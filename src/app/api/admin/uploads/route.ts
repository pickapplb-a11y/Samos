import { requireAdminApi } from "@/lib/admin-api";
import { storeImage } from "@/lib/uploads";
import { handle, HttpError, ok } from "@/lib/http";

/** Product photography upload. Stored privately but flagged public (library) so it can be shown in the shop. */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdminApi();
  const f = (await req.formData()).get("file");
  if (!(f instanceof File)) throw new HttpError(400, "No file");
  const a = await storeImage({ data: Buffer.from(await f.arrayBuffer()), kind: "UPLOAD", ownerId: admin.id, meta: { library: true, productImage: true, name: f.name.slice(0, 80) } });
  return ok({ url: `/api/assets/${a.id}` }, { status: 201 });
});
