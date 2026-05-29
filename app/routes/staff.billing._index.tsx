import type { LoaderFunctionArgs } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireStaffUser(request);
  return null;
};

export default function StaffBilling() {
  return (
    <>
      <h1 className="kxs-h1">
        Zahlungen<span className="sub">Abos & Einnahmen</span>
      </h1>
      <div className="kxs-panel" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 34, lineHeight: 1 }}>💳</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>
          Zahlungsübersicht – in Kürze
        </div>
        <p style={{ color: "#64748b", fontSize: 14, maxWidth: 460, margin: "8px auto 0" }}>
          Hier erscheinen demnächst der Abo-Status jedes Shops (Plan, Testphase,
          aktiv), die geschätzten monatlichen Einnahmen (MRR) und der Verlauf.
        </p>
      </div>
    </>
  );
}
