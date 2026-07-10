import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const jsToTsResolverPlugin = () => ({
  name: "js-to-ts-resolver",
  resolveId(source, importer) {
    if (source.endsWith(".js") || source.endsWith(".jsx")) {
      if (source.startsWith(".") || source.startsWith("/")) {
        const tsSource = source.replace(/\.js(x?)$/, ".ts$1");
        return this.resolve(tsSource, importer, { skipSelf: true });
      }
    }
    return null;
  },
});

export default defineConfig({
  plugins: [tailwindcss(), react(), jsToTsResolverPlugin()],
  esbuild: {
    drop: ["console", "debugger"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/backend/db.json"],
    },
    proxy: {
      "/api": "http://127.0.0.1:5175",
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@mantine/core",
      "@mantine/hooks",
      "@tabler/icons-react",
      "exceljs",
      "jspdf",
      "docx-preview",
      "@mantine/charts",
      "pdf-lib",
      "jszip",
      "docxtemplater",
      "pizzip",
      "date-fns",
      "sonner",
      "bcryptjs"
    ],
  },
});
