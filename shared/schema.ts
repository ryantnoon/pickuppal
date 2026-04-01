import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Listings table - items for sale
export const listings = sqliteTable("listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  category: text("category").notNull().default("other"),
  condition: text("condition").notNull().default("used"),
  images: text("images").notNull().default("[]"), // JSON array of base64 data URIs
  status: text("status").notNull().default("active"), // active, sold, archived
  createdAt: text("created_at").notNull(),
});

// Time slots - manual pickup availability
export const timeSlots = sqliteTable("time_slots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
  maxBookings: integer("max_bookings").notNull().default(1),
  currentBookings: integer("current_bookings").notNull().default(0),
});

// Bookings - reservation requests
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  timeSlotId: integer("time_slot_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, denied, completed
  calendarEventId: text("calendar_event_id"), // Google Calendar event ID
  createdAt: text("created_at").notNull(),
  notes: text("notes").default(""),
});

// Admin settings
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminPin: text("admin_pin").notNull().default("1234"),
  pickupLocation: text("pickup_location").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
});

// Insert schemas
export const insertListingSchema = createInsertSchema(listings).omit({ id: true });
export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({ id: true, currentBookings: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, calendarEventId: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

// Types
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type TimeSlot = typeof timeSlots.$inferSelect;
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
