import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  STORE_LOCATION,
  haversineKm,
  computeDelivery,
  toStoreConfig,
} from "@/lib/delivery";
import { db } from "@/lib/db";

/**
 * Geocode an address query into lat/lng + structured address.
 *
 * Strategy:
 *  1. If GOOGLE_MAPS_API_KEY is set in env, use Google Maps Geocoding API
 *     (production-ready, higher accuracy, supports worldwide addresses).
 *  2. Otherwise, fall back to OpenStreetMap Nominatim (free, no key required,
 *     rate-limited to ~1 req/sec — fine for demo).
 *
 * Either way we compute haversine distance from the store and a dynamic
 * delivery fee based on the radius rules in zone-store.ts.
 */

const Query = z.object({
  q: z.string().min(3, "Type at least 3 characters"),
});

type GeoResult = {
  address: string;
  addressLine: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  lat: number;
  lng: number;
};

async function geocodeGoogle(q: string, apiKey: string): Promise<GeoResult[]> {
  // Restricted to New Zealand via components=country:NZ + region=nz bias.
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    q
  )}&key=${apiKey}&region=nz&components=country:NZ`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google geocode HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google geocode status: ${data.status} — ${data.error_message ?? ""}`);
  }
  return (data.results ?? []).map((r: any) => {
    const parts: Record<string, string> = {};
    for (const c of r.address_components ?? []) {
      for (const t of c.types ?? []) parts[t] = c.long_name;
    }
    return {
      address: r.formatted_address,
      addressLine: [parts.street_number, parts.route].filter(Boolean).join(" ").trim() || r.formatted_address,
      city: parts.locality || parts.postal_town || parts.sublocality,
      region: parts.administrative_area_level_1,
      postcode: parts.postal_code,
      country: parts.country,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    };
  });
}

async function geocodeNominatim(q: string): Promise<GeoResult[]> {
  // Restricted to New Zealand (countrycodes=nz) — faster, cleaner UX.
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    q
  )}&addressdetails=1&limit=6&countrycodes=nz`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PocketPizzaNZ/1.0 (pocketpizzanz@gmail.com)",
      "Accept-Language": "en-NZ",
    },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data: any[] = await res.json();
  return data.map((r) => {
    const a = r.address ?? {};
    const addressLine = [a.house_number, a.road].filter(Boolean).join(" ").trim();
    return {
      address: r.display_name,
      addressLine: addressLine || r.display_name.split(",")[0],
      city: a.city || a.town || a.village || a.suburb || a.hamlet,
      region: a.state,
      postcode: a.postcode,
      country: a.country,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    };
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = Query.safeParse({ q });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  let results: GeoResult[] = [];
  let provider = "nominatim";
  let error: string | undefined;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      results = await geocodeGoogle(q, googleKey);
      provider = "google";
    } catch (e: any) {
      error = e.message;
      console.warn("Google geocode failed, falling back to Nominatim:", error);
      try {
        results = await geocodeNominatim(q);
      } catch (e2: any) {
        return NextResponse.json(
          { error: "All geocoders failed", google: error, nominatim: e2.message },
          { status: 502 }
        );
      }
    }
  } else {
    try {
      results = await geocodeNominatim(q);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  }

  // Load live store settings (admin-editable)
  const settings = await db.storeSettings.findUnique({ where: { id: "default" } });
  const cfg = settings ? toStoreConfig(settings) : null;
  const storeLat = cfg?.shopLat ?? STORE_LOCATION.lat;
  const storeLng = cfg?.shopLng ?? STORE_LOCATION.lng;
  const storeAddress = cfg?.shopAddress ?? STORE_LOCATION.address;
  const storeName = cfg?.shopName ?? STORE_LOCATION.name;
  const rules = cfg
    ? {
        baseFee: cfg.baseFee,
        perKmAfter: cfg.perKmAfter,
        freeRadiusKm: cfg.freeRadiusKm,
        maxRadiusKm: cfg.maxRadiusKm,
        estimatedMinsBase: cfg.estimatedMinsBase,
        estimatedMinsPerKm: cfg.estimatedMinsPerKm,
      }
    : {};

  // Annotate with delivery fee, ETA, distance from store
  const annotated = results.map((r) => {
    const distanceKm = haversineKm(storeLat, storeLng, r.lat, r.lng);
    const delivery = computeDelivery(distanceKm, rules);
    return {
      ...r,
      distanceKm: Math.round(distanceKm * 10) / 10,
      deliveryFee: delivery.fee,
      estimatedMins: delivery.mins,
      isDeliverable: delivery.isDeliverable,
      reason: delivery.reason,
    };
  });

  return NextResponse.json({
    results: annotated,
    provider,
    store: { name: storeName, address: storeAddress, lat: storeLat, lng: storeLng },
  });
}
