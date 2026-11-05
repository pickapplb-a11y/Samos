"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/account";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [s, a, p] = useActionState(updateProfile, null);
  return (
    <form action={a} className="card space-y-4 p-6">
      <h2 className="font-semibold">Profile</h2>
      <div><label className="label" htmlFor="pf-email">Email</label><input id="pf-email" className="input opacity-60" value={email} disabled /></div>
      <div><label className="label" htmlFor="pf-name">Name</label><input id="pf-name" name="name" defaultValue={name} required className="input" /></div>
      <div><label className="label" htmlFor="pf-phone">Phone</label><input id="pf-phone" name="phone" type="tel" defaultValue={phone} className="input" /></div>
      {s?.error && <p className="text-xs text-red-400">{s.error}</p>}
      {s?.ok && <p className="text-xs text-blaze">Saved</p>}
      <button className="btn-primary btn-sm" disabled={p}>Save profile</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, a, p] = useActionState(changePassword, null);
  return (
    <form action={a} className="card space-y-4 p-6">
      <h2 className="font-semibold">Password</h2>
      <div><label className="label" htmlFor="pw-c">Current password</label><input id="pw-c" name="current" type="password" required autoComplete="current-password" className="input" /></div>
      <div><label className="label" htmlFor="pw-n">New password</label><input id="pw-n" name="next" type="password" required minLength={10} autoComplete="new-password" className="input" /></div>
      {s?.error && <p className="text-xs text-red-400">{s.error}</p>}
      {s?.ok && <p className="text-xs text-blaze">Password updated</p>}
      <button className="btn-ghost btn-sm" disabled={p}>Change password</button>
    </form>
  );
}
