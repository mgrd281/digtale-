import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, Form, Link } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireStaffUser(request);
  return { email: user.email };
};

const SHELL_CSS = `
  body { margin: 0; background: #f3f5f7; }
  .kxs-wrap { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111827; }
  .kxs-top { background: #0b3d2e; color: #fff; padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; }
  .kxs-brand { font-weight: 800; letter-spacing: 2px; font-size: 14px; }
  .kxs-brand span { opacity: .7; font-weight: 600; letter-spacing: 0; margin-left: 10px; }
  .kxs-right { display: flex; align-items: center; gap: 14px; font-size: 13px; }
  .kxs-logout { background: rgba(255,255,255,.16); color: #fff; border: 0; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .kxs-main { max-width: 1080px; margin: 0 auto; padding: 24px 22px 60px; }
  .kxs-h1 { font-size: 22px; font-weight: 750; margin: 4px 0 18px; }
  .kxs-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 26px; }
  .kxs-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px 18px; }
  .kxs-card .l { font-size: 13px; color: #6b7280; font-weight: 550; }
  .kxs-card .v { font-size: 28px; font-weight: 750; margin-top: 6px; }
  .kxs-sec { font-size: 15px; font-weight: 700; margin: 8px 0 12px; }
  .kxs-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
  .kxs-table th { text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; padding: 12px 14px; background: #fafbfc; border-bottom: 1px solid #eef1f4; }
  .kxs-table td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid #f1f3f5; }
  .kxs-table tr:last-child td { border-bottom: 0; }
  .kxs-link { color: #1f48ff; text-decoration: none; font-weight: 600; }
  .kxs-pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 999px; }
  .kxs-empty { color: #6b7280; font-size: 14px; padding: 10px 0; }
  .kxs-back { color: #6b7280; text-decoration: none; font-size: 13px; }
`;

export default function StaffLayout() {
  const { email } = useLoaderData<typeof loader>();
  return (
    <div className="kxs-wrap">
      <style>{SHELL_CSS}</style>
      <header className="kxs-top">
        <Link to="/staff" style={{ color: "#fff", textDecoration: "none" }}>
          <span className="kxs-brand">
            KARINEX <span>Kontrollzentrum</span>
          </span>
        </Link>
        <div className="kxs-right">
          <span style={{ opacity: 0.85 }}>{email}</span>
          <Form method="post" action="/staff/logout">
            <button type="submit" className="kxs-logout">
              Abmelden
            </button>
          </Form>
        </div>
      </header>
      <main className="kxs-main">
        <Outlet />
      </main>
    </div>
  );
}
