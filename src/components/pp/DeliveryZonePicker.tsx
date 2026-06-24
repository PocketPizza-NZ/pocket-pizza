"use client";

import { useEffect, useState, useRef } from "react";
import { useZone, STORE_LOCATION, type DeliveryLocation } from "@/lib/zone-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, MapPin, Loader2, Search, AlertCircle, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = DeliveryLocation;

export function DeliveryZonePicker({ variant = "header" }: { variant?: "header" | "inline" }) {
  const { location, setLocation } = useZone();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setResults(data.results ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Try browser geolocation
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Reverse-geocode using Nominatim/Google (we just send coords as the query)
        try {
          const { lat, lng } = pos.coords;
          const url = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            ? `/api/geocode?q=${lat},${lng}`
            : `/api/geocode?q=${lat},${lng}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.results?.length) {
            setResults(data.results);
            setQuery(data.results[0].addressLine);
          }
        } catch {
          setError("Couldn't fetch your address");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const pick = (r: Result) => {
    setLocation(r);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const label = location
    ? location.addressLine.length > 28
      ? location.addressLine.slice(0, 28) + "…"
      : location.addressLine
    : "Delivery address";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant === "header" ? "ghost" : "outline"}
          size="sm"
          className={cn(
            "h-9 gap-2 font-medium",
            variant === "header" && "text-foreground hover:bg-secondary/60"
          )}
          aria-label="Set delivery address"
        >
          <MapPin className="h-4 w-4 text-primary" />
          <span className="max-w-[160px] truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={variant === "header" ? "start" : "center"}
        className="w-[360px] p-0"
      >
        {/* Search input */}
        <div className="border-b p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Where to deliver?
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any address in New Zealand"
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <button
              onClick={useMyLocation}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <Navigation className="h-3 w-3" /> Use my current location
            </button>
            <span className="text-[10px] text-muted-foreground">Powered by Google Maps</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!error && !loading && query.trim().length < 3 && (
            <div className="p-3 text-xs text-muted-foreground">
              Start typing an address — anywhere in Auckland, NZ, or worldwide. We&apos;ll
              auto-calculate the delivery fee based on distance from our New Windsor
              kitchen.
            </div>
          )}

          {!error && results.length === 0 && !loading && query.trim().length >= 3 && (
            <div className="p-3 text-xs text-muted-foreground">
              No matches. Try a street name, suburb, postcode, or city.
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.lat},${r.lng},${i}`}
              onClick={() => pick(r)}
              className={cn(
                "flex w-full items-start gap-2.5 border-b border-border/50 px-3 py-2.5 text-left transition last:border-0 hover:bg-secondary/40",
                !r.isDeliverable && "opacity-70"
              )}
            >
              <MapPin
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  r.isDeliverable ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{r.addressLine}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {[r.city, r.region, r.postcode, r.country].filter(Boolean).join(", ")}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-foreground/80">
                    {r.distanceKm.toFixed(1)} km away
                  </span>
                  {r.isDeliverable ? (
                    <>
                      <span className="font-bold text-primary">
                        · ${r.deliveryFee.toFixed(2)} delivery
                      </span>
                      <span className="text-muted-foreground">· ~{r.estimatedMins} min</span>
                    </>
                  ) : (
                    <span className="font-medium text-destructive">
                      · Pickup only (outside {r.reason?.match(/\d+/)?.[0]}km)
                    </span>
                  )}
                </div>
              </div>
              {location?.lat === r.lat && location?.lng === r.lng && (
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t bg-secondary/30 p-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Store: 210 New Windsor Rd · delivers within 30km
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Google Maps Embed (keyless iframe) ───────────────────────────
export function MapEmbed({
  lat,
  lng,
  label,
  height = 180,
}: {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
}) {
  const q = encodeURIComponent(label ? `${label}@${lat},${lng}` : `${lat},${lng}`);
  const src = `https://maps.google.com/maps?q=${q}&z=15&output=embed&hl=en`;
  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{ height }}
    >
      <iframe
        title="Delivery location map"
        src={src}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

// Store location embed (used on homepage / about)
export function StoreMapEmbed({ height = 200 }: { height?: number }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(
    STORE_LOCATION.address
  )}&z=15&output=embed&hl=en`;
  return (
    <div
      className="overflow-hidden rounded-2xl border-2 border-ink"
      style={{ height }}
    >
      <iframe
        title="Pocket Pizza store location"
        src={src}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
