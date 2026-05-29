import { randomUUID } from "node:crypto";
import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { uploadFile } from "../lib/storage.server";
import { LOW_STOCK_THRESHOLD } from "../lib/shared";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      files: { orderBy: { createdAt: "desc" } },
      links: { orderBy: { createdAt: "asc" } },
      _count: { select: { licenseKeys: true } },
    },
  });
  if (!product) {
    throw new Response("Produkt nicht gefunden", { status: 404 });
  }

  const available = await prisma.licenseKey.count({
    where: { productId: product.id, status: "AVAILABLE" },
  });
  const assigned = await prisma.licenseKey.count({
    where: { productId: product.id, status: "ASSIGNED" },
  });

  return {
    product: {
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      deliveryType: product.deliveryType,
      downloadLimit: product.downloadLimit,
      linkExpiryHours: product.linkExpiryHours,
      deliveryMessage: product.deliveryMessage ?? "",
    },
    available,
    assigned,
    files: product.files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      sizeBytes: Number(f.sizeBytes),
    })),
    links: product.links.map((l) => ({
      id: l.id,
      label: l.label,
      version: l.version ?? "",
      url: l.url,
    })),
  };
};

function parseKeys(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\r\n,;]+/)
        .map((line) => line.split(",")[0].trim())
        .filter(Boolean)
        .filter((v) => !/^(key|keys|license|lizenzschl[üu]ssel)$/i.test(v)),
    ),
  );
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const productId = params.id as string;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new Response("Produkt nicht gefunden", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "settings") {
    await prisma.product.update({
      where: { id: productId },
      data: {
        deliveryType: String(formData.get("deliveryType")) as
          | "KEY"
          | "FILE"
          | "BOTH",
        downloadLimit: Math.max(1, Number(formData.get("downloadLimit")) || 1),
        linkExpiryHours: Math.max(
          1,
          Number(formData.get("linkExpiryHours")) || 1,
        ),
        deliveryMessage: String(formData.get("deliveryMessage") ?? "").trim() || null,
      },
    });
    return data({ ok: true, message: "Einstellungen gespeichert." });
  }

  if (intent === "addLink") {
    const label = String(formData.get("label") ?? "").trim() || "Download + Anleitung";
    const version = String(formData.get("version") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    if (!/^https?:\/\//i.test(url)) {
      return data({
        ok: false,
        message: "Bitte eine gültige URL angeben (beginnt mit https://).",
      });
    }
    await prisma.productLink.create({
      data: { productId, label, version: version || null, url },
    });
    return data({
      ok: true,
      message: version
        ? `Version „${version}" hinzugefügt.`
        : `Download-Link hinzugefügt.`,
    });
  }

  if (intent === "deleteLink") {
    await prisma.productLink.delete({
      where: { id: String(formData.get("linkId")) },
    });
    return data({ ok: true, message: "Download-Link entfernt." });
  }

  if (intent === "keys") {
    const pasted = String(formData.get("keys") ?? "");
    const csv = formData.get("keysCsv");
    let raw = pasted;
    if (csv instanceof File && csv.size > 0) {
      raw += "\n" + (await csv.text());
    }
    const values = parseKeys(raw);
    if (values.length === 0) {
      return data({ ok: false, message: "Keine gültigen Schlüssel gefunden." });
    }
    const result = await prisma.licenseKey.createMany({
      data: values.map((keyValue) => ({ productId, keyValue })),
      skipDuplicates: true,
    });
    return data({
      ok: true,
      message: `${result.count} Schlüssel hinzugefügt (${
        values.length - result.count
      } Duplikate übersprungen).`,
    });
  }

  if (intent === "uploadFile") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return data({ ok: false, message: "Bitte wählen Sie eine Datei aus." });
    }
    const storageKey = `products/${productId}/${randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(storageKey, buffer, file.type || undefined);
    await prisma.digitalFile.create({
      data: {
        productId,
        fileName: file.name,
        storageKey,
        sizeBytes: BigInt(file.size),
      },
    });
    return data({ ok: true, message: `Datei „${file.name}“ hochgeladen.` });
  }

  if (intent === "deleteFile") {
    await prisma.digitalFile.delete({
      where: { id: String(formData.get("fileId")) },
    });
    return data({ ok: true, message: "Datei entfernt." });
  }

  return data({ ok: false, message: "Unbekannte Aktion." }, { status: 400 });
};

const DETAIL_DELIVERY_LABEL: Record<string, string> = {
  KEY: "Lizenzschlüssel",
  FILE: "Datei-Download",
  BOTH: "Schlüssel + Datei",
};

const HERO_CSS = `
  .kx-hero {
    display: flex; gap: 18px; align-items: center;
    background: linear-gradient(135deg, #ffffff, #f6f8fb);
    border: 1px solid #e5e7eb; border-radius: 18px; padding: 18px 20px;
    box-shadow: 0 1px 2px rgba(16,24,40,.05);
  }
  .kx-hero-thumb {
    width: 88px; height: 88px; flex: 0 0 auto; border-radius: 14px;
    background: #fff; border: 1px solid #eceff2; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .kx-hero-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 6px; box-sizing: border-box; }
  .kx-hero-noimg { font-size: 11px; color: #9aa3af; }
  .kx-hero-info { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .kx-hero-title { font-size: 17px; font-weight: 700; color: #111827; line-height: 1.3; }
  .kx-hero-badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .kx-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
`;

export default function ProductDetail() {
  const { product, available, assigned, files, links } =
    useLoaderData<typeof loader>();
  const settings = useFetcher<typeof action>();
  const keys = useFetcher<typeof action>();
  const upload = useFetcher<typeof action>();
  const linkFetcher = useFetcher<typeof action>();

  // Auto-save the delivery settings (incl. the customer message) a moment after
  // any change, so the merchant never has to click "Speichern".
  const settingsFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = settingsFormRef.current;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => settings.submit(form), 700);
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

  // Clear the link / key forms after a successful add, so the next entry is
  // immediate (smoother for adding several in a row).
  const linkFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (linkFetcher.state === "idle" && linkFetcher.data?.ok) {
      linkFormRef.current?.reset();
    }
  }, [linkFetcher.state, linkFetcher.data]);

  const keysFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (keys.state === "idle" && keys.data?.ok) {
      keysFormRef.current?.reset();
    }
  }, [keys.state, keys.data]);

  const low =
    (product.deliveryType === "KEY" || product.deliveryType === "BOTH") &&
    available < LOW_STOCK_THRESHOLD;

  return (
    <s-page heading={product.title}>
      <s-link slot="primary-action" href="/app/products">
        Zurück
      </s-link>

      {product.imageUrl !== undefined && (
        <>
          <style>{HERO_CSS}</style>
          <div className="kx-hero">
            <div className="kx-hero-thumb">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.title} />
              ) : (
                <span className="kx-hero-noimg">Kein Bild</span>
              )}
            </div>
            <div className="kx-hero-info">
              <div className="kx-hero-title">{product.title}</div>
              <div className="kx-hero-badges">
                <span className="kx-pill" style={{ background: "#eef2ff", color: "#3538cd" }}>
                  {DETAIL_DELIVERY_LABEL[product.deliveryType] ?? product.deliveryType}
                </span>
                {(product.deliveryType === "KEY" ||
                  product.deliveryType === "BOTH") && (
                  <span
                    className="kx-pill"
                    style={
                      low
                        ? { background: "#fde8e8", color: "#b42318" }
                        : { background: "#e7f7ec", color: "#1a7f37" }
                    }
                  >
                    {available} Schlüssel verfügbar
                  </span>
                )}
                {links.length > 0 && (
                  <span className="kx-pill" style={{ background: "#f1f5f9", color: "#334155" }}>
                    {links.length} Download-Link(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {low && (
        <s-banner tone="warning" heading="Niedriger Schlüsselbestand">
          <s-paragraph>
            Nur noch {available} Schlüssel verfügbar. Bitte laden Sie neue
            Schlüssel hoch.
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="Liefereinstellungen">
        {settings.data?.message && (
          <s-banner tone={settings.data.ok ? "success" : "critical"}>
            <s-paragraph>{settings.data.message}</s-paragraph>
          </s-banner>
        )}
        <settings.Form method="post" ref={settingsFormRef}>
          <input type="hidden" name="intent" value="settings" />
          <s-stack direction="block" gap="base">
            <s-select
              label="Lieferart"
              name="deliveryType"
              value={product.deliveryType}
            >
              <s-option value="KEY">Nur Lizenzschlüssel</s-option>
              <s-option value="FILE">Nur Datei-Download</s-option>
              <s-option value="BOTH">Schlüssel und Datei</s-option>
            </s-select>
            <s-number-field
              label="Maximale Downloads pro Link"
              name="downloadLimit"
              value={String(product.downloadLimit)}
              min={1}
            />
            <s-number-field
              label="Gültigkeit des Links (Stunden)"
              name="linkExpiryHours"
              value={String(product.linkExpiryHours)}
              min={1}
            />
            <s-text-area
              label="Nachricht an den Kunden (optional)"
              name="deliveryMessage"
              rows={4}
              value={product.deliveryMessage}
              placeholder="z. B. Installationsanleitung oder Hinweise zur Aktivierung."
            />
            <s-stack direction="inline" gap="small">
              <s-button type="submit" variant="primary">
                Speichern
              </s-button>
              <s-text color="subdued">
                {settings.state !== "idle"
                  ? "Wird gespeichert …"
                  : "Änderungen werden automatisch gespeichert"}
              </s-text>
            </s-stack>
          </s-stack>
        </settings.Form>
      </s-section>

      <s-section heading="Download-Links">
        <s-paragraph>
          Links, die dem Kunden nach dem Kauf angezeigt werden (z. B. Installer
          oder Anleitung). Es wird kein Datei-Upload benötigt – fügen Sie einfach
          die URL ein.
        </s-paragraph>
        {linkFetcher.data?.message && (
          <s-banner tone={linkFetcher.data.ok ? "success" : "critical"}>
            <s-paragraph>{linkFetcher.data.message}</s-paragraph>
          </s-banner>
        )}
        <linkFetcher.Form method="post" ref={linkFormRef}>
          <input type="hidden" name="intent" value="addLink" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Versionsname"
              name="version"
              placeholder="z. B. Windows · 64-Bit · Deutsch"
            />
            <s-text-field
              label="Button-Text"
              name="label"
              placeholder="Download + Anleitung"
            />
            <s-text-field label="URL" name="url" placeholder="https://…" />
            <s-button type="submit" variant="primary">
              Link hinzufügen
            </s-button>
          </s-stack>
        </linkFetcher.Form>

        {links.length > 0 && (
          <s-table>
            <s-table-header-row>
              <s-table-header>Version</s-table-header>
              <s-table-header>Button-Text</s-table-header>
              <s-table-header>Link</s-table-header>
              <s-table-header></s-table-header>
            </s-table-header-row>
            <s-table-body>
              {links.map((l) => (
                <s-table-row key={l.id}>
                  <s-table-cell>{l.version || "—"}</s-table-cell>
                  <s-table-cell>{l.label}</s-table-cell>
                  <s-table-cell>
                    <s-link href={l.url} target="_blank">
                      Öffnen
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <linkFetcher.Form method="post">
                      <input type="hidden" name="intent" value="deleteLink" />
                      <input type="hidden" name="linkId" value={l.id} />
                      <s-button type="submit" variant="tertiary" tone="critical">
                        Entfernen
                      </s-button>
                    </linkFetcher.Form>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section heading="Schlüssel hochladen">
        <s-stack direction="inline" gap="large">
          <s-badge tone={low ? "warning" : "success"}>
            Verfügbar: {String(available)}
          </s-badge>
          <s-badge>Zugewiesen: {String(assigned)}</s-badge>
        </s-stack>
        {keys.data?.message && (
          <s-banner tone={keys.data.ok ? "success" : "critical"}>
            <s-paragraph>{keys.data.message}</s-paragraph>
          </s-banner>
        )}
        <keys.Form method="post" encType="multipart/form-data" ref={keysFormRef}>
          <input type="hidden" name="intent" value="keys" />
          <s-stack direction="block" gap="base">
            <s-text-area
              label="Schlüssel einfügen (einer pro Zeile)"
              name="keys"
              rows={6}
              placeholder="ABCD-1234-EFGH-5678"
            />
            <s-text>oder CSV-Datei hochladen:</s-text>
            <input type="file" name="keysCsv" accept=".csv,text/csv" />
            <s-button type="submit" variant="primary">
              Schlüssel hinzufügen
            </s-button>
          </s-stack>
        </keys.Form>
      </s-section>

      <s-section heading="Dateien hochladen">
        {upload.data?.message && (
          <s-banner tone={upload.data.ok ? "success" : "critical"}>
            <s-paragraph>{upload.data.message}</s-paragraph>
          </s-banner>
        )}
        <upload.Form method="post" encType="multipart/form-data">
          <input type="hidden" name="intent" value="uploadFile" />
          <s-stack direction="block" gap="base">
            <input type="file" name="file" />
            <s-button type="submit" variant="primary">
              Datei hochladen
            </s-button>
          </s-stack>
        </upload.Form>

        {files.length > 0 && (
          <s-table>
            <s-table-header-row>
              <s-table-header>Dateiname</s-table-header>
              <s-table-header>Größe</s-table-header>
              <s-table-header></s-table-header>
            </s-table-header-row>
            <s-table-body>
              {files.map((f) => (
                <s-table-row key={f.id}>
                  <s-table-cell>{f.fileName}</s-table-cell>
                  <s-table-cell>
                    {(f.sizeBytes / 1024).toFixed(0)} KB
                  </s-table-cell>
                  <s-table-cell>
                    <upload.Form method="post">
                      <input type="hidden" name="intent" value="deleteFile" />
                      <input type="hidden" name="fileId" value={f.id} />
                      <s-button type="submit" variant="tertiary" tone="critical">
                        Entfernen
                      </s-button>
                    </upload.Form>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section heading="Vorschau – so sieht es der Kunde">
        <s-paragraph>
          So erscheint die Auslieferung auf der Dankesseite des Kunden. Der
          Lizenzschlüssel ist ein Beispiel – der echte Schlüssel wird beim Kauf
          automatisch zugewiesen.
        </s-paragraph>
        <div
          style={{
            maxWidth: "520px",
            border: "1px solid #e0e4e2",
            borderRadius: "12px",
            padding: "20px",
            background: "#fafbfb",
          }}
        >
          <div
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "#0b3d2e",
              marginBottom: "6px",
            }}
          >
            {product.title}
          </div>

          {product.deliveryMessage && (
            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#444",
                whiteSpace: "pre-line",
                margin: "8px 0",
              }}
            >
              {product.deliveryMessage}
            </div>
          )}

          {(product.deliveryType === "KEY" ||
            product.deliveryType === "BOTH") && (
            <div style={{ margin: "14px 0" }}>
              <div style={{ fontSize: "12px", color: "#777" }}>
                Ihr Lizenzschlüssel:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  background: "#f4f6f5",
                  border: "1px solid #e0e4e2",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  display: "inline-block",
                  marginTop: "4px",
                }}
              >
                ABCD-1234-EFGH-5678
              </div>
            </div>
          )}

          <div style={{ marginTop: "8px" }}>
            {links.map((l) => (
              <div key={l.id} style={{ marginTop: "10px" }}>
                {l.version && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#555",
                      marginBottom: "4px",
                    }}
                  >
                    {l.version}
                  </div>
                )}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    background: "#0b3d2e",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 600,
                    padding: "12px 22px",
                    borderRadius: "8px",
                    marginRight: "8px",
                  }}
                >
                  {l.label}
                </a>
              </div>
            ))}
            {files.map((f) => (
              <span
                key={f.id}
                style={{
                  display: "inline-block",
                  background: "#0b3d2e",
                  color: "#fff",
                  fontWeight: 600,
                  padding: "12px 22px",
                  borderRadius: "8px",
                  marginRight: "8px",
                  marginTop: "8px",
                }}
              >
                {f.fileName}
              </span>
            ))}
          </div>

          {links.length === 0 &&
            files.length === 0 &&
            product.deliveryType === "FILE" && (
              <div style={{ fontSize: "13px", color: "#b00", marginTop: "8px" }}>
                Noch keine Download-Links oder Dateien – der Kunde sieht keinen
                Download-Button.
              </div>
            )}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
