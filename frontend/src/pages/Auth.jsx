import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useApp, useAuth } from "../ctx";
import { SPECS } from "../i18n";

function Frame({ children }) {
  const { t, lang, setLang } = useApp();
  return (
    <div className="auth">
      <div className="card">
        <div className="row"><h1 style={{ flex: 1, margin: 0 }}>🩺 {t("app")}</h1>
          <button className="btn ghost" onClick={() => setLang(lang === "bn" ? "en" : "bn")}>{lang === "bn" ? "English" : "বাংলা"}</button></div>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { t } = useApp();
  const { login } = useAuth();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api("/auth/login", { method: "POST", body: f });
      login(d.token, d.user);
    } catch (e) { setErr(e.message); }
  };
  return (
    <Frame>
      <form onSubmit={submit} className="form">
        <label>{t("email")}<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>{t("password")}<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <div className="alert">{err}</div>}
        <button className="btn">{t("login")}</button>
      </form>
      <p className="mute">{t("noAcc")} <Link to="/register">{t("register")}</Link></p>
    </Frame>
  );
}

export function Register() {
  const { t } = useApp();
  const { login } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "patient", specialty: "Medicine", fee: 500 });
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const d = await api("/auth/register", { method: "POST", body: f });
      if (d.token) login(d.token, d.user);
      else setDone(t("pendingMsg"));
    } catch (e) { setErr(e.message); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Frame>
      {done ? <div className="note">{done}</div> : (
        <form onSubmit={submit} className="form">
          <label>{t("role")}<select value={f.role} onChange={set("role")}><option value="patient">{t("patient")}</option><option value="doctor">{t("doctor")}</option></select></label>
          <label>{t("name")}<input required value={f.name} onChange={set("name")} /></label>
          <label>{t("email")}<input type="email" required value={f.email} onChange={set("email")} /></label>
          <label>{t("password")}<input type="password" minLength={6} required value={f.password} onChange={set("password")} /></label>
          {f.role === "doctor" && (<>
            <label>{t("specialty")}<select value={f.specialty} onChange={set("specialty")}>{SPECS.map((s) => <option key={s} value={s}>{t("sp_" + s)}</option>)}</select></label>
            <label>{t("fee")} (৳)<input type="number" min="0" value={f.fee} onChange={set("fee")} /></label>
          </>)}
          {err && <div className="alert">{err}</div>}
          <button className="btn">{t("register")}</button>
        </form>
      )}
      <p className="mute">{t("haveAcc")} <Link to="/login">{t("login")}</Link></p>
    </Frame>
  );
}
