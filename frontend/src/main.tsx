import React from "react";
import { createRoot } from "react-dom/client";

// Desactivar todos los logs de consola en producción (Garantía de limpieza)
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}
import { MantineProvider } from "@mantine/core";
import { Toaster } from "sonner";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { mantineTheme } from "./mantineTheme";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={mantineTheme}>
      <Toaster
        position="top-center"
        className="app-sonner-center"
        richColors
        closeButton
        expand
        toastOptions={{
          style: {
            borderRadius: "10px",
            fontFamily: "inherit",
            fontWeight: "650",
          },
        }}
      />
      <HashRouter>
        <App />
      </HashRouter>
    </MantineProvider>
  </React.StrictMode>
);
