import { apiDb, nextApiId, saveApiDb, syncApiDb, resetApiDb } from "../../services/dbApi";
import { isApiMode, apiClient } from "../../services/apiClient";
import { ALL_PERMISSIONS, getRoleLabel, isSuperAdmin } from "./models/usuarioModel";

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const modulosAuditables = {
  administrador: "Administrador",
  secretaria: "Asistente",
  caja: "Cajera",
  coordinacion: "Coordinación Académica",
  auxiliar: "Auxiliar",
  direccion: "Dirección",
  padres: "Padres",
  desconocido: "Desconocido"
};

function normalizarRolAuditoria(rol) {
  return String(rol || "").trim().toLowerCase();
}

function crearDetalleAcceso(rol) {
  return JSON.stringify({ modulo: modulosAuditables[rol] || getRoleLabel(rol) });
}

function filtrarLogsAcceso(logs = []) {
  return (Array.isArray(logs) ? logs : [])
    .map((log) => {
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

export async function listarUsuarios() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/usuarios");
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data;
  }
  await delay(300);
  await syncApiDb();
  return Array.isArray(apiDb.usuarios) ? [...apiDb.usuarios] : [];
}

export async function crearUsuario(datos) {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/usuarios", datos);
    if (!res.success) throw new Error(res.message || "Error al crear usuario");
    return res.data;
  }
  await delay(600);
  await syncApiDb();
  
  // Validar si usuario ya existe
  const existe = apiDb.usuarios.some(u => u.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (existe) throw new Error("El nombre de usuario ya esta en uso.");

  const nuevoUsuario = {
    id: `USR-${Date.now()}`,
    estado: "Activo",
    ...datos
  };

  apiDb.usuarios.push(nuevoUsuario);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "administrador" } }));
  return nuevoUsuario;
}

export async function editarUsuario(id, datos) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/usuarios/${id}`, datos);
    if (!res.success) throw new Error(res.message || "Error al editar usuario");
    return res.data;
  }
  await delay(600);
  await syncApiDb();
  
  const index = apiDb.usuarios.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Usuario no encontrado.");
  if (isSuperAdmin(apiDb.usuarios[index])) {
    datos = {
      ...datos,
      usuario: "admin",
      rol: "Administrador",
      estado: "Activo",
      permisos: ALL_PERMISSIONS,
    };
  }

  // Validar si el nuevo username ya existe en OTRO usuario
  const existe = apiDb.usuarios.some(u => u.id !== id && u.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (existe) throw new Error("El nombre de usuario ya esta en uso por otra persona.");

  apiDb.usuarios[index] = {
    ...apiDb.usuarios[index],
    ...datos,
  };

  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "administrador" } }));
  return apiDb.usuarios[index];
}

export async function cambiarEstadoUsuario(id, nuevoEstado) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/usuarios/${id}/estado`, { estado: nuevoEstado });
    if (!res.success) throw new Error(res.message || "Error al cambiar estado del usuario");
    return res.data;
  }
  await delay(400);
  await syncApiDb();
  
  const usuario = apiDb.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error("Usuario no encontrado.");
  if (isSuperAdmin(usuario) && nuevoEstado !== "Activo") {
    throw new Error("El super administrador no se puede desactivar.");
  }
  
  // Evitar desactivar al unico administrador (opcional, pero buena practica)
  if (nuevoEstado === "Inactivo" && usuario.rol === "Administrador") {
    const adminsActivos = apiDb.usuarios.filter(u => u.rol === "Administrador" && u.estado === "Activo");
    if (adminsActivos.length <= 1) {
      throw new Error("No puede desactivar al unico administrador activo.");
    }
  }

  usuario.estado = nuevoEstado;
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "administrador" } }));
  return usuario;
}

export async function resetearContrasenaUsuario(id) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/usuarios/${id}/resetear-contrasena`);
    if (!res.success) throw new Error(res.message || "Error al resetear contraseña");
    return res.data;
  }
  await delay(400);
  await syncApiDb();

  const usuario = apiDb.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error("Usuario no encontrado.");

  usuario.contrasena = "123456";
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "administrador" } }));
  return usuario;
}

export async function eliminarUsuario(id) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/usuarios/${id}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar usuario");
    return res.data;
  }
  await delay(400);
  await syncApiDb();

  const index = apiDb.usuarios.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Usuario no encontrado.");

  const usuario = apiDb.usuarios[index];
  if (isSuperAdmin(usuario)) {
    throw new Error("El super administrador no se puede eliminar.");
  }
  if (usuario.rol === "Administrador" && usuario.estado === "Activo") {
    const adminsActivos = apiDb.usuarios.filter((item) =>
      item.rol === "Administrador" && item.estado === "Activo"
    );
    if (adminsActivos.length <= 1) {
      throw new Error("No puede eliminar al unico administrador activo.");
    }
  }

  const [eliminado] = apiDb.usuarios.splice(index, 1);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "administrador" } }));
  return eliminado;
}

export async function listarLogsAuditoria() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/administrador/audit-logs");
    if (!res.success || !Array.isArray(res.data)) return [];
    return filtrarLogsAcceso(res.data);
  }
  await delay(200);
  await syncApiDb();
  return filtrarLogsAcceso(apiDb.auditLogs);
}

export async function descargarBackup() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/administrador/db/backup");
    if (!res.success || !res.data) throw new Error("No se pudo obtener la copia de seguridad.");
    return res.data;
  }
  await delay(200);
  await syncApiDb();
  return JSON.parse(JSON.stringify(apiDb));
}

export async function resetearBaseDatos() {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/administrador/db/reset");
    if (!res.success) throw new Error(res.message || "Error al resetear la base de datos.");
    return res.data;
  }
  await delay(500);
  return await resetApiDb();
}
