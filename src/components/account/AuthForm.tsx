"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const raw = sp.get("next") || "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account"; // no open redirects
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "Something went wrong");
      setBusy(false);
      return;
    }
    router.push(j.role === "ADMIN" && next === "/account" ? "/admin" : next);
    router.refresh();
  }
  return (
    <div className="container-x grid min-h-[80vh] max-w-md place-items-center pt-24">
      <div className="w-full">
        <h1 className="display text-5xl">{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="mt-3 text-white/60">{mode === "login" ? "Access your designs, orders and addresses." : "Save designs, track orders and check out faster."}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "register" && <div><label htmlFor="name" className="label">Name</label><input id="name" name="name" required autoComplete="name" className="input" /></div>}
          <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className="input" />
            {mode === "register" && <p className="mt-1 text-xs text-mist">At least 10 characters, including a number.</p>}
          </div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-mist">
          {mode === "login" ? <>New here? <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="text-white underline">Create an account</Link></> : <>Already have an account? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="text-white underline">Sign in</Link></>}
        </p>
        <p className="mt-2 text-center text-xs text-mist">Designs you made as a guest in this browser are moved to your account automatically.</p>
      </div>
    </div>
  );
}
