import jwt from "jsonwebtoken";
import { getDb } from "../dbLocal.js";

// Middleware para verificar la existencia y validez del token JWT enviado en la cabecera Authorization (Bearer).
export function requireAuth(req, res, next) {
  // 1. Obtiene la cabecera de autorización de la solicitud HTTP
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No autorizado. Token inexistente o invalido." });
  }

  // 2. Extrae el token JWT propiamente dicho
  const token = authHeader.split(" ")[1];
  try {
    // 3. Valida la existencia de la firma secreta en el archivo de entorno
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Error de configuración del servidor." });
    }
    // 4. Decodifica y verifica la autenticidad del token usando jwt.verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adjunta los datos decodificados al objeto de la petición
    next(); // Permite continuar con el siguiente middleware o controlador
  } catch {
    // 5. Retorna error en caso de expiración o alteración del token
    return res.status(401).json({ success: false, message: "Sesion invalida o expirada." });
  }
}

// Middleware para restringir accesos según roles definidos (ej: auxiliar, caja, coordinacion).
export function requireRole(allowedRoles) {
  return async (req, res, next) => {
    // 1. Verifica que la petición haya sido previamente autenticada
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    // 2. Si el rol pertenece al portal de padres, valida el acceso directo
    if (req.user.role === "padres") {
      const hasRole = allowedRoles.map(r => String(r).toLowerCase()).includes("padres");
      if (hasRole) {
        return next();
      }
      return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
    }

    try {
      // 3. Consulta la base de datos de usuarios para validar el estado del operador
      const db = await getDb();
      const userObj = (db.usuarios || []).find(
        u => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
      );

      // 4. Bloquea el acceso si el usuario no existe o está deshabilitado/inactivo
      if (!userObj || userObj.estado !== "Activo") {
        return res.status(401).json({ success: false, message: "Usuario inactivo o no autorizado." });
      }

      // 5. Mapea la nomenclatura de roles internos a roles del middleware
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

      // 6. Evalúa si el rol actual o algún permiso específico está listado en los roles autorizados
      const hasRole = allowedRoles.map(r => String(r).toLowerCase()).includes(role);
      const hasSpecificPermission = allowedRoles.some(allowedRole => {
        const lowerAllowed = String(allowedRole).toLowerCase();
        return (userObj.permisos || []).some(p => p.startsWith(lowerAllowed + "."));
      });

      // 7. Si es administrador, tiene el rol, o el permiso, le da acceso
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

// Middleware para restringir accesos según permisos granulares del usuario (ej: secretaria.inscripcion).
export function requirePermission(allowedPermissions) {
  return async (req, res, next) => {
    // 1. Verifica autenticación previa
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    // 2. Deniega acceso directo a padres para rutas con permisos administrativos granulares
    if (req.user.role === "padres") {
      return res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
    }

    try {
      // 3. Carga el usuario de la base local
      const db = await getDb();
      const userObj = (db.usuarios || []).find(
        u => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
      );

      // 4. Bloquea si no está activo
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

      // 5. El rol Administrador salta automáticamente la validación granular de permisos
      if (role === "administrador") {
        return next();
      }

      // 6. Compara los permisos del usuario contra el arreglo de permisos requeridos
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

// Middleware de seguridad para los endpoints críticos de volcado/guardado local en base de datos.
export function requireLocalDbAccess(req, res, next) {
  // 1. Permite acceso directo si no estamos en producción
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // 2. En producción, exige autenticación obligatoria y rol Administrador
  return requireAuth(req, res, () => requireRole(["administrador"])(req, res, next));
}

