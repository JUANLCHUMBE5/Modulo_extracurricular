import { obtenerVentanaInscripcion } from "../src/services/dateService.js";

const fechaInicio = "16/06/2026";
const hoy = new Date("2026-06-16T09:57:23-05:00"); // current local time of the user
const duracionAvisoDias = 1;
const horaLimiteAviso = "09:18";

const res = obtenerVentanaInscripcion(fechaInicio, hoy, duracionAvisoDias, horaLimiteAviso);
console.log("RESULTADO:", JSON.stringify(res, null, 2));
console.log("hoy.getTime():", hoy.getTime(), "->", hoy.toString());
console.log("limite parsed:", new Date(2026, 5, 16, 9, 18, 59, 999).toString());
