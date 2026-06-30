import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../dbLocal.js";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware para verificar la existencia y validez del token JWT enviado en la cabecera Authorization (Bearer).
 * Si el token es válido, decodifica el usuario y lo inyecta en el objeto `req.user` para los siguientes middlewares.
 * 
 * @param req Solicitud HTTP con cabecera de autenticación.
 * @param res Respuesta HTTP para devolver errores en caso de falta de autorización.
 * @param next Siguiente función middleware en la cadena.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 1. Obtiene la cabecera de autorización de la solicitud HTTP
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "No autorizado. Token inexistente o invalido." });
    return;
  }

  // 2. Extrae el token JWT propiamente dicho
  const token = authHeader.split(" ")[1];
  try {
    // 3. Valida la existencia de la firma secreta en el archivo de entorno
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ success: false, message: "Error de configuración del servidor." });
      return;
    }
    // 4. Decodifica y verifica la autenticidad del token usando jwt.verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adjunta los datos decodificados al objeto de la petición
    next(); // Permite continuar con el siguiente middleware o controlador
  } catch {
    // 5. Retorna error en caso de expiración o alteración del token
    res.status(401).json({ success: false, message: "Sesion invalida o expirada." });
    return;
  }
}

/**
 * Middleware para restringir accesos según roles definidos (ej: auxiliar, caja, coordinacion).
 * Permite el acceso si el rol del usuario coincide con alguno de los permitidos o si posee permisos administrativos generales.
 * 
 * @param allowedRoles Lista de nombres de roles autorizados a acceder a la ruta.
 * @returns Función middleware de Express.
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. Verifica que la petición haya sido previamente autenticada
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado." });
      return;
    }

    // 2. Si el rol pertenece al portal de padres, valida el acceso directo
    if (req.user.role === "padres") {
      const hasRole = allowedRoles.map(r => String(r).toLowerCase()).includes("padres");
      if (hasRole) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
      return;
    }

    try {
      // 3. Consulta la base de datos de usuarios para validar el estado del operador
      const db = await getDb();
      const userObj = (db.usuarios || []).find(
        (u: any) => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
      );

      // 4. Bloquea el acceso si el usuario no existe o está deshabilitado/inactivo
      if (!userObj || userObj.estado !== "Activo") {
        res.status(401).json({ success: false, message: "Usuario inactivo o no autorizado." });
        return;
      }

      // 5. Mapea la nomenclatura de roles internos a roles del middleware
      const rolesMap: Record<string, string> = {
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
        return (userObj.permisos || []).some((p: string) => p.startsWith(lowerAllowed + "."));
      });

      // 7. Si es administrador, tiene el rol, o el permiso, le da acceso
      if (role === "administrador" || hasRole || hasSpecificPermission) {
        req.user.role = role;
        req.user.permissions = userObj.permisos || [];
        next();
        return;
      }
      res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Error al verificar permisos: " + error.message });
      return;
    }
  };
}

/**
 * Middleware para restringir accesos según permisos granulares del usuario (ej: secretaria.inscripcion).
 * Permite omitir la validación si el usuario cuenta con rol de Administrador de forma directa.
 * 
 * @param allowedPermissions Lista de strings de códigos de permisos (ej: ["secretaria.inscripcion"]).
 * @returns Función middleware de Express.
 */
export function requirePermission(allowedPermissions: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. Verifica autenticación previa
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado." });
      return;
    }

    // 2. Deniega acceso directo a padres para rutas con permisos administrativos granulares
    if (req.user.role === "padres") {
      res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
      return;
    }

    try {
      // 3. Carga el usuario de la base local
      const db = await getDb();
      const userObj = (db.usuarios || []).find(
        (u: any) => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
      );

      // 4. Bloquea si no está activo
      if (!userObj || userObj.estado !== "Activo") {
        res.status(401).json({ success: false, message: "Usuario inactivo o no autorizado." });
        return;
      }

      const rolesMap: Record<string, string> = {
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
        next();
        return;
      }

      // 6. Compara los permisos del usuario contra el arreglo de permisos requeridos
      const userPerms = userObj.permisos || [];
      const hasPermission = allowedPermissions.some(p => userPerms.includes(p));
      if (hasPermission) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: "No tiene permisos suficientes para realizar esta accion." });
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Error al verificar permisos: " + error.message });
      return;
    }
  };
}

/**
 * Middleware de seguridad para los endpoints críticos de volcado/guardado local en la base de datos.
 * En desarrollo permite acceso directo; en producción restringe el acceso al rol Administrador.
 * 
 * @param req Solicitud HTTP de Express.
 * @param res Respuesta HTTP de Express.
 * @param next Siguiente función middleware en la cadena.
 */
export function requireLocalDbAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 1. Permite acceso directo si no estamos en producción
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }

  // 2. En producción, exige autenticación obligatoria y rol Administrador
  return requireAuth(req, res, () => requireRole(["administrador"])(req, res, next));
}
