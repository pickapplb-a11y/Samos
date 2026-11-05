"use client";
import { useEffect } from "react";
import { useCart } from "@/components/cart/store";
export default function ClearCartOnPaid() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
