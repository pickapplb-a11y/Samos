"use client";

import { useCart, type CartItem } from "@/components/cart/store";

/** Re-adds the exact items (including the same design revision) — the server re-validates and re-prices at checkout. */
export default function ReorderButton({ items }: { items: Omit<CartItem, "key">[] }) {
  const add = useCart((s) => s.add);
  return <button className="btn-primary btn-sm" onClick={() => items.forEach((i) => add(i))}>Reorder</button>;
}
