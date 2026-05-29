import prisma from "../db.server";

// Deliveries created per day for the last `days` days, across all shops,
// returned oldest→newest with zero-filled gaps. Raw SQL keeps it to one query.
export async function deliveriesByDay(
  days = 30,
): Promise<{ date: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ d: Date; c: bigint }[]>`
    SELECT date_trunc('day', "createdAt") AS d, count(*) AS c
    FROM "Delivery"
    WHERE "createdAt" >= now() - (${days} || ' days')::interval
    GROUP BY d
  `;
  const byDay = new Map(
    rows.map((r) => [new Date(r.d).toISOString().slice(0, 10), Number(r.c)]),
  );
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: d, count: byDay.get(d) ?? 0 });
  }
  return out;
}

// Top products by number of DELIVERED deliveries, across all shops.
export async function topProducts(
  limit = 8,
): Promise<{ title: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ title: string; c: bigint }[]>`
    SELECT p."title" AS title, count(*) AS c
    FROM "Delivery" d
    JOIN "Product" p ON p."id" = d."productId"
    WHERE d."status" = 'DELIVERED'
    GROUP BY p."title"
    ORDER BY c DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ title: r.title, count: Number(r.c) }));
}
