import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, ExternalLink, ImagePlus, Package } from "lucide-react";
import type { Listing } from "@shared/schema";

const categories = ["Electronics", "Furniture", "Vehicles", "Clothing", "Tools", "Sports", "Home", "Other"];
const conditions = ["New", "Like New", "Good", "Fair", "Used"];

export function ListingsPanel() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/listings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setOpen(false);
      toast({ title: "Listing created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/listings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setOpen(false);
      setEditingId(null);
      toast({ title: "Listing updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/listings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: "Listing deleted" });
    },
  });

  const copyLink = (id: number) => {
    const url = `${window.location.origin}${window.location.pathname}#/listing/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied to clipboard" });
    }).catch(() => {
      toast({ title: "Link", description: url });
    });
  };

  const statusColor = (s: string) => {
    if (s === "active") return "default";
    if (s === "sold") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-listings-title">Your Listings</h2>
          <p className="text-sm text-muted-foreground">{listings.length} item{listings.length !== 1 ? "s" : ""}</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-listing">
              <Plus className="w-4 h-4 mr-1" /> Add Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Listing" : "New Listing"}</DialogTitle>
            </DialogHeader>
            <ListingForm
              listing={editingId ? listings.find((l) => l.id === editingId) : undefined}
              onSubmit={(data) => {
                if (editingId) {
                  updateMutation.mutate({ id: editingId, data });
                } else {
                  createMutation.mutate({ ...data, createdAt: new Date().toISOString() });
                }
              }}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-32 bg-muted rounded-md" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium">No listings yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first item to get started</p>
            <Button size="sm" onClick={() => setOpen(true)} data-testid="button-add-first">
              <Plus className="w-4 h-4 mr-1" /> Add Listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((listing) => {
            const images: string[] = JSON.parse(listing.images || "[]");
            return (
              <Card key={listing.id} className="overflow-hidden" data-testid={`card-listing-${listing.id}`}>
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {images.length > 0 ? (
                    <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2" variant={statusColor(listing.status)}>
                    {listing.status}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate" data-testid={`text-listing-title-${listing.id}`}>
                        {listing.title}
                      </h3>
                      <p className="text-primary font-semibold text-sm">${listing.price}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => copyLink(listing.id)}
                      data-testid={`button-copy-link-${listing.id}`}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setEditingId(listing.id); setOpen(true); }}
                      data-testid={`button-edit-${listing.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(listing.id)}
                      data-testid={`button-delete-${listing.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListingForm({
  listing,
  onSubmit,
  isPending,
}: {
  listing?: Listing;
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(listing?.title || "");
  const [description, setDescription] = useState(listing?.description || "");
  const [price, setPrice] = useState(listing?.price || "");
  const [category, setCategory] = useState(listing?.category || "Other");
  const [condition, setCondition] = useState(listing?.condition || "Used");
  const [status, setStatus] = useState(listing?.status || "active");
  const [images, setImages] = useState<string[]>(JSON.parse(listing?.images || "[]"));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      price,
      category,
      condition,
      status,
      images: JSON.stringify(images),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Samsung 65 inch Smart TV"
          required
          data-testid="input-listing-title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Price ($)</Label>
        <Input
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          required
          data-testid="input-listing-price"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the item, its condition, what's included..."
          rows={3}
          required
          data-testid="input-listing-description"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger data-testid="select-condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conditions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {listing && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Photos</Label>
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-md p-0.5 text-xs"
                onClick={() => removeImage(idx)}
              >
                &times;
              </button>
            </div>
          ))}
          <label className="w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors" data-testid="button-upload-image">
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending || !title || !price} data-testid="button-submit-listing">
        {isPending ? "Saving..." : listing ? "Update Listing" : "Create Listing"}
      </Button>
    </form>
  );
}
