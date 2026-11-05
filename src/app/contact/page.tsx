import LegalPage from "@/components/layout/LegalPage";
import ContactForm from "@/components/layout/ContactForm";
import { SITE } from "@/lib/site";
export const metadata = { title: "Contact", description: "Get in touch with the VANTA studio.", alternates: { canonical: "/contact" } };
export default function Page() {
  return (
    <LegalPage title="Contact">
      <div className="not-prose grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6 text-sm text-white/75">
          <div><p className="label">Email</p><a href={`mailto:${SITE.email}`} className="text-white hover:text-blaze">{SITE.email}</a></div>
          <div><p className="label">Phone</p><p>{SITE.phone}<br />Mon–Fri, 9:00–18:00</p></div>
          <div><p className="label">Studio</p><p>{SITE.address}</p></div>
          <p className="text-mist">For order questions, include your order number. We reply within one business day.</p>
        </div>
        <ContactForm />
      </div>
    </LegalPage>
  );
}
