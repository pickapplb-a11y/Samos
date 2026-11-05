import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Suspense } from "react";
import Checkout from "@/components/checkout/Checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await currentUser();
  const addresses = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : [];
  return (
    <Suspense>
    <Checkout
      user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
      addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region ?? "", postalCode: a.postalCode ?? "", country: a.country }))}
    />
    </Suspense>
  );
}
