"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  STORE_LOCATION,
  DELIVERY_RULES,
  haversineKm,
  computeDelivery,
} from "./delivery";

// Re-export for backwards compat (other components import from zone-store)
export { STORE_LOCATION, DELIVERY_RULES, haversineKm, computeDelivery };

export type DeliveryLocation = {
  // Full address as returned by geocoder
  address: string;
  addressLine: string; // first line, e.g. "12 Sample Street"
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  lat: number;
  lng: number;
  // Computed at selection time
  distanceKm: number; // haversine distance from store
  deliveryFee: number; // NZD
  estimatedMins: number;
  isDeliverable: boolean; // false if outside max radius
  reason?: string; // why not deliverable
};

type LocationState = {
  location: DeliveryLocation | null;
  setLocation: (l: DeliveryLocation | null) => void;
};

export const useZone = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (l) => set({ location: l }),
    }),
    { name: "pp-zone-v1" }
  )
);
