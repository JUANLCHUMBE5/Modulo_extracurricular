import { randomUUID } from "crypto";
import { updateDb } from "./dbLocal.js";

const modulosAuditables = {
  administrador: "Administrador",
  secretaria: "Asistente",
  caja: "Cajera",
  coordinacion: "Coordinación Académica",
  auxiliar: "Auxiliar",
  direccion: "Dirección",
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
  const accesosUnicamente = (Array.isArray(logs) ? logs : []).filter(
    log => ["INICIO_SESION", "LOGIN_FALLIDO", "DB_RESET", "PADRES_VALIDAR_EXITOSO", "PADRES_VALIDAR_FALLIDO"].includes(log.accion)
  );
  return accesosUnicamente.slice(0, 100).map((log) => {
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
    let detallesObj = {};
    if (detalles) {
      if (typeof detalles === "object") {
        detallesObj = { ...detalles };
      } else {
        try {
          detallesObj = JSON.parse(detalles);
        } catch (e) {
          detallesObj = { detalleTexto: String(detalles) };
        }
      }
    } else {
      detallesObj = { modulo: modulosAuditables[rolNormalizado] || rolNormalizado };
    }

    const usuarioLower = String(usuario || "sistema").trim().toLowerCase();
    const USUARIOS_VALIDOS = ["admin", "secretaria", "caja", "coordinacion", "aux", "dir", "profe"];
    let usuarioFinal = "admin";

    if (USUARIOS_VALIDOS.includes(usuarioLower)) {
      usuarioFinal = usuarioLower;
    } else {
      detallesObj._usuario_original = usuario || "sistema";
    }

    const log = {
      id: `AUD-${String(Date.now()).slice(-6)}-${randomUUID().slice(0, 4)}`,
      usuario: usuarioFinal,
      rol: rolNormalizado,
      fecha: new Date().toISOString(),
      accion,
      detalles: JSON.stringify(detallesObj),
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
