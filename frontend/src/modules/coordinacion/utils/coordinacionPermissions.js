export function tienePermisoAsignado(user, permiso) {
  if (!user) return false;
  if (user.role === "administrador") return true;
  const permisos = Array.isArray(user.permisos)
    ? user.permisos
    : Array.isArray(user.permissions)
      ? user.permissions
      : [];
  return permisos.includes(permiso);
}

export function puedeVerVista(user, vista) {
  return !vista.permissions?.length || vista.permissions.some((permiso) => tienePermisoAsignado(user, permiso));
}
