import { db } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/admin/ui";

export default async function NewProduct() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return <div><PageTitle title="New product" /><ProductForm categories={categories} /></div>;
}
