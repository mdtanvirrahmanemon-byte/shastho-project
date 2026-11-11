import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./ctx";
import { Login, Register } from "./pages/Auth";
import Patient from "./pages/Patient";
import Doctor from "./pages/Doctor";
import Admin from "./pages/Admin";

export default function App() {
  const { user } = useAuth();
  const home = user ? `/${user.role}` : "/login";
  const guard = (role, el) => (user?.role === role ? el : <Navigate to={home} />);
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} /> : <Register />} />
      <Route path="/patient" element={guard("patient", <Patient />)} />
      <Route path="/doctor" element={guard("doctor", <Doctor />)} />
      <Route path="/admin" element={guard("admin", <Admin />)} />
      <Route path="*" element={<Navigate to={home} />} />
    </Routes>
  );
}
