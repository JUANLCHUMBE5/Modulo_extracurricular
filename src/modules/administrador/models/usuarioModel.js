export const ROLES = [
  "Administrador",
  "Secretaria",
  "Caja",
  "Coordinacion",
  "Auxiliar",
  "Direccion",
];

export const PERMISSION_GROUPS = [
  {
    id: "usuarios",
    label: "Usuarios y accesos",
    permissions: [
      { id: "usuarios.crear", label: "Crear usuarios" },
      { id: "usuarios.editar", label: "Editar usuarios" },
      { id: "usuarios.estado", label: "Activar o desactivar usuarios" },
      { id: "usuarios.resetear", label: "Resetear contrasenas" },
    ],
  },
  {
    id: "coordinacion",
    label: "Coordinacion",
    permissions: [
      { id: "programas.crear", label: "Crear programas" },
      { id: "programas.editar", label: "Editar programas" },
      { id: "grupos.crear", label: "Crear grupos" },
      { id: "grupos.editar", label: "Editar grupos" },
      { id: "alumnos.historial.ver", label: "Ver historial de alumnos" },
    ],
  },
  {
    id: "direccion",
    label: "Direccion y reportes",
    permissions: [
      { id: "presupuesto.ver", label: "Ver presupuesto" },
      { id: "direccion.resumen.ver", label: "Ver resumen de direccion" },
      { id: "reportes.ver", label: "Ver reportes" },
      { id: "reportes.exportar", label: "Exportar reportes" },
    ],
  },
  {
    id: "caja",
    label: "Caja",
    permissions: [
      { id: "pagos.ver", label: "Ver pagos" },
      { id: "pagos.registrar", label: "Registrar pagos" },
      { id: "pagos.editar", label: "Editar pagos" },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id)
);

export const SUPER_ADMIN_USERNAME = "admin";

export const DEFAULT_PERMISSIONS_BY_ROLE = {
  Administrador: ALL_PERMISSIONS,
  Secretaria: [
    "alumnos.historial.ver",
    "programas.editar",
    "reportes.ver",
  ],
  Caja: [
    "pagos.ver",
    "pagos.registrar",
    "reportes.ver",
  ],
  Coordinacion: [
    "programas.crear",
    "programas.editar",
    "grupos.crear",
    "grupos.editar",
    "alumnos.historial.ver",
    "presupuesto.ver",
    "reportes.ver",
  ],
  Auxiliar: [
    "alumnos.historial.ver",
  ],
  Direccion: [
    "presupuesto.ver",
    "direccion.resumen.ver",
    "alumnos.historial.ver",
    "reportes.ver",
    "reportes.exportar",
  ],
};

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

export function getDefaultPermissionsByRole(rol) {
  return [...(DEFAULT_PERMISSIONS_BY_ROLE[rol] || [])];
}

export function normalizePermissions(permisos = []) {
  return Array.from(new Set(permisos)).filter((permission) =>
    PERMISSION_SET.has(permission)
  );
}

export function normalizeUser(usuario = {}) {
  const rol = ROLES.includes(usuario.rol) ? usuario.rol : "Secretaria";
  const permisos = usuario.rol === "Administrador" || rol === "Administrador"
    ? ALL_PERMISSIONS
    : Array.isArray(usuario.permisos)
      ? usuario.permisos
      : getDefaultPermissionsByRole(rol);

  return {
    ...usuario,
    rol,
    permisos: normalizePermissions(permisos),
  };
}

export function isSuperAdmin(usuario = {}) {
  return String(usuario.usuario || "").trim().toLowerCase() === SUPER_ADMIN_USERNAME;
}

export function buildUserPayload(datos = {}) {
  const base = normalizeUser(datos);
  return {
    ...datos,
    rol: base.rol,
    permisos: base.permisos,
  };
}

export function hasPermission(usuario, permission) {
  const normalized = normalizeUser(usuario);
  return normalized.rol === "Administrador" || normalized.permisos.includes(permission);
}
