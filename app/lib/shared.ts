// Client- and server-safe constants and pure helpers.
// IMPORTANT: this module must never import server-only code (prisma,
// nodemailer, aws-sdk, …) so it can be used inside client components.

export const LOW_STOCK_THRESHOLD = 10;

// Shopify webhook product/variant IDs arrive numeric; Admin GraphQL returns
// GIDs. Normalise both to the trailing numeric string so the two reconcile.
export function numericId(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  const match = s.match(/(\d+)\s*$/);
  return match ? match[1] : s;
}
