export function tienePermisoAsignado(user, permiso) {
  if (!user) return false;
  if (user.role === "administrador") return true;
  const permisos = Array.isArray(user.permisos)
    ? user.permisos
    : Array.isArray(user.permissions)
      ? user.permissions
      : [];
  if (permisos.includes(permiso)) return true;
  return permisos.some((p) => permiso.startsWith(p + "."));
}

export function puedeVerVista(user, vista) {
  return !vista.permissions?.length || vista.permissions.some((permiso) => tienePermisoAsignado(user, permiso));
}
