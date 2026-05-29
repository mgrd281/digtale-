import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, Link, data } from "react-router";
import {
  isAdmin,
  requireStaffAdmin,
  requireStaffUser,
} from "../lib/staff-auth.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireStaffUser(request);
  const shop = decodeURIComponent(params.shop ?? "");
  const productId = params.productId as string;

  const product = await prisma.product.findFirst({
    where: { id: productId, shop },
    include: {
      links: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) {
    throw new Response("Produkt nicht gefunden.", { status: 404 });
  }

  const [available, assigned, keys] = await Promise.all([
    prisma.licenseKey.count({ where: { productId, status: "AVAILABLE" } }),
    prisma.licenseKey.count({ where: { productId, status: "ASSIGNED" } }),
    prisma.licenseKey.findMany({
      where: { productId, status: "AVAILABLE" },
      orderBy: { id: "asc" },
      select: { id: true, keyValue: true },
      take: 500,
    }),
  ]);

  return {
    shop,
    canEdit: isAdmin(user),
    product: {
      id: product.id,
      title: product.title,
      deliveryType: product.deliveryType,
      downloadLimit: product.downloadLimit,
      linkExpiryHours: product.linkExpiryHours,
      deliverUnpaid: product.deliverUnpaid,
      deliveryMessage: product.deliveryMessage ?? "",
    },
    available,
    assigned,
    keys,
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
  await requireStaffAdmin(request);
  const shop = decodeURIComponent(params.shop ?? "");
  const productId = params.productId as string;

  // Verify the product belongs to this shop; child mutations are scoped by it.
  const product = await prisma.product.findFirst({
    where: { id: productId, shop },
    select: { id: true },
  });
  if (!product) throw new Response("Produkt nicht gefunden.", { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "settings") {
    await prisma.product.update({
      where: { id: productId },
      data: {
        deliveryType: String(form.get("deliveryType")) as "KEY" | "FILE" | "BOTH",
        downloadLimit: Math.max(1, Number(form.get("downloadLimit")) || 1),
        linkExpiryHours: Math.max(1, Number(form.get("linkExpiryHours")) || 1),
        deliverUnpaid: form.get("deliverUnpaid") === "true",
        deliveryMessage: String(form.get("deliveryMessage") ?? "").trim() || null,
      },
    });
    return data({ ok: true, message: "Einstellungen gespeichert." });
  }

  if (intent === "addLink") {
    const url = String(form.get("url") ?? "").trim();
    if (!/^https?:\/\//i.test(url)) {
      return data({ ok: false, message: "Bitte eine gültige URL (http/https) angeben." });
    }
    await prisma.productLink.create({
      data: {
        productId,
        label: String(form.get("label") ?? "").trim() || "Download",
        version: String(form.get("version") ?? "").trim() || null,
        url,
      },
    });
    return data({ ok: true, message: "Download-Link hinzugefügt." });
  }

  if (intent === "deleteLink") {
    await prisma.productLink.deleteMany({
      where: { id: String(form.get("linkId")), productId },
    });
    return data({ ok: true, message: "Link entfernt." });
  }

  if (intent === "keys") {
    const values = parseKeys(String(form.get("keys") ?? ""));
    if (values.length === 0) {
      return data({ ok: false, message: "Keine gültigen Schlüssel gefunden." });
    }
    const result = await prisma.licenseKey.createMany({
      data: values.map((keyValue) => ({ productId, keyValue })),
      skipDuplicates: true,
    });
    return data({
      ok: true,
      message: `${result.count} Schlüssel hinzugefügt (${values.length - result.count} Duplikate übersprungen).`,
    });
  }

  if (intent === "deleteKey") {
    const result = await prisma.licenseKey.deleteMany({
      where: { id: String(form.get("keyId")), productId, status: "AVAILABLE" },
    });
    return data({
      ok: result.count > 0,
      message: result.count > 0 ? "Schlüssel entfernt." : "Schlüssel nicht entfernbar (zugewiesen).",
    });
  }

  return data({ ok: false, message: "Unbekannte Aktion." }, { status: 400 });
}

export default function StaffProductControl() {
  const { shop, product, available, assigned, keys, links, canEdit } =
    useLoaderData<typeof loader>();
  const settings = useFetcher<{ ok: boolean; message: string }>();
  const linkF = useFetcher<{ ok: boolean; message: string }>();
  const keyF = useFetcher<{ ok: boolean; message: string }>();

  return (
    <>
      <Link to={`/staff/shops/${encodeURIComponent(shop)}`} className="kxs-back">
        ← Zurück zum Shop
      </Link>
      <h1 className="kxs-h1" style={{ marginTop: 8 }}>
        {product.title}
        <span className="sub">{shop}</span>
      </h1>

      {!canEdit && (
        <div className="kxs-banner err">
          Nur-Lese-Zugriff: Änderungen sind Administratoren vorbehalten.
        </div>
      )}

      <div className="kxs-grid2">
        {/* Delivery settings */}
        <div>
          <div className="kxs-sec">Liefereinstellungen</div>
          <div className="kxs-panel" style={{ padding: 18 }}>
            {settings.data?.message && (
              <div className={"kxs-banner " + (settings.data.ok ? "ok" : "err")}>
                {settings.data.message}
              </div>
            )}
            <settings.Form method="post">
              <input type="hidden" name="intent" value="settings" />
              <div className="kxs-field">
                <label>Lieferart</label>
                <select className="kxs-select" name="deliveryType" defaultValue={product.deliveryType} disabled={!canEdit}>
                  <option value="KEY">Nur Lizenzschlüssel</option>
                  <option value="FILE">Nur Datei-Download</option>
                  <option value="BOTH">Schlüssel + Datei</option>
                </select>
              </div>
              <div className="kxs-field">
                <label>Maximale Downloads pro Link</label>
                <input className="kxs-input" type="number" name="downloadLimit" min={1} defaultValue={product.downloadLimit} disabled={!canEdit} />
              </div>
              <div className="kxs-field">
                <label>Gültigkeit des Links (Stunden)</label>
                <input className="kxs-input" type="number" name="linkExpiryHours" min={1} defaultValue={product.linkExpiryHours} disabled={!canEdit} />
              </div>
              <div className="kxs-field">
                <label>Sofort-Auslieferung bei Vorkasse</label>
                <select className="kxs-select" name="deliverUnpaid" defaultValue={product.deliverUnpaid ? "true" : "false"} disabled={!canEdit}>
                  <option value="false">Nein – erst nach Zahlung</option>
                  <option value="true">Ja – schon bei Bestellung</option>
                </select>
              </div>
              <div className="kxs-field">
                <label>Nachricht an den Kunden</label>
                <textarea className="kxs-textarea" name="deliveryMessage" defaultValue={product.deliveryMessage} disabled={!canEdit} />
              </div>
              {canEdit && (
                <button type="submit" className="kxs-btn">
                  Speichern
                </button>
              )}
            </settings.Form>
          </div>
        </div>

        {/* License keys */}
        <div>
          <div className="kxs-sec">
            Lizenzschlüssel
            <span className="kxs-ro">{available} frei · {assigned} zugewiesen</span>
          </div>
          <div className="kxs-panel" style={{ padding: 18 }}>
            {keyF.data?.message && (
              <div className={"kxs-banner " + (keyF.data.ok ? "ok" : "err")}>
                {keyF.data.message}
              </div>
            )}
            {canEdit && (
              <keyF.Form method="post" style={{ marginBottom: 14 }}>
                <input type="hidden" name="intent" value="keys" />
                <div className="kxs-field">
                  <label>Schlüssel einfügen (einer pro Zeile)</label>
                  <textarea className="kxs-textarea" name="keys" placeholder="ABCD-1234-EFGH-5678" />
                </div>
                <button type="submit" className="kxs-btn">Schlüssel hinzufügen</button>
              </keyF.Form>
            )}
            {keys.length > 0 && (
              <table className="kxs-table">
                <thead>
                  <tr>
                    <th>Verfügbare Schlüssel</th>
                    {canEdit && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id}>
                      <td style={{ fontFamily: "monospace" }}>{k.keyValue}</td>
                      {canEdit && (
                        <td>
                          <keyF.Form method="post">
                            <input type="hidden" name="intent" value="deleteKey" />
                            <input type="hidden" name="keyId" value={k.id} />
                            <button type="submit" className="kxs-btn mini danger">Entfernen</button>
                          </keyF.Form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Download links */}
      <div className="kxs-sec">Download-Links</div>
      <div className="kxs-panel" style={{ padding: 18 }}>
        {linkF.data?.message && (
          <div className={"kxs-banner " + (linkF.data.ok ? "ok" : "err")}>
            {linkF.data.message}
          </div>
        )}
        {canEdit && (
          <linkF.Form method="post" style={{ marginBottom: 14 }}>
            <input type="hidden" name="intent" value="addLink" />
            <div className="kxs-grid2">
              <div className="kxs-field">
                <label>Versionsname (optional)</label>
                <input className="kxs-input" name="version" placeholder="z. B. Windows 11 Pro" />
              </div>
              <div className="kxs-field">
                <label>Button-Text</label>
                <input className="kxs-input" name="label" placeholder="Herunterladen" />
              </div>
            </div>
            <div className="kxs-field">
              <label>URL</label>
              <input className="kxs-input" name="url" placeholder="https://…" />
            </div>
            <button type="submit" className="kxs-btn">Link hinzufügen</button>
          </linkF.Form>
        )}
        {links.length > 0 && (
          <table className="kxs-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Button-Text</th>
                <th>Link</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>{l.version || "—"}</td>
                  <td>{l.label}</td>
                  <td>
                    <a className="kxs-link" href={l.url} target="_blank" rel="noreferrer">Öffnen</a>
                  </td>
                  {canEdit && (
                    <td>
                      <linkF.Form method="post">
                        <input type="hidden" name="intent" value="deleteLink" />
                        <input type="hidden" name="linkId" value={l.id} />
                        <button type="submit" className="kxs-btn mini danger">Entfernen</button>
                      </linkF.Form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
