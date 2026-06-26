const permisosExportar = ["direccion.reportes"];

export function puedeExportar(user) {
  if (user?.role === "administrador") return true;
  const permisos = Array.isArray(user?.permisos)
    ? user.permisos
    : Array.isArray(user?.permissions)
      ? user.permissions
      : [];
  return permisosExportar.some((permiso) => permisos.includes(permiso));
}

export function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}
