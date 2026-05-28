import { randomUUID } from "node:crypto";
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
import { LOW_STOCK_THRESHOLD } from "../lib/fulfillment.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      files: { orderBy: { createdAt: "desc" } },
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
      deliveryType: product.deliveryType,
      downloadLimit: product.downloadLimit,
      linkExpiryHours: product.linkExpiryHours,
    },
    available,
    assigned,
    files: product.files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      sizeBytes: Number(f.sizeBytes),
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
      },
    });
    return data({ ok: true, message: "Einstellungen gespeichert." });
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

export default function ProductDetail() {
  const { product, available, assigned, files } = useLoaderData<typeof loader>();
  const settings = useFetcher<typeof action>();
  const keys = useFetcher<typeof action>();
  const upload = useFetcher<typeof action>();

  const low =
    (product.deliveryType === "KEY" || product.deliveryType === "BOTH") &&
    available < LOW_STOCK_THRESHOLD;

  return (
    <s-page heading={product.title}>
      <s-link slot="primary-action" href="/app/products">
        Zurück
      </s-link>

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
        <settings.Form method="post">
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
            <s-button type="submit" variant="primary">
              Speichern
            </s-button>
          </s-stack>
        </settings.Form>
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
        <keys.Form method="post" encType="multipart/form-data">
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
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
