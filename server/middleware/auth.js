import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No autorizado. Token inexistente o invalido." });
  }
  const token = authHeader.split(" ")[1];
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Error de configuración del servidor." });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Sesion invalida o expirada." });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }
    const role = String(req.user.role || "").toLowerCase();
    const hasRole = allowedRoles.map(r => String(r).toLowerCase()).includes(role);
    if (role === "administrador" || hasRole) {
      return next();
    }
    return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
  };
}

export function requirePermission(allowedPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }
    const role = String(req.user.role || "").toLowerCase();
    if (role === "administrador") {
      return next();
    }
    const userPerms = req.user.permissions || req.user.permisos || [];
    const hasPermission = allowedPermissions.some(p => userPerms.includes(p));
    if (hasPermission) {
      return next();
    }
    return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
  };
}

export function requireLocalDbAccess(req, res, next) {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  return requireAuth(req, res, () => requireRole(["administrador"])(req, res, next));
}
