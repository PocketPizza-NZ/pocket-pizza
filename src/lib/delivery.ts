// Shared (isomorphic) helpers — no React, no client-only code.
// Safe to import from both server routes and client components.

// ─── Default store location & delivery rules ───
// These are the fallbacks used when the DB row isn't available (e.g. during
// build). At runtime the live values from StoreSettings (admin-editable)
// take precedence — see getStoreConfig() below.
export const STORE_LOCATION = {
  name: "Pocket Pizza NZ",
  address: "210 New Windsor Road, New Windsor, Auckland, New Zealand",
  lat: -36.8852,
  lng: 174.7177,
};

export const DELIVERY_RULES = {
  baseFee: 4.0,
  perKmAfter: 1.5,
  freeRadiusKm: 5,
  maxRadiusKm: 30,
  estimatedMinsBase: 20,
  estimatedMinsPerKm: 1.2,
};

export type StoreConfig = {
  shopName: string;
  shopAddress: string;
  shopLat: number;
  shopLng: number;
  openingHours: Record<string, string>;
  baseFee: number;
  perKmAfter: number;
  freeRadiusKm: number;
  maxRadiusKm: number;
  estimatedMinsBase: number;
  estimatedMinsPerKm: number;
};

import type { StoreSettings } from "@prisma/client";

// Convert a DB StoreSettings row into a clean config object
export function toStoreConfig(s: StoreSettings): StoreConfig {
  let hours: Record<string, string> = {};
  try {
    hours = JSON.parse(s.openingHours);
  } catch {
    hours = {};
  }
  return {
    shopName: s.shopName,
    shopAddress: s.shopAddress,
    shopLat: s.shopLat,
    shopLng: s.shopLng,
    openingHours: hours,
    baseFee: s.baseFee,
    perKmAfter: s.perKmAfter,
    freeRadiusKm: s.freeRadiusKm,
    maxRadiusKm: s.maxRadiusKm,
    estimatedMinsBase: s.estimatedMinsBase,
    estimatedMinsPerKm: s.estimatedMinsPerKm,
  };
}

// Haversine distance in km
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute delivery fee + ETA + deliverability from a customer location,
// optionally using live admin-configured rules.
export function computeDelivery(
  distanceKm: number,
  rules: {
    baseFee?: number;
    perKmAfter?: number;
    freeRadiusKm?: number;
    maxRadiusKm?: number;
    estimatedMinsBase?: number;
    estimatedMinsPerKm?: number;
  } = {}
): {
  fee: number;
  mins: number;
  isDeliverable: boolean;
  reason?: string;
} {
  const r = { ...DELIVERY_RULES, ...rules };
  if (distanceKm > r.maxRadiusKm) {
    return {
      fee: 0,
      mins: 0,
      isDeliverable: false,
      reason: `Outside ${r.maxRadiusKm}km delivery radius — pickup only`,
    };
  }
  const extraKm = Math.max(0, distanceKm - r.freeRadiusKm);
  const fee = r.baseFee + extraKm * r.perKmAfter;
  const mins = Math.round(
    r.estimatedMinsBase + distanceKm * r.estimatedMinsPerKm
  );
  return { fee: Math.round(fee * 100) / 100, mins, isDeliverable: true };
}
