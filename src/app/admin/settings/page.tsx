import { getPricing } from "@/lib/settings";
import PricingForm from "@/components/admin/PricingForm";
import { PageTitle } from "@/components/admin/ui";

export default async function Settings() {
  return <div><PageTitle title="Pricing" sub="All prices are re-validated on the server at checkout." /><PricingForm cfg={await getPricing()} /></div>;
}
