import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, CalendarCheck, Clock, User, Phone, Mail, Package } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Booking, Listing, TimeSlot } from "@shared/schema";

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function BookingsPanel() {
  const { toast } = useToast();

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });
  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });
  const { data: slots = [] } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      toast({ title: "Booking approved and added to calendar" });
    },
    onError: () => {
      toast({ title: "Approved, but calendar event may have failed", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/deny`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      toast({ title: "Booking denied" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: "Marked as completed. Listing marked sold." });
    },
  });

  const getListingTitle = (id: number) => listings.find((l) => l.id === id)?.title || "Unknown";
  const getSlot = (id: number) => slots.find((s) => s.id === id);

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">Pending</Badge>;
      case "approved": return <Badge className="bg-primary/10 text-primary border-primary/20">Approved</Badge>;
      case "denied": return <Badge variant="destructive">Denied</Badge>;
      case "completed": return <Badge variant="secondary">Completed</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const otherBookings = bookings.filter((b) => b.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-bookings-title">Bookings</h2>
        <p className="text-sm text-muted-foreground">{bookings.length} total, {pendingBookings.length} pending approval</p>
      </div>

      {loadingBookings ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarCheck className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm text-muted-foreground">Bookings will appear here when buyers reserve items</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingBookings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-amber-600 dark:text-amber-400">
                Pending Approval ({pendingBookings.length})
              </h3>
              {pendingBookings.map((booking) => {
                const slot = getSlot(booking.timeSlotId);
                return (
                  <Card key={booking.id} className="border-amber-200 dark:border-amber-800/40" data-testid={`card-booking-${booking.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">{getListingTitle(booking.listingId)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{booking.buyerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{booking.buyerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{booking.buyerEmail}</span>
                          </div>
                          {slot && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>
                                {format(parseISO(slot.date), "MMM d, yyyy")} at {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            </div>
                          )}
                          {booking.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1">"{booking.notes}"</p>
                          )}
                        </div>
                        {statusBadge(booking.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(booking.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${booking.id}`}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {approveMutation.isPending ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => denyMutation.mutate(booking.id)}
                          disabled={denyMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-deny-${booking.id}`}
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Deny
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {otherBookings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                All Bookings
              </h3>
              {otherBookings.map((booking) => {
                const slot = getSlot(booking.timeSlotId);
                return (
                  <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-medium text-sm truncate">{getListingTitle(booking.listingId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.buyerName} &middot; {booking.buyerPhone}
                        </p>
                        {slot && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(slot.date), "MMM d")} at {formatTime(slot.startTime)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusBadge(booking.status)}
                        {booking.status === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => completeMutation.mutate(booking.id)}
                            data-testid={`button-complete-${booking.id}`}
                          >
                            Mark Sold
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
