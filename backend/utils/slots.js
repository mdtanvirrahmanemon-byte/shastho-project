// স্লট তৈরির pure ফাংশন (ডেটাবেস ছাড়া টেস্ট করা যায়)
const pad = (n) => String(n).padStart(2, "0");
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

// availability: [{day, start, end}] থেকে ওই তারিখের ৩০ মিনিটের স্লট
function allSlots(availability, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const day = new Date(date + "T00:00:00").getDay();
  const out = [];
  (availability || [])
    .filter((a) => a.day === day)
    .forEach((a) => {
      for (let m = toMin(a.start); m + 30 <= toMin(a.end); m += 30) out.push(fmt(m));
    });
  return [...new Set(out)].sort();
}

// অতীতের স্লট বাদ দেয়
function futureSlots(availability, date, now = new Date()) {
  const today = localDate(now);
  if (date < today) return [];
  const s = allSlots(availability, date);
  return date === today ? s.filter((x) => toMin(x) > nowMin(now)) : s;
}

module.exports = { pad, localDate, nowMin, toMin, fmt, allSlots, futureSlots };
