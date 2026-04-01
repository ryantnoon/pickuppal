import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertTimeSlotSchema, insertBookingSchema } from "@shared/schema";
import { execSync } from "child_process";

function callExternalTool(sourceId: string, toolName: string, args: Record<string, any>) {
  const params = JSON.stringify({ source_id: sourceId, tool_name: toolName, arguments: args });
  const escaped = params.replace(/'/g, "'\\''");
  const result = execSync(`external-tool call '${escaped}'`, { timeout: 30000 }).toString();
  return JSON.parse(result);
}

export function registerRoutes(server: Server, app: Express) {
  // --- LISTINGS ---
  app.get("/api/listings", (_req, res) => {
    res.json(storage.getListings());
  });

  app.get("/api/listings/active", (_req, res) => {
    res.json(storage.getActiveListings());
  });

  app.get("/api/listings/:id", (req, res) => {
    const listing = storage.getListing(Number(req.params.id));
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  });

  app.post("/api/listings", (req, res) => {
    const parsed = insertListingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const listing = storage.createListing(parsed.data);
    res.status(201).json(listing);
  });

  app.patch("/api/listings/:id", (req, res) => {
    const listing = storage.updateListing(Number(req.params.id), req.body);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  });

  app.delete("/api/listings/:id", (req, res) => {
    storage.deleteListing(Number(req.params.id));
    res.json({ success: true });
  });

  // --- TIME SLOTS ---
  app.get("/api/timeslots", (_req, res) => {
    res.json(storage.getTimeSlots());
  });

  app.get("/api/timeslots/available", (_req, res) => {
    res.json(storage.getAvailableTimeSlots());
  });

  app.post("/api/timeslots", (req, res) => {
    const parsed = insertTimeSlotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const slot = storage.createTimeSlot(parsed.data);
    res.status(201).json(slot);
  });

  app.patch("/api/timeslots/:id", (req, res) => {
    const slot = storage.updateTimeSlot(Number(req.params.id), req.body);
    if (!slot) return res.status(404).json({ error: "Time slot not found" });
    res.json(slot);
  });

  app.delete("/api/timeslots/:id", (req, res) => {
    storage.deleteTimeSlot(Number(req.params.id));
    res.json({ success: true });
  });

  // --- BOOKINGS ---
  app.get("/api/bookings", (_req, res) => {
    res.json(storage.getBookings());
  });

  app.get("/api/bookings/listing/:listingId", (req, res) => {
    res.json(storage.getBookingsByListing(Number(req.params.listingId)));
  });

  app.post("/api/bookings", (req, res) => {
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    // Check slot availability
    const slot = storage.getTimeSlot(parsed.data.timeSlotId);
    if (!slot) return res.status(400).json({ error: "Time slot not found" });
    if (slot.currentBookings >= slot.maxBookings) {
      return res.status(400).json({ error: "Time slot is fully booked" });
    }

    // Check listing exists and is active
    const listing = storage.getListing(parsed.data.listingId);
    if (!listing || listing.status !== "active") {
      return res.status(400).json({ error: "Listing not available" });
    }

    const booking = storage.createBooking(parsed.data);
    storage.incrementBookingCount(parsed.data.timeSlotId);
    res.status(201).json(booking);
  });

  app.post("/api/bookings/:id/approve", async (req, res) => {
    const booking = storage.getBooking(Number(req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const listing = storage.getListing(booking.listingId);
    const slot = storage.getTimeSlot(booking.timeSlotId);
    if (!listing || !slot) return res.status(404).json({ error: "Related data not found" });

    const adminSettings = storage.getSettings();

    // Create Google Calendar event
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
      // Try to extract event ID from the response
      if (result && typeof result === "object") {
        const resultStr = JSON.stringify(result);
        const eventIdMatch = resultStr.match(/"event_id"\s*:\s*"([^"]+)"/);
        if (eventIdMatch) calendarEventId = eventIdMatch[1];
      }
    } catch (err) {
      console.error("Calendar event creation failed:", err);
      // Continue with approval even if calendar fails
    }

    const updated = storage.updateBookingStatus(Number(req.params.id), "approved", calendarEventId);
    res.json(updated);
  });

  app.post("/api/bookings/:id/deny", (req, res) => {
    const booking = storage.getBooking(Number(req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Free up the time slot
    storage.decrementBookingCount(booking.timeSlotId);
    const updated = storage.updateBookingStatus(Number(req.params.id), "denied");
    res.json(updated);
  });

  app.post("/api/bookings/:id/complete", (req, res) => {
    const updated = storage.updateBookingStatus(Number(req.params.id), "completed");
    if (!updated) return res.status(404).json({ error: "Booking not found" });
    
    // Mark listing as sold
    const booking = storage.getBooking(Number(req.params.id));
    if (booking) {
      storage.updateListing(booking.listingId, { status: "sold" });
    }
    res.json(updated);
  });

  // --- SETTINGS ---
  app.get("/api/settings", (_req, res) => {
    res.json(storage.getSettings());
  });

  app.patch("/api/settings", (req, res) => {
    const updated = storage.updateSettings(req.body);
    res.json(updated);
  });

  // --- AUTH ---
  app.post("/api/auth/verify", (req, res) => {
    const { pin } = req.body;
    const adminSettings = storage.getSettings();
    if (pin === adminSettings.adminPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid PIN" });
    }
  });
}
