import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
// @ts-ignore
import bcrypt from "bcryptjs";
import { getDb, saveDb, resetDb } from "../../dbLocal.js";
import { registrarAuditoria, prepararLogsAcceso } from "../../audit.js";
import { requireAuth, requireRole, AuthenticatedRequest } from "../../middleware/auth.js";
import { loginLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

/**
 * Genera una contraseña aleatoria de 8 caracteres alfanuméricos.
 * Se usa para restablecimientos de contraseña temporales de usuarios operadores.
 * 
 * @returns Cadena de 8 caracteres de contraseña.
 */
function generarContrasenaTemporal(): string {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let resultado = "";
  for (let i = 0; i < 8; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

/**
 * GET /api/usuarios
 * Endpoint heredado (Legacy) para listar usuarios sanitizados (sin contraseñas).
 */
router.get("/api/usuarios", async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const sanitizedUsuarios = (db.usuarios || []).map(({ contrasena, ...u }) => u);
    res.json(sanitizedUsuarios);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los usuarios." });
  }
});

/**
 * POST /api/v1/extracurricular/padres/validar
 * Endpoint de inicio de sesión y autenticación para el Portal de Padres de Familia.
 * Valida el DNI y la Fecha de Nacimiento del estudiante.
 * Retorna un JWT firmado específico para Padres.
 */
router.post("/api/v1/extracurricular/padres/validar", loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni, fecha_nacimiento } = req.body;
    const db = await getDb();
    const student = db.estudiantes?.[dni];
    if (student && student.fechaNacimiento === fecha_nacimiento) {
      // Generar JWT firmado real para padres
      const token = jwt.sign({
        username: student.dni,
        role: "padres",
        name: "Padre de familia",
        dni: student.dni,
        estudiante: student.nombres,
        permissions: []
      }, JWT_SECRET, { expiresIn: "24h" });

      await registrarAuditoria(student.dni, "padres", "PADRES_VALIDAR_EXITOSO", { dni, nombres: student.nombres });

      res.json({
        success: true,
        data: {
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
        }
      });
    } else {
      await registrarAuditoria(dni || "desconocido", "padres", "PADRES_VALIDAR_FALLIDO", { ip: req.ip });
      res.status(400).json({ success: false, message: "DNI o fecha de nacimiento incorrectos." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/auth/login
 * Endpoint de inicio de sesión y autenticación para Operadores del Sistema (Caja, Secretaría, Dirección, etc.).
 * Valida usuario y contraseña. Si la contraseña guardada está en texto plano, la encripta automáticamente en bcrypt.
 * Retorna el JWT firmado con los permisos granulares del usuario.
 */
router.post("/api/v1/auth/login", loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
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
        await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip: req.ip, motivo: "Usuario sin contraseña" });
        res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });
        return;
      }
      let passwordValido = false;
      let migrarContrasena = false;

      if (contrasenaGuardada.startsWith("$2a$") || contrasenaGuardada.startsWith("$2b$")) {
        passwordValido = bcrypt.compareSync(password, contrasenaGuardada);
      } else {
        passwordValido = String(password) === String(contrasenaGuardada);
        if (passwordValido) {
          migrarContrasena = true;
        }
      }

      if (passwordValido) {
        if (migrarContrasena) {
          userObj.contrasena = bcrypt.hashSync(password, 10);
          await saveDb(db);
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

        // Generar JWT firmado real
        const token = jwt.sign({
          username: userObj.usuario,
          role,
          name: userObj.nombre,
          permissions: userObj.permisos || []
        }, JWT_SECRET, { expiresIn: "24h" });

        await registrarAuditoria(userObj.usuario, role, "INICIO_SESION");

        res.json({
          success: true,
          data: {
            token,
            user: {
              username: userObj.usuario,
              role,
              name: userObj.nombre,
              estado: userObj.estado,
              permisos: userObj.permisos || [],
              permissions: userObj.permisos || []
            }
          }
        });
      } else {
        await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip: req.ip, motivo: "Contraseña incorrecta" });
        res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });
      }
    } else {
      await registrarAuditoria(username, "desconocido", "LOGIN_FALLIDO", { ip: req.ip, motivo: "Usuario inactivo o no existe" });
      res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/auth/me
 * Endpoint protegido para obtener los datos del operador actualmente autenticado en base al JWT.
 */
router.get("/api/v1/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user.role === "padres") {
      res.json({
        success: true,
        data: {
          user: {
            username: req.user.username,
            role: req.user.role,
            name: req.user.name,
            permissions: req.user.permissions || [],
            permisos: req.user.permissions || []
          }
        }
      });
      return;
    }

    const db = await getDb();
    const userObj = (db.usuarios || []).find(
      u => String(u.usuario || "").trim().toLowerCase() === String(req.user.username || "").trim().toLowerCase()
    );

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

    res.json({
      success: true,
      data: {
        user: {
          username: userObj.usuario,
          role,
          name: userObj.nombre,
          permissions: userObj.permisos || [],
          permisos: userObj.permisos || []
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- RUTAS ADMINISTRADORAS (Requieren rol de administrador) ---

/**
 * GET /api/v1/administrador/audit-logs
 * Obtiene los registros de auditoría interna formateados para el panel de administración.
 */
router.get("/api/v1/administrador/audit-logs", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    res.json({ success: true, data: prepararLogsAcceso(db.auditLogs || []) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/administrador/db/backup
 * Genera y descarga el volcado de base de datos local completa (Backup JSON).
 */
router.get("/api/v1/administrador/db/backup", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    res.json({ success: true, data: db });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/administrador/db/reset
 * Restablece físicamente todas las entidades del servidor a sus valores por defecto de fábrica.
 */
router.post("/api/v1/administrador/db/reset", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await resetDb();
    await registrarAuditoria(req.user.username, req.user.role, "DB_RESET", { ip: req.ip });
    res.json({ success: true, data: db });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/usuarios
 * Lista la totalidad de los usuarios del sistema (sanitizando contraseñas) para la pantalla de configuración.
 */
router.get("/api/v1/usuarios", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const sanitizedUsuarios = (db.usuarios || []).map(({ contrasena, ...u }) => u);
    res.json({ success: true, data: sanitizedUsuarios });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/usuarios
 * Registra un nuevo operador en el sistema (encriptando su contraseña mediante bcrypt).
 */
router.post("/api/v1/usuarios", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const contrasenaPlana = req.body.contrasena || "1234";
    const nuevo = {
      id: `USR-${String(Date.now()).slice(-6)}`,
      usuario: req.body.usuario,
      nombre: req.body.nombre,
      rol: req.body.rol,
      estado: req.body.estado || "Activo",
      contrasena: bcrypt.hashSync(contrasenaPlana, 10),
      permisos: req.body.permisos || []
    };
    db.usuarios = db.usuarios || [];
    db.usuarios.push(nuevo);
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_CREAR", { usuarioId: nuevo.id, usuario: nuevo.usuario });

    const { contrasena, ...sanitizedNuevo } = nuevo;
    res.json({ success: true, data: sanitizedNuevo });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/v1/usuarios/:id
 * Modifica la información, el rol o el listado de permisos del operador especificado.
 */
router.put("/api/v1/usuarios/:id", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(req.params.id));
    if (idx === -1) {
      res.status(404).json({ success: false, message: "Usuario no encontrado." });
      return;
    }

    let contrasena = db.usuarios[idx].contrasena;
    if (req.body.contrasena && req.body.contrasena !== contrasena) {
      if (!req.body.contrasena.startsWith("$2a$") && !req.body.contrasena.startsWith("$2b$")) {
        contrasena = bcrypt.hashSync(req.body.contrasena, 10);
      } else {
        contrasena = req.body.contrasena;
      }
    }

    const updated = {
      ...db.usuarios[idx],
      usuario: req.body.usuario,
      nombre: req.body.nombre,
      rol: req.body.rol,
      estado: req.body.estado || db.usuarios[idx].estado,
      contrasena: contrasena,
      permisos: req.body.permisos || []
    };
    db.usuarios[idx] = updated;
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_EDITAR", { usuarioId: req.params.id });

    const { contrasena: _, ...sanitizedUpdated } = updated;
    res.json({ success: true, data: sanitizedUpdated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/v1/usuarios/:id/estado
 * Habilita o deshabilita (Inactivo) la cuenta de un usuario operador.
 */
router.put("/api/v1/usuarios/:id/estado", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(req.params.id));
    if (idx === -1) {
      res.status(404).json({ success: false, message: "Usuario no encontrado." });
      return;
    }

    db.usuarios[idx].estado = req.body.estado;
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_ESTADO", { usuarioId: req.params.id, estado: req.body.estado });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    res.json({ success: true, data: sanitizedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/usuarios/:id/resetear-contrasena
 * Restablece la contraseña de un operador al valor por defecto "1234".
 */
router.post("/api/v1/usuarios/:id/resetear-contrasena", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(req.params.id));
    if (idx === -1) {
      res.status(404).json({ success: false, message: "Usuario no encontrado." });
      return;
    }

    db.usuarios[idx].contrasena = bcrypt.hashSync("1234", 10);
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_RESET_CONTRASENA", { usuarioId: req.params.id });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    res.json({ success: true, data: sanitizedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/v1/usuarios/:id
 * Elimina físicamente el operador especificado de la base de datos local.
 */
router.delete("/api/v1/usuarios/:id", requireAuth, requireRole(["administrador"]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    db.usuarios = (db.usuarios || []).filter(u => String(u.id) !== String(req.params.id));
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_ELIMINAR", { usuarioId: req.params.id });

    res.json({ success: true, data: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
