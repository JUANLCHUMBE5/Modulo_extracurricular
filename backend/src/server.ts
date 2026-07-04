import "./config/env.js";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || process.env.EXCEL_API_PORT || 5175);
const API_HOST = process.env.API_HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

const app = createApp();

app.listen(PORT, API_HOST, () => {
  console.log(`Excel API listening on http://${API_HOST}:${PORT}`);
});
