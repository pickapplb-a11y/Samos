export default function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="container-x max-w-3xl pt-32">
      <p className="eyebrow">{updated ? `Last updated ${updated}` : "Help"}</p>
      <h1 className="display mt-3 text-5xl md:text-7xl">{title}</h1>
      <div className="prose-vanta mt-10">{children}</div>
    </article>
  );
}
