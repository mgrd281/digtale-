import { APP_URL } from "./config";

export interface DeliveryDownload {
  fileName: string;
  url: string;
}

export interface DeliveryItem {
  productTitle: string;
  licenseKey: string | null;
  status: "PENDING" | "DELIVERED" | "FAILED";
  downloads: DeliveryDownload[];
}

export interface DeliveriesResponse {
  pending: boolean;
  heading: string;
  keyLabel: string;
  downloadButton: string;
  pendingMessage: string;
  legal: string;
  items: DeliveryItem[];
}

// The extension API shape varies slightly per target, so we read the order id
// and session token defensively.
export async function fetchDeliveries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
  surface: "checkout" | "order-status",
): Promise<DeliveriesResponse> {
  const token: string = await api.sessionToken.get();

  const orderId: string =
    api?.orderConfirmation?.current?.order?.id ??
    api?.order?.current?.id ??
    api?.order?.id ??
    "";

  const res = await fetch(
    `${APP_URL}/api/deliveries?surface=${surface}&orderId=${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Backend responded ${res.status}`);
  }
  return (await res.json()) as DeliveriesResponse;
}
