import prisma from "../db.server";
import type { AppSettings } from "@prisma/client";

// App-wide branding / e-mail settings live in a single row (id = "default").
// getSettings upserts it so the app always has sensible defaults.
export async function getSettings(): Promise<AppSettings> {
  return prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function updateSettings(
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
    >
  >,
): Promise<AppSettings> {
  return prisma.appSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}
