import { STATUS_FLOW, STATUS_LABEL } from "@/lib/format";

export default function StatusTimeline({ status, events }: { status: string; events: { status: string; createdAt: Date; note: string | null }[] }) {
  if (status === "CANCELLED") return <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">This order was cancelled.</p>;
  const idx = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Order progress">
      {STATUS_FLOW.map((s, i) => {
        const e = events.find((x) => x.status === s);
        return (
          <li key={s} className="min-w-0" aria-current={i === idx ? "step" : undefined}>
            <div className={`h-1 rounded-full ${i <= idx ? "bg-blaze" : "bg-white/10"}`} />
            <p className={`mt-2 truncate text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${i <= idx ? "text-white" : "text-white/30"}`}>{STATUS_LABEL[s]}</p>
            {e && <p className="hidden text-[10px] text-mist sm:block">{e.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
          </li>
        );
      })}
    </ol>
  );
}
