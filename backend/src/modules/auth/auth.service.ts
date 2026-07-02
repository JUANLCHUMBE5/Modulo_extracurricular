import jwt from "jsonwebtoken";
// @ts-ignore
import bcrypt from "bcryptjs";
import { getDb, saveDb, resetDb as resetDatabase } from "../../database/dbLocal.js";
import { registrarAuditoria, prepararLogsAcceso } from "../../services/audit.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

import { ROLES_MAP } from "../../config/roles.js";

export class AuthService {
  /**
   * Valida las credenciales de un padre (DNI y Fecha de Nacimiento) y genera su token JWT de sesión.
   */
  async validatePadre(dni: string, fechaNacimiento: string, ip: string) {
    const db = await getDb();
    const student = db.estudiantes?.[dni];
    if (student && student.fechaNacimiento === fechaNacimiento) {
      const token = jwt.sign({
        username: student.dni,
        role: "padres",
        roles: ["padres"], // Soporte multi-rol
        name: "Padre de familia",
        dni: student.dni,
        estudiante: student.nombres,
        permissions: []
      }, JWT_SECRET, { expiresIn: "24h" });

      await registrarAuditoria(student.dni, "padres", "PADRES_VALIDAR_EXITOSO", { dni, nombres: student.nombres });

      return {
        token,
        estudiante_id: student.dni,
        dni_estudiante: student.dni,
        codigo_estudiante: student.codigoEstudiante,
        nombres: student.nombres,
        apellidos: student.apellidos || "",
        fecha_nacimiento: student.fechaNacimiento,
        grado_nombre: student.grado,
        seccion: student.seccion,
        nivel_nombre: student.nivel || "",
        tipo_alumno: student.tipoAlumno || "Alumno interno",
        estado_matricula: student.estadoMatricula || "Activo",
        apoderado: student.apoderado || "",
        telefono_apoderado: student.telefonoApoderado || "",
        correo_apoderado: student.correoApoderado || ""
      };
    } else {
      await registrarAuditoria(dni || "desconocido", "padres", "PADRES_VALIDAR_FALLIDO", { ip });
      throw new Error("DNI o fecha de nacimiento incorrectos.");
    }
  }

  /**
   * Autentica a un usuario operador del sistema (Admin, Coordinador, Cajera, Secretaria) mediante username y password.
   */
  async loginOperator(username: string, passwordPlana: string, ip: string) {
    const db = await getDb();
    const cleanUser = String(username || "").trim().toLowerCase();
    const aliases: Record<string, string> = {
      asistente: "secretaria",
      cajera: "caja",
      secre: "secretaria",
      coord: "coordinacion",
      "coordinacion-academica": "coordinacion",
      coordinacionacademica: "coordinacion",
    };
    const userToFind = aliases[cleanUser] || cleanUser;
    const userObj = (db.usuarios || []).find(u => String(u.usuario || "").trim().toLowerCase() === userToFind);

    if (userObj && userObj.estado === "Activo") {
      const contrasenaGuardada = userObj.contrasena;
      if (!contrasenaGuardada) {
        await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip, motivo: "Usuario sin contraseña" });
        throw new Error("Usuario o contraseña incorrectos.");
      }

      let passwordValido = false;
      let migrarContrasena = false;

      if (contrasenaGuardada.startsWith("$2a$") || contrasenaGuardada.startsWith("$2b$")) {
        passwordValido = bcrypt.compareSync(passwordPlana, contrasenaGuardada);
      } else {
        passwordValido = String(passwordPlana) === String(contrasenaGuardada);
        if (passwordValido) {
          migrarContrasena = true;
        }
      }

      if (passwordValido) {
        if (migrarContrasena) {
          userObj.contrasena = bcrypt.hashSync(passwordPlana, 10);
          await saveDb(db);
        }

        const userRolesDb = Array.isArray(userObj.roles) 
          ? userObj.roles 
          : (userObj.rol ? [userObj.rol] : []);
        const mappedRoles = userRolesDb.map((r: string) => ROLES_MAP[r] || String(r || "").toLowerCase());
        const role = mappedRoles[0] || "usuario";

        const token = jwt.sign({
          username: userObj.usuario,
          role,
          roles: mappedRoles, // Soporte multi-rol
          name: userObj.nombre,
          permissions: userObj.permisos || []
        }, JWT_SECRET, { expiresIn: "24h" });

        await registrarAuditoria(userObj.usuario, role, "INICIO_SESION");

        return {
          token,
          user: {
            username: userObj.usuario,
            role,
            roles: mappedRoles, // Soporte multi-rol
            name: userObj.nombre,
            estado: userObj.estado,
            permisos: userObj.permisos || [],
            permissions: userObj.permisos || []
          }
        };
      } else {
        await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip, motivo: "Contraseña incorrecta" });
        throw new Error("Usuario o contraseña incorrectos.");
      }
    } else {
      await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip, motivo: "Usuario inactivo o no existe" });
      throw new Error("Usuario o contraseña incorrectos.");
    }
  }

  /**
   * Obtiene la información del perfil del usuario autenticado actualmente en base a su token.
   */
  async getMe(username: string, currentRole: string) {
    if (currentRole === "padres") {
      return {
        username,
        role: currentRole,
        roles: ["padres"], // Soporte multi-rol
        name: "Padre de familia",
        permissions: [],
        permisos: []
      };
    }

    const db = await getDb();
    const userObj = (db.usuarios || []).find(
      u => String(u.usuario || "").trim().toLowerCase() === String(username || "").trim().toLowerCase()
    );


    if (!userObj || userObj.estado !== "Activo") {
      throw new Error("Usuario inactivo o no autorizado.");
    }

    const userRolesDb = Array.isArray(userObj.roles) 
      ? userObj.roles 
      : (userObj.rol ? [userObj.rol] : []);
    const mappedRoles = userRolesDb.map((r: string) => ROLES_MAP[r] || String(r || "").toLowerCase());
    const role = mappedRoles[0] || "usuario";

    return {
      username: userObj.usuario,
      role,
      roles: mappedRoles, // Soporte multi-rol
      name: userObj.nombre,
      permissions: userObj.permisos || [],
      permisos: userObj.permisos || []
    };
  }

  /**
   * Retorna la lista formateada del registro de auditoría del sistema.
   */
  async getAuditLogs() {
    const db = await getDb();
    return prepararLogsAcceso(db.auditLogs || []);
  }

  /**
   * Genera y retorna una copia de seguridad cruda de la base de datos local JSON.
   */
  async getDbBackup() {
    return await getDb();
  }

  /**
   * Resetea la base de datos a sus valores iniciales por defecto (limpiando todos los datos).
   */
  async resetDb(operatorUsername: string, operatorRole: string, ip: string) {
    const db = await resetDatabase();
    await registrarAuditoria(operatorUsername, operatorRole, "DB_RESET", { ip });
    return db;
  }

  /**
   * Lista a todos los usuarios del sistema sin exponer el hash de sus contraseñas.
   */
  async listUsers() {
    const db = await getDb();
    return (db.usuarios || []).map(({ contrasena, ...u }) => ({
      ...u,
      roles: u.roles || (u.rol ? [u.rol] : [])
    }));
  }

  /**
   * Crea un nuevo usuario en la base de datos, encriptando su contraseña con bcrypt.
   */
  async createUser(operatorUsername: string, operatorRole: string, userData: any) {
    const db = await getDb();
    const contrasenaPlana = userData.contrasena || "1234";
    const rolesArray = Array.isArray(userData.roles)
      ? userData.roles
      : (userData.rol ? [userData.rol] : []);

    const nuevo = {
      id: `USR-${String(Date.now()).slice(-6)}`,
      usuario: userData.usuario,
      nombre: userData.nombre,
      rol: userData.rol || (rolesArray[0] || ""),
      roles: rolesArray, // Soporte multi-rol
      estado: userData.estado || "Activo",
      contrasena: bcrypt.hashSync(contrasenaPlana, 10),
      permisos: userData.permisos || []
    };
    db.usuarios = db.usuarios || [];
    db.usuarios.push(nuevo);
    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_CREAR", { usuarioId: nuevo.id, usuario: nuevo.usuario });

    const { contrasena, ...sanitizedNuevo } = nuevo;
    return sanitizedNuevo;
  }

  /**
   * Actualiza la información de un usuario específico. Valida contra modificaciones no autorizadas al administrador.
   */
  async updateUser(operatorUsername: string, operatorRole: string, id: string, userData: any, superadminKey?: string) {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // Validación protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para modificar este usuario.");
      }
    }

    let contrasena = db.usuarios[idx].contrasena;
    if (userData.contrasena && userData.contrasena !== contrasena) {
      if (!userData.contrasena.startsWith("$2a$") && !userData.contrasena.startsWith("$2b$")) {
        contrasena = bcrypt.hashSync(userData.contrasena, 10);
      } else {
        contrasena = userData.contrasena;
      }
    }

    const rolesArray = Array.isArray(userData.roles)
      ? userData.roles
      : (userData.rol ? [userData.rol] : db.usuarios[idx].roles || [db.usuarios[idx].rol]);

    const updated = {
      ...db.usuarios[idx],
      usuario: userData.usuario,
      nombre: userData.nombre,
      rol: userData.rol || (rolesArray[0] || ""),
      roles: rolesArray, // Soporte multi-rol
      estado: userData.estado || db.usuarios[idx].estado,
      contrasena: contrasena,
      permisos: userData.permisos || []
    };
    db.usuarios[idx] = updated;
    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_EDITAR", { usuarioId: id });

    const { contrasena: _, ...sanitizedUpdated } = updated;
    return sanitizedUpdated;
  }

  /**
   * Cambia el estado (Activo/Inactivo) de un usuario específico. Valida contra modificaciones no autorizadas al administrador.
   */
  async updateUserStatus(operatorUsername: string, operatorRole: string, id: string, estado: string, superadminKey?: string) {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // Validación protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para modificar este usuario.");
      }
    }

    db.usuarios[idx].estado = estado;
    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_ESTADO", { usuarioId: id, estado });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    return sanitizedUser;
  }

  /**
   * Resetea la contraseña de un usuario por defecto a '1234' (encriptada con bcrypt). Valida contra modificaciones no autorizadas al administrador.
   */
  async resetUserPassword(operatorUsername: string, operatorRole: string, id: string, superadminKey?: string) {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // Validación protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para modificar este usuario.");
      }
    }

    db.usuarios[idx].contrasena = bcrypt.hashSync("1234", 10);
    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_RESET_CONTRASENA", { usuarioId: id });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    return sanitizedUser;
  }

  /**
   * Elimina un usuario por completo de la base de datos. Valida contra modificaciones no autorizadas al administrador.
   */
  async deleteUser(operatorUsername: string, operatorRole: string, id: string, superadminKey?: string) {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // Validación protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para eliminar este usuario.");
      }
    }

    db.usuarios = db.usuarios.filter((u: any) => String(u.id) !== String(id));
    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_ELIMINAR", { usuarioId: id });
    return true;
  }
}
