export const ROLES = [
  "Administrador",
  "Secretaria",
  "Caja",
  "Coordinacion",
  "Auxiliar",
  "Direccion",
];

export const ROLE_LABELS = {
  Administrador: "Administrador",
  Secretaria: "Asistente",
  Caja: "Cajera",
  Coordinacion: "Coordinación Académica",
  Auxiliar: "Auxiliar",
  Direccion: "Dirección",
};

const ROLE_ALIASES = {
  administrador: "Administrador",
  secretaria: "Secretaria",
  asistente: "Secretaria",
  caja: "Caja",
  cajera: "Caja",
  coordinacion: "Coordinacion",
  coordinacionacademica: "Coordinacion",
  auxiliar: "Auxiliar",
  direccion: "Direccion",
};

function normalizarClaveRol(rol = "") {
  return String(rol)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function normalizeRoleValue(rol = "") {
  return ROLE_ALIASES[normalizarClaveRol(rol)] || (ROLES.includes(rol) ? rol : "Secretaria");
}

export function getRoleLabel(rol = "") {
  const normalized = normalizeRoleValue(rol);
  return ROLE_LABELS[normalized] || normalized;
}

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
    label: "Coordinación Académica",
    permissions: [
      { id: "coordinacion.programas", label: "Gestion de Programas" },
      { id: "coordinacion.carga", label: "Importar / Exportar / Registro" },
      { id: "coordinacion.documentos", label: "Plantillas / Documentos" },
      { id: "coordinacion.asistencia", label: "Asistencia y Control" },
      { id: "coordinacion.historial", label: "Historial / Archivo" },
    ],
  },
  {
    id: "direccion",
    label: "Dirección y reportes",
    permissions: [
      { id: "direccion.resumen", label: "Resumen general" },
      { id: "direccion.reportes", label: "Reportes" },
      { id: "direccion.descuentos", label: "Descuentos y Becas" },
      { id: "direccion.correlativos", label: "Correlativos" },
    ],
  },
  {
    id: "caja",
    label: "Cajera",
    permissions: [
      { id: "caja.cobro", label: "Registrar Cobro" },
      { id: "caja.control", label: "Control y Exportacion" },
      { id: "caja.correlativo", label: "Anulación de Correlativo" },
    ],
  },
  {
    id: "secretaria",
    label: "Asistente (Secretaría)",
    permissions: [
      { id: "secretaria.inscripcion", label: "Inscripción presencial" },
    ],
  },
  {
    id: "auxiliar",
    label: "Auxiliar",
    permissions: [
      { id: "auxiliar.asistencia", label: "Registrar asistencias (QR/DNI)" },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id)
);

export const SUPER_ADMIN_USERNAME = "admin";

export const REQUIRED_PERMISSIONS_BY_ROLE = {
  Administrador: ALL_PERMISSIONS,
  Secretaria: [
    "secretaria.inscripcion",
    "secretaria.asistencias",
  ],
  Caja: [
    "caja.cobro",
    "caja.control",
    "caja.correlativo",
  ],
  Coordinacion: [
    "coordinacion.programas",
    "coordinacion.carga",
    "coordinacion.documentos",
    "coordinacion.asistencia",
    "coordinacion.historial",
  ],
  Auxiliar: [
    "auxiliar.asistencia",
  ],
  Direccion: [
    "direccion.resumen",
    "direccion.reportes",
    "direccion.descuentos",
    "direccion.correlativos",
  ],
};

export const DEFAULT_PERMISSIONS_BY_ROLE = {
  ...REQUIRED_PERMISSIONS_BY_ROLE,
  Coordinacion: [
    ...REQUIRED_PERMISSIONS_BY_ROLE.Coordinacion,
  ],
  Caja: [
    ...REQUIRED_PERMISSIONS_BY_ROLE.Caja,
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
  const rol = normalizeRoleValue(usuario.rol);
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
