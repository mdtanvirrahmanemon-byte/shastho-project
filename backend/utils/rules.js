// Rule-based symptom triage ও vitals warning
const RULES = {
  fever: { Medicine: 2, Pediatrics: 1 },
  cough: { Medicine: 2, Pediatrics: 1 },
  chest_pain: { Cardiology: 3, Medicine: 1 },
  palpitations: { Cardiology: 3 },
  shortness_breath: { Cardiology: 2, Medicine: 2 },
  headache: { Neurology: 2, Medicine: 1 },
  dizziness: { Neurology: 2, Cardiology: 1 },
  numbness: { Neurology: 3 },
  skin_rash: { Dermatology: 3 },
  itching: { Dermatology: 3 },
  joint_pain: { Orthopedics: 3 },
  back_pain: { Orthopedics: 3 },
  stomach_pain: { Medicine: 3 },
  period_problem: { Gynecology: 3 },
};
const URGENT = ["chest_pain", "shortness_breath"];

function triage(symptoms = [], child = false) {
  const score = {};
  const matched = {};
  symptoms.forEach((s) => {
    const r = RULES[s];
    if (!r) return;
    Object.entries(r).forEach(([sp, w]) => {
      score[sp] = (score[sp] || 0) + w;
      (matched[sp] = matched[sp] || []).push(s);
    });
  });
  if (child && Object.keys(score).length) score.Pediatrics = (score.Pediatrics || 0) + 3;
  const suggestions = Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([specialty, s]) => ({ specialty, score: s, matched: matched[specialty] || [] }));
  return { suggestions, emergency: symptoms.some((s) => URGENT.includes(s)) };
}

function flagVital(type, v, v2) {
  if (type === "bp") return v >= 140 || v2 >= 90 ? "high" : v < 90 || v2 < 60 ? "low" : null;
  if (type === "sugar") return v > 180 ? "high" : v < 70 ? "low" : null;
  if (type === "heartRate") return v > 100 ? "high" : v < 50 ? "low" : null;
  return null;
}

module.exports = { triage, flagVital };
