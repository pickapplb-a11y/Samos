"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const views = ["Front", "Back", "Side"];
  return (
    <div className="grid gap-3 md:grid-cols-[76px_1fr]">
      <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col" role="tablist" aria-label="Product images">
        {images.map((src, k) => (
          <button key={src} role="tab" aria-selected={i === k} onClick={() => setI(k)} className={`relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl bg-coal transition md:w-full ${i === k ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"}`}>
            <Image src={src} alt={`${name} — ${views[k % 3]} view`} fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
      <div
        className="relative order-1 aspect-[4/5] cursor-zoom-in overflow-hidden rounded-3xl bg-coal md:order-2"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          src={images[i] ?? "/products/placeholder.svg"}
          alt={`${name} — ${views[i % 3]} view`}
          fill
          priority
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-300"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
    </div>
  );
}
