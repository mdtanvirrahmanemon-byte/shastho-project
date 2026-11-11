import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DICT } from "./i18n";

const C = createContext();
export const useApp = () => useContext(C);

export function AppProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "bn");
  const [dark, setDark] = useState(localStorage.getItem("dark") === "1");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("dark", dark ? "1" : "0");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  const t = useCallback((k) => DICT[lang][k] ?? k, [lang]);
  const toast = useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3500);
  }, []);
  return (
    <C.Provider value={{ lang, setLang, dark, setDark, t, toast }}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </C.Provider>
  );
}

const A = createContext();
export const useAuth = () => useContext(A);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const login = (token, u) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };
  return <A.Provider value={{ user, login, logout }}>{children}</A.Provider>;
}
