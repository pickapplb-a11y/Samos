import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/account";
import AccountNav from "@/components/account/AccountNav";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-x pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-8">
        <div><p className="eyebrow">My account</p><h1 className="display mt-3 text-5xl md:text-6xl">Hi, {user.name.split(" ")[0]}</h1></div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && <Link href="/admin" className="btn-ghost btn-sm">Admin dashboard</Link>}
          <form action={logout}><button className="btn-ghost btn-sm">Sign out</button></form>
        </div>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[200px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
