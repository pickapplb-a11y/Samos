import { STATUS_LABEL } from "@/lib/format";

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="display text-4xl md:text-5xl">{title}</h1>{sub && <p className="mt-2 text-sm text-mist">{sub}</p>}</div>
      {children}
    </div>
  );
}

const TONE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-300",
  CONFIRMED: "bg-sky-500/15 text-sky-300",
  DESIGN_REVIEW: "bg-violet-500/15 text-violet-300",
  PRINTING: "bg-blaze/15 text-blaze",
  READY: "bg-teal-500/15 text-teal-300",
  OUT_FOR_DELIVERY: "bg-indigo-500/15 text-indigo-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};
export function StatusBadge({ s }: { s: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${TONE[s] ?? "bg-white/10"}`}>{STATUS_LABEL[s] ?? s}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-4xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  );
}
