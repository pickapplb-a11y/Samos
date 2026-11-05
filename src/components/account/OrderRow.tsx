import Image from "next/image";
import Link from "next/link";
import { money, STATUS_LABEL } from "@/lib/format";
import ReorderButton from "./ReorderButton";

type O = { number: string; status: string; total: number; createdAt: Date; items: { name: string; previewId: string | null; quantity: number; productId: string | null; designId: string | null; size: string; colorHex: string; colorName: string; style: "OVERSIZED" | "REGULAR" | "ZIP"; unitPrice: number; design: unknown }[] };

export default function OrderRow({ o, images }: { o: O; images: Record<string, string> }) {
  return (
    <li className="card flex flex-wrap items-center gap-4 p-5">
      <div className="flex -space-x-3">
        {o.items.slice(0, 3).map((i, k) => (
          <div key={k} className="relative h-16 w-14 overflow-hidden rounded-lg border-2 border-coal bg-ink">
            {(i.previewId || (i.productId && images[i.productId])) && <Image src={i.previewId ? `/api/assets/${i.previewId}` : images[i.productId!]} alt="" fill sizes="56px" className="object-cover" unoptimized={!!i.previewId} />}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{o.number}</p>
        <p className="text-xs text-mist">{o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {money(o.total)}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${o.status === "DELIVERED" ? "bg-emerald-500/15 text-emerald-300" : o.status === "CANCELLED" ? "bg-red-500/15 text-red-300" : "bg-blaze/15 text-blaze"}`}>{STATUS_LABEL[o.status]}</span>
      <div className="flex gap-2">
        <Link href={`/orders/${o.number}`} className="btn-ghost btn-sm">Track</Link>
        <ReorderButton
          items={o.items.map((i) => ({
            kind: i.design ? "custom" : "product",
            productId: i.productId ?? undefined,
            designId: (i.design as { designId?: string } | null)?.designId,
            revision: (i.design as { revision?: number } | null)?.revision,
            name: i.name,
            image: i.previewId ? `/api/assets/${i.previewId}` : (i.productId && images[i.productId]) || "/products/placeholder.svg",
            style: i.style,
            colorName: i.colorName,
            colorHex: i.colorHex,
            size: i.size,
            qty: i.quantity,
            unitPrice: i.unitPrice,
          }))}
        />
      </div>
    </li>
  );
}
