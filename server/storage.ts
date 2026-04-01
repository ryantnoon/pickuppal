import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import {
  listings, timeSlots, bookings, settings,
  type Listing, type InsertListing,
  type TimeSlot, type InsertTimeSlot,
  type Booking, type InsertBooking,
  type Settings, type InsertSettings,
} from "@shared/schema";

const sqlite = new Database("database.sqlite");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    condition TEXT NOT NULL DEFAULT 'used',
    images TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    max_bookings INTEGER NOT NULL DEFAULT 1,
    current_bookings INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    time_slot_id INTEGER NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    calendar_event_id TEXT,
    created_at TEXT NOT NULL,
    notes TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_pin TEXT NOT NULL DEFAULT '1234',
    pickup_location TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT ''
  );
`);

// Ensure a settings row exists
const existingSettings = db.select().from(settings).get();
if (!existingSettings) {
  db.insert(settings).values({ adminPin: "1234", pickupLocation: "", contactPhone: "" }).run();
}

export interface IStorage {
  // Listings
  getListings(): Listing[];
  getActiveListings(): Listing[];
  getListing(id: number): Listing | undefined;
  createListing(data: InsertListing): Listing;
  updateListing(id: number, data: Partial<InsertListing>): Listing | undefined;
  deleteListing(id: number): void;
  
  // Time slots
  getTimeSlots(): TimeSlot[];
  getAvailableTimeSlots(): TimeSlot[];
  getTimeSlot(id: number): TimeSlot | undefined;
  createTimeSlot(data: InsertTimeSlot): TimeSlot;
  updateTimeSlot(id: number, data: Partial<InsertTimeSlot>): TimeSlot | undefined;
  deleteTimeSlot(id: number): void;
  incrementBookingCount(id: number): void;
  decrementBookingCount(id: number): void;
  
  // Bookings
  getBookings(): Booking[];
  getBookingsByListing(listingId: number): Booking[];
  getBooking(id: number): Booking | undefined;
  createBooking(data: InsertBooking): Booking;
  updateBookingStatus(id: number, status: string, calendarEventId?: string): Booking | undefined;
  deleteBooking(id: number): void;

  // Settings
  getSettings(): Settings;
  updateSettings(data: Partial<InsertSettings>): Settings;
}

export const storage: IStorage = {
  // Listings
  getListings() {
    return db.select().from(listings).orderBy(desc(listings.createdAt)).all();
  },
  getActiveListings() {
    return db.select().from(listings).where(eq(listings.status, "active")).orderBy(desc(listings.createdAt)).all();
  },
  getListing(id: number) {
    return db.select().from(listings).where(eq(listings.id, id)).get();
  },
  createListing(data: InsertListing) {
    return db.insert(listings).values(data).returning().get();
  },
  updateListing(id: number, data: Partial<InsertListing>) {
    return db.update(listings).set(data).where(eq(listings.id, id)).returning().get();
  },
  deleteListing(id: number) {
    db.delete(listings).where(eq(listings.id, id)).run();
  },

  // Time slots
  getTimeSlots() {
    return db.select().from(timeSlots).orderBy(timeSlots.date, timeSlots.startTime).all();
  },
  getAvailableTimeSlots() {
    return db.select().from(timeSlots).all().filter(
      (slot) => slot.currentBookings < slot.maxBookings
    );
  },
  getTimeSlot(id: number) {
    return db.select().from(timeSlots).where(eq(timeSlots.id, id)).get();
  },
  createTimeSlot(data: InsertTimeSlot) {
    return db.insert(timeSlots).values({ ...data, currentBookings: 0 }).returning().get();
  },
  updateTimeSlot(id: number, data: Partial<InsertTimeSlot>) {
    return db.update(timeSlots).set(data).where(eq(timeSlots.id, id)).returning().get();
  },
  deleteTimeSlot(id: number) {
    db.delete(timeSlots).where(eq(timeSlots.id, id)).run();
  },
  incrementBookingCount(id: number) {
    const slot = db.select().from(timeSlots).where(eq(timeSlots.id, id)).get();
    if (slot) {
      db.update(timeSlots).set({ currentBookings: slot.currentBookings + 1 }).where(eq(timeSlots.id, id)).run();
    }
  },
  decrementBookingCount(id: number) {
    const slot = db.select().from(timeSlots).where(eq(timeSlots.id, id)).get();
    if (slot && slot.currentBookings > 0) {
      db.update(timeSlots).set({ currentBookings: slot.currentBookings - 1 }).where(eq(timeSlots.id, id)).run();
    }
  },

  // Bookings
  getBookings() {
    return db.select().from(bookings).orderBy(desc(bookings.createdAt)).all();
  },
  getBookingsByListing(listingId: number) {
    return db.select().from(bookings).where(eq(bookings.listingId, listingId)).all();
  },
  getBooking(id: number) {
    return db.select().from(bookings).where(eq(bookings.id, id)).get();
  },
  createBooking(data: InsertBooking) {
    return db.insert(bookings).values(data).returning().get();
  },
  updateBookingStatus(id: number, status: string, calendarEventId?: string) {
    const updateData: Record<string, any> = { status };
    if (calendarEventId !== undefined) {
      updateData.calendarEventId = calendarEventId;
    }
    return db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning().get();
  },
  deleteBooking(id: number) {
    db.delete(bookings).where(eq(bookings.id, id)).run();
  },

  // Settings
  getSettings() {
    return db.select().from(settings).get()!;
  },
  updateSettings(data: Partial<InsertSettings>) {
    const current = db.select().from(settings).get()!;
    return db.update(settings).set(data).where(eq(settings.id, current.id)).returning().get();
  },
};
