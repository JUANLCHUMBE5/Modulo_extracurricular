import { isApiMode, apiClient } from "../../services/apiClient";
import { adaptarAsistencia } from "../../services/adapters";
import {
  obtenerProgramasActivosMock,
  validarDniMock,
  validarQRMock,
  registrarAsistenciaMock
} from "./utils/auxiliarServiceMock";

const MINUTOS_BLOQUEO = 15;
const registrosRecientes = new Map(); // clave: dni o código → timestamp

function limpiarDni(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 8);
}

function limpiarCodigo(valor) {
  return String(valor || "").trim().toUpperCase();
}

function obtenerClaveDuplicado(data) {
  const dni = limpiarDni(data?.dni || data?.dniEstudiante || "");
  if (dni) return `dni:${dni}`;
  const codigo = limpiarCodigo(data?.codigoEstudiante || "");
  if (codigo) return `cod:${codigo}`;
  return "";
}

export async function obtenerProgramasActivos() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/programas");
    if (!res.success) throw new Error(res.message || "Error al obtener programas");
    return res.data;
  }
  return obtenerProgramasActivosMock();
}

export async function validarDni(busqueda, programaId = "") {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/auxiliar/validar", {
      params: { busqueda, programa_id: programaId }
    });
    if (!res.success) throw new Error(res.message || "Error al validar DNI");
    return res.data;
  }
  return validarDniMock(busqueda, programaId);
}

export async function validarQR(codigo) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/auxiliar/validar-qr", {
      params: { codigo }
    });
    if (!res.success) throw new Error(res.message || "Error al validar QR");
    return res.data;
  }
  return validarQRMock(codigo);
}

export async function registrarAsistencia(data, observacion = "") {
  // ─── Protección anti-duplicado (en memoria, funciona en ambos modos) ───
  const claveEstudiante = obtenerClaveDuplicado(data);
  if (claveEstudiante) {
    const ultimoRegistro = registrosRecientes.get(claveEstudiante);
    if (ultimoRegistro) {
      const ahora = Date.now();
      const limiteMs = MINUTOS_BLOQUEO * 60 * 1000;
      const transcurrido = ahora - ultimoRegistro;
      if (transcurrido < limiteMs) {
        const minutosRestantes = Math.ceil((limiteMs - transcurrido) / 60000);
        throw new Error(
          `Este estudiante ya fue registrado hace poco. Podrá registrarse nuevamente en ${minutosRestantes} minuto(s).`
        );
      }
    }
  }

  if (isApiMode()) {
    const apiPayload = {
      inscripcion_id: data.inscripcionId || "",
      pago_id: data.pagoId || "",
      dni_estudiante: data.dni || data.dniEstudiante || "",
      codigo_estudiante: data.codigoEstudiante || "",
      nombres_estudiante: data.nombres || data.nombresEstudiante || data.estudianteNombre || "",
      programa_id: data.programaId || "",
      programa: data.programa || "",
      horario: data.horario || "",
      estado_pago: data.estadoPago || "",
      estado_acceso: data.estadoAcceso || "presente",
      observacion: observacion || "",
      origen: "Auxiliar"
    };
    const res = await apiClient.post("/api/v1/extracurricular/asistencia", apiPayload);
    if (!res.success) throw new Error(res.message || "Error al registrar asistencia");
    // Marcar como registrado en memoria
    if (claveEstudiante) registrosRecientes.set(claveEstudiante, Date.now());
    return adaptarAsistencia(res.data);
  }

  const res = await registrarAsistenciaMock(data, observacion);
  if (claveEstudiante) registrosRecientes.set(claveEstudiante, Date.now());
  return res;
}
