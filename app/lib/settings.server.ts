import prisma from "../db.server";
import type { AppSettings } from "@prisma/client";

// Per-shop branding / e-mail settings live in one row per installed shop,
// keyed by the shop domain. getSettings upserts it so every shop always has
// sensible defaults on first access.
export async function getSettings(shop: string): Promise<AppSettings> {
  return prisma.appSettings.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });
}

export async function updateSettings(
  shop: string,
  data: Partial<
    Pick<
      AppSettings,
      | "shopName"
      | "brandColor"
      | "logoUrl"
      | "supportEmail"
      | "emailIntro"
      | "emailFooter"
      | "defaultLocale"
      | "adminLocale"
      | "onboarded"
      | "plan"
      | "deliverUnpaidOrders"
    >
  >,
): Promise<AppSettings> {
  return prisma.appSettings.upsert({
    where: { shop },
    update: data,
    create: { shop, ...data },
  });
}
