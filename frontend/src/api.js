const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const pad = (n) => String(n).padStart(2, "0");
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const r = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}
