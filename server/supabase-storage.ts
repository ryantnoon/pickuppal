import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://haulmizpiiwbfwdtbawu.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface IStorage {
  // Listings
  getListings(): Promise<any[]>;
  getActiveListings(): Promise<any[]>;
  getListing(id: number): Promise<any | undefined>;
  createListing(data: any): Promise<any>;
  updateListing(id: number, data: any): Promise<any | undefined>;
  deleteListing(id: number): Promise<void>;

  // Time Slots
  getTimeSlots(): Promise<any[]>;
  getAvailableTimeSlots(): Promise<any[]>;
  getTimeSlot(id: number): Promise<any | undefined>;
  createTimeSlot(data: any): Promise<any>;
  updateTimeSlot(id: number, data: any): Promise<any | undefined>;
  deleteTimeSlot(id: number): Promise<void>;

  // Bookings
  getBookings(): Promise<any[]>;
  getBooking(id: number): Promise<any | undefined>;
  getBookingsByListing(listingId: number): Promise<any[]>;
  createBooking(data: any): Promise<any>;
  updateBookingStatus(id: number, status: string, calendarEventId?: string): Promise<any | undefined>;
  incrementBookingCount(timeSlotId: number): Promise<void>;
  decrementBookingCount(timeSlotId: number): Promise<void>;

  // Settings
  getSettings(): Promise<any>;
  updateSettings(data: any): Promise<any>;

  // Photo storage
  uploadPhoto(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string>;
}

// Map camelCase to snake_case for DB columns
function toDb(obj: any): any {
  const map: Record<string, string> = {
    startTime: "start_time",
    endTime: "end_time",
    maxBookings: "max_bookings",
    currentBookings: "current_bookings",
    listingId: "listing_id",
    timeSlotId: "time_slot_id",
    buyerName: "buyer_name",
    buyerEmail: "buyer_email",
    buyerPhone: "buyer_phone",
    calendarEventId: "calendar_event_id",
    createdAt: "created_at",
    adminPin: "admin_pin",
    sellerName: "seller_name",
    pickupLocation: "pickup_location",
    contactPhone: "contact_phone",
    googleTokens: "google_tokens",
    googleClientId: "google_client_id",
    googleClientSecret: "google_client_secret",
  };
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "id") continue; // Don't include id in inserts/updates
    result[map[k] || k] = v;
  }
  return result;
}

// Map snake_case DB columns to camelCase
function fromDb(obj: any): any {
  if (!obj) return obj;
  const map: Record<string, string> = {
    start_time: "startTime",
    end_time: "endTime",
    max_bookings: "maxBookings",
    current_bookings: "currentBookings",
    listing_id: "listingId",
    time_slot_id: "timeSlotId",
    buyer_name: "buyerName",
    buyer_email: "buyerEmail",
    buyer_phone: "buyerPhone",
    calendar_event_id: "calendarEventId",
    created_at: "createdAt",
    admin_pin: "adminPin",
    seller_name: "sellerName",
    pickup_location: "pickupLocation",
    contact_phone: "contactPhone",
    google_tokens: "googleTokens",
    google_client_id: "googleClientId",
    google_client_secret: "googleClientSecret",
  };
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] || k] = v;
  }
  return result;
}

class SupabaseStorage implements IStorage {
  // --- LISTINGS ---
  async getListings() {
    const { data, error } = await supabase
      .from("pickuppal_listings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDb);
  }

  async getActiveListings() {
    const { data, error } = await supabase
      .from("pickuppal_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDb);
  }

  async getListing(id: number) {
    const { data, error } = await supabase
      .from("pickuppal_listings")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code === "PGRST116") return undefined;
    if (error) throw error;
    return fromDb(data);
  }

  async createListing(input: any) {
    const dbData = toDb(input);
    const { data, error } = await supabase
      .from("pickuppal_listings")
      .insert(dbData)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  }

  async updateListing(id: number, input: any) {
    const dbData = toDb(input);
    const { data, error } = await supabase
      .from("pickuppal_listings")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();
    if (error && error.code === "PGRST116") return undefined;
    if (error) throw error;
    return fromDb(data);
  }

  async deleteListing(id: number) {
    await supabase.from("pickuppal_listings").delete().eq("id", id);
  }

  // --- TIME SLOTS ---
  async getTimeSlots() {
    const { data, error } = await supabase
      .from("pickuppal_time_slots")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data || []).map(fromDb);
  }

  async getAvailableTimeSlots() {
    const { data, error } = await supabase
      .from("pickuppal_time_slots")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    // Filter available slots (current_bookings < max_bookings)
    return (data || [])
      .filter((s: any) => s.current_bookings < s.max_bookings)
      .map(fromDb);
  }

  async getTimeSlot(id: number) {
    const { data, error } = await supabase
      .from("pickuppal_time_slots")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code === "PGRST116") return undefined;
    if (error) throw error;
    return fromDb(data);
  }

  async createTimeSlot(input: any) {
    const dbData = toDb(input);
    const { data, error } = await supabase
      .from("pickuppal_time_slots")
      .insert(dbData)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  }

  async updateTimeSlot(id: number, input: any) {
    const dbData = toDb(input);
    const { data, error } = await supabase
      .from("pickuppal_time_slots")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();
    if (error && error.code === "PGRST116") return undefined;
    if (error) throw error;
    return fromDb(data);
  }

  async deleteTimeSlot(id: number) {
    await supabase.from("pickuppal_time_slots").delete().eq("id", id);
  }

  // --- BOOKINGS ---
  async getBookings() {
    const { data, error } = await supabase
      .from("pickuppal_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDb);
  }

  async getBooking(id: number) {
    const { data, error } = await supabase
      .from("pickuppal_bookings")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code === "PGRST116") return undefined;
    if (error) throw error;
    return fromDb(data);
  }

  async getBookingsByListing(listingId: number) {
    const { data, error } = await supabase
      .from("pickuppal_bookings")
      .select("*")
      .eq("listing_id", listingId);
    if (error) throw error;
    return (data || []).map(fromDb);
  }

  async createBooking(input: any) {
    const dbData = toDb(input);
    const { data, error } = await supabase
      .from("pickuppal_bookings")
      .insert(dbData)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  }

  async updateBookingStatus(id: number, status: string, calendarEventId?: string) {
    const update: any = { status };
    if (calendarEventId !== undefined) update.calendar_event_id = calendarEventId;
    const { data, error } = await supabase
      .from("pickuppal_bookings")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error && error.code === "PGRST116") return undefined;
    if (error) throw error;
    return fromDb(data);
  }

  async incrementBookingCount(timeSlotId: number) {
    const slot = await this.getTimeSlot(timeSlotId);
    if (slot) {
      await supabase
        .from("pickuppal_time_slots")
        .update({ current_bookings: (slot.currentBookings || 0) + 1 })
        .eq("id", timeSlotId);
    }
  }

  async decrementBookingCount(timeSlotId: number) {
    const slot = await this.getTimeSlot(timeSlotId);
    if (slot && slot.currentBookings > 0) {
      await supabase
        .from("pickuppal_time_slots")
        .update({ current_bookings: slot.currentBookings - 1 })
        .eq("id", timeSlotId);
    }
  }

  // --- SETTINGS ---
  async getSettings() {
    const { data, error } = await supabase
      .from("pickuppal_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error && error.code === "PGRST116") {
      // No settings row, return defaults
      return { id: 1, adminPin: "1234", sellerName: "", pickupLocation: "" };
    }
    if (error) throw error;
    return fromDb(data);
  }

  async updateSettings(input: any) {
    const dbData = toDb(input);
    const { data, error } = await supabase
      .from("pickuppal_settings")
      .update(dbData)
      .eq("id", 1)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  }

  // --- PHOTO STORAGE ---
  async uploadPhoto(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
    const path = `listings/${Date.now()}-${fileName}`;
    const { error } = await supabase.storage
      .from("pickuppal-photos")
      .upload(path, fileBuffer, { contentType, upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("pickuppal-photos")
      .getPublicUrl(path);
    return urlData.publicUrl;
  }
}

export const storage = new SupabaseStorage();
