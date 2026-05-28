// Customer-facing German strings (Sie-Form, premium tone).
// Used verbatim per the KARINEX brand spec. Do not translate.

export const de = {
  emailSubject: (orderName: string) =>
    `Ihre KARINEX-Bestellung ${orderName}: Lizenzschlüssel & Download`,
  emailGreeting: "Sehr geehrte Kundin, sehr geehrter Kunde,",
  emailIntro:
    "vielen Dank für Ihren Einkauf bei KARINEX. Nachfolgend finden Sie Ihren Lizenzschlüssel sowie den Download-Link zu Ihrem Produkt.",
  keyLabel: "Ihr Lizenzschlüssel:",
  downloadButton: "Produkt herunterladen",
  validityNote: (linkExpiryHours: number, downloadLimit: number) =>
    `Der Download-Link ist ${linkExpiryHours} Stunden gültig und kann bis zu ${downloadLimit}-mal genutzt werden.`,
  footer: "Bei Fragen erreichen Sie uns unter kundenservice@karinex.de.",
  heading: "Ihr digitales Produkt",
  pending:
    "Ihre Lieferung wird vorbereitet. Sie erhalten in Kürze eine E-Mail mit Ihrem Lizenzschlüssel und Download-Link.",
  // § 356 Abs. 5 BGB – start of contract performance / waiver of withdrawal.
  legal:
    "Mit dem Download beginnt die Ausführung des Vertrags. Ihr Widerrufsrecht erlischt gemäß § 356 Abs. 5 BGB.",
} as const;
