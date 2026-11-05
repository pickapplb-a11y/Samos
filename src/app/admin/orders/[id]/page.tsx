import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, STATUS_FLOW, STATUS_LABEL } from "@/lib/format";
import { STYLE_LABELS, UNITS_PER_INCH, type ZoneId } from "@/lib/design/zones";
import type { Layer } from "@/lib/design/schema";
import { updateOrderStatus, setPaymentStatus } from "@/app/actions/admin";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import DesignViewer from "@/components/admin/DesignViewer";

type Snapshot = { designId: string; revision: number; name: string; style: "OVERSIZED" | "REGULAR" | "ZIP"; colorHex: string; colorName: string; layers: Layer[]; zones: Record<string, { label: string; widthIn: number; heightIn: number }>; priceLines: { label: string; amount: number }[] };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: "desc" } }, user: { select: { name: true, email: true } } } });
  if (!o) notFound();
  const ship = o.shipping as Record<string, string>;
  const idx = STATUS_FLOW.indexOf(o.status as (typeof STATUS_FLOW)[number]);
  const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  const assetIds = o.items.flatMap((i) => [...Object.values((i.printFiles ?? {}) as Record<string, string>), ...((i.design as Snapshot | null)?.layers ?? []).filter((l) => l.type === "image").map((l) => (l as Extract<Layer, { type: "image" }>).assetId)]);
  const assets = Object.fromEntries((await db.asset.findMany({ where: { id: { in: assetIds } } })).map((a) => [a.id, a]));
  const inch = (v: number) => (v / UNITS_PER_INCH).toFixed(2) + "″";

  return (
    <div>
      <Link href="/admin/orders" className="text-xs text-mist hover:text-white">← All orders</Link>
      <PageTitle title={o.number} sub={`Placed ${o.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`}>
        <div className="flex items-center gap-2"><StatusBadge s={o.status} /><a className="btn-accent btn-sm" href={`/api/admin/orders/${o.id}/artwork`}>Download all artwork (ZIP)</a></div>
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {o.items.map((it) => {
            const d = it.design as Snapshot | null;
            const prints = (it.printFiles ?? {}) as Record<string, string>;
            return (
              <section key={it.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{it.name} {d && <span className="ml-1 rounded bg-blaze/15 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase text-blaze">Custom</span>}</h2>
                    <p className="mt-1 text-sm text-mist">{STYLE_LABELS[it.style]} · {it.colorName} <span className="inline-block h-3 w-3 rounded-full border border-white/20 align-middle" style={{ background: it.colorHex }} /> {it.colorHex} · Size <b className="text-white">{it.size}</b> · Qty <b className="text-white">{it.quantity}</b></p>
                  </div>
                  <p className="tabular-nums">{money(it.unitPrice)} × {it.quantity}</p>
                </div>
                {d && (
                  <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="aspect-square overflow-hidden rounded-2xl bg-ink"><DesignViewer style={d.style} color={d.colorHex} layers={d.layers} /></div>
                    <div className="min-w-0 space-y-5">
                      <div>
                        <p className="label">Print-ready files · 300 DPI PNG · revision {d.revision}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(prints).map(([zone, aid]) => {
                            const a = assets[aid];
                            const spec = d.zones[zone];
                            return (
                              <a key={zone} href={`/api/assets/${aid}?download=${o.number}-${it.id.slice(-4)}-${zone}.png`} className="group block rounded-xl border border-white/10 p-2 transition hover:border-blaze">
                                <div className="relative aspect-square rounded-lg bg-[repeating-conic-gradient(#222_0_25%,#181818_0_50%)] bg-[length:14px_14px]" style={{ backgroundColor: it.colorHex }}>
                                  <Image src={`/api/assets/${aid}`} alt={`${zone} print file`} fill sizes="200px" className="object-contain p-1" unoptimized />
                                </div>
                                <p className="mt-2 text-xs font-semibold">{spec?.label ?? zone} <span className="font-normal text-mist">{spec?.widthIn}″×{spec?.heightIn}″</span></p>
                                <p className="text-[10px] text-mist">{a?.width}×{a?.height}px · {((a?.size ?? 0) / 1024 / 1024).toFixed(1)} MB · ⬇ download</p>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                      <details className="rounded-xl border border-white/10 p-3 text-xs">
                        <summary className="cursor-pointer font-semibold">Layer specification ({d.layers.length})</summary>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[520px]">
                            <thead className="text-left text-mist"><tr><th>Zone</th><th>Element</th><th>Centre (x, y)</th><th>Size</th><th>Rot.</th><th>Source</th></tr></thead>
                            <tbody className="divide-y divide-white/5">
                              {d.layers.map((l) => (
                                <tr key={l.id} className={l.visible === false ? "opacity-40" : ""}>
                                  <td className="py-1.5">{d.zones[l.zone]?.label ?? l.zone}</td>
                                  <td>{l.type === "text" ? <>“{l.text}” <span className="text-mist">{l.fontFamily} · {l.color}{l.strokeWidth ? ` · outline ${l.strokeColor}` : ""}</span></> : l.name || "Image"}</td>
                                  <td className="tabular-nums">{inch(l.x)}, {inch(l.y)}</td>
                                  <td className="tabular-nums">{inch(l.width)} × {inch(l.height)}</td>
                                  <td className="tabular-nums">{Math.round(l.rotation)}°</td>
                                  <td>{l.type === "image" && assets[l.assetId] ? <a className="text-blaze" href={`/api/assets/${l.assetId}?download=source-${l.id}.${assets[l.assetId].mime.split("/")[1].replace("svg+xml", "svg").replace("jpeg", "jpg")}`}>original ⬇</a> : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                      <p className="text-[11px] text-mist">Coordinates are measured from the top-left of each print area. Zones: {Object.keys(prints).map((z) => d.zones[z as ZoneId]?.label ?? z).join(", ")}.</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold">Production status</h2>
            {next && (
              <form action={updateOrderStatus} className="mt-4">
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={next} />
                <button className="btn-accent btn-sm w-full">Advance to {STATUS_LABEL[next]} →</button>
              </form>
            )}
            <form action={updateOrderStatus} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={o.id} />
              <select name="status" defaultValue={o.status} className="input h-10" aria-label="Set status">{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-coal">{v}</option>)}</select>
              <input name="note" placeholder="Note (optional, e.g. tracking number)" maxLength={300} className="input h-10" />
              <button className="btn-ghost btn-sm w-full">Update status</button>
            </form>
            <ol className="mt-5 space-y-3 border-t border-white/[0.07] pt-4 text-xs">
              {o.events.map((e) => <li key={e.id}><StatusBadge s={e.status} /> <span className="text-mist">{e.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })} · {e.actor}</span>{e.note && <p className="mt-1 text-white/70">{e.note}</p>}</li>)}
            </ol>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="text-sm font-semibold">Payment</h2>
            <p className="mt-2">{o.paymentMethod === "COD" ? "Cash on delivery" : "Card (Stripe)"} · <b>{o.paymentStatus}</b></p>
            <form action={setPaymentStatus} className="mt-3 flex gap-2"><input type="hidden" name="id" value={o.id} /><select name="paymentStatus" defaultValue={o.paymentStatus} className="input h-9" aria-label="Payment status">{["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"].map((s) => <option key={s} className="bg-coal">{s}</option>)}</select><button className="btn-ghost btn-sm">Set</button></form>
            <dl className="mt-4 space-y-1 border-t border-white/[0.07] pt-3">
              <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-mist">Discount ({o.discountCode})</dt><dd>−{money(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-mist">Delivery ({o.deliveryMethod})</dt><dd>{money(o.deliveryFee)}</dd></div>
              {o.codFee > 0 && <div className="flex justify-between"><dt className="text-mist">COD fee</dt><dd>{money(o.codFee)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{money(o.total)}</dd></div>
            </dl>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="text-sm font-semibold">Customer & delivery</h2>
            <p className="mt-2">{o.user ? <>{o.user.name} <span className="text-mist">(account)</span></> : <span className="text-mist">Guest checkout</span>}<br /><a className="text-blaze" href={`mailto:${o.email}`}>{o.email}</a><br />{o.phone}</p>
            <p className="mt-3 text-white/80">{ship.fullName}<br />{ship.line1}{ship.line2 && <>, {ship.line2}</>}<br />{ship.city}{ship.region && `, ${ship.region}`} {ship.postalCode}<br />{ship.country}</p>
            {o.notes && <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs">“{o.notes}”</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
