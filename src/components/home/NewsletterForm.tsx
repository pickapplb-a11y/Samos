"use client";

import { useState } from "react";

export default function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setState("busy");
    const r = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    setState(r.ok ? "done" : "error");
    setMsg(r.ok ? "You're on the list. Welcome to the studio." : j.error || "Could not subscribe");
  }
  return (
    <form onSubmit={submit} className={compact ? "" : "mx-auto max-w-lg"}>
      <label htmlFor={compact ? "nl-f" : "nl"} className="sr-only">Email address</label>
      <div className="flex gap-2 rounded-full border border-white/15 bg-white/[0.03] p-1.5 focus-within:border-blaze/60">
        <input id={compact ? "nl-f" : "nl"} name="email" type="email" required placeholder="Your email" className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-white/30" />
        <button className="btn-primary btn-sm h-10" disabled={state === "busy" || state === "done"}>{state === "done" ? "Joined" : "Subscribe"}</button>
      </div>
      <p className={`mt-2 min-h-[1rem] text-xs ${state === "error" ? "text-red-400" : "text-mist"}`} role="status">{msg}</p>
    </form>
  );
}
