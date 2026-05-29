import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, Form, Link } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireStaffUser(request);
  return { email: user.email, role: user.role };
};

const SHELL_CSS = `
  :root { --kxs-green:#0b3d2e; --kxs-green2:#14573f; --kxs-ink:#0f172a; --kxs-mut:#64748b; }
  body { margin: 0; background: #f1f5f4; }
  * { box-sizing: border-box; }
  .kxs { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: var(--kxs-ink);
    display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
  .kxs-side { background: linear-gradient(180deg, #0b3d2e, #0a2a21); color: #cfe6dc; display: flex; flex-direction: column; padding: 20px 14px; position: sticky; top: 0; height: 100vh; }
  .kxs-logo { font-weight: 800; letter-spacing: 2px; font-size: 15px; color: #fff; padding: 6px 10px 18px; }
  .kxs-logo small { display:block; font-weight:600; letter-spacing:0; font-size:11px; color:#84b6a3; margin-top:3px; }
  .kxs-nav { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .kxs-nav a { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; color: #bfe0d3; text-decoration: none; font-size: 14px; font-weight: 550; }
  .kxs-nav a:hover { background: rgba(255,255,255,.07); color: #fff; }
  .kxs-nav a.active { background: rgba(255,255,255,.14); color: #fff; }
  .kxs-nav svg { width: 18px; height: 18px; flex: 0 0 auto; opacity: .9; }
  .kxs-user { border-top: 1px solid rgba(255,255,255,.12); padding-top: 14px; font-size: 12px; }
  .kxs-user .em { color: #fff; font-weight: 600; word-break: break-all; }
  .kxs-user .rl { color: #84b6a3; margin-top: 2px; }
  .kxs-logout { margin-top: 10px; width: 100%; background: rgba(255,255,255,.12); color: #fff; border: 0; border-radius: 9px; padding: 9px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .kxs-logout:hover { background: rgba(255,255,255,.2); }
  .kxs-body { padding: 26px 30px 60px; max-width: 1140px; }
  .kxs-h1 { font-size: 23px; font-weight: 760; margin: 2px 0 20px; }
  .kxs-h1 .sub { font-size: 14px; color: var(--kxs-mut); font-weight: 500; margin-left: 10px; }
  .kxs-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 14px; margin-bottom: 28px; }
  .kxs-card { background: #fff; border: 1px solid #e3e8e6; border-radius: 16px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
  .kxs-card .l { font-size: 13px; color: var(--kxs-mut); font-weight: 550; }
  .kxs-card .v { font-size: 28px; font-weight: 760; margin-top: 6px; }
  .kxs-sec { font-size: 15px; font-weight: 720; margin: 8px 0 12px; display:flex; align-items:center; justify-content:space-between; }
  .kxs-panel { background:#fff; border:1px solid #e3e8e6; border-radius:16px; overflow:hidden; box-shadow:0 1px 2px rgba(16,24,40,.04); margin-bottom: 26px; }
  .kxs-table { width: 100%; border-collapse: collapse; }
  .kxs-table th { text-align: left; font-size: 12px; color: var(--kxs-mut); font-weight: 600; padding: 12px 16px; background: #f8faf9; border-bottom: 1px solid #eef2f0; white-space: nowrap; }
  .kxs-table td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f1f4f3; vertical-align: middle; }
  .kxs-table tr:last-child td { border-bottom: 0; }
  .kxs-table tr:hover td { background: #fafcfb; }
  .kxs-link { color: #1f48ff; text-decoration: none; font-weight: 600; }
  .kxs-pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
  .kxs-empty { color: var(--kxs-mut); font-size: 14px; padding: 16px; }
  .kxs-back { color: var(--kxs-mut); text-decoration: none; font-size: 13px; }
  .kxs-btn { display:inline-block; background: var(--kxs-green); color:#fff; border:0; border-radius:9px; padding:9px 16px; font-size:13.5px; font-weight:600; cursor:pointer; text-decoration:none; }
  .kxs-btn:hover { background: var(--kxs-green2); }
  .kxs-btn.sec { background:#eef2f1; color:#0b3d2e; }
  .kxs-btn.danger { background:#fdecec; color:#b42318; }
  .kxs-btn.danger:hover { background:#fbdada; }
  .kxs-btn.mini { padding:6px 11px; font-size:12.5px; border-radius:8px; }
  .kxs-input, .kxs-select, .kxs-textarea { width:100%; padding:10px 12px; border:1px solid #d6dedb; border-radius:10px; font-size:14px; outline:none; background:#fff; }
  .kxs-textarea { resize: vertical; min-height: 76px; }
  .kxs-field { margin-bottom: 14px; }
  .kxs-field label { display:block; font-size:12px; font-weight:600; color:var(--kxs-mut); margin-bottom:6px; }
  .kxs-banner { border-radius:11px; padding:11px 14px; font-size:13.5px; margin-bottom:16px; }
  .kxs-banner.ok { background:#e7f7ec; color:#176b32; }
  .kxs-banner.err { background:#fdecec; color:#b42318; }
  .kxs-toolbar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
  .kxs-grid2 { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
  .kxs-ro { font-size:12px; color:var(--kxs-mut); }
  @media (max-width: 800px){ .kxs{ grid-template-columns: 1fr; } .kxs-side{ position:static; height:auto; flex-direction:row; flex-wrap:wrap; align-items:center; } .kxs-nav{ flex-direction:row; flex-wrap:wrap; } .kxs-user{ border:0; } }
`;

type NavItem = { to: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

function icon(path: string) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {path.split("|").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export default function StaffLayout() {
  const { email, role } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();

  const nav: NavItem[] = [
    {
      to: "/staff",
      label: "Übersicht",
      icon: icon("M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"),
      match: (p) => p === "/staff" || p.startsWith("/staff/shops"),
    },
    {
      to: "/staff/orders",
      label: "Bestellungen",
      icon: icon("M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18|M16 10a4 4 0 0 1-8 0"),
      match: (p) => p.startsWith("/staff/orders"),
    },
    {
      to: "/staff/billing",
      label: "Zahlungen",
      icon: icon("M1 4h22v16H1zM1 10h22"),
      match: (p) => p.startsWith("/staff/billing"),
    },
    {
      to: "/staff/team",
      label: "Team",
      icon: icon("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75"),
      match: (p) => p.startsWith("/staff/team"),
    },
  ];

  return (
    <div className="kxs">
      <style>{SHELL_CSS}</style>
      <aside className="kxs-side">
        <div className="kxs-logo">
          KARINEX
          <small>Kontrollzentrum</small>
        </div>
        <nav className="kxs-nav">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={n.match(pathname) ? "active" : ""}>
              {n.icon}
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="kxs-user">
          <div className="em">{email}</div>
          <div className="rl">{role === "ADMIN" ? "Administrator" : "Betrachter"}</div>
          <Form method="post" action="/staff/logout">
            <button type="submit" className="kxs-logout">
              Abmelden
            </button>
          </Form>
        </div>
      </aside>
      <main className="kxs-body">
        <Outlet />
      </main>
    </div>
  );
}
