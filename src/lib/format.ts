const currency = process.env.NEXT_PUBLIC_CURRENCY || "USD";
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency });
export const money = (cents: number) => fmt.format(cents / 100);
export const STATUS_FLOW = ["PENDING", "CONFIRMED", "DESIGN_REVIEW", "PRINTING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DESIGN_REVIEW: "Design Review",
  PRINTING: "Printing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
