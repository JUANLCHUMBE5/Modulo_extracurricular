import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { getDb, saveDb, resetDb } from "../../dbLocal.js";
import { registrarAuditoria, prepararLogsAcceso } from "../../audit.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Limitador de tasa para mitigar ataques de fuerza bruta y scripts automatizados
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 intentos por IP cada minuto
  message: {
    success: false,
    message: "Demasiados intentos de inicio de sesion. Por favor, intente de nuevo en un minuto."
  },
  standardHeaders: true,
  legacyHeaders: false,
});


// Helper to generate temporary passwords
function generarContrasenaTemporal() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let resultado = "";
  for (let i = 0; i < 8; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

// Legacy users list endpoint
router.get("/api/usuarios", async (_req, res) => {
  try {
    const db = await getDb();
    const sanitizedUsuarios = (db.usuarios || []).map(({ contrasena, ...u }) => u);
    res.json(sanitizedUsuarios);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los usuarios." });
  }
});

// Padres Validar (Login for Parents)
router.post("/api/v1/extracurricular/padres/validar", loginLimiter, async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auth Login
router.post("/api/v1/auth/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getDb();
    const cleanUser = String(username || "").trim().toLowerCase();
    const aliases = {
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
        return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auth Get Current User
router.get("/api/v1/auth/me", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "padres") {
      return res.json({
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
    }

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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Administrator Routes
router.get("/api/v1/administrador/audit-logs", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: prepararLogsAcceso(db.auditLogs || []) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/administrador/db/backup", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: db });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/administrador/db/reset", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await resetDb();
    await registrarAuditoria(req.user.username, req.user.role, "DB_RESET", { ip: req.ip });
    res.json({ success: true, data: db });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Users management (requires admin)
router.get("/api/v1/usuarios", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    const sanitizedUsuarios = (db.usuarios || []).map(({ contrasena, ...u }) => u);
    res.json({ success: true, data: sanitizedUsuarios });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/usuarios", requireAuth, requireRole(["administrador"]), async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/api/v1/usuarios/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado." });

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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/api/v1/usuarios/:id/estado", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado." });

    db.usuarios[idx].estado = req.body.estado;
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_ESTADO", { usuarioId: req.params.id, estado: req.body.estado });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    res.json({ success: true, data: sanitizedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/usuarios/:id/resetear-contrasena", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => String(u.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado." });

    db.usuarios[idx].contrasena = bcrypt.hashSync("1234", 10);
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_RESET_CONTRASENA", { usuarioId: req.params.id });

    const { contrasena, ...sanitizedUser } = db.usuarios[idx];
    res.json({ success: true, data: sanitizedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/api/v1/usuarios/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    db.usuarios = (db.usuarios || []).filter(u => String(u.id) !== String(req.params.id));
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_ELIMINAR", { usuarioId: req.params.id });

    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
