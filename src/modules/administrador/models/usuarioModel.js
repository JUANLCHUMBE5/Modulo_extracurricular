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

export const REQUIRED_PERMISSIONS_BY_ROLE = {
  Administrador: ALL_PERMISSIONS,
  Secretaria: [],
  Caja: [
    "pagos.ver",
    "pagos.registrar",
    "pagos.editar",
  ],
  Coordinacion: [
    "programas.crear",
    "programas.editar",
    "grupos.crear",
    "grupos.editar",
    "alumnos.historial.ver",
  ],
  Auxiliar: [
    "alumnos.historial.ver",
  ],
  Direccion: [
    "presupuesto.ver",
    "direccion.resumen.ver",
    "reportes.ver",
    "reportes.exportar",
  ],
};

export const DEFAULT_PERMISSIONS_BY_ROLE = {
  ...REQUIRED_PERMISSIONS_BY_ROLE,
  Coordinacion: [
    ...REQUIRED_PERMISSIONS_BY_ROLE.Coordinacion,
    "presupuesto.ver",
    "reportes.ver",
  ],
  Caja: [
    ...REQUIRED_PERMISSIONS_BY_ROLE.Caja,
    "reportes.ver",
  ],
};

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

export function getDefaultPermissionsByRole(rol) {
  return [...(DEFAULT_PERMISSIONS_BY_ROLE[rol] || [])];
}

export function getRequiredPermissionsByRole(rol) {
  return [...(REQUIRED_PERMISSIONS_BY_ROLE[rol] || [])];
}

export function normalizePermissions(permisos = []) {
  return Array.from(new Set(permisos)).filter((permission) =>
    PERMISSION_SET.has(permission)
  );
}

export function normalizeUser(usuario = {}) {
  const rol = ROLES.includes(usuario.rol) ? usuario.rol : "Secretaria";
  const permisosBase = usuario.rol === "Administrador" || rol === "Administrador"
    ? ALL_PERMISSIONS
    : Array.isArray(usuario.permisos)
      ? usuario.permisos
      : getDefaultPermissionsByRole(rol);
  const permisos = [
    ...permisosBase,
    ...getRequiredPermissionsByRole(rol),
  ];

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
