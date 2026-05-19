import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Toaster } from "sonner";
import App from "./App.jsx";
import { mantineTheme } from "./mantineTheme";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
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
      <App />
    </MantineProvider>
  </React.StrictMode>
);
