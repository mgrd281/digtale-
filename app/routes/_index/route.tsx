import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};

const CSS = `
  *{box-sizing:border-box}
  body{margin:0}
  .lp{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6;background:#fff;}
  .lp a{color:inherit;text-decoration:none}
  .lp-wrap{max-width:1080px;margin:0 auto;padding:0 22px}
  .lp-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
  .lp-logo{font-weight:800;letter-spacing:2px;font-size:17px;color:#0b3d2e}
  .lp-nav-links{display:flex;align-items:center;gap:24px;font-size:14px;font-weight:550;color:#475569}
  .lp-nav-links a:hover{color:#0b3d2e}
  .lp-cta{background:#0b3d2e;color:#fff !important;padding:9px 18px;border-radius:10px;font-weight:600}
  .lp-cta:hover{background:#14573f}
  .lp-hero{background:radial-gradient(1200px 500px at 50% -120px,#10503b 0%,#0b3d2e 45%,#08291f 100%);color:#eaf4ef;padding:64px 0 88px;text-align:center;border-radius:0 0 36px 36px}
  .lp-badge{display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);padding:6px 14px;border-radius:999px;font-size:13px;color:#bfe7d6;margin-bottom:22px}
  .lp-h1{font-size:46px;line-height:1.1;font-weight:820;margin:0 auto 18px;max-width:760px;color:#fff;letter-spacing:-.5px}
  .lp-sub{font-size:18px;color:#bcd9cd;max-width:600px;margin:0 auto 32px}
  .lp-form{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;max-width:480px;margin:0 auto}
  .lp-input{flex:1;min-width:240px;padding:14px 16px;border:0;border-radius:12px;font-size:15px;outline:none}
  .lp-btn{background:#1bbf73;color:#04231a;border:0;border-radius:12px;padding:14px 24px;font-size:15px;font-weight:750;cursor:pointer;white-space:nowrap}
  .lp-btn:hover{background:#15a763}
  .lp-hint{font-size:13px;color:#8fb9aa;margin-top:14px}
  .lp-trust{margin-top:30px;display:flex;gap:24px;justify-content:center;flex-wrap:wrap;font-size:13px;color:#9fc6b7}
  .lp-trust span{display:flex;align-items:center;gap:7px}
  .lp-sec{padding:72px 0}
  .lp-eyebrow{text-align:center;color:#1a7f37;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px}
  .lp-h2{text-align:center;font-size:32px;font-weight:780;margin:0 auto 14px;max-width:620px;letter-spacing:-.4px}
  .lp-lead{text-align:center;color:#64748b;max-width:560px;margin:0 auto 46px;font-size:16px}
  .lp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
  .lp-feat{background:#fff;border:1px solid #e6ece9;border-radius:18px;padding:26px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
  .lp-fi{width:46px;height:46px;border-radius:13px;background:#e7f7ec;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px}
  .lp-feat h3{margin:0 0 8px;font-size:17px;font-weight:720}
  .lp-feat p{margin:0;color:#64748b;font-size:14.5px}
  .lp-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px}
  .lp-step{position:relative;padding:24px;border:1px dashed #cfddd6;border-radius:18px}
  .lp-step .n{width:34px;height:34px;border-radius:10px;background:#0b3d2e;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
  .lp-step h3{margin:0 0 6px;font-size:16px}
  .lp-step p{margin:0;color:#64748b;font-size:14px}
  .lp-price-wrap{background:#f5f8f7;border-radius:28px;padding:64px 22px}
  .lp-price{max-width:420px;margin:0 auto;background:#fff;border:1px solid #e6ece9;border-radius:22px;padding:34px;text-align:center;box-shadow:0 16px 40px rgba(11,61,46,.10)}
  .lp-price .amt{font-size:52px;font-weight:840;color:#0b3d2e;letter-spacing:-1px}
  .lp-price .amt span{font-size:17px;font-weight:600;color:#64748b}
  .lp-price ul{list-style:none;padding:0;margin:22px 0;text-align:left;display:grid;gap:11px}
  .lp-price li{display:flex;gap:10px;font-size:14.5px;color:#334155}
  .lp-price li b{color:#1a7f37}
  .lp-foot{background:#08291f;color:#9fc6b7;padding:40px 0;font-size:13.5px}
  .lp-foot .row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;align-items:center}
  @media(max-width:640px){.lp-h1{font-size:34px}.lp-h2{font-size:26px}.lp-nav-links a:not(.lp-cta){display:none}}
`;

const FEATURES: [string, string, string][] = [
  ["⚡", "Sofortige Auslieferung", "Lizenzschlüssel, Datei-Downloads und Links erscheinen sofort nach dem Kauf – auf der Bestellseite und per E-Mail."],
  ["🔑", "Schlüssel-Verwaltung", "Schlüssel-Pools je Produkt, automatische sichere Zuweisung und Lagerwarnungen bei niedrigem Bestand."],
  ["🌍", "10 Sprachen", "Vollständig übersetzte Oberfläche (inkl. Arabisch RTL) – die passende Sprache wird automatisch gewählt."],
  ["💳", "Vorkasse-Auslieferung", "Optional schon bei Bestellung ausliefern (Vorkasse/Überweisung) – global oder pro Produkt einstellbar."],
  ["🔒", "Sichere Download-Links", "Ablaufende, limitierte Links mit Widerruf – volle Kontrolle über jeden Download."],
  ["📊", "Kontrollzentrum", "Übersicht über alle Shops, Bestellungen, Einnahmen und das Team – an einem Ort."],
];

const STEPS: [string, string][] = [
  ["App installieren", "Mit einem Klick im Shopify-Shop installieren – keine Programmierung nötig."],
  ["Produkte einrichten", "Schlüssel hochladen oder Download-Links hinterlegen, Sprache & Nachricht wählen."],
  ["Automatisch ausliefern", "Jede Bestellung wird sofort und zuverlässig digital ausgeliefert."],
];

export default function Landing() {
  const { showForm } = useLoaderData<typeof loader>();
  return (
    <div className="lp">
      <style>{CSS}</style>

      <div className="lp-wrap">
        <nav className="lp-nav">
          <div className="lp-logo">KARINEX</div>
          <div className="lp-nav-links">
            <a href="#features">Funktionen</a>
            <a href="#how">So funktioniert's</a>
            <a href="#pricing">Preis</a>
            <a className="lp-cta" href="#start">Loslegen</a>
          </div>
        </nav>
      </div>

      <header className="lp-hero" id="start">
        <div className="lp-wrap">
          <div className="lp-badge">Digitale Auslieferung für Shopify</div>
          <h1 className="lp-h1">Verkaufe digitale Produkte. Wir liefern sie sofort aus.</h1>
          <p className="lp-sub">
            Lizenzschlüssel, Software und Downloads – automatisch, sicher und in
            der Sprache deiner Kunden. Sekunden nach dem Kauf.
          </p>
          {showForm && (
            <Form className="lp-form" method="post" action="/auth/login">
              <input className="lp-input" type="text" name="shop" placeholder="dein-shop.myshopify.com" />
              <button className="lp-btn" type="submit">Kostenlos starten</button>
            </Form>
          )}
          <div className="lp-hint">3 Tage kostenlos testen · keine Kreditkarte für die Installation</div>
          <div className="lp-trust">
            <span>✓ In Minuten startklar</span>
            <span>✓ DSGVO-konform</span>
            <span>✓ 10 Sprachen</span>
          </div>
        </div>
      </header>

      <section className="lp-sec" id="features">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Funktionen</div>
          <h2 className="lp-h2">Alles für den digitalen Verkauf</h2>
          <p className="lp-lead">Von der Schlüsselverwaltung bis zur mehrsprachigen Auslieferung – alles eingebaut.</p>
          <div className="lp-grid">
            {FEATURES.map(([ic, title, d]) => (
              <div className="lp-feat" key={title}>
                <div className="lp-fi">{ic}</div>
                <h3>{title}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="how" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-eyebrow">So funktioniert's</div>
          <h2 className="lp-h2">In drei Schritten startklar</h2>
          <div className="lp-steps">
            {STEPS.map(([title, d], i) => (
              <div className="lp-step" key={title}>
                <div className="n">{i + 1}</div>
                <h3>{title}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="pricing">
        <div className="lp-wrap">
          <div className="lp-price-wrap">
            <div className="lp-eyebrow">Preis</div>
            <h2 className="lp-h2">Ein einfacher Plan</h2>
            <div className="lp-price">
              <div className="amt">9,99 $<span> / Monat</span></div>
              <ul>
                <li><b>✓</b> 3 Tage kostenlos testen</li>
                <li><b>✓</b> Unbegrenzte Produkte &amp; Bestellungen</li>
                <li><b>✓</b> Schlüssel, Dateien &amp; Download-Links</li>
                <li><b>✓</b> 10 Sprachen inkl. Arabisch (RTL)</li>
                <li><b>✓</b> Sichere, ablaufende Downloads</li>
              </ul>
              {showForm && (
                <Form method="post" action="/auth/login">
                  <input
                    className="lp-input"
                    type="text"
                    name="shop"
                    placeholder="dein-shop.myshopify.com"
                    style={{ width: "100%", border: "1px solid #d6dedb", marginBottom: 12 }}
                  />
                  <button className="lp-btn" type="submit" style={{ width: "100%" }}>
                    Jetzt starten
                  </button>
                </Form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap row">
          <div className="lp-logo" style={{ color: "#fff" }}>KARINEX</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <a href="/privacy" style={{ color: "#9fc6b7" }}>Datenschutz</a>
            <a href="/terms" style={{ color: "#9fc6b7" }}>Nutzungsbedingungen</a>
            <span>© {new Date().getFullYear()} KARINEX</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
