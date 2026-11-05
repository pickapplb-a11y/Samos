import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteDesign } from "@/app/actions/account";
import { STYLE_LABELS } from "@/lib/design/zones";

export default async function Designs() {
  const u = await requireUser("/account/designs");
  const designs = await db.design.findMany({ where: { userId: u.id, isPublic: false }, orderBy: { updatedAt: "desc" } });
  return (
    <section>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Saved designs</h2><Link href="/studio" className="btn-accent btn-sm">New design</Link></div>
      {!designs.length && <p className="text-sm text-mist">No saved designs yet. Designs you save in the studio appear here.</p>}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {designs.map((d) => (
          <li key={d.id} className="card overflow-hidden">
            <div className="relative aspect-square bg-ink">
              {d.previewId ? <Image src={`/api/assets/${d.previewId}`} alt="" fill sizes="33vw" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center" style={{ background: d.colorHex }}><span className="text-xs text-white/60">No preview</span></div>}
            </div>
            <div className="p-4">
              <p className="truncate font-semibold">{d.name}</p>
              <p className="text-xs text-mist">{STYLE_LABELS[d.style]} · {d.colorName} · {(d.layers as unknown[]).length} elements</p>
              <p className="text-[11px] text-mist">Updated {d.updatedAt.toLocaleDateString()}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/studio?design=${d.id}`} className="btn-primary btn-sm flex-1">Open & order</Link>
                <form action={deleteDesign}><input type="hidden" name="id" value={d.id} /><button className="btn-ghost btn-sm" aria-label={`Delete ${d.name}`}>Delete</button></form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
