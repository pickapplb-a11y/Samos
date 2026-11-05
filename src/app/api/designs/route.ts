import { db } from "@/lib/db";
import { ownerScope } from "@/lib/auth";
import { validateDesign } from "@/lib/designs";
import { rateLimit } from "@/lib/rate-limit";
import { handle, HttpError, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const { user, guestId } = await ownerScope();
  if (!(await rateLimit("design-save", 60, 10 * 60_000, user?.id ?? guestId ?? undefined))) throw new HttpError(429, "Too many saves, slow down a little");
  const input = await validateDesign(await req.json(), user, guestId);
  const design = await db.design.create({
    data: { ...input, layers: input.layers as object[], userId: user?.id ?? null, guestId: user ? null : guestId },
    select: { id: true, revision: true },
  });
  return ok({ design }, { status: 201 });
});

export const GET = handle(async () => {
  const { user, guestId } = await ownerScope();
  const designs = await db.design.findMany({
    where: user ? { userId: user.id } : { guestId, userId: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, style: true, colorName: true, previewId: true, updatedAt: true },
    take: 100,
  });
  return ok({ designs });
});
