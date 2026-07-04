import { randomUUID } from "crypto";
import { updateDb } from "../../database/local/dbLocal.js";

const modulosAuditables: Record<string, string> = {
  administrador: "Administrador",
  secretaria: "Asistente",
  caja: "Cajera",
  coordinacion: "Coordinación Académica",
  auxiliar: "Auxiliar",
  direccion: "Dirección",
  padres: "Padres",
  desconocido: "Desconocido",
};

/**
 * Normaliza y limpia el nombre del rol del usuario para su registro en la auditoría.
 * 
 * @param rol Nombre del rol.
 * @returns Rol normalizado a minúsculas y sin espacios.
 */
function normalizarRolAuditoria(rol: string): string {
  return String(rol || "").trim().toLowerCase();
}

/**
 * Genera un string JSON con el nombre del módulo asociado a un rol para registrar accesos.
 * 
 * @param rol Nombre del rol.
 * @returns String JSON de detalles de acceso.
 */
function crearDetalleAcceso(rol: string): string {
  return JSON.stringify({ modulo: modulosAuditables[rol] || rol });
}

export interface LogAuditoria {
  id: string;
  usuario: string;
  rol: string;
  fecha: string;
  accion: string;
  detalles: string;
}

/**
 * Filtra y prepara los logs de auditoría para mostrar únicamente los eventos de tipo
 * acceso (inicio de sesión, fallas de login, resets de base de datos) limitados a los últimos 100 registros.
 * 
 * @param logs Lista de logs crudos guardados en la base de datos.
 * @returns Lista de los 100 logs de acceso más recientes normalizados.
 */
export function prepararLogsAcceso(logs: any[] = []): LogAuditoria[] {
  const accesosUnicamente = (Array.isArray(logs) ? logs : []).filter(
    (log: any) => ["INICIO_SESION", "LOGIN_FALLIDO", "DB_RESET", "PADRES_VALIDAR_EXITOSO", "PADRES_VALIDAR_FALLIDO"].includes(log.accion)
  );
  return accesosUnicamente.slice(0, 100).map((log: any) => {
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

/**
 * Registra una acción de auditoría en la base de datos local.
 * Normaliza los nombres de usuario del sistema (admin, secretaria, etc.) y encapsula los detalles adicionales.
 * 
 * @param usuario Nombre del operador o sistema que realiza la acción.
 * @param rol Rol del operador.
 * @param accion Nombre clave de la acción efectuada.
 * @param detalles Datos o metadatos de contexto opcionales.
 */
export async function registrarAuditoria(
  usuario: string,
  rol: string,
  accion: string,
  detalles: any = null
): Promise<void> {
  try {
    const rolNormalizado = normalizarRolAuditoria(rol);
    let detallesObj: Record<string, any> = {};
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

    const log: LogAuditoria = {
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
