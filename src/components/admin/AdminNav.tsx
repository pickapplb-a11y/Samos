"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const L = [["/admin", "Analytics"], ["/admin/orders", "Orders"], ["/admin/products", "Products & inventory"], ["/admin/settings", "Pricing"], ["/admin/discounts", "Discount codes"], ["/admin/collections", "Homepage collections"], ["/admin/inbox", "Inbox"]];
export default function AdminNav() {
  const p = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
      {L.map(([h, l]) => {
        const on = h === "/admin" ? p === h : p.startsWith(h);
        return <Link key={h} href={h} aria-current={on ? "page" : undefined} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-sm transition", on ? "bg-white text-ink" : "text-white/70 hover:bg-white/5 hover:text-white")}>{l}</Link>;
      })}
    </nav>
  );
}
