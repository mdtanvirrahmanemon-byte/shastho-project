import { useEffect, useState } from "react";
import { api } from "../api";
import { useApp } from "../ctx";
import Shell from "../Shell";

const TABS = ["appts", "availability"];

export default function Doctor() {
  const [tab, setTab] = useState("appts");
  return (
    <Shell tabs={TABS} tab={tab} setTab={setTab}>
      {tab === "appts" ? <Appts /> : <Availability />}
    </Shell>
  );
}

function RxForm({ appt, done }) {
  const { t, toast } = useApp();
  const [meds, setMeds] = useState([{ name: "", dosage: "", duration: "" }]);
  const [advice, setAdvice] = useState("");
  const set = (i, k, v) => setMeds(meds.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const save = async () => {
    try {
      await api("/prescriptions", { method: "POST", body: { appointment: appt._id, medicines: meds, advice } });
      toast(t("rxSaved")); done();
    } catch (e) { toast(e.message); }
  };
  return (
    <div className="note">
      <b>{t("writeRx")}</b>
      {meds.map((m, i) => (
        <div className="row" key={i}>
          <input placeholder={t("medicine")} value={m.name} onChange={(e) => set(i, "name", e.target.value)} />
          <input placeholder={t("dosage")} value={m.dosage} onChange={(e) => set(i, "dosage", e.target.value)} />
          <input placeholder={t("duration")} value={m.duration} onChange={(e) => set(i, "duration", e.target.value)} />
        </div>
      ))}
      <div className="row"><button className="btn ghost" onClick={() => setMeds([...meds, { name: "", dosage: "", duration: "" }])}>{t("addRow")}</button></div>
      <textarea rows="2" placeholder={t("advice")} value={advice} onChange={(e) => setAdvice(e.target.value)} />
      <div className="row"><button className="btn" onClick={save}>{t("saveRx")}</button></div>
    </div>
  );
}

function Appts() {
  const { t, toast } = useApp();
  const [list, setList] = useState([]);
  const [hist, setHist] = useState({});
  const [rxFor, setRxFor] = useState(null);
  const load = () => api("/appointments/mine").then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const set = async (id, status) => {
    try { await api(`/appointments/${id}/status`, { method: "PATCH", body: { status } }); load(); }
    catch (e) { toast(e.message); }
  };
  const history = async (a) => {
    try { setHist({ ...hist, [a._id]: await api(`/prescriptions/patient/${a.patient._id}`) }); }
    catch (e) { toast(e.message); }
  };
  if (!list.length) return <div className="empty">{t("noData")}</div>;
  return list.map((a) => (
    <div className="card" key={a._id} style={{ marginBottom: 10 }}>
      <h3>{a.patient.name} <span className={"tag st-" + a.status}>{t("st_" + a.status)}</span></h3>
      <div className="mute">{a.date} · {a.time}</div>
      {a.symptoms && <div>{a.symptoms}</div>}
      <div className="row">
        {a.status === "pending" && (<>
          <button className="btn" onClick={() => set(a._id, "confirmed")}>{t("confirm")}</button>
          <button className="btn warn" onClick={() => set(a._id, "rejected")}>{t("reject")}</button>
        </>)}
        {a.status === "confirmed" && (<>
          <a className="btn" href={`https://meet.jit.si/ShasthoSeba-${a._id}`} target="_blank" rel="noreferrer">{t("video")}</a>
          {!a.hasRx && <button className="btn ghost" onClick={() => setRxFor(rxFor === a._id ? null : a._id)}>{t("writeRx")}</button>}
          <button className="btn ghost" onClick={() => set(a._id, "completed")}>{t("complete")}</button>
          <button className="btn warn" onClick={() => set(a._id, "cancelled")}>{t("cancel")}</button>
        </>)}
        {["confirmed", "completed"].includes(a.status) && <button className="btn ghost" onClick={() => history(a)}>{t("history")}</button>}
      </div>
      {rxFor === a._id && <RxForm appt={a} done={() => { setRxFor(null); load(); }} />}
      {hist[a._id] && (hist[a._id].length ? hist[a._id].map((r) => (
        <div className="note" key={r._id}><b>{r.doctor.name}</b> · {r.appointment?.date}
          <ul>{r.medicines.map((m, i) => <li key={i}>{m.name} — {m.dosage} — {m.duration}</li>)}</ul></div>
      )) : <div className="empty">{t("noData")}</div>)}
    </div>
  ));
}

function Availability() {
  const { t, toast } = useApp();
  const [rows, setRows] = useState(Array.from({ length: 7 }, (_, d) => ({ day: d, on: false, start: "10:00", end: "13:00" })));
  useEffect(() => {
    api("/doctors/me/availability").then((list) =>
      setRows((r) => r.map((x) => { const a = list.find((y) => y.day === x.day); return a ? { ...x, on: true, start: a.start, end: a.end } : x; }))
    ).catch(() => {});
  }, []);
  const up = (d, k, v) => setRows(rows.map((r) => (r.day === d ? { ...r, [k]: v } : r)));
  const save = async () => {
    try {
      await api("/doctors/me/availability", { method: "PUT", body: { availability: rows.filter((r) => r.on).map(({ day, start, end }) => ({ day, start, end })) } });
      toast(t("saved"));
    } catch (e) { toast(e.message); }
  };
  return (<div className="card">
    <h3>{t("availability")}</h3>
    {rows.map((r) => (
      <div className="row" key={r.day}>
        <label className="chk" style={{ width: 90 }}><input type="checkbox" checked={r.on} onChange={(e) => up(r.day, "on", e.target.checked)} />{t("day" + r.day)}</label>
        <input type="time" disabled={!r.on} value={r.start} onChange={(e) => up(r.day, "start", e.target.value)} aria-label={t("from")} />
        <input type="time" disabled={!r.on} value={r.end} onChange={(e) => up(r.day, "end", e.target.value)} aria-label={t("to")} />
      </div>
    ))}
    <div className="row"><button className="btn" onClick={save}>{t("save")}</button></div>
  </div>);
}
