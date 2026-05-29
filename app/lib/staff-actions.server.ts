import prisma from "../db.server";
import { resendDelivery, revokeDelivery } from "./deliveries.server";

// Shared delivery actions for the staff portal. Staff are cross-shop, so we
// resolve the delivery's own shop and call the shop-scoped operations with it.
export async function staffDeliveryAction(
  intent: string,
  deliveryId: string,
): Promise<{ ok: boolean; message: string }> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: { shop: true },
  });
  if (!delivery) {
    return { ok: false, message: "Lieferung nicht gefunden." };
  }

  try {
    if (intent === "resend") {
      await resendDelivery(delivery.shop, deliveryId);
      return { ok: true, message: "Liefer-E-Mail erneut gesendet." };
    }
    if (intent === "revoke") {
      await revokeDelivery(delivery.shop, deliveryId);
      return { ok: true, message: "Lieferung widerrufen." };
    }
    if (intent === "delete") {
      await prisma.delivery.deleteMany({
        where: { id: deliveryId, shop: delivery.shop },
      });
      return { ok: true, message: "Lieferung gelöscht." };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return { ok: false, message: "Unbekannte Aktion." };
}
