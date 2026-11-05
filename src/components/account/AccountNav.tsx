"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const L = [["/account", "Overview"], ["/account/orders", "Orders"], ["/account/designs", "Saved designs"], ["/account/addresses", "Addresses"]];
export default function AccountNav() {
  const p = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto lg:flex-col">
      {L.map(([h, l]) => (
        <Link key={h} href={h} aria-current={p === h ? "page" : undefined} className={cn("whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition", p === h ? "bg-white text-ink" : "text-white/70 hover:bg-white/5 hover:text-white")}>{l}</Link>
      ))}
    </nav>
  );
}
