import { google } from "googleapis";
import { getOAuth2Client } from "./google-calendar";
import { storage } from "./supabase-storage";

export async function sendBookingNotification(booking: any, listing: any, slot: any) {
  const settings = await storage.getSettings();
  const notifyEmail = settings.contactPhone ? undefined : undefined; // We'll use the OAuth user's email
  
  if (!settings.googleTokens) {
    console.log("No Google tokens — skipping email notification");
    return;
  }

  try {
    const tokens = JSON.parse(settings.googleTokens);
    const oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const subject = `New Booking Request: ${listing.title} — ${booking.buyerName}`;
    const body = [
      `New pickup reservation request on PickupPal!`,
      ``,
      `Item: ${listing.title}`,
      `Price: $${listing.price}`,
      ``,
      `Buyer: ${booking.buyerName}`,
      `Phone: ${booking.buyerPhone}`,
      `Email: ${booking.buyerEmail}`,
      booking.notes ? `Notes: ${booking.notes}` : ``,
      ``,
      `Requested Time: ${slot.date} from ${formatTime(slot.startTime)} to ${formatTime(slot.endTime)}`,
      ``,
      `Log in to approve or deny: https://pickuppal.onrender.com/#/admin/bookings`,
    ].filter(Boolean).join("\n");

    // Get the authenticated user's email
    const profile = await gmail.users.getProfile({ userId: "me" });
    const userEmail = profile.data.emailAddress || "";

    const message = [
      `To: ${userEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ].join("\n");

    const encoded = Buffer.from(message).toString("base64url");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    console.log(`Booking notification sent to ${userEmail}`);
  } catch (err) {
    console.error("Email notification failed:", err);
    // Don't throw — email failure shouldn't block the booking
  }
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}
