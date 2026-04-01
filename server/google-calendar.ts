import { google } from "googleapis";
import { storage } from "./supabase-storage";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://pickuppal.onrender.com/api/auth/google/callback";

export function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export async function handleCallback(code: string): Promise<string> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Store tokens in settings
  await storage.updateSettings({
    googleTokens: JSON.stringify(tokens),
  });

  return tokens.refresh_token || "";
}

export async function createCalendarEvent(eventData: {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
}): Promise<string> {
  const settings = await storage.getSettings();
  if (!settings.googleTokens) {
    throw new Error("Google Calendar not connected");
  }

  const tokens = JSON.parse(settings.googleTokens);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Listen for token refresh events and save new tokens
  oauth2Client.on("tokens", async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    await storage.updateSettings({
      googleTokens: JSON.stringify(merged),
    });
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startDateTime,
        timeZone: "America/New_York",
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: "America/New_York",
      },
      location: eventData.location || undefined,
    },
  });

  return event.data.id || "";
}

export function isCalendarConnected(settings: any): boolean {
  return !!(settings.googleTokens && settings.googleTokens !== "{}");
}
