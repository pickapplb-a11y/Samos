import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/ui";

export default async function Inbox() {
  const [msgs, subs] = await Promise.all([db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 })]);
  return (
    <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
      <section>
        <PageTitle title="Inbox" sub={`${msgs.length} contact messages`} />
        <ul className="space-y-3">
          {msgs.map((m) => <li key={m.id} className="card p-5 text-sm"><div className="flex justify-between gap-2"><b>{m.subject}</b><span className="text-xs text-mist">{m.createdAt.toLocaleString()}</span></div><p className="mt-1 text-xs text-mist">{m.name} · <a className="text-blaze" href={`mailto:${m.email}`}>{m.email}</a></p><p className="mt-3 whitespace-pre-wrap text-white/80">{m.message}</p></li>)}
          {!msgs.length && <li className="text-sm text-mist">No messages yet.</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-4 mt-2 text-lg font-semibold">Newsletter ({subs.length})</h2>
        <ul className="card divide-y divide-white/[0.05] text-sm">{subs.map((s) => <li key={s.id} className="flex justify-between p-3"><span className="truncate">{s.email}</span><span className="text-xs text-mist">{s.createdAt.toLocaleDateString()}</span></li>)}</ul>
      </section>
    </div>
  );
}
