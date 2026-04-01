import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Tag, Star, Clock, CalendarDays, CheckCircle2, ImagePlus, ChevronLeft, ChevronRight, ArrowLeft,
} from "lucide-react";
import { format, parseISO, isBefore, startOfToday } from "date-fns";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import type { Listing, TimeSlot } from "@shared/schema";

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function PublicListing() {
  const { id } = useParams<{ id: string }>();
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState(false);
  const { toast } = useToast();

  const { data: listing, isLoading: loadingListing } = useQuery<Listing>({
    queryKey: [`/api/listings/${id}`],
  });

  const { data: allSlots = [] } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots/available"],
  });

  // Filter to future available slots only
  const availableSlots = allSlots.filter(
    (s) => !isBefore(parseISO(s.date), startOfToday()) && s.currentBookings < s.maxBookings
  );

  const bookMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: () => {
      setBooked(true);
    },
    onError: (err: Error) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    },
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !listing) return;
    bookMutation.mutate({
      listingId: listing.id,
      timeSlotId: selectedSlot,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      notes,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  };

  if (loadingListing) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2">
          <p className="font-medium">Listing not found</p>
          <p className="text-sm text-muted-foreground">This item may have been removed.</p>
        </div>
      </div>
    );
  }

  if (listing.status !== "active") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center space-y-3 py-20">
          <Tag className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-lg">This item is no longer available</p>
          <p className="text-muted-foreground">It may have been sold or removed.</p>
        </div>
      </div>
    );
  }

  const images: string[] = JSON.parse(listing.images || "[]");

  if (booked) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-md mx-auto text-center space-y-4 py-20">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
          <h1 className="text-xl font-semibold" data-testid="text-booking-success">Reservation Submitted</h1>
          <p className="text-muted-foreground">
            Your request to reserve <strong>{listing.title}</strong> has been submitted.
            The seller will review and confirm your booking.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll be contacted at <strong>{phone}</strong> once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="PickupPal">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <path d="M10 22V14l6-4 6 4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              <rect x="13" y="18" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
            </svg>
            <span className="font-semibold text-sm">PickupPal</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Image gallery */}
        {images.length > 0 ? (
          <div className="relative rounded-lg overflow-hidden bg-muted aspect-[4/3]">
            <img
              src={images[currentImage]}
              alt={listing.title}
              className="w-full h-full object-contain bg-black/5 dark:bg-white/5"
              data-testid="img-listing"
            />
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                  onClick={() => setCurrentImage((c) => (c - 1 + images.length) % images.length)}
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                  onClick={() => setCurrentImage((c) => (c + 1) % images.length)}
                  data-testid="button-next-image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${i === currentImage ? "bg-primary" : "bg-background/60"}`}
                      onClick={() => setCurrentImage(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-muted aspect-[4/3] flex items-center justify-center">
            <ImagePlus className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Item details */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold" data-testid="text-listing-title">{listing.title}</h1>
            <span className="text-xl font-bold text-primary whitespace-nowrap" data-testid="text-listing-price">
              ${listing.price}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              <Tag className="w-3 h-3 mr-1" /> {listing.category}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Star className="w-3 h-3 mr-1" /> {listing.condition}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-listing-description">
            {listing.description}
          </p>
        </div>

        {/* Booking form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reserve This Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBook} className="space-y-4">
              {/* Time slot selection */}
              <div className="space-y-2">
                <Label>Select a Pickup Time</Label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No pickup times available right now. Check back later.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`p-3 rounded-md border text-left text-sm transition-colors ${
                          selectedSlot === slot.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedSlot(slot.id)}
                        data-testid={`button-slot-${slot.id}`}
                      >
                        <div className="flex items-center gap-1.5 font-medium">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(parseISO(slot.date), "EEE, MMM d")}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Buyer info */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="buyer-name">Your Name</Label>
                  <Input
                    id="buyer-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    required
                    data-testid="input-buyer-name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="buyer-email">Email</Label>
                    <Input
                      id="buyer-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@email.com"
                      required
                      data-testid="input-buyer-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyer-phone">Phone</Label>
                    <Input
                      id="buyer-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      required
                      data-testid="input-buyer-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer-notes">Notes (optional)</Label>
                  <Textarea
                    id="buyer-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any questions or details..."
                    rows={2}
                    data-testid="input-buyer-notes"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedSlot || !name || !email || !phone || bookMutation.isPending}
                data-testid="button-reserve"
              >
                {bookMutation.isPending ? "Submitting..." : "Reserve Item & Book Pickup"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your reservation will be reviewed before confirmation. Payment is collected at pickup.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
