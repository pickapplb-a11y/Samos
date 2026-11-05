import LegalPage from "@/components/layout/LegalPage";
export const metadata = { title: "Size guide", alternates: { canonical: "/size-guide" } };
const ROWS: Record<string, [string, number, number, number][]> = {
  "Oversized": [["XS", 58, 68, 54], ["S", 61, 70, 56], ["M", 64, 72, 58], ["L", 67, 74, 60], ["XL", 70, 76, 62], ["XXL", 73, 78, 64], ["3XL", 76, 80, 66]],
  "Regular fit & Zip-up": [["XS", 50, 66, 60], ["S", 53, 68, 62], ["M", 56, 70, 64], ["L", 59, 72, 66], ["XL", 62, 74, 67], ["XXL", 65, 76, 68], ["3XL", 68, 78, 69]],
};
export default function Page() {
  return (
    <LegalPage title="Size guide">
      <p>Garment measurements in centimetres, measured flat. Chest is measured 2.5 cm below the armhole, side to side. Sleeve is measured from the shoulder seam to the cuff.</p>
      {Object.entries(ROWS).map(([fit, rows]) => (
        <div key={fit} className="not-prose mt-10">
          <h2 className="text-xl font-semibold text-white">{fit}</h2>
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-mist"><tr><th className="p-3">Size</th><th>½ Chest</th><th>Length</th><th>Sleeve</th></tr></thead>
              <tbody className="divide-y divide-white/[0.05]">{rows.map(([s, c, l, sl]) => <tr key={s}><td className="p-3 font-semibold">{s}</td><td>{c}</td><td>{l}</td><td>{sl}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      ))}
      <h2>Fit tips</h2>
      <ul><li>Oversized: take your usual size for the intended boxy look, or size down for a closer fit.</li><li>Regular & Zip-up: true to size; size up for a relaxed fit.</li><li>Heavyweight fleece is pre-shrunk, so expect less than 3% shrinkage when washed cold.</li></ul>
    </LegalPage>
  );
}
