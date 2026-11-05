"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center pt-24 text-center">
      <div><h1 className="display text-5xl">Something went wrong</h1><p className="mt-3 text-mist">Please try again. If it keeps happening, contact us.</p><button onClick={reset} className="btn-primary mt-6">Try again</button></div>
    </div>
  );
}
