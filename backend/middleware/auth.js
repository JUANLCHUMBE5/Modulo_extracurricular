import jwt from "jsonwebtoken";
import { getDb } from "../dbLocal.js";

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
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    // Si es un rol de padres, se valida directo con el token
    if (req.user.role === "padres") {
      const hasRole = allowedRoles.map(r => String(r).toLowerCase()).includes("padres");
      if (hasRole) {
        return next();
      }
      return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
    }

    try {
      const db = await getDb();
      const userObj = (db.usuarios || []).find(
        u => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
      );

      if (!userObj || userObj.estado !== "Activo") {
        return res.status(401).json({ success: false, message: "Usuario inactivo o no autorizado." });
      }

      const rolesMap = {
        Administrador: "administrador",
        Secretaria: "secretaria",
        Asistente: "secretaria",
        Caja: "caja",
        Cajera: "caja",
        Coordinacion: "coordinacion",
        "Coordinación Académica": "coordinacion",
        "Coordinacion Academica": "coordinacion",
        Auxiliar: "auxiliar",
        Direccion: "direccion",
        Dirección: "direccion"
      };
      const role = rolesMap[userObj.rol] || String(userObj.rol || "").toLowerCase();

      const hasRole = allowedRoles.map(r => String(r).toLowerCase()).includes(role);
      const hasSpecificPermission = allowedRoles.some(allowedRole => {
        const lowerAllowed = String(allowedRole).toLowerCase();
        return (userObj.permisos || []).some(p => p.startsWith(lowerAllowed + "."));
      });

      if (role === "administrador" || hasRole || hasSpecificPermission) {
        req.user.role = role;
        req.user.permissions = userObj.permisos || [];
        return next();
      }
      return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al verificar permisos: " + error.message });
    }
  };
}

export function requirePermission(allowedPermissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    if (req.user.role === "padres") {
      return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
    }

    try {
      const db = await getDb();
      const userObj = (db.usuarios || []).find(
        u => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
      );

      if (!userObj || userObj.estado !== "Activo") {
        return res.status(401).json({ success: false, message: "Usuario inactivo o no autorizado." });
      }

      const rolesMap = {
        Administrador: "administrador",
        Secretaria: "secretaria",
        Asistente: "secretaria",
        Caja: "caja",
        Cajera: "caja",
        Coordinacion: "coordinacion",
        "Coordinación Académica": "coordinacion",
        "Coordinacion Academica": "coordinacion",
        Auxiliar: "auxiliar",
        Direccion: "direccion",
        Dirección: "direccion"
      };
      const role = rolesMap[userObj.rol] || String(userObj.rol || "").toLowerCase();

      if (role === "administrador") {
        return next();
      }

      const userPerms = userObj.permisos || [];
      const hasPermission = allowedPermissions.some(p => userPerms.includes(p));
      if (hasPermission) {
        return next();
      }
      return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al verificar permisos: " + error.message });
    }
  };
}

export function requireLocalDbAccess(req, res, next) {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  return requireAuth(req, res, () => requireRole(["administrador"])(req, res, next));
}

