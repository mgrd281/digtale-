import { Readable } from "node:stream";
import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { getFileStream } from "../lib/storage.server";

function errorPage(message: string, status: number): Response {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
    <title>KARINEX – Download</title></head>
    <body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;
       max-width:560px;margin:80px auto;padding:0 24px;color:#222;text-align:center;">
      <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:#0b3d2e;">KARINEX</div>
      <h1 style="font-size:20px;margin-top:24px;">Download nicht möglich</h1>
      <p style="font-size:15px;line-height:1.6;color:#555;">${message}</p>
      <p style="font-size:13px;color:#999;margin-top:24px;">
        Bei Fragen erreichen Sie uns unter
        <a href="mailto:kundenservice@karinex.de">kundenservice@karinex.de</a>.
      </p>
    </body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const token = params.token ?? "";

  const row = await prisma.downloadToken.findUnique({
    where: { token },
    include: { file: true },
  });

  if (!row) {
    return errorPage(
      "Dieser Download-Link ist ungültig. Bitte prüfen Sie den Link aus Ihrer E-Mail.",
      404,
    );
  }

  if (row.revoked) {
    return errorPage("Dieser Download-Link wurde widerrufen.", 410);
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return errorPage(
      "Dieser Download-Link ist abgelaufen. Bitte kontaktieren Sie uns für einen neuen Link.",
      410,
    );
  }
  if (row.downloadCount >= row.maxDownloads) {
    return errorPage(
      "Die maximale Anzahl an Downloads für diesen Link wurde erreicht.",
      410,
    );
  }

  // Atomically consume one download. The guard re-checks every limit so a race
  // can never push the count past maxDownloads or serve an expired/revoked link.
  const consumed = await prisma.$executeRaw`
    UPDATE "DownloadToken"
    SET "downloadCount" = "downloadCount" + 1
    WHERE "id" = ${row.id}
      AND "revoked" = false
      AND "expiresAt" > now()
      AND "downloadCount" < "maxDownloads"
  `;
  if (consumed === 0) {
    return errorPage(
      "Die maximale Anzahl an Downloads für diesen Link wurde erreicht.",
      410,
    );
  }

  let file;
  try {
    file = await getFileStream(row.file.storageKey);
  } catch (error) {
    // Roll the counter back: the customer never received the file.
    await prisma.downloadToken.update({
      where: { id: row.id },
      data: { downloadCount: { decrement: 1 } },
    });
    console.error(`Storage error for token ${row.id}:`, error);
    return errorPage(
      "Die Datei ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.",
      502,
    );
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    file.contentType || "application/octet-stream",
  );
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(row.file.fileName)}"`,
  );
  if (file.contentLength) {
    headers.set("Content-Length", String(file.contentLength));
  }
  headers.set("Cache-Control", "private, no-store");

  const webStream = Readable.toWeb(file.stream) as unknown as ReadableStream;
  return new Response(webStream, { status: 200, headers });
};
