import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/[0.07] bg-coal lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="font-display text-2xl tracking-[0.12em]">VANTA<span className="text-blaze">.</span> <span className="align-middle font-sans text-[10px] font-semibold tracking-[0.2em] text-mist">ADMIN</span></Link>
        </div>
        <AdminNav />
        <div className="hidden px-5 py-6 text-xs text-mist lg:block">
          <p className="truncate">{admin.email}</p>
          <Link href="/" className="mt-2 inline-block hover:text-white">← Back to store</Link>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}
