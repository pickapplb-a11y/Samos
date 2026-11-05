"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/store";
import CartDrawer from "@/components/cart/CartDrawer";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/studio", label: "Design Studio" },
  { href: "/shop?category=essentials", label: "Essentials" },
  { href: "/faq", label: "Help" },
];

export default function Header({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const setOpen = useCart((s) => s.setOpen);

  useEffect(() => {
    setMounted(true);
    const f = () => setScrolled(window.scrollY > 12);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => setMenu(false), [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/render")) return null;
  const studio = pathname.startsWith("/studio");

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled || studio || menu ? "bg-ink/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent",
        )}
      >
        <div className="container-x flex h-16 items-center justify-between gap-6">
          <Link href="/" className="font-display text-2xl tracking-[0.12em]" aria-label="VANTA home">
            VANTA<span className="text-blaze">.</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn("link-u text-[13px] font-medium tracking-wide text-white/70 hover:text-white", pathname === n.href && "text-white")}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/shop?focus=search" aria-label="Search products" className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/5 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </Link>
            <Link href={user ? (user.role === "ADMIN" ? "/admin" : "/account") : "/account/login"} aria-label={user ? "Your account" : "Sign in"} className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/5 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            </Link>
            <button onClick={() => setOpen(true)} aria-label={`Open cart, ${mounted ? count : 0} items`} className="relative grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/5 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
              {mounted && count > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-blaze px-1 text-[10px] font-bold text-ink">{count}</span>}
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-full md:hidden" aria-expanded={menu} aria-controls="mobile-nav" aria-label="Menu" onClick={() => setMenu((m) => !m)}>
              <span className="relative block h-3 w-5">
                <span className={cn("absolute left-0 top-0 h-px w-5 bg-white transition", menu && "top-1.5 rotate-45")} />
                <span className={cn("absolute bottom-0 left-0 h-px w-5 bg-white transition", menu && "bottom-1.5 -rotate-45")} />
              </span>
            </button>
          </div>
        </div>
        {menu && (
          <nav id="mobile-nav" aria-label="Mobile" className="container-x animate-fadeUp pb-8 pt-4 md:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block border-b border-white/[0.06] py-4 font-display text-3xl uppercase">
                {n.label}
              </Link>
            ))}
            <Link href="/studio" className="btn-accent mt-6 w-full">Start designing</Link>
          </nav>
        )}
      </header>
      {!studio && <div className="h-0" />}
      <CartDrawer />
    </>
  );
}
