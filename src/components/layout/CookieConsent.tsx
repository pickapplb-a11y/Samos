"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Consent = { analytics: boolean; at: string };
const KEY = "vanta-consent";

export function readConsent(): Consent | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

/** Strictly-necessary cookies only by default; analytics loads only after opt-in. */
export default function CookieConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  useEffect(() => {
    setConsent(readConsent());
    const open = () => setConsent(null);
    window.addEventListener("vanta:cookie-settings", open);
    return () => window.removeEventListener("vanta:cookie-settings", open);
  }, []);
  const save = (analytics: boolean) => {
    const c = { analytics, at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(c));
    setConsent(c);
  };
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <>
      {consent?.analytics && domain && <Script src="https://plausible.io/js/script.js" data-domain={domain} strategy="afterInteractive" />}
      {consent === null && !pathname.startsWith("/render") && (
        <div role="dialog" aria-label="Cookie preferences" className="glass fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl animate-fadeUp rounded-2xl p-5 sm:bottom-6">
          <p className="text-sm text-white/80">
            We use essential cookies to keep you signed in and remember your cart. With your permission we also use privacy-friendly analytics to improve the studio.{" "}
            <Link href="/privacy#cookies" className="text-blaze underline-offset-2 hover:underline">Learn more</Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary btn-sm" onClick={() => save(true)}>Accept analytics</button>
            <button className="btn-ghost btn-sm" onClick={() => save(false)}>Essential only</button>
          </div>
        </div>
      )}
    </>
  );
}
