import jwt from "jsonwebtoken";
// @ts-ignore
import bcrypt from "bcryptjs";
import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import { ROLES_MAP } from "../../../config/roles.js";
import { AuthRepository } from "../repositories/auth.repository.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const authRepository = new AuthRepository();

function normalizarFecha(fechaStr: string): string {
  if (!fechaStr) return "";
  const limpia = fechaStr.trim();
  const matchYmd = limpia.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchYmd) {
    const y = matchYmd[1];
    const m = matchYmd[2].padStart(2, "0");
    const d = matchYmd[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const matchDmy = limpia.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchDmy) {
    const d = matchDmy[1].padStart(2, "0");
    const m = matchDmy[2].padStart(2, "0");
    const y = matchDmy[3];
    return `${y}-${m}-${d}`;
  }
  return limpia;
}

export class AuthSessionService {
  async validatePadre(dni: string, fechaNacimiento: string, ip: string) {
    const db = await authRepository.getDb();
    const student = db.estudiantes?.[dni];
    const fnDb = student ? normalizarFecha(student.fechaNacimiento) : "";
    const fnInput = normalizarFecha(fechaNacimiento);
    if (student && fnDb === fnInput) {
      const token = jwt.sign({
        username: student.dni,
        role: "padres",
        roles: ["padres"], // Soporte multi-rol
        name: "Padre de familia",
        dni: student.dni,
        estudiante: student.nombres,
        permissions: []
      }, JWT_SECRET, { expiresIn: "20m" });

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

  async loginOperator(username: string, passwordPlana: string, ip: string) {
    const db = await authRepository.getDb();
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
        await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip, motivo: "Usuario sin contraseÃ±a" });
        throw new Error("Usuario o contraseÃ±a incorrectos.");
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
          await authRepository.saveDb(db);
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
        }, JWT_SECRET, { expiresIn: "2h" });

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
        await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip, motivo: "ContraseÃ±a incorrecta" });
        throw new Error("Usuario o contraseÃ±a incorrectos.");
      }
    } else {
      await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip, motivo: "Usuario inactivo o no existe" });
      throw new Error("Usuario o contraseÃ±a incorrectos.");
    }
  }

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

    const db = await authRepository.getDb();
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
}

