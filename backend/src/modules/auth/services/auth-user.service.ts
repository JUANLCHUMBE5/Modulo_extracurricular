// @ts-ignore
import bcrypt from "bcryptjs";
import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import { AuthRepository } from "../repositories/auth.repository.js";

const authRepository = new AuthRepository();

export class AuthUserService {
  async listUsers() {
    const db = await authRepository.getDb();
    return (db.usuarios || []).map(({ contrasena, ...u }) => ({
      ...u,
      roles: u.roles || (u.rol ? [u.rol] : [])
    }));
  }

  async createUser(operatorUsername: string, operatorRole: string, userData: any) {
    const db = await authRepository.getDb();
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
    await authRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_CREAR", { usuarioId: nuevo.id, usuario: nuevo.usuario });

    const { contrasena, ...sanitizedNuevo } = nuevo;
    return sanitizedNuevo;
  }

  async updateUser(operatorUsername: string, operatorRole: string, id: string, userData: any, superadminKey?: string) {
    const db = await authRepository.getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // ValidaciÃ³n protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
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
    await authRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_EDITAR", { usuarioId: id });

    const { contrasena: _, ...sanitizedUpdated } = updated;
    return sanitizedUpdated;
  }

  async updateUserStatus(operatorUsername: string, operatorRole: string, id: string, estado: string, superadminKey?: string) {
    const db = await authRepository.getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // ValidaciÃ³n protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para modificar este usuario.");
      }
    }

    db.usuarios[idx].estado = estado;
    await authRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_ESTADO", { usuarioId: id, estado });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    return sanitizedUser;
  }

  async resetUserPassword(operatorUsername: string, operatorRole: string, id: string, superadminKey?: string) {
    const db = await authRepository.getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // ValidaciÃ³n protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para modificar este usuario.");
      }
    }

    db.usuarios[idx].contrasena = bcrypt.hashSync("1234", 10);
    await authRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_RESET_CONTRASENA", { usuarioId: id });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    return sanitizedUser;
  }

  async deleteUser(operatorUsername: string, operatorRole: string, id: string, superadminKey?: string) {
    const db = await authRepository.getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error("Usuario no encontrado.");
    }

    // ValidaciÃ³n protectora: requiere clave de superadmin si el usuario a modificar es el admin principal
    const targetUser = db.usuarios[idx];
    const isSuperAdmin = targetUser.usuario === "admin";
    if (isSuperAdmin) {
      const systemKey = process.env.SUPERADMIN_USERKEY || "ClavePorDefecto123!";
      if (!superadminKey || superadminKey !== systemKey) {
        throw new Error("Accion denegada. Se requiere la clave de Superadministrador (USERKEY) valida para eliminar este usuario.");
      }
    }

    db.usuarios = db.usuarios.filter((u: any) => String(u.id) !== String(id));
    await authRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "USUARIO_ELIMINAR", { usuarioId: id });
    return true;
  }
}

