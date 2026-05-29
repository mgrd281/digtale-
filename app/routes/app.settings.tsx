import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useEffect, useRef } from "react";
import { useLoaderData, useFetcher, data } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getSettings, updateSettings } from "../lib/settings.server";
import { sendTestEmail } from "../lib/email.server";
import { ensureOrdersCreateWebhook } from "../lib/webhooks.server";
import { LOCALES, t } from "../lib/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const s = await getSettings();
  if (s.deliverUnpaidOrders) {
    await ensureOrdersCreateWebhook(admin);
  }
  return {
    locale: s.adminLocale,
    settings: {
      shopName: s.shopName,
      brandColor: s.brandColor,
      logoUrl: s.logoUrl ?? "",
      supportEmail: s.supportEmail,
      emailIntro: s.emailIntro ?? "",
      emailFooter: s.emailFooter ?? "",
      defaultLocale: s.defaultLocale,
      deliverUnpaidOrders: s.deliverUnpaidOrders,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { adminLocale: locale } = await getSettings();
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "settings") {
    const brandColor = String(form.get("brandColor") ?? "").trim() || "#0b3d2e";
    if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
      return data({
        ok: false,
        message: t(locale, "settings.msgInvalidColor"),
      });
    }
    const deliverUnpaidOrders = form.get("deliverUnpaidOrders") === "true";
    await updateSettings({
      shopName: String(form.get("shopName") ?? "").trim() || "KARINEX",
      brandColor,
      logoUrl: String(form.get("logoUrl") ?? "").trim() || null,
      supportEmail:
        String(form.get("supportEmail") ?? "").trim() ||
        "kundenservice@karinex.de",
      emailIntro: String(form.get("emailIntro") ?? "").trim() || null,
      emailFooter: String(form.get("emailFooter") ?? "").trim() || null,
      defaultLocale: String(form.get("defaultLocale") ?? "de"),
      adminLocale: String(form.get("adminLocale") || locale),
      deliverUnpaidOrders,
    });

    // When delivering on unpaid orders (Vorkasse), make sure the orders/create
    // webhook is registered via the API so it works without a CLI deploy.
    if (deliverUnpaidOrders) {
      await ensureOrdersCreateWebhook(admin);
    }
    return data({ ok: true, message: t(locale, "settings.msgSaved") });
  }

  if (intent === "test") {
    const to = String(form.get("to") ?? "").trim();
    const emailLocale = String(form.get("locale") ?? "de");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return data({ ok: false, message: t(locale, "settings.msgInvalidEmail") });
    }
    try {
      await sendTestEmail({ to, locale: emailLocale });
      return data({
        ok: true,
        message: `${t(locale, "settings.testTo")} ${to} ${t(locale, "settings.msgTestSent")}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const hint = msg.includes("SMTP")
        ? " " + t(locale, "settings.msgSmtpHint")
        : "";
      return data({
        ok: false,
        message: `${t(locale, "settings.msgSendFailed")} ${msg}.${hint}`,
      });
    }
  }

  return data(
    { ok: false, message: t(locale, "settings.msgUnknownAction") },
    { status: 400 },
  );
};

export default function Settings() {
  const { settings, locale } = useLoaderData<typeof loader>();
  const save = useFetcher<typeof action>();
  const test = useFetcher<typeof action>();

  // Auto-save branding/template changes shortly after any edit.
  const saveFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = saveFormRef.current;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => save.submit(form), 700);
    };
    form.addEventListener("change", onChange);
    form.addEventListener("input", onChange);
    return () => {
      form.removeEventListener("change", onChange);
      form.removeEventListener("input", onChange);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <s-page heading={t(locale, "settings.title")}>
      <s-section heading={t(locale, "settings.brandingSection")}>
        {save.data?.message && (
          <s-banner tone={save.data.ok ? "success" : "critical"}>
            <s-paragraph>{save.data.message}</s-paragraph>
          </s-banner>
        )}
        <save.Form method="post" ref={saveFormRef}>
          <input type="hidden" name="intent" value="settings" />
          <s-stack direction="block" gap="base">
            <s-select
              label={t(locale, "welcome.selectLang")}
              name="adminLocale"
              value={locale}
            >
              {LOCALES.map((l) => (
                <s-option key={l.code} value={l.code}>
                  {l.label}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              label={t(locale, "settings.shopName")}
              name="shopName"
              value={settings.shopName}
            />
            <s-text-field
              label={t(locale, "settings.brandColor")}
              name="brandColor"
              value={settings.brandColor}
              placeholder="#0b3d2e"
            />
            <s-text-field
              label={t(locale, "settings.logoUrl")}
              name="logoUrl"
              value={settings.logoUrl}
              placeholder="https://…/logo.png"
            />
            <s-text-field
              label={t(locale, "settings.supportEmail")}
              name="supportEmail"
              value={settings.supportEmail}
            />
            <s-select
              label={t(locale, "settings.defaultLocale")}
              name="defaultLocale"
              value={settings.defaultLocale}
            >
              <s-option value="de">Deutsch</s-option>
              <s-option value="en">English</s-option>
            </s-select>
            <s-select
              label={t(locale, "settings.instantPrepay")}
              name="deliverUnpaidOrders"
              value={settings.deliverUnpaidOrders ? "true" : "false"}
            >
              <s-option value="false">{t(locale, "settings.instantNo")}</s-option>
              <s-option value="true">{t(locale, "settings.instantYes")}</s-option>
            </s-select>
            <s-text color="subdued">{t(locale, "settings.instantHelper")}</s-text>
            <s-text-area
              label={t(locale, "settings.emailIntro")}
              name="emailIntro"
              rows={3}
              value={settings.emailIntro}
              placeholder={t(locale, "settings.emailIntroPlaceholder")}
            />
            <s-text-area
              label={t(locale, "settings.emailFooter")}
              name="emailFooter"
              rows={2}
              value={settings.emailFooter}
              placeholder={t(locale, "settings.emailFooterPlaceholder")}
            />
            <s-button type="submit" variant="primary">
              {t(locale, "settings.save")}
            </s-button>
          </s-stack>
        </save.Form>
      </s-section>

      <s-section heading={t(locale, "settings.testSection")}>
        <s-paragraph>{t(locale, "settings.testIntro")}</s-paragraph>
        {test.data?.message && (
          <s-banner tone={test.data.ok ? "success" : "critical"}>
            <s-paragraph>{test.data.message}</s-paragraph>
          </s-banner>
        )}
        <test.Form method="post">
          <input type="hidden" name="intent" value="test" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label={t(locale, "settings.testTo")}
              name="to"
              placeholder={t(locale, "settings.testToPlaceholder")}
            />
            <s-select
              label={t(locale, "settings.language")}
              name="locale"
              value={settings.defaultLocale}
            >
              <s-option value="de">Deutsch</s-option>
              <s-option value="en">English</s-option>
            </s-select>
            <s-button
              type="submit"
              {...(test.state !== "idle" ? { loading: true } : {})}
            >
              {t(locale, "settings.sendTest")}
            </s-button>
          </s-stack>
        </test.Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
