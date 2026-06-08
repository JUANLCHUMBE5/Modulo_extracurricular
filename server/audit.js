import { randomUUID } from "crypto";
import { updateDb } from "./localDb.js";

const modulosAuditables = {
  administrador: "Administrador",
  secretaria: "Secretaria",
  caja: "Caja",
  coordinacion: "Coordinacion",
  auxiliar: "Auxiliar",
  direccion: "Direccion",
  padres: "Padres",
  desconocido: "Desconocido",
};

function normalizarRolAuditoria(rol) {
  return String(rol || "").trim().toLowerCase();
}

function crearDetalleAcceso(rol) {
  return JSON.stringify({ modulo: modulosAuditables[rol] || rol });
}

export function prepararLogsAcceso(logs = []) {
  return (Array.isArray(logs) ? logs : []).map((log) => {
    const rol = normalizarRolAuditoria(log.rol);
    return {
      id: log.id,
      usuario: log.usuario,
      rol,
      fecha: log.fecha,
      accion: log.accion,
      detalles: log.detalles || crearDetalleAcceso(rol),
    };
  });
}

export async function registrarAuditoria(usuario, rol, accion, detalles = null) {
  try {
    const rolNormalizado = normalizarRolAuditoria(rol);
    const detallesStr = detalles
      ? (typeof detalles === "object" ? JSON.stringify(detalles) : String(detalles))
      : crearDetalleAcceso(rolNormalizado);

    const log = {
      id: `AUD-${String(Date.now()).slice(-6)}-${randomUUID().slice(0, 4)}`,
      usuario: usuario || "sistema",
      rol: rolNormalizado,
      fecha: new Date().toISOString(),
      accion,
      detalles: detallesStr,
    };

    await updateDb((db) => {
      db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
      db.auditLogs.unshift(log);
      return db;
    });
  } catch (error) {
    console.error("Error al registrar auditoria:", error);
  }
}
