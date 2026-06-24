"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Extra = {
  id: string;
  name: string;
  price: number;
};

export type CartLine = {
  key: string; // unique line key (id + extras hash)
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  extras: Extra[];
  emoji?: string;
  color?: [string, string];
  image?: string;
  rating?: string | null;
  spicy?: boolean;
};

export type CustomerInfo = {
  fullName: string;
  mobile: string;
  email: string;
  deliveryAddress: string;
  deliveryNotes?: string;
};

type CartState = {
  lines: CartLine[];
  customer: CustomerInfo;
  openCart: boolean;
  openProduct: null | {
    menuItemId: string;
    name: string;
    description: string;
    longDescription?: string | null;
    basePrice: number;
    emoji?: string;
    color?: [string, string];
    image?: string;
    rating?: string | null;
    spicy?: boolean;
    extras: Extra[];
  };
  lastOrderRef: string | null;

  addLine: (line: Omit<CartLine, "key">) => void;
  removeLine: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;

  setCustomer: (c: Partial<CustomerInfo>) => void;
  setOpenCart: (b: boolean) => void;
  setOpenProduct: (p: CartState["openProduct"]) => void;
  setLastOrderRef: (ref: string | null) => void;
};

function extrasKey(extras: Extra[]) {
  if (!extras.length) return "0";
  return extras
    .map((e) => e.id)
    .sort()
    .join(",");
}

function lineTotal(line: CartLine) {
  const extrasSum = line.extras.reduce((s, e) => s + e.price, 0);
  return (line.basePrice + extrasSum) * line.quantity;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      customer: {} as CustomerInfo,
      openCart: false,
      openProduct: null,
      lastOrderRef: null,

      addLine: (line) => {
        const key = `${line.menuItemId}|${extrasKey(line.extras)}`;
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l
            ),
            openCart: true,
          });
        } else {
          set({ lines: [...get().lines, { ...line, key }], openCart: true });
        }
      },
      removeLine: (key) =>
        set({ lines: get().lines.filter((l) => l.key !== key) }),
      setQty: (key, qty) => {
        if (qty <= 0) {
          set({ lines: get().lines.filter((l) => l.key !== key) });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.key === key ? { ...l, quantity: qty } : l
          ),
        });
      },
      clear: () => set({ lines: [], lastOrderRef: null }),
      subtotal: () => get().lines.reduce((s, l) => s + lineTotal(l), 0),
      count: () => get().lines.reduce((s, l) => s + l.quantity, 0),

      setCustomer: (c) => set({ customer: { ...get().customer, ...c } }),
      setOpenCart: (b) => set({ openCart: b }),
      setOpenProduct: (p) => set({ openProduct: p }),
      setLastOrderRef: (ref) => set({ lastOrderRef: ref }),
    }),
    {
      name: "pp-cart-v1",
      partialize: (s) => ({
        lines: s.lines,
        customer: s.customer,
        lastOrderRef: s.lastOrderRef,
      }),
    }
  )
);

export const lineTotalOf = lineTotal;
