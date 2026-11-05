import LegalPage from "@/components/layout/LegalPage";
export const metadata = { title: "Customization policy", alternates: { canonical: "/customization-policy" } };
export default function Page() {
  return (
    <LegalPage title="Customization policy" updated="November 2026">
      <h2>Your artwork, your responsibility</h2>
      <p>Only upload images, logos, characters and text you created or have the rights to use. We don&apos;t print trademarks, copyrighted characters or likenesses of real people without permission.</p>
      <h2>Content we won&apos;t print</h2>
      <ul><li>Hate speech, harassment or symbols promoting violence or discrimination</li><li>Sexually explicit content</li><li>Content that is illegal or promotes illegal activity</li><li>Personal data of others without consent</li></ul>
      <h2>Design review</h2>
      <p>Every custom order goes through a design review before printing. If we spot a problem (rights, content, or print quality), we&apos;ll contact you before anything is printed. You can then change the design or get a full refund.</p>
      <h2>Print quality</h2>
      <ul><li>Artwork is printed exactly where you place it, within each print area: front up to 12″×14″ (oversized), back up to 14″×16″, sleeves 3.5″×14″, zip-up left chest 4.5″×4.5″.</li><li>For crisp results, upload images that are at least 300 DPI at print size. The studio warns you when an image may print soft.</li><li>Colours on screen can vary slightly from printed ink on fabric, especially neons and on dark garments.</li><li>SVG uploads are sanitised for security. Scripts and external references are removed.</li></ul>
      <h2>AI-generated graphics</h2>
      <p>When the AI design assistant is available, it creates original artwork from your description. The same content rules apply, and prompts asking for brand logos or real people are declined.</p>
    </LegalPage>
  );
}
