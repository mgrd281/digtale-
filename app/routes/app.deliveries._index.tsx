import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher, Form } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { resendDelivery, revokeDelivery } from "../lib/deliveries.server";
import { getSettings } from "../lib/settings.server";
import { t, statusLabel } from "../lib/i18n";
import type { DeliveryStatus, Prisma } from "@prisma/client";

const STATUSES: DeliveryStatus[] = ["PENDING", "DELIVERED", "FAILED"];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const settings = await getSettings();

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";

  const where: Prisma.DeliveryWhereInput = {};
  if (status && STATUSES.includes(status as DeliveryStatus)) {
    where.status = status as DeliveryStatus;
  }
  if (q) {
    where.OR = [
      { shopifyOrderName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: { select: { title: true } },
      licenseKey: { select: { keyValue: true } },
      _count: { select: { tokens: { where: { revoked: false } } } },
    },
  });

  return {
    q,
    status,
    locale: settings.adminLocale,
    deliveries: deliveries.map((d) => ({
      id: d.id,
      orderName: d.shopifyOrderName,
      email: d.customerEmail,
      product: d.product.title,
      key: d.licenseKey?.keyValue ?? null,
      status: d.status,
      activeTokens: d._count.tokens,
      error: d.errorMessage,
      createdAt: d.createdAt.toISOString().slice(0, 16).replace("T", " "),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const { adminLocale: locale } = await getSettings();
  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  const deliveryId = String(formData.get("deliveryId"));

  try {
    if (intent === "resend") {
      await resendDelivery(deliveryId);
      return { ok: true, message: t(locale, "deliveries.msgResent") };
    }
    if (intent === "revoke") {
      await revokeDelivery(deliveryId);
      return { ok: true, message: t(locale, "deliveries.msgRevoked") };
    }
    if (intent === "delete") {
      // Remove the record (download tokens cascade). The assigned key stays
      // burned so it is never reissued.
      await prisma.delivery.delete({ where: { id: deliveryId } });
      return { ok: true, message: t(locale, "deliveries.msgDeleted") };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
  return { ok: false, message: t(locale, "deliveries.msgUnknownAction") };
};

function statusTone(status: string): "success" | "warning" | "critical" | "neutral" {
  if (status === "DELIVERED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "critical";
  return "neutral";
}

export default function Deliveries() {
  const { deliveries, q, status, locale } = useLoaderData<typeof loader>();
  const action = useFetcher<{ ok: boolean; message: string }>();

  return (
    <s-page heading={t(locale, "nav.orders")}>
      {action.data?.message && (
        <s-banner tone={action.data.ok ? "success" : "critical"}>
          <s-paragraph>{action.data.message}</s-paragraph>
        </s-banner>
      )}

      <s-section heading={t(locale, "deliveries.searchSection")}>
        <Form method="get">
          <s-stack direction="inline" gap="base">
            <s-search-field
              label={t(locale, "deliveries.searchLabel")}
              name="q"
              value={q}
              placeholder={t(locale, "deliveries.searchPlaceholder")}
            />
            <s-select label={t(locale, "deliveries.statusLabel")} name="status" value={status}>
              <s-option value="">{t(locale, "deliveries.statusAll")}</s-option>
              <s-option value="DELIVERED">{t(locale, "deliveries.statusDelivered")}</s-option>
              <s-option value="PENDING">{t(locale, "deliveries.statusPending")}</s-option>
              <s-option value="FAILED">{t(locale, "deliveries.statusFailed")}</s-option>
            </s-select>
            <s-button type="submit">{t(locale, "deliveries.filter")}</s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading={`${t(locale, "deliveries.results")} (${deliveries.length})`}>
        {deliveries.length === 0 ? (
          <s-paragraph>{t(locale, "deliveries.none")}</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>{t(locale, "deliveries.thOrder")}</s-table-header>
              <s-table-header>{t(locale, "deliveries.thCustomer")}</s-table-header>
              <s-table-header>{t(locale, "deliveries.thProduct")}</s-table-header>
              <s-table-header>{t(locale, "deliveries.thKey")}</s-table-header>
              <s-table-header>{t(locale, "deliveries.thStatus")}</s-table-header>
              <s-table-header>{t(locale, "deliveries.thDate")}</s-table-header>
              <s-table-header>{t(locale, "deliveries.thActions")}</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {deliveries.map((d) => (
                <s-table-row key={d.id}>
                  <s-table-cell>{d.orderName}</s-table-cell>
                  <s-table-cell>{d.email}</s-table-cell>
                  <s-table-cell>{d.product}</s-table-cell>
                  <s-table-cell>
                    <s-text>{d.key ?? t(locale, "detail.dash")}</s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone={statusTone(d.status)}>{statusLabel(locale, d.status)}</s-badge>
                  </s-table-cell>
                  <s-table-cell>{d.createdAt}</s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small-100">
                      <s-link href={`/app/deliveries/${d.id}`}>
                        {t(locale, "deliveries.customerView")}
                      </s-link>
                      <action.Form method="post">
                        <input type="hidden" name="intent" value="resend" />
                        <input type="hidden" name="deliveryId" value={d.id} />
                        <s-button type="submit" variant="tertiary">
                          {t(locale, "deliveries.resend")}
                        </s-button>
                      </action.Form>
                      <action.Form method="post">
                        <input type="hidden" name="intent" value="revoke" />
                        <input type="hidden" name="deliveryId" value={d.id} />
                        <s-button type="submit" variant="tertiary" tone="critical">
                          {t(locale, "deliveries.revoke")}
                        </s-button>
                      </action.Form>
                      <action.Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="deliveryId" value={d.id} />
                        <s-button type="submit" variant="tertiary" tone="critical">
                          {t(locale, "deliveries.delete")}
                        </s-button>
                      </action.Form>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
