import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useApp, useAuth } from "./ctx";

export default function Shell({ tabs, tab, setTab, children }) {
  const { t, lang, setLang, dark, setDark, toast } = useApp();
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const seen = useRef(null);

  const load = async () => {
    try {
      const n = await api("/notifications");
      if (seen.current) n.filter((x) => !x.read && !seen.current.has(x._id)).forEach((x) => toast(x.message));
      seen.current = new Set(n.map((x) => x._id));
      setNotes(n);
    } catch {}
  };
  useEffect(() => {
    if (user.role === "admin") return;
    load();
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, []);

  const unread = notes.filter((n) => !n.read).length;
  const readAll = async () => {
    await api("/notifications/read-all", { method: "PATCH" });
    load();
  };

  return (
    <>
      <header className="top">
        <h1>🩺 {t("app")}</h1>
        <span className="mute">{user.name} ({t(user.role)})</span>
        {user.role !== "admin" && (
          <button className="btn ghost" aria-label={t("notifications")} onClick={() => setOpen(!open)}>
            🔔{unread > 0 && <span className="badge">{unread}</span>}
          </button>
        )}
        <button className="btn ghost" onClick={() => setLang(lang === "bn" ? "en" : "bn")}>{lang === "bn" ? "English" : "বাংলা"}</button>
        <button className="btn ghost" onClick={() => setDark(!dark)}>{dark ? t("light") : t("dark")}</button>
        <button className="btn warn" onClick={logout}>{t("logout")}</button>
      </header>
      {open && (
        <div className="panel">
          <div className="row"><b style={{ flex: 1 }}>{t("notifications")}</b><button className="btn ghost" onClick={readAll}>{t("markRead")}</button></div>
          {notes.length ? notes.map((n) => (
            <div key={n._id} className={"note" + (n.read ? "" : " unread")}>
              {n.message}<div className="mute">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          )) : <div className="empty">{t("noData")}</div>}
        </div>
      )}
      <nav className="tabs">
        {tabs.map((k) => (
          <button key={k} aria-selected={tab === k} onClick={() => setTab(k)}>{t(k)}</button>
        ))}
      </nav>
      <main>{children}</main>
    </>
  );
}
