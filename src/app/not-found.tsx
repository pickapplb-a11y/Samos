import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x grid min-h-[80vh] place-items-center pt-24 text-center">
      <div>
        <p className="font-display text-[clamp(8rem,30vw,22rem)] leading-none text-white/[0.06]" aria-hidden>404</p>
        <h1 className="display -mt-[0.4em] text-5xl md:text-7xl">Lost the thread</h1>
        <p className="mx-auto mt-4 max-w-md text-white/60">This page doesn&apos;t exist, or it&apos;s been moved. Your next favourite hoodie is still out there.</p>
        <div className="mt-8 flex justify-center gap-3"><Link href="/" className="btn-primary">Home</Link><Link href="/studio" className="btn-ghost">Design a hoodie</Link></div>
      </div>
    </div>
  );
}
