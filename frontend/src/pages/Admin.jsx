import { useEffect, useState } from "react";
import { api } from "../api";
import { useApp } from "../ctx";
import Shell from "../Shell";

const TABS = ["stats", "pendingDoctors", "users", "audit"];

export default function Admin() {
  const { t, toast } = useApp();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const load = () => {
    api("/admin/stats").then(setStats).catch(() => {});
    api("/admin/doctors/pending").then(setPending).catch(() => {});
    api("/admin/users").then(setUsers).catch(() => {});
    api("/admin/audit").then(setLogs).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const approve = async (id) => { try { await api(`/admin/doctors/${id}/approve`, { method: "PATCH" }); load(); } catch (e) { toast(e.message); } };
  const block = async (u) => { try { await api(`/admin/users/${u._id}/block`, { method: "PATCH", body: { blocked: !u.isBlocked } }); load(); } catch (e) { toast(e.message); } };

  return (
    <Shell tabs={TABS} tab={tab} setTab={setTab}>
      {tab === "stats" && stats && (
        <div className="grid">
          <div className="card"><div className="mute">{t("totalPatients")}</div><h1>{stats.patients}</h1></div>
          <div className="card"><div className="mute">{t("totalDoctors")}</div><h1>{stats.doctors}</h1></div>
          <div className="card"><div className="mute">{t("pendingDoctors")}</div><h1>{stats.pendingDoctors}</h1></div>
        </div>
      )}
      {tab === "pendingDoctors" && (<>
        {!pending.length && <div className="empty">{t("noData")}</div>}
        {pending.map((d) => (
          <div className="card" key={d._id} style={{ marginBottom: 10 }}>
            <h3>{d.name}</h3><div className="mute">{d.email} · {t("sp_" + d.specialty)}</div>
            <div className="row"><button className="btn" onClick={() => approve(d._id)}>{t("approve")}</button></div>
          </div>
        ))}
      </>)}
      {tab === "users" && (
        <div className="scroll"><table>
          <thead><tr><th>{t("name")}</th><th>{t("email")}</th><th>{t("role")}</th><th></th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{t(u.role)}</td>
              <td>{u.role !== "admin" && <button className={"btn " + (u.isBlocked ? "" : "warn")} onClick={() => block(u)}>{u.isBlocked ? t("unblock") : t("block")}</button>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      {tab === "audit" && (<>
        {!logs.length && <div className="empty">{t("noData")}</div>}
        {logs.map((l) => (
          <div className="note" key={l._id}>
            <b>{l.actor?.name}</b> ({l.actor?.role}) → {l.action} → {l.target?.name}
            <div className="mute">{new Date(l.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </>)}
    </Shell>
  );
}
