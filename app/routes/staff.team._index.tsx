import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { data } from "react-router";
import {
  hashPassword,
  isAdmin,
  requireStaffAdmin,
  requireStaffUser,
} from "../lib/staff-auth.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const me = await requireStaffUser(request);
  const users = await prisma.staffUser.findMany({ orderBy: { createdAt: "asc" } });
  return {
    canEdit: isAdmin(me),
    meId: me.id,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString().slice(0, 10),
      lastLoginAt: u.lastLoginAt?.toISOString().slice(0, 16).replace("T", " ") ?? "—",
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const me = await requireStaffAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "add") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const role = String(form.get("role") ?? "VIEWER") === "ADMIN" ? "ADMIN" : "VIEWER";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return data({ ok: false, message: "Bitte eine gültige E-Mail angeben." });
    }
    if (password.length < 8) {
      return data({ ok: false, message: "Das Passwort muss mindestens 8 Zeichen haben." });
    }
    const existing = await prisma.staffUser.findUnique({ where: { email } });
    if (existing) {
      return data({ ok: false, message: "Diese E-Mail ist bereits vergeben." });
    }
    await prisma.staffUser.create({
      data: { email, passwordHash: hashPassword(password), role },
    });
    return data({ ok: true, message: `Mitarbeiter ${email} hinzugefügt.` });
  }

  if (intent === "delete") {
    const id = String(form.get("id"));
    if (id === me.id) {
      return data({ ok: false, message: "Sie können sich nicht selbst löschen." });
    }
    await prisma.staffUser.delete({ where: { id } });
    return data({ ok: true, message: "Mitarbeiter entfernt." });
  }

  if (intent === "setRole") {
    const id = String(form.get("id"));
    const role = String(form.get("role")) === "ADMIN" ? "ADMIN" : "VIEWER";
    if (id === me.id) {
      return data({ ok: false, message: "Sie können Ihre eigene Rolle nicht ändern." });
    }
    await prisma.staffUser.update({ where: { id }, data: { role } });
    return data({ ok: true, message: "Rolle aktualisiert." });
  }

  return data({ ok: false, message: "Unbekannte Aktion." }, { status: 400 });
};

export default function StaffTeam() {
  const { users, canEdit, meId } = useLoaderData<typeof loader>();
  const add = useFetcher<{ ok: boolean; message: string }>();
  const row = useFetcher<{ ok: boolean; message: string }>();

  return (
    <>
      <h1 className="kxs-h1">
        Team<span className="sub">Mitarbeiterzugänge</span>
      </h1>

      {!canEdit && (
        <div className="kxs-banner err">
          Nur-Lese-Zugriff: Mitarbeiter können nur von Administratoren verwaltet werden.
        </div>
      )}

      {canEdit && (
        <>
          <div className="kxs-sec">Neuen Mitarbeiter hinzufügen</div>
          <div className="kxs-panel" style={{ padding: 18 }}>
            {add.data?.message && (
              <div className={"kxs-banner " + (add.data.ok ? "ok" : "err")}>
                {add.data.message}
              </div>
            )}
            <add.Form method="post">
              <input type="hidden" name="intent" value="add" />
              <div className="kxs-grid2">
                <div className="kxs-field">
                  <label>E-Mail</label>
                  <input className="kxs-input" name="email" type="email" required />
                </div>
                <div className="kxs-field">
                  <label>Passwort (min. 8 Zeichen)</label>
                  <input className="kxs-input" name="password" type="text" required />
                </div>
              </div>
              <div className="kxs-field" style={{ maxWidth: 240 }}>
                <label>Rolle</label>
                <select className="kxs-select" name="role" defaultValue="VIEWER">
                  <option value="VIEWER">Betrachter (nur Lesen)</option>
                  <option value="ADMIN">Administrator (volle Rechte)</option>
                </select>
              </div>
              <button type="submit" className="kxs-btn">Hinzufügen</button>
            </add.Form>
          </div>
        </>
      )}

      <div className="kxs-sec">Mitarbeiter ({users.length})</div>
      <div className="kxs-panel">
        {row.data?.message && (
          <div className={"kxs-banner " + (row.data.ok ? "ok" : "err")} style={{ margin: 14 }}>
            {row.data.message}
          </div>
        )}
        <table className="kxs-table">
          <thead>
            <tr>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Erstellt</th>
              <th>Letzter Login</th>
              {canEdit && <th>Aktionen</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.email}
                  {u.id === meId && <span className="kxs-ro"> (Sie)</span>}
                </td>
                <td>
                  <span
                    className="kxs-pill"
                    style={
                      u.role === "ADMIN"
                        ? { background: "#e7eefe", color: "#1f48ff" }
                        : { background: "#eef2f1", color: "#475569" }
                    }
                  >
                    {u.role === "ADMIN" ? "Administrator" : "Betrachter"}
                  </span>
                </td>
                <td>{u.createdAt}</td>
                <td style={{ whiteSpace: "nowrap" }}>{u.lastLoginAt}</td>
                {canEdit && (
                  <td>
                    {u.id === meId ? (
                      <span className="kxs-ro">—</span>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <row.Form method="post">
                          <input type="hidden" name="intent" value="setRole" />
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            type="hidden"
                            name="role"
                            value={u.role === "ADMIN" ? "VIEWER" : "ADMIN"}
                          />
                          <button type="submit" className="kxs-btn mini sec">
                            {u.role === "ADMIN" ? "Zu Betrachter" : "Zu Admin"}
                          </button>
                        </row.Form>
                        <row.Form method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="kxs-btn mini danger">Entfernen</button>
                        </row.Form>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
