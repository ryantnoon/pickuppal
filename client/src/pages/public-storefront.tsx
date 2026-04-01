import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tag, Star, ImagePlus, Package, MapPin } from "lucide-react";
import type { Listing } from "@shared/schema";

export default function PublicStorefront() {
  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings/active"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="PickupPal">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <path d="M10 22V14l6-4 6 4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              <rect x="13" y="18" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
            </svg>
            <span className="font-semibold text-sm">PickupPal</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-xl font-semibold" data-testid="text-storefront-title">
            Items for Sale
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse available items and reserve a pickup time
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
            <MapPin className="w-3 h-3" />
            Contact details and pickup location provided upon booking confirmation
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && listings.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="font-medium">No items listed yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for new listings.</p>
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const images: string[] = JSON.parse(listing.images || "[]");
              return (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.id}`}
                  className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  data-testid={`card-listing-${listing.id}`}
                >
                  {/* Image */}
                  {images.length > 0 ? (
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      <img
                        src={images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                      <ImagePlus className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h2>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">
                        ${listing.price}
                      </span>
                    </div>
                    {listing.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {listing.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Tag className="w-2.5 h-2.5 mr-0.5" /> {listing.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Star className="w-2.5 h-2.5 mr-0.5" /> {listing.condition}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
