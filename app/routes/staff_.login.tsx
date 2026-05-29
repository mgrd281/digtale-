import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useNavigation, Form, redirect } from "react-router";
import {
  createStaffSession,
  ensureSeedAdmin,
  getStaffUser,
  verifyStaffCredentials,
} from "../lib/staff-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Already signed in → straight to the dashboard.
  if (await getStaffUser(request)) throw redirect("/staff");
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Seed the first admin from env on the very first login attempt.
  await ensureSeedAdmin();

  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const user = await verifyStaffCredentials(email, password);
  if (!user) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }
  return createStaffSession(user.id, "/staff");
};

export default function StaffLogin() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(150deg, #0b3d2e, #14573f)",
        fontFamily:
          "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#fff",
          borderRadius: "18px",
          padding: "34px 30px",
          boxShadow: "0 18px 48px rgba(0,0,0,.28)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "3px",
            color: "#0b3d2e",
          }}
        >
          KARINEX
        </div>
        <h1 style={{ fontSize: "21px", margin: "8px 0 4px", color: "#111827" }}>
          Kontrollzentrum
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 22px" }}>
          Bitte melden Sie sich an, um alle Shops zu verwalten.
        </p>

        {actionData?.error && (
          <div
            style={{
              background: "#fde8e8",
              color: "#b42318",
              borderRadius: "10px",
              padding: "10px 12px",
              fontSize: "13px",
              marginBottom: "14px",
            }}
          >
            {actionData.error}
          </div>
        )}

        <Form method="post">
          <label style={labelStyle}>E-Mail</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            style={inputStyle}
          />
          <label style={labelStyle}>Passwort</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={inputStyle}
          />
          <button type="submit" disabled={busy} style={buttonStyle}>
            {busy ? "Anmelden …" : "Anmelden"}
          </button>
        </Form>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b7280",
  margin: "0 0 6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  border: "1px solid #d8dde3",
  borderRadius: "10px",
  fontSize: "15px",
  marginBottom: "16px",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  background: "#0b3d2e",
  color: "#fff",
  border: 0,
  fontWeight: 700,
  fontSize: "15px",
  padding: "13px",
  borderRadius: "11px",
  cursor: "pointer",
};
