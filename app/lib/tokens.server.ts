import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

// Cryptographically random, URL-safe download token (256 bits).
export function generateDownloadToken(): string {
  return randomBytes(32).toString("base64url");
}

// HMAC helpers for signing/verifying internal requests (extension -> backend
// fallback, and any other server-to-server signature need).
export function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = sign(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
