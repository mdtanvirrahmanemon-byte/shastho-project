import { useCallback, useEffect, useRef, useState } from "react";
import { api, today, pad } from "../api";
import { useApp } from "../ctx";
import Shell from "../Shell";
import { SPECS, SYMPTOMS } from "../i18n";

const TABS = ["find", "appts", "prescriptions", "vitals", "reminders"];

export default function Patient() {
  const { t, toast } = useApp();
  const [tab, setTab] = useState("find");
  const [reminders, setReminders] = useState([]);
  const fired = useRef(new Set());

  const loadRem = useCallback(() => api("/reminders").then(setReminders).catch(() => {}), []);
  useEffect(() => { loadRem(); }, [loadRem]);

  // ওষুধ রিমাইন্ডার: পেজ খোলা থাকলে সময় হলে জানায়
  useEffect(() => {
    const i = setInterval(() => {
      const d = new Date();
      const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      reminders.forEach((r) => {
        const key = today() + r._id + hm;
        if (r.time === hm && !fired.current.has(key)) {
          fired.current.add(key);
          toast("💊 " + t("remNow") + " " + r.name);
        }
      });
    }, 15000);
    return () => clearInterval(i);
  }, [reminders, t, toast]);

  return (
    <Shell tabs={TABS} tab={tab} setTab={setTab}>
      {tab === "find" && <Find goAppts={() => setTab("appts")} />}
      {tab === "appts" && <Appts />}
      {tab === "prescriptions" && <Rx />}
      {tab === "vitals" && <Vitals />}
      {tab === "reminders" && <Meds list={reminders} reload={loadRem} />}
    </Shell>
  );
}

function Triage({ onPick }) {
  const { t } = useApp();
  const [sel, setSel] = useState([]);
  const [child, setChild] = useState(false);
  const [res, setRes] = useState(null);
  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const run = async () => { if (sel.length) setRes(await api("/triage", { method: "POST", body: { symptoms: sel, child } })); };
  return (
    <details className="card" style={{ marginBottom: 12 }}>
      <summary><b>{t("triageTitle")}</b></summary>
      <p className="mute">{t("triageHint")}</p>
      <div className="row">{SYMPTOMS.map((k) => (
        <label key={k} className="chk"><input type="checkbox" checked={sel.includes(k)} onChange={() => toggle(k)} />{t("sym_" + k)}</label>
      ))}</div>
      <label className="chk"><input type="checkbox" checked={child} onChange={() => setChild(!child)} />{t("child")}</label>
      <div className="row"><button className="btn" onClick={run}>{t("suggest")}</button></div>
      {res && (<div style={{ marginTop: 8 }}>
        {res.emergency && <div className="alert">{t("emergency")}</div>}
        <div className="row">{res.suggestions.map((s) => (
          <button key={s.specialty} className="btn ghost" onClick={() => onPick(s.specialty)}>{t("sp_" + s.specialty)}</button>
        ))}</div>
      </div>)}
    </details>
  );
}

function DoctorCard({ d, onBooked }) {
  const { t, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState("");
  const [sym, setSym] = useState("");
  const loadSlots = useCallback(() => {
    setTime("");
    api(`/doctors/${d._id}/slots?date=${date}`).then(setSlots).catch(() => setSlots([]));
  }, [d._id, date]);
  useEffect(() => { if (open) loadSlots(); }, [open, loadSlots]);
  const book = async () => {
    try {
      await api("/appointments", { method: "POST", body: { doctor: d._id, date, time, symptoms: sym } });
      toast(t("booked"));
      setOpen(false);
      onBooked();
    } catch (e) { toast(e.message); loadSlots(); }
  };
  return (
    <div className="card">
      <h3>{d.name}</h3>
      <span className="tag">{t("sp_" + d.specialty)}</span>
      <div className="row"><span className="stars">{"★".repeat(Math.round(d.rating))}{"☆".repeat(5 - Math.round(d.rating))}</span>
        <span className="mute">{d.rating} ({d.reviews} {t("reviewsCount")})</span></div>
      <div className="mute">{t("fee")}: ৳{d.fee || 0}</div>
      <div className="row"><button className="btn" onClick={() => setOpen(!open)}>{t("book")}</button></div>
      {open && (<div style={{ marginTop: 8 }}>
        <input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("date")} />
        <p className="mute">{t("slots")}</p>
        <div className="row">
          {slots.length ? slots.map((s) => (
            <button key={s.time} disabled={s.booked} className={"slot" + (time === s.time ? " on" : "")} onClick={() => setTime(s.time)}>{s.time}</button>
          )) : <span className="mute">{t("noSlots")}</span>}
        </div>
        <textarea rows="2" placeholder={t("symptoms")} value={sym} onChange={(e) => setSym(e.target.value)} />
        <div className="row"><button className="btn" disabled={!time} onClick={book}>{t("book")}</button></div>
      </div>)}
    </div>
  );
}

function Find({ goAppts }) {
  const { t } = useApp();
  const [docs, setDocs] = useState([]);
  const [spec, setSpec] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    api(`/doctors?specialty=${encodeURIComponent(spec)}&q=${encodeURIComponent(q)}`).then(setDocs).catch(() => {});
  }, [spec, q]);
  return (<>
    <Triage onPick={setSpec} />
    <div className="row" style={{ marginBottom: 12 }}>
      <select value={spec} onChange={(e) => setSpec(e.target.value)}>
        <option value="">{t("allSpec")}</option>
        {SPECS.map((s) => <option key={s} value={s}>{t("sp_" + s)}</option>)}
      </select>
      <input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
    <div className="grid">{docs.map((d) => <DoctorCard key={d._id} d={d} onBooked={goAppts} />)}</div>
    {!docs.length && <div className="empty">{t("noData")}</div>}
  </>);
}

function RateForm({ id, done }) {
  const { t, toast } = useApp();
  const [r, setR] = useState(5);
  const [c, setC] = useState("");
  const send = async () => {
    try { await api("/reviews", { method: "POST", body: { appointment: id, rating: r, comment: c } }); toast(t("thanks")); done(); }
    catch (e) { toast(e.message); }
  };
  return (<div className="row">
    <b>{t("rate")}</b>
    <select value={r} onChange={(e) => setR(+e.target.value)}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select>
    <input placeholder={t("comment")} value={c} onChange={(e) => setC(e.target.value)} />
    <button className="btn" onClick={send}>{t("submit")}</button>
  </div>);
}

function Appts() {
  const { t, toast } = useApp();
  const [list, setList] = useState([]);
  const load = () => api("/appointments/mine").then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const cancel = async (id) => {
    try { await api(`/appointments/${id}/status`, { method: "PATCH", body: { status: "cancelled" } }); load(); }
    catch (e) { toast(e.message); }
  };
  if (!list.length) return <div className="empty">{t("noData")}</div>;
  return list.map((a) => (
    <div className="card" key={a._id} style={{ marginBottom: 10 }}>
      <h3>{a.doctor.name} <span className={"tag st-" + a.status}>{t("st_" + a.status)}</span></h3>
      <div className="mute">{a.date} · {a.time} · {t("sp_" + a.doctor.specialty)}</div>
      {a.symptoms && <div>{a.symptoms}</div>}
      <div className="row">
        {a.status === "confirmed" && (
          <a className="btn" href={`https://meet.jit.si/ShasthoSeba-${a._id}`} target="_blank" rel="noreferrer">{t("video")}</a>
        )}
        {["pending", "confirmed"].includes(a.status) && <button className="btn warn" onClick={() => cancel(a._id)}>{t("cancel")}</button>}
      </div>
      {a.status === "completed" && !a.reviewed && <RateForm id={a._id} done={load} />}
    </div>
  ));
}

function Rx() {
  const { t } = useApp();
  const [list, setList] = useState([]);
  const [pr, setPr] = useState(null);
  useEffect(() => { api("/prescriptions/mine").then(setList).catch(() => {}); }, []);
  const print = (r) => { setPr(r); setTimeout(() => window.print(), 150); };
  return (<>
    {!list.length && <div className="empty">{t("noData")}</div>}
    {list.map((r) => (
      <div className="card" key={r._id} style={{ marginBottom: 10 }}>
        <h3>{r.doctor.name}</h3>
        <div className="mute">{r.appointment?.date} · {t("sp_" + r.doctor.specialty)}</div>
        <ul>{r.medicines.map((m, i) => <li key={i}>{m.name} — {m.dosage} — {m.duration}</li>)}</ul>
        {r.advice && <div className="mute">{t("advice")}: {r.advice}</div>}
        <div className="row"><button className="btn" onClick={() => print(r)}>{t("print")}</button></div>
      </div>
    ))}
    {pr && (
      <div className="print-area">
        <h1>🩺 {t("app")} — {t("prescriptions")}</h1>
        <p><b>{pr.doctor.name}</b> ({t("sp_" + pr.doctor.specialty)})<br />{t("rxFor")}: {pr.patient.name}<br />{pr.appointment?.date}</p>
        <ol>{pr.medicines.map((m, i) => <li key={i}>{m.name} — {m.dosage} — {m.duration}</li>)}</ol>
        {pr.advice && <p>{t("advice")}: {pr.advice}</p>}
      </div>
    )}
  </>);
}

function Chart({ points }) {
  if (points.length < 2) return null;
  const W = 320, H = 100;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const xy = points.map((p, i) => `${(i / (points.length - 1)) * (W - 20) + 10},${H - 12 - ((p.v - min) / span) * (H - 24)}`).join(" ");
  return (<svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="trend">
    <polyline points={xy} fill="none" stroke="var(--pri)" strokeWidth="2" />
    {points.map((p, i) => <circle key={i} cx={(i / (points.length - 1)) * (W - 20) + 10} cy={H - 12 - ((p.v - min) / span) * (H - 24)} r="3" fill={p.flag ? "var(--warn)" : "var(--pri)"} />)}
  </svg>);
}

function Vitals() {
  const { t, toast } = useApp();
  const [list, setList] = useState([]);
  const [type, setType] = useState("bp");
  const [v, setV] = useState("");
  const [v2, setV2] = useState("");
  const load = () => api("/vitals").then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const add = async () => {
    try {
      const r = await api("/vitals", { method: "POST", body: { type, value: v, value2: v2 } });
      if (r.flag) toast("⚠️ " + t("warnVital"));
      setV(""); setV2(""); load();
    } catch (e) { toast(e.message); }
  };
  const rows = list.filter((x) => x.type === type);
  const pts = [...rows].reverse().map((x) => ({ v: x.value, flag: x.flag }));
  return (<>
    <div className="card">
      <div className="row">
        <select value={type} onChange={(e) => setType(e.target.value)}>{["bp", "sugar", "weight", "heartRate"].map((k) => <option key={k} value={k}>{t(k)}</option>)}</select>
        <input type="number" placeholder={type === "bp" ? t("systolic") : t("value")} value={v} onChange={(e) => setV(e.target.value)} />
        {type === "bp" && <input type="number" placeholder={t("diastolic")} value={v2} onChange={(e) => setV2(e.target.value)} />}
        <button className="btn" onClick={add}>{t("add")}</button>
      </div>
      <Chart points={pts} />
    </div>
    {!rows.length && <div className="empty" style={{ marginTop: 10 }}>{t("noData")}</div>}
    {rows.map((x) => (
      <div className="note" key={x._id}>
        {x.value}{x.type === "bp" ? ` / ${x.value2}` : ""} {x.flag && <span className="tag c">{t(x.flag)}</span>}
        <div className="mute">{new Date(x.createdAt).toLocaleString()}</div>
      </div>
    ))}
  </>);
}

function Meds({ list, reload }) {
  const { t, toast } = useApp();
  const [name, setName] = useState("");
  const [time, setTime] = useState("08:00");
  const add = async () => {
    try { await api("/reminders", { method: "POST", body: { name, time } }); setName(""); reload(); }
    catch (e) { toast(e.message); }
  };
  const del = async (id) => { await api(`/reminders/${id}`, { method: "DELETE" }); reload(); };
  return (<>
    <div className="card"><div className="row">
      <input placeholder={t("remName")} value={name} onChange={(e) => setName(e.target.value)} />
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("time")} />
      <button className="btn" onClick={add}>{t("add")}</button>
    </div></div>
    {!list.length && <div className="empty" style={{ marginTop: 10 }}>{t("noData")}</div>}
    {list.map((r) => (
      <div className="card" key={r._id} style={{ marginTop: 10 }}><div className="row" style={{ margin: 0 }}>
        <b style={{ flex: 1 }}>💊 {r.name}</b><span className="tag">{r.time}</span>
        <button className="btn warn" onClick={() => del(r._id)}>{t("delete")}</button>
      </div></div>
    ))}
  </>);
}
