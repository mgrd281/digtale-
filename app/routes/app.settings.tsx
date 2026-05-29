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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const s = await getSettings();
  return {
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
  await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "settings") {
    const brandColor = String(form.get("brandColor") ?? "").trim() || "#0b3d2e";
    if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
      return data({
        ok: false,
        message: "Markenfarbe muss ein Hex-Wert sein, z. B. #0b3d2e.",
      });
    }
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
      deliverUnpaidOrders: form.get("deliverUnpaidOrders") === "true",
    });
    return data({ ok: true, message: "Einstellungen gespeichert." });
  }

  if (intent === "test") {
    const to = String(form.get("to") ?? "").trim();
    const locale = String(form.get("locale") ?? "de");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return data({ ok: false, message: "Bitte eine gültige E-Mail angeben." });
    }
    try {
      await sendTestEmail({ to, locale });
      return data({ ok: true, message: `Test-E-Mail an ${to} gesendet.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const hint = msg.includes("SMTP")
        ? " Der E-Mail-Versand (SMTP) ist noch nicht konfiguriert."
        : "";
      return data({ ok: false, message: `Versand fehlgeschlagen: ${msg}.${hint}` });
    }
  }

  return data({ ok: false, message: "Unbekannte Aktion." }, { status: 400 });
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
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
    <s-page heading="Einstellungen">
      <s-section heading="Branding & E-Mail-Vorlage">
        {save.data?.message && (
          <s-banner tone={save.data.ok ? "success" : "critical"}>
            <s-paragraph>{save.data.message}</s-paragraph>
          </s-banner>
        )}
        <save.Form method="post" ref={saveFormRef}>
          <input type="hidden" name="intent" value="settings" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Shop-Name"
              name="shopName"
              value={settings.shopName}
            />
            <s-text-field
              label="Markenfarbe (Hex)"
              name="brandColor"
              value={settings.brandColor}
              placeholder="#0b3d2e"
            />
            <s-text-field
              label="Logo-URL (optional)"
              name="logoUrl"
              value={settings.logoUrl}
              placeholder="https://…/logo.png"
            />
            <s-text-field
              label="Support-E-Mail"
              name="supportEmail"
              value={settings.supportEmail}
            />
            <s-select
              label="Standardsprache der E-Mail"
              name="defaultLocale"
              value={settings.defaultLocale}
            >
              <s-option value="de">Deutsch</s-option>
              <s-option value="en">English</s-option>
            </s-select>
            <s-select
              label="Sofort-Auslieferung bei Vorkasse (vor Zahlungseingang)"
              name="deliverUnpaidOrders"
              value={settings.deliverUnpaidOrders ? "true" : "false"}
            >
              <s-option value="false">Nein – erst nach Zahlungseingang</s-option>
              <s-option value="true">Ja – sofort bei Bestellung</s-option>
            </s-select>
            <s-text color="subdued">
              Bei „Ja" erhält der Kunde Schlüssel/Download schon bei
              Bestelleingang – auch bei noch nicht bezahlter Vorkasse.
            </s-text>
            <s-text-area
              label="Eigener Einleitungstext (optional)"
              name="emailIntro"
              rows={3}
              value={settings.emailIntro}
              placeholder="Überschreibt den Standard-Einleitungstext der Liefermail."
            />
            <s-text-area
              label="Eigener Fußzeilentext (optional)"
              name="emailFooter"
              rows={2}
              value={settings.emailFooter}
              placeholder="z. B. Kontakt- oder Rechtshinweise."
            />
            <s-button type="submit" variant="primary">
              Speichern
            </s-button>
          </s-stack>
        </save.Form>
      </s-section>

      <s-section heading="Test-Auslieferung">
        <s-paragraph>
          Senden Sie eine Beispiel-Liefermail an Ihre eigene Adresse, um die
          Vorlage und den E-Mail-Versand zu prüfen.
        </s-paragraph>
        {test.data?.message && (
          <s-banner tone={test.data.ok ? "success" : "critical"}>
            <s-paragraph>{test.data.message}</s-paragraph>
          </s-banner>
        )}
        <test.Form method="post">
          <input type="hidden" name="intent" value="test" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Test-E-Mail an"
              name="to"
              placeholder="ich@karinex.de"
            />
            <s-select label="Sprache" name="locale" value={settings.defaultLocale}>
              <s-option value="de">Deutsch</s-option>
              <s-option value="en">English</s-option>
            </s-select>
            <s-button
              type="submit"
              {...(test.state !== "idle" ? { loading: true } : {})}
            >
              Test-E-Mail senden
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
