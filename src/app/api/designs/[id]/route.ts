import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ownerScope } from "@/lib/auth";
import { findOwnedDesign, validateDesign } from "@/lib/designs";
import { handle, HttpError, ok } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { user, guestId } = await ownerScope();
  const d = await findOwnedDesign((await params).id, user, guestId);
  if (!d) throw new HttpError(404, "Design not found");
  return ok({ design: d });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { user, guestId } = await ownerScope();
  const d = await findOwnedDesign((await params).id, user, guestId);
  if (!d) throw new HttpError(404, "Design not found");
  const input = await validateDesign(await req.json(), user, guestId);
  // New revision: old print files stay untouched (orders reference them), new ones are rendered for this revision.
  const design = await db.design.update({
    where: { id: d.id },
    data: { ...input, layers: input.layers as object[], revision: { increment: 1 }, renders: Prisma.DbNull, previewId: null },
    select: { id: true, revision: true },
  });
  return ok({ design });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { user, guestId } = await ownerScope();
  const d = await findOwnedDesign((await params).id, user, guestId);
  if (!d) throw new HttpError(404, "Design not found");
  await db.design.delete({ where: { id: d.id } });
  return ok({ ok: true });
});
