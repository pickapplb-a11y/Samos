"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  key: string;
  kind: "product" | "custom";
  productId?: string;
  slug?: string;
  designId?: string;
  revision?: number;
  name: string;
  image: string;
  style: "OVERSIZED" | "REGULAR" | "ZIP";
  colorName: string;
  colorHex: string;
  size: string;
  qty: number;
  /** display estimate only; the server re-prices everything at checkout */
  unitPrice: number;
}

interface CartState {
  items: CartItem[];
  open: boolean;
  add(item: Omit<CartItem, "key">): void;
  setQty(key: string, qty: number): void;
  remove(key: string): void;
  clear(): void;
  setOpen(o: boolean): void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item) =>
        set((s) => {
          const same = s.items.find(
            (i) => i.kind === item.kind && i.productId === item.productId && i.designId === item.designId && i.revision === item.revision && i.size === item.size && i.colorHex === item.colorHex,
          );
          if (same) return { items: s.items.map((i) => (i === same ? { ...i, qty: Math.min(20, i.qty + item.qty) } : i)), open: true };
          return { items: [...s.items, { ...item, key: Math.random().toString(36).slice(2) }], open: true };
        }),
      setQty: (key, qty) => set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "vanta-cart", partialize: (s) => ({ items: s.items }) },
  ),
);
