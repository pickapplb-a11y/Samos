import { ownerScope } from "@/lib/auth";
import { priceCart, quoteSchema } from "@/lib/orders";
import { features } from "@/lib/settings";
import { handle, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const input = quoteSchema.parse(await req.json());
  const who = await ownerScope();
  const q = await priceCart(input, who);
  return ok({
    items: q.items.map((i) => ({ name: i.name, image: i.image, size: i.size, colorName: i.colorName, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal, breakdown: i.breakdown, kind: i.kind })),
    problems: q.problems,
    subtotal: q.subtotal,
    discount: q.discount,
    discountCode: q.discountCode,
    promoError: q.promoError,
    delivery: q.delivery,
    codFee: q.codFee,
    total: q.total,
    freeOver: q.freeOver,
    cardEnabled: features.card(),
  });
});
