"use client";

import Link from "next/link";
import { Fragment, useActionState } from "react";
import { submitReview } from "@/app/actions/reviews";

export default function ReviewForm({ productId, signedIn }: { productId: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(submitReview, null as null | { ok?: boolean; error?: string });
  if (!signedIn) return <p className="text-sm text-mist"><Link href="/account/login" className="text-white underline">Sign in</Link> to write a review.</p>;
  if (state?.ok) return <p className="text-sm text-white/80">Thanks — your review is live.</p>;
  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="label">Rating</legend>
        <div className="flex flex-row-reverse justify-end gap-1 [&>input:checked~label]:text-blaze [&>label:hover]:text-blaze [&>label:hover~label]:text-blaze">
          {[5, 4, 3, 2, 1].map((n) => (
            <Fragment key={n}><input id={`r${n}`} type="radio" name="rating" value={n} className="peer sr-only" required defaultChecked={n === 5} /><label htmlFor={`r${n}`} className="cursor-pointer text-2xl text-white/20" aria-label={`${n} stars`}>★</label></Fragment>
          ))}
        </div>
      </fieldset>
      <input name="title" required maxLength={80} placeholder="Title" className="input" aria-label="Review title" />
      <textarea name="body" required minLength={10} maxLength={1500} rows={4} placeholder="How does it fit and feel?" className="input h-auto py-3" aria-label="Review" />
      {state?.error && <p className="text-xs text-red-400" role="alert">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Posting…" : "Post review"}</button>
    </form>
  );
}
