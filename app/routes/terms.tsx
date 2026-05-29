// Public terms of service.
const CSS = `
  .lg{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.7;max-width:760px;margin:0 auto;padding:48px 22px 80px}
  .lg a{color:#0b3d2e}
  .lg .brand{font-weight:800;letter-spacing:2px;color:#0b3d2e;font-size:15px}
  .lg h1{font-size:30px;margin:14px 0 4px}
  .lg .upd{color:#6b7280;font-size:13px;margin-bottom:30px}
  .lg h2{font-size:18px;margin:30px 0 8px;color:#0b3d2e}
  .lg p,.lg li{font-size:15px}
  .lg ul{padding-left:20px}
  .lg .back{display:inline-block;margin-top:36px;color:#0b3d2e;text-decoration:none;font-weight:600}
`;

export default function Terms() {
  return (
    <main className="lg">
      <style>{CSS}</style>
      <div className="brand">KARINEX</div>
      <h1>Nutzungsbedingungen</h1>
      <div className="upd">Stand: Mai 2026</div>

      <h2>1. Leistung</h2>
      <p>
        KARINEX Fulfillment liefert digitale Produkte (Lizenzschlüssel, Dateien,
        Download-Links) für Shopify-Shops automatisch nach dem Kauf aus.
      </p>

      <h2>2. Abonnement & Testphase</h2>
      <p>
        Die Nutzung erfolgt im Abonnement (Starter, Pro oder Business) mit einer
        kostenlosen Testphase von 3 Tagen. Die Abrechnung läuft über Shopify
        Billing; die Kündigung ist jederzeit durch Deinstallation der App
        möglich.
      </p>

      <h2>3. Pflichten des Händlers</h2>
      <ul>
        <li>Hinterlegung gültiger Lizenzschlüssel bzw. Download-Inhalte.</li>
        <li>Rechtmäßiger Vertrieb der angebotenen digitalen Produkte.</li>
      </ul>

      <h2>4. Verfügbarkeit & Haftung</h2>
      <p>
        Wir bemühen uns um eine hohe Verfügbarkeit, können diese jedoch nicht
        unterbrechungsfrei garantieren. Die Haftung ist auf Vorsatz und grobe
        Fahrlässigkeit beschränkt, soweit gesetzlich zulässig.
      </p>

      <h2>5. Datenschutz</h2>
      <p>
        Es gilt unsere <a href="/privacy">Datenschutzerklärung</a>.
      </p>

      <h2>6. Kontakt</h2>
      <p>
        <a href="mailto:kundenservice@karinex.de">kundenservice@karinex.de</a>
      </p>

      <a className="back" href="/">← Zurück zur Startseite</a>
    </main>
  );
}
