// Definición centralizada y escalable de roles del sistema
export const SYSTEM_ROLES = {
  ADMINISTRADOR: "administrador",
  SECRETARIA: "secretaria",
  CAJA: "caja",
  COORDINACION: "coordinacion",
  AUXILIAR: "auxiliar",
  DIRECCION: "direccion",
  PADRES: "padres",
  SEGURIDAD: "seguridad", // Rol de seguridad agregado a requerimiento
};

// Mapa de traducción de roles provenientes de la base de datos local
export const ROLES_MAP: Record<string, string> = {
  Administrador: SYSTEM_ROLES.ADMINISTRADOR,
  Secretaria: SYSTEM_ROLES.SECRETARIA,
  Asistente: SYSTEM_ROLES.SECRETARIA,
  Caja: SYSTEM_ROLES.CAJA,
  Cajera: SYSTEM_ROLES.CAJA,
  Coordinacion: SYSTEM_ROLES.COORDINACION,
  "Coordinación Académica": SYSTEM_ROLES.COORDINACION,
  "Coordinacion Academica": SYSTEM_ROLES.COORDINACION,
  Auxiliar: SYSTEM_ROLES.AUXILIAR,
  Direccion: SYSTEM_ROLES.DIRECCION,
  Dirección: SYSTEM_ROLES.DIRECCION,
  Seguridad: SYSTEM_ROLES.SEGURIDAD, // Traducción del nuevo rol de seguridad
};
