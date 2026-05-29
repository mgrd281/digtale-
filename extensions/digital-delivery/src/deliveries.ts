import { APP_URL } from "./config";

export interface DeliveryDownload {
  fileName: string;
  url: string;
}

export interface DeliveryItem {
  productTitle: string;
  message: string | null;
  licenseKey: string | null;
  status: "PENDING" | "DELIVERED" | "FAILED";
  downloads: DeliveryDownload[];
}

export interface DeliveriesResponse {
  hide?: boolean;
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

  // Buyer locale (defensive: the shape differs per target). Lets the backend
  // return localized strings; defaults to German when unavailable.
  const locale: string =
    api?.localization?.language?.current?.isoCode ??
    api?.localization?.isoCode?.current ??
    api?.localization?.language?.isoCode ??
    "";

  const res = await fetch(
    `${APP_URL}/api/deliveries?surface=${surface}&orderId=${encodeURIComponent(orderId)}&locale=${encodeURIComponent(locale)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Backend responded ${res.status}`);
  }
  return (await res.json()) as DeliveriesResponse;
}
