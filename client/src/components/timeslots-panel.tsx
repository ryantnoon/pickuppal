import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CalendarDays, RefreshCw, Loader2 } from "lucide-react";
import { format, parseISO, isBefore, startOfToday } from "date-fns";
import type { TimeSlot } from "@shared/schema";

export function TimeSlotsPanel() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: slots = [], isLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/timeslots", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      setOpen(false);
      toast({ title: "Time slot created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timeslots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      toast({ title: "Time slot deleted" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timeslots/generate-week", { weeksAhead: 2 });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      toast({ title: `${data.created} time slots generated`, description: "Weekdays 6–9 PM, 30-min slots for the next 2 weeks" });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  // Group slots by date
  const grouped = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-timeslots-title">Pickup Time Slots</h2>
          <p className="text-sm text-muted-foreground">Create slots when you're available for pickups</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-slots"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-1" /> Auto-Fill 2 Weeks</>
            )}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-timeslot">
                <Plus className="w-4 h-4 mr-1" /> Add Slot
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>New Time Slot</DialogTitle>
            </DialogHeader>
            <TimeSlotForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-10 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium">No time slots</p>
            <p className="text-sm text-muted-foreground mb-4">Create time slots when buyers can pick up items</p>
            <Button size="sm" onClick={() => setOpen(true)} data-testid="button-add-first-slot">
              <Plus className="w-4 h-4 mr-1" /> Add Slot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const isPast = isBefore(parseISO(date), startOfToday());
            return (
              <div key={date} className={isPast ? "opacity-50" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">
                    {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                  </h3>
                  {isPast && <Badge variant="outline" className="text-xs">Past</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {grouped[date].map((slot) => (
                    <Card key={slot.id} data-testid={`card-slot-${slot.id}`}>
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {slot.currentBookings}/{slot.maxBookings} booked
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {slot.currentBookings < slot.maxBookings ? (
                            <Badge variant="default" className="text-xs">Open</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Full</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(slot.id)}
                            data-testid={`button-delete-slot-${slot.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function TimeSlotForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [maxBookings, setMaxBookings] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ date, startTime, endTime, maxBookings: parseInt(maxBookings) || 1 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          data-testid="input-slot-date"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start">Start Time</Label>
          <Input
            id="start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            data-testid="input-slot-start"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End Time</Label>
          <Input
            id="end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            data-testid="input-slot-end"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="max">Max Bookings per Slot</Label>
        <Input
          id="max"
          type="number"
          min="1"
          max="20"
          value={maxBookings}
          onChange={(e) => setMaxBookings(e.target.value)}
          data-testid="input-slot-max"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending || !date} data-testid="button-submit-slot">
        {isPending ? "Creating..." : "Create Slot"}
      </Button>
    </form>
  );
}
