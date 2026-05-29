// Customer-facing strings. German (Sie-Form, premium tone) is the default and
// must not be reworded; English is offered for non-German buyers.

export interface Strings {
  emailSubject: (orderName: string) => string;
  emailGreeting: string;
  emailIntro: string;
  keyLabel: string;
  downloadButton: string;
  validityNote: (linkExpiryHours: number, downloadLimit: number) => string;
  footer: string;
  heading: string;
  pending: string;
  legal: string;
}

export const de: Strings = {
  emailSubject: (orderName: string) =>
    `Ihre KARINEX-Bestellung ${orderName}: Lizenzschlüssel & Download`,
  emailGreeting: "Sehr geehrte Kundin, sehr geehrter Kunde,",
  emailIntro:
    "vielen Dank für Ihren Einkauf bei KARINEX. Nachfolgend finden Sie Ihren Lizenzschlüssel sowie den Download-Link zu Ihrem Produkt.",
  keyLabel: "Ihr Lizenzschlüssel:",
  downloadButton: "Download + Anleitung",
  validityNote: (linkExpiryHours: number, downloadLimit: number) =>
    `Der Download-Link ist ${linkExpiryHours} Stunden gültig und kann bis zu ${downloadLimit}-mal genutzt werden.`,
  footer: "Bei Fragen erreichen Sie uns unter kundenservice@karinex.de.",
  heading: "Ihre Downloads & Lizenzschlüssel",
  pending:
    "Ihre Lieferung wird vorbereitet. Sie erhalten in Kürze eine E-Mail mit Ihrem Lizenzschlüssel und Download-Link.",
  // § 356 Abs. 5 BGB – start of contract performance / waiver of withdrawal.
  legal:
    "Mit dem Download beginnt die Ausführung des Vertrags. Ihr Widerrufsrecht erlischt gemäß § 356 Abs. 5 BGB.",
};

export const en: Strings = {
  emailSubject: (orderName: string) =>
    `Your KARINEX order ${orderName}: licence key & download`,
  emailGreeting: "Dear customer,",
  emailIntro:
    "thank you for your purchase at KARINEX. Below you will find your licence key and the download link for your product.",
  keyLabel: "Your licence key:",
  downloadButton: "Download + guide",
  validityNote: (linkExpiryHours: number, downloadLimit: number) =>
    `The download link is valid for ${linkExpiryHours} hours and can be used up to ${downloadLimit} times.`,
  footer: "If you have any questions, contact us at kundenservice@karinex.de.",
  heading: "Your downloads & licence keys",
  pending:
    "Your delivery is being prepared. You will shortly receive an e-mail with your licence key and download link.",
  legal:
    "Downloading starts the performance of the contract. Your right of withdrawal expires pursuant to § 356 (5) German Civil Code.",
};

// Pick a string set from a Shopify/BCP-47 locale. Defaults to German.
export function getStrings(locale?: string | null): Strings {
  return locale && locale.toLowerCase().startsWith("en") ? en : de;
}
