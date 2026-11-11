import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppProvider, AuthProvider } from "./ctx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppProvider>
  </BrowserRouter>
);
