import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./supabase-storage";
import { execSync } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

function callExternalTool(sourceId: string, toolName: string, args: Record<string, any>) {
  const params = JSON.stringify({ source_id: sourceId, tool_name: toolName, arguments: args });
  const escaped = params.replace(/'/g, "'\\''");
  const result = execSync(`external-tool call '${escaped}'`, { timeout: 30000 }).toString();
  return JSON.parse(result);
}

export function registerRoutes(server: Server, app: Express) {
  // --- LISTINGS ---
  app.get("/api/listings", async (_req, res) => {
    try { res.json(await storage.getListings()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/listings/active", async (_req, res) => {
    try { res.json(await storage.getActiveListings()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(Number(req.params.id));
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      res.json(listing);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      const listing = await storage.createListing(req.body);
      res.status(201).json(listing);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.updateListing(Number(req.params.id), req.body);
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      res.json(listing);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/listings/:id", async (req, res) => {
    try {
      await storage.deleteListing(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- PHOTO UPLOAD ---
  app.post("/api/upload/photo", async (req, res) => {
    try {
      const { image, fileName } = req.body; // base64 data URI
      if (!image) return res.status(400).json({ error: "No image provided" });

      const match = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "Invalid image format" });

      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const name = fileName || `photo-${Date.now()}.${contentType.split("/")[1]}`;

      const publicUrl = await storage.uploadPhoto(buffer, name, contentType);
      res.json({ url: publicUrl });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- TIME SLOTS ---
  app.get("/api/timeslots", async (_req, res) => {
    try { res.json(await storage.getTimeSlots()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/timeslots/available", async (_req, res) => {
    try { res.json(await storage.getAvailableTimeSlots()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/timeslots", async (req, res) => {
    try {
      const slot = await storage.createTimeSlot(req.body);
      res.status(201).json(slot);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/timeslots/:id", async (req, res) => {
    try {
      const slot = await storage.updateTimeSlot(Number(req.params.id), req.body);
      if (!slot) return res.status(404).json({ error: "Time slot not found" });
      res.json(slot);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Auto-generate weekly time slots (weekdays 6pm-9pm ET, 30-min increments)
  app.post("/api/timeslots/generate-week", async (req, res) => {
    try {
      const { weeksAhead = 2 } = req.body || {};
      const created = [];
      const existing = await storage.getTimeSlots();
      const existingDates = new Set(existing.map((s: any) => `${s.date}-${s.startTime}`));

      const now = new Date();
      // Generate for the next N weeks
      for (let w = 0; w < weeksAhead; w++) {
        for (let d = 0; d < 7; d++) {
          const date = new Date(now);
          date.setDate(now.getDate() + (w * 7) + d);
          const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
          if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

          const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

          // 6:00 PM to 9:00 PM in 30-min increments = 6 slots
          const times = [
            { start: "18:00", end: "18:30" },
            { start: "18:30", end: "19:00" },
            { start: "19:00", end: "19:30" },
            { start: "19:30", end: "20:00" },
            { start: "20:00", end: "20:30" },
            { start: "20:30", end: "21:00" },
          ];

          for (const t of times) {
            const key = `${dateStr}-${t.start}`;
            if (existingDates.has(key)) continue; // Don't duplicate

            const slot = await storage.createTimeSlot({
              date: dateStr,
              startTime: t.start,
              endTime: t.end,
              maxBookings: 1,
              currentBookings: 0,
            });
            created.push(slot);
          }
        }
      }

      res.json({ created: created.length, message: `Generated ${created.length} time slots` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/timeslots/:id", async (req, res) => {
    try {
      await storage.deleteTimeSlot(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- BOOKINGS ---
  app.get("/api/bookings", async (_req, res) => {
    try { res.json(await storage.getBookings()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/bookings/listing/:listingId", async (req, res) => {
    try { res.json(await storage.getBookingsByListing(Number(req.params.listingId))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const slot = await storage.getTimeSlot(req.body.timeSlotId);
      if (!slot) return res.status(400).json({ error: "Time slot not found" });
      if (slot.currentBookings >= slot.maxBookings) {
        return res.status(400).json({ error: "Time slot is fully booked" });
      }

      const listing = await storage.getListing(req.body.listingId);
      if (!listing || listing.status !== "active") {
        return res.status(400).json({ error: "Listing not available" });
      }

      const booking = await storage.createBooking(req.body);
      await storage.incrementBookingCount(req.body.timeSlotId);
      res.status(201).json(booking);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/bookings/:id/approve", async (req, res) => {
    try {
      const booking = await storage.getBooking(Number(req.params.id));
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      const listing = await storage.getListing(booking.listingId);
      const slot = await storage.getTimeSlot(booking.timeSlotId);
      if (!listing || !slot) return res.status(404).json({ error: "Related data not found" });

      const adminSettings = await storage.getSettings();

      let calendarEventId = "";
      try {
        const startDateTime = `${slot.date}T${slot.startTime}:00-04:00`;
        const endDateTime = `${slot.date}T${slot.endTime}:00-04:00`;

        const result = callExternalTool("gcal", "update_calendar", {
          create_actions: [{
            action: "create",
            title: `Pickup: ${listing.title} - ${booking.buyerName}`,
            description: `Item: ${listing.title}\nPrice: $${listing.price}\nBuyer: ${booking.buyerName}\nPhone: ${booking.buyerPhone}\nEmail: ${booking.buyerEmail}\n${booking.notes ? `Notes: ${booking.notes}` : ""}`,
            start_date_time: startDateTime,
            end_date_time: endDateTime,
            location: adminSettings.pickupLocation || null,
            attendees: null,
            meeting_provider: null,
          }],
          delete_actions: [],
          update_actions: [],
        });
        if (result && typeof result === "object") {
          const resultStr = JSON.stringify(result);
          const eventIdMatch = resultStr.match(/"event_id"\s*:\s*"([^"]+)"/);
          if (eventIdMatch) calendarEventId = eventIdMatch[1];
        }
      } catch (err) {
        console.error("Calendar event creation failed:", err);
      }

      const updated = await storage.updateBookingStatus(Number(req.params.id), "approved", calendarEventId);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/bookings/:id/deny", async (req, res) => {
    try {
      const booking = await storage.getBooking(Number(req.params.id));
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      await storage.decrementBookingCount(booking.timeSlotId);
      const updated = await storage.updateBookingStatus(Number(req.params.id), "denied");
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/bookings/:id/complete", async (req, res) => {
    try {
      const updated = await storage.updateBookingStatus(Number(req.params.id), "completed");
      if (!updated) return res.status(404).json({ error: "Booking not found" });

      const booking = await storage.getBooking(Number(req.params.id));
      if (booking) {
        await storage.updateListing(booking.listingId, { status: "sold" });
      }
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SETTINGS ---
  app.get("/api/settings", async (_req, res) => {
    try { res.json(await storage.getSettings()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/settings", async (req, res) => {
    try { res.json(await storage.updateSettings(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- BULK IMPORT (AI Vision) ---
  app.post("/api/import/extract", async (req, res) => {
    try {
      const { screenshots } = req.body;
      if (!screenshots || !Array.isArray(screenshots) || screenshots.length === 0) {
        return res.status(400).json({ error: "No screenshots provided" });
      }

      const client = new Anthropic();
      const results = [];

      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        const match = screenshot.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (!match) { results.push({ error: "Invalid image format" }); continue; }
        const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        const imageData = match[2];

        // Upload the screenshot to Supabase Storage as the listing photo
        let photoUrl = "";
        try {
          const ext = mediaType.split("/")[1] || "png";
          const buffer = Buffer.from(imageData, "base64");
          photoUrl = await storage.uploadPhoto(buffer, `import-${Date.now()}-${i}.${ext}`, mediaType);
        } catch (uploadErr) {
          console.error("Screenshot upload failed:", uploadErr);
        }

        const message = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
              { type: "text", text: `This is a screenshot of a Facebook Marketplace listing. Extract the following details and return them as JSON only (no other text):\n{\n  "title": "item title",\n  "price": "numeric price only, no dollar sign",\n  "description": "item description if visible, or generate a brief one from what you see",\n  "category": "one of: Electronics, Furniture, Vehicles, Clothing, Tools, Sports, Home, Other",\n  "condition": "one of: New, Like New, Good, Fair, Used"\n}\nIf you cannot determine a field, use a reasonable default. Return ONLY the JSON object.` },
            ],
          }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            parsed.photoUrl = photoUrl;
            results.push(parsed);
          }
          else { results.push({ error: "Could not parse AI response", raw: text, photoUrl }); }
        } catch { results.push({ error: "Failed to parse AI response", raw: text, photoUrl }); }
      }

      res.json({ listings: results });
    } catch (err: any) {
      console.error("Import extraction failed:", err);
      res.status(500).json({ error: err.message || "Extraction failed" });
    }
  });

  // --- AUTH ---
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { pin } = req.body;
      const adminSettings = await storage.getSettings();
      if (pin === adminSettings.adminPin) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Invalid PIN" });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
