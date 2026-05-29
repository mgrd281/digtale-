// Public privacy policy (required for the Shopify App Store listing).
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

export default function Privacy() {
  return (
    <main className="lg">
      <style>{CSS}</style>
      <div className="brand">KARINEX</div>
      <h1>Datenschutzerklärung</h1>
      <div className="upd">Stand: Mai 2026</div>

      <p>
        Diese Datenschutzerklärung gilt für die App „KARINEX Fulfillment" (die
        „App"), die digitale Produkte (Lizenzschlüssel, Dateien und Download-Links)
        für Shopify-Shops automatisch ausliefert.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        KARINEX · Digitale Auslieferung. Kontakt:{" "}
        <a href="mailto:kundenservice@karinex.de">kundenservice@karinex.de</a>.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><b>Shop-Daten:</b> Shop-Domain, Zugriffstoken und Einstellungen der App.</li>
        <li><b>Produktdaten:</b> Titel, IDs sowie die vom Händler hinterlegten Lizenzschlüssel, Dateien und Download-Links.</li>
        <li><b>Bestelldaten:</b> Bestellnummer, gekaufte Produkte und die E-Mail-Adresse des Kunden – ausschließlich zur Auslieferung der digitalen Inhalte.</li>
      </ul>

      <h2>3. Zweck & Rechtsgrundlage</h2>
      <p>
        Die Daten werden ausschließlich zur Bereitstellung der digitalen
        Auslieferung verarbeitet (Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung).
        Es findet kein Verkauf oder Weitergabe der Daten zu Werbezwecken statt.
      </p>

      <h2>4. Auftragsverarbeiter</h2>
      <p>
        Zur Bereitstellung nutzen wir Shopify (Plattform), eine gehostete
        Datenbank und einen Hosting-Anbieter. Diese verarbeiten Daten
        ausschließlich in unserem Auftrag.
      </p>

      <h2>5. Speicherdauer & Löschung</h2>
      <p>
        Wir speichern die Daten nur, solange die App installiert ist. Auf
        Anfrage eines Kunden (customers/redact) anonymisieren wir dessen
        personenbezogene Daten. 48 Stunden nach Deinstallation der App
        (shop/redact) werden sämtliche Daten des Shops gelöscht.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung sowie Datenübertragbarkeit. Anfragen
        richten Sie an{" "}
        <a href="mailto:kundenservice@karinex.de">kundenservice@karinex.de</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Im internen Kontrollzentrum setzen wir ein technisch notwendiges
        Sitzungs-Cookie für die Anmeldung. Es dient ausschließlich der
        Authentifizierung und nicht der Analyse oder Werbung.
      </p>

      <a className="back" href="/">← Zurück zur Startseite</a>
    </main>
  );
}
