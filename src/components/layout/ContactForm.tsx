"use client";
import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setErr("");
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setState("done");
    else { setErr(j.error || "Could not send"); setState("idle"); }
  }
  if (state === "done") return <div className="card p-8"><p className="text-lg font-semibold">Message sent</p><p className="mt-2 text-sm text-mist">Thanks, we&apos;ll get back to you within one business day.</p></div>;
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" name="name" required className="input" autoComplete="name" /></div>
        <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required className="input" autoComplete="email" /></div>
      </div>
      <div><label className="label" htmlFor="c-subject">Subject</label><input id="c-subject" name="subject" required className="input" placeholder="Order VN-…, sizing, collaboration…" /></div>
      <div><label className="label" htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" required minLength={10} rows={6} className="input h-auto py-3" /></div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
      <button className="btn-primary" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send message"}</button>
    </form>
  );
}
