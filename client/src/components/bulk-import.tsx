import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Loader2, Check, X, ImagePlus, ScanSearch, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";

const categories = ["Electronics", "Furniture", "Vehicles", "Clothing", "Tools", "Sports", "Home", "Other"];
const conditions = ["New", "Like New", "Good", "Fair", "Used"];

interface ExtractedListing {
  title: string;
  price: string;
  description: string;
  category: string;
  condition: string;
  screenshotPreview?: string;
  photos: string[];
  error?: string;
}

type ImportStep = "upload" | "review" | "done";

export function BulkImport({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [listings, setListings] = useState<ExtractedListing[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const { toast } = useToast();

  // Extract listings from screenshots using AI vision
  const extractMutation = useMutation({
    mutationFn: async (screenshotData: string[]) => {
      const res = await apiRequest("POST", "/api/import/extract", { screenshots: screenshotData });
      return res.json();
    },
    onSuccess: (data) => {
      const extracted: ExtractedListing[] = data.listings.map((l: any, i: number) => ({
        title: l.title || "Untitled",
        price: l.price || "0",
        description: l.description || "",
        category: categories.includes(l.category) ? l.category : "Other",
        condition: conditions.includes(l.condition) ? l.condition : "Used",
        screenshotPreview: screenshotPreviews[i],
        photos: [],
        error: l.error,
      }));
      setListings(extracted);
      setStep("review");
    },
    onError: (err: Error) => {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    },
  });

  // Save all listings
  const saveMutation = useMutation({
    mutationFn: async (items: ExtractedListing[]) => {
      const results = [];
      for (const item of items) {
        const res = await apiRequest("POST", "/api/listings", {
          title: item.title,
          price: item.price,
          description: item.description,
          category: item.category,
          condition: item.condition,
          status: "active",
          images: JSON.stringify(item.photos),
          createdAt: new Date().toISOString(),
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: `${results.length} listing${results.length !== 1 ? "s" : ""} imported` });
      setStep("done");
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setScreenshots((prev) => [...prev, dataUri]);
        setScreenshotPreviews((prev) => [...prev, dataUri]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (idx: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePhotoUpload = (listingIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setListings((prev) =>
          prev.map((l, i) =>
            i === listingIdx ? { ...l, photos: [...l.photos, reader.result as string] } : l
          )
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (listingIdx: number, photoIdx: number) => {
    setListings((prev) =>
      prev.map((l, i) =>
        i === listingIdx ? { ...l, photos: l.photos.filter((_, j) => j !== photoIdx) } : l
      )
    );
  };

  const updateListing = (idx: number, field: string, value: string) => {
    setListings((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  const removeListing = (idx: number) => {
    setListings((prev) => prev.filter((_, i) => i !== idx));
  };

  // STEP 1: Upload screenshots
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm">Bulk Import from Screenshots</h3>
          <p className="text-xs text-muted-foreground">
            Upload screenshots of your Facebook Marketplace listings. AI will extract the title, price, description, and other details automatically.
          </p>
        </div>

        {/* Upload area */}
        <label
          className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors"
          data-testid="upload-screenshots"
        >
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm font-medium">Upload Screenshots</span>
          <span className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP — multiple files OK</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleScreenshotUpload}
          />
        </label>

        {/* Preview uploaded screenshots */}
        {screenshots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""} uploaded
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {screenshotPreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                    onClick={() => removeScreenshot(idx)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={screenshots.length === 0 || extractMutation.isPending}
            onClick={() => extractMutation.mutate(screenshots)}
            data-testid="button-extract"
          >
            {extractMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Analyzing {screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <ScanSearch className="w-4 h-4 mr-1.5" />
                Extract Listing Details
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // STEP 2: Review and edit extracted listings + add photos
  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm">Review Imported Listings</h3>
          <p className="text-xs text-muted-foreground">
            Edit any details below, add item photos, then save. {listings.length} listing{listings.length !== 1 ? "s" : ""} extracted.
          </p>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {listings.map((listing, idx) => (
            <Card key={idx} className="overflow-hidden" data-testid={`import-listing-${idx}`}>
              <CardContent className="p-0">
                {/* Collapsed header */}
                <button
                  type="button"
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  {listing.screenshotPreview && (
                    <img
                      src={listing.screenshotPreview}
                      alt=""
                      className="w-10 h-12 rounded object-cover border flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{listing.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-primary font-semibold">${listing.price}</span>
                      <span>{listing.category}</span>
                      <span>{listing.condition}</span>
                      {listing.photos.length > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {listing.photos.length} photo{listing.photos.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeListing(idx); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {expandedIdx === idx ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded edit form */}
                {expandedIdx === idx && (
                  <div className="px-3 pb-3 space-y-3 border-t">
                    {listing.error && (
                      <p className="text-xs text-destructive mt-2">Extraction issue: {listing.error}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={listing.title}
                          onChange={(e) => updateListing(idx, "title", e.target.value)}
                          className="h-8 text-sm"
                          data-testid={`input-import-title-${idx}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Price ($)</Label>
                        <Input
                          value={listing.price}
                          onChange={(e) => updateListing(idx, "price", e.target.value)}
                          className="h-8 text-sm"
                          data-testid={`input-import-price-${idx}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Category</Label>
                        <Select value={listing.category} onValueChange={(v) => updateListing(idx, "category", v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Condition</Label>
                        <Select value={listing.condition} onValueChange={(v) => updateListing(idx, "condition", v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditions.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={listing.description}
                          onChange={(e) => updateListing(idx, "description", e.target.value)}
                          rows={2}
                          className="text-sm"
                          data-testid={`input-import-desc-${idx}`}
                        />
                      </div>
                    </div>

                    {/* Photo upload for this listing */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Item Photos</Label>
                      <div className="flex flex-wrap gap-2">
                        {listing.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="relative w-14 h-14 rounded-md overflow-hidden border">
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-md p-0.5 text-[10px]"
                              onClick={() => removePhoto(idx, pIdx)}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <label className="w-14 h-14 rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
                          <ImagePlus className="w-4 h-4 text-muted-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(idx, e)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">All listings removed.</p>
            <Button variant="outline" className="mt-2" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setStep("upload"); setListings([]); }}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(listings)}
              data-testid="button-save-imports"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Save {listings.length} Listing{listings.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // STEP 3: Done
  return (
    <div className="text-center space-y-4 py-6">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Check className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="font-medium">Import Complete</p>
        <p className="text-sm text-muted-foreground">Your listings are now live on the storefront.</p>
      </div>
      <Button onClick={onClose} data-testid="button-import-done">
        Done
      </Button>
    </div>
  );
}
