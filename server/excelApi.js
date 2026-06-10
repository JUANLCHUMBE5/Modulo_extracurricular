import cors from "cors";
import "./loadEnv.js";
import { randomUUID } from "crypto";
import express from "express";
import multer from "multer";
import { generarPreviewCargaExcel } from "./excelPreviewService.js";
import {
  MAX_FILE_SIZE,
  MAX_WORD_FILE_SIZE,
  convertirWordAPdf,
  limpiarDni,
  normalizarComparacion,
  normalizarNombreDescarga,
  normalizarPeriodo,
  obtenerInvitacionesAlumno,
  parseJsonArray,
  parseJsonObject,
  validarArchivoWord,
} from "./fileProcessing.js";
import { getDb, getDbSource, resetDb, saveDb, updateDb } from "./localDb.js";
import { prepararLogsAcceso, registrarAuditoria } from "./audit.js";
import { requireAuth, requireLocalDbAccess, requireRole } from "./middleware/auth.js";
import {
  mapDbAsistenciaToApi,
  mapDbEnrollmentToApi,
  mapDbPaymentToApi,
  mapDbProgramToApi,
  agregarGradoProgramaDesdeAlumnoApi,
  gradoCorrespondeAlProgramaApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  obtenerCamposProgramaInvitacionApi,
  obtenerPlantillaProgramaApi,
  programaListoParaPortalPadresApi,
  resolverDocentePorGradoApi,
  resolverHorarioPorGradoApi,
  sincronizarGradosProgramaConInvitadosApi,
  sincronizarPlantillaProgramaApi,
  tieneHorariosPorGrupoApi,
} from "./apiMappers.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";


const app = express();
const PORT = Number(process.env.PORT || process.env.EXCEL_API_PORT || 5175);
const API_HOST = process.env.API_HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const JWT_SECRET = process.env.JWT_SECRET || "secreto-local-san-rafael-extracurricular-2026";

function normalizarEstadoPagoReporteCaja(pago = null, inscripcion = null) {
  if (pago) {
    const estadoPago = normalizarTextoApi(pago.estado);
    if (["completado", "pagado", "validado"].includes(estadoPago)) return "pagado";
    if (["por verificar", "verificando", "verificacion"].includes(estadoPago)) return "verificando";
    if (["observado", "rechazado", "no coincide"].includes(estadoPago)) return "observado";
    if (["anulado", "cancelado"].includes(estadoPago)) return "anulado";

    const origen = normalizarTextoApi(pago.origenRegistro);
    const tieneComprobante = Boolean(
      pago.numeroOperacion ||
      pago.telefonoOperacion ||
      pago.capturaPagoBase64 ||
      pago.capturaPagoNombre
    );
    if (origen.includes("portal") && tieneComprobante) return "verificando";
  }

  const estadoInscripcion = normalizarTextoApi(inscripcion?.estadoPago);
  if (["pagado", "completado", "validado"].includes(estadoInscripcion)) return "pagado";
  return "pendiente";
}

function esProgramaCambridgeApi(programa = {}) {
  const texto = normalizarTextoApi([
    programa.nombre,
    programa.categoria,
    programa.plantilla,
    ...(programa.plantillaVariables || []),
  ].filter(Boolean).join(" "));
  return texto.includes("cambridge") ||
    texto.includes("certificacion") ||
    texto.includes("preparacion") ||
    (programa.plantillaVariables || []).some((variable) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(variable)
    );
}

function claveAlumnoInvitadoApi(alumno = {}) {
  const dni = limpiarDni(alumno.dni);
  if (dni) return `dni:${dni}`;
  const codigo = normalizarTextoApi(alumno.codigoEstudiante || alumno.codigo_estudiante);
  if (codigo) return `codigo:${codigo}`;
  const nombre = normalizarTextoApi(
    alumno.nombres ||
    alumno.alumno ||
    `${alumno.nombre || ""} ${alumno.apellidos || ""}`.trim()
  );
  const grado = normalizarTextoApi(alumno.grado);
  const seccion = normalizarTextoApi(alumno.seccion);
  return nombre ? `nombre:${nombre}:${grado}:${seccion}` : "";
}

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ]
    .map((origin) => String(origin || "").trim().replace(/\/$/, ""))
    .filter(Boolean)
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fieldSize: 5 * 1024 * 1024 },
});


const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORD_FILE_SIZE, files: 1 },
});

app.use(cors({
  origin(origin, callback) {
    const cleanOrigin = String(origin || "").replace(/\/$/, "");
    if (!origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(cleanOrigin) || allowedOrigins.has(cleanOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origen no permitido por CORS."));
  },
}));
app.use(express.json({ limit: "30mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "modulo-extracurricular-api", dbSource: getDbSource() });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbSource: getDbSource() });
});

app.get("/api/db", requireLocalDbAccess, async (_req, res) => {
  try {
    const db = await getDb();
    const sanitizedDb = {
      ...db,
      usuarios: (db.usuarios || []).map(({ contrasena, ...u }) => u)
    };
    res.json(sanitizedDb);
  } catch (error) {
    console.error("No se pudo leer la base local:", error);
    res.status(500).json({ message: "No se pudo leer la base local." });
  }
});

app.put("/api/db", requireLocalDbAccess, async (req, res) => {
  try {
    const db = await saveDb(req.body);
    res.json(db);
  } catch (error) {
    console.error("No se pudo guardar la base local:", error);
    res.status(500).json({ message: "No se pudo guardar la base local." });
  }
});

app.post("/api/db/reset", requireLocalDbAccess, async (_req, res) => {
  try {
    res.json(await resetDb());
  } catch (error) {
    console.error("No se pudo reiniciar la base local:", error);
    res.status(500).json({ message: "No se pudo reiniciar la base local." });
  }
});

app.get("/api/modulo", async (_req, res) => {
  try {
    res.json(await getDb());
  } catch {
    res.status(500).json({ message: "No se pudo leer el modulo extracurricular." });
  }
});

app.get("/api/programas", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.programas || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los programas." });
  }
});

app.get("/api/categorias", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.categorias || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar las categorias." });
  }
});

app.get("/api/estudiantes", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(Object.values(db.estudiantes || {}));
  } catch {
    res.status(500).json({ message: "No se pudieron listar los estudiantes." });
  }
});

app.get("/api/estudiantes/:dni", async (req, res) => {
  try {
    const db = await getDb();
    const dni = limpiarDni(req.params.dni);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) return res.status(404).json({ message: "Estudiante no encontrado." });
    return res.json(estudiante);
  } catch {
    return res.status(500).json({ message: "No se pudo consultar el estudiante." });
  }
});

app.get("/api/inscripciones", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.inscripciones || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar las inscripciones." });
  }
});

app.get("/api/documentos", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.documentosGenerados || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los documentos." });
  }
});

app.get("/api/pagos", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.pagos || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los pagos." });
  }
});

app.get("/api/usuarios", async (_req, res) => {
  try {
    const db = await getDb();
    const sanitizedUsuarios = (db.usuarios || []).map(({ contrasena, ...u }) => u);
    res.json(sanitizedUsuarios);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los usuarios." });
  }
});

app.get("/api/padres/:dni/resumen", async (req, res) => {
  try {
    const db = await getDb();
    const dni = limpiarDni(req.params.dni);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) return res.status(404).json({ message: "Estudiante no encontrado." });

    const inscripciones = (db.inscripciones || []).filter((item) =>
      item.dniEstudiante === dni || item.codigoEstudiante === estudiante.codigoEstudiante
    );
    const pagos = (db.pagos || []).filter((item) =>
      item.dniEstudiante === dni || inscripciones.some((inscripcion) => inscripcion.id === item.inscripcionId)
    );
    const documentos = (db.documentosGenerados || []).filter((item) =>
      item.dniEstudiante === dni || normalizarComparacion(item.alumno) === normalizarComparacion(estudiante.nombres)
    );
    const invitaciones = obtenerInvitacionesAlumno(db, dni);

    return res.json({ estudiante, invitaciones, inscripciones, pagos, documentos });
  } catch {
    return res.status(500).json({ message: "No se pudo consultar el resumen del padre." });
  }
});

app.post("/api/coordinacion/cargas/preview", upload.single("archivo"), async (req, res) => {
  try {
    const periodo = normalizarPeriodo(req.body.periodo);
    const archivo = req.file;
    const programas = parseJsonArray(req.body.programas);
    const existentes = parseJsonObject(req.body.existentes);
    const estudiantes = parseJsonObject(req.body.estudiantes);
    const programaId = req.body.programaId || req.body.programa_id || "";

    const preview = await generarPreviewCargaExcel({
      periodo,
      archivo,
      programas,
      existentes,
      estudiantes,
      programaId,
    });
    res.json(preview);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo validar el archivo Excel.",
    });
  }
});

app.post("/api/secretaria/documentos/pdf", documentUpload.single("archivo"), async (req, res) => {
  try {
    const archivo = req.file;
    validarArchivoWord(archivo);

    const pdf = await convertirWordAPdf(archivo.buffer);
    const nombre = normalizarNombreDescarga(archivo.originalname).replace(/\.docx$/i, ".pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(pdf);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo convertir el Word a PDF. Verifique que el servidor tenga Microsoft Word o LibreOffice instalado.",
    });
  }
});

// ==========================================
// NEW REST API V1 ENDPOINTS FOR LOCAL TESTING
// ==========================================

// 1. Auth Login
app.post("/api/v1/auth/login", async (req, res) => {
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
    
    if (userObj && userObj.estado !== "Inactivo") {
      const contrasenaGuardada = userObj.contrasena || "1234";
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
app.get("/api/v1/auth/me", requireAuth, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Administrator Routes
app.get("/api/v1/administrador/audit-logs", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: prepararLogsAcceso(db.auditLogs || []) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/administrador/db/backup", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: db });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/administrador/db/reset", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const db = await resetDb();
    await registrarAuditoria(req.user.username, req.user.role, "DB_RESET", { ip: req.ip });
    res.json({ success: true, data: db });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Padres Validar
app.post("/api/v1/extracurricular/padres/validar", async (req, res) => {
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

// Proteger todos los endpoints extracurricular posteriores con JWT
app.use("/api/v1/extracurricular", requireAuth);

// 3. Categorias CRUD
app.get("/api/v1/extracurricular/categorias", async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: db.categorias || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/categorias", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { nombre } = req.body;
    const db = await getDb();
    if (!db.categorias.includes(nombre)) {
      db.categorias.push(nombre);
      await saveDb(db);
    }
    res.json({ success: true, data: nombre });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/v1/extracurricular/categorias/:nombre", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { nombre } = req.params;
    const db = await getDb();
    db.categorias = (db.categorias || []).filter(c => String(c).toLowerCase() !== String(nombre).toLowerCase());
    await saveDb(db);
    res.json({ success: true, data: nombre });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Programas CRUD
app.get("/api/v1/extracurricular/programas", async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: (db.programas || []).map((programa) => mapDbProgramToApi(programa, db)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/programas/:id", async (req, res) => {
  try {
    const db = await getDb();
    const prog = (db.programas || []).find(p => p.id === req.params.id);
    if (!prog) return res.status(404).json({ success: false, message: "Programa no encontrado." });
    res.json({ success: true, data: mapDbProgramToApi(prog, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/programas", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const id = `PROG-${String(db.nextProgramaId || 1).padStart(3, "0")}`;
    db.nextProgramaId = (db.nextProgramaId || 1) + 1;
    
    const nuevo = {
      id,
      nombre: req.body.nombre_programa,
      categoria: req.body.categoria,
      fechaInicio: req.body.fecha_inicio,
      fechaFin: req.body.fecha_fin,
      horaInicio: req.body.hora_inicio,
      horaFin: req.body.hora_fin,
      costo: Number(req.body.monto || 0),
      cupos: Number(req.body.cupos || 0),
      cuposOcupados: 0,
      gradosAplicables: req.body.grados || [],
      responsable: req.body.responsable || "",
      periodo: req.body.periodo || "escolar",
      modalidadCobro: req.body.modalidad_cobro || "Mensual",
      duracionAvisoDias: req.body.duracion_aviso_dias || req.body.duracionAvisoDias || 7,
      requiereUniforme: Boolean(req.body.requiere_uniforme),
      requiereIndumentaria: Boolean(req.body.requiere_indumentaria),
      anuncioImagen: req.body.anuncio_imagen || "",
      anuncioImagenNombre: req.body.anuncio_imagen_nombre || "",
      talleresDeportivos: req.body.talleres_deportivos || [],
      horariosPorGrupo: req.body.horarios_por_grupo || [],
      requisitos: req.body.requisitos || "",
      comunicado: req.body.comunicado || "",
      comunicadoCompleto: req.body.comunicado_completo || "",
      detalleCosto: req.body.detalle_costo || "",
      detalleAlmuerzo: req.body.detalle_almuerzo || "",
      concesionarios: req.body.concesionarios || "",
      invitacionMasiva: Boolean(req.body.invitacion_masiva),
      alcanceInvitacionMasiva: req.body.alcance_invitacion_masiva || "colegio",
      plantilla: req.body.plantilla || "",
      plantillaBase64: req.body.plantilla_base64 || "",
      plantillaVariables: req.body.plantilla_variables || [],
      plantillaValidada: Boolean(req.body.plantilla_validada || req.body.plantilla_base64),
      estado: "Habilitado"
    };
    
    sincronizarPlantillaProgramaApi(db, nuevo);
    db.programas.push(nuevo);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_CREAR", {
      id,
      nombre: nuevo.nombre,
      costo: nuevo.costo,
      cupos: nuevo.cupos
    });
    res.json({ success: true, data: mapDbProgramToApi(nuevo, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/programas/documento", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const id = `PROG-${String(db.nextProgramaId || 1).padStart(3, "0")}`;
    db.nextProgramaId = (db.nextProgramaId || 1) + 1;
    
    const nuevo = {
      id,
      nombre: req.body.nombre_programa,
      categoria: req.body.categoria,
      fechaInicio: req.body.fecha_inicio,
      fechaFin: req.body.fecha_fin,
      costo: Number(req.body.monto || 0),
      cupos: Number(req.body.cupos || 0),
      cuposOcupados: 0,
      gradosAplicables: req.body.grados || [],
      periodo: req.body.periodo || "escolar",
      modalidadCobro: req.body.modalidad_cobro || "Mensual",
      duracionAvisoDias: req.body.duracion_aviso_dias || req.body.duracionAvisoDias || 7,
      requiereUniforme: Boolean(req.body.requiere_uniforme),
      requiereIndumentaria: Boolean(req.body.requiere_indumentaria),
      horario: req.body.horario || "Por definir",
      grupo: req.body.grupo || "Por definir",
      plantilla: req.body.plantilla || "",
      plantillaBase64: req.body.plantilla_base64 || "",
      plantillaVariables: req.body.plantilla_variables || [],
      plantillaValidada: true,
      requisitos: req.body.requisitos || "",
      comunicado: req.body.comunicado || "",
      comunicadoCompleto: req.body.comunicado_completo || "",
      detalleCosto: req.body.detalle_costo || "",
      detalleAlmuerzo: req.body.detalle_almuerzo || "",
      concesionarios: req.body.concesionarios || "",
      creadoDesdeDocumento: true,
      estado: "Deshabilitado"
    };
    
    sincronizarPlantillaProgramaApi(db, nuevo);
    db.programas.push(nuevo);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Asistente", req.user?.role || "secretaria", "PROGRAMA_CREAR", {
      id,
      nombre: nuevo.nombre,
      creadoDesdeDocumento: true
    });
    res.json({ success: true, data: mapDbProgramToApi(nuevo, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/programas/:id", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.programas || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Programa no encontrado." });
    
    let nuevoEstado = db.programas[idx].estado;
    if (nuevoEstado === "Finalizado") {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      const hoy = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
      if (req.body.fecha_fin >= hoy) {
        nuevoEstado = "Habilitado";
      }
    }

    const plantillaActual = obtenerPlantillaProgramaApi(db, db.programas[idx]);
    const updated = {
      ...db.programas[idx],
      nombre: req.body.nombre_programa,
      categoria: req.body.categoria,
      fechaInicio: req.body.fecha_inicio,
      fechaFin: req.body.fecha_fin,
      horaInicio: req.body.hora_inicio,
      horaFin: req.body.hora_fin,
      costo: Number(req.body.monto || 0),
      cupos: Number(req.body.cupos || 0),
      gradosAplicables: req.body.grados || [],
      responsable: req.body.responsable || "",
      periodo: req.body.periodo || "escolar",
      modalidadCobro: req.body.modalidad_cobro || "Mensual",
      duracionAvisoDias: req.body.duracion_aviso_dias || req.body.duracionAvisoDias || 7,
      requiereUniforme: Boolean(req.body.requiere_uniforme),
      requiereIndumentaria: Boolean(req.body.requiere_indumentaria),
      anuncioImagen: req.body.anuncio_imagen || "",
      anuncioImagenNombre: req.body.anuncio_imagen_nombre || "",
      talleresDeportivos: req.body.talleres_deportivos || [],
      horariosPorGrupo: req.body.horarios_por_grupo || [],
      requisitos: req.body.requisitos || "",
      comunicado: req.body.comunicado || "",
      comunicadoCompleto: req.body.comunicado_completo || "",
      detalleCosto: req.body.detalle_costo || "",
      detalleAlmuerzo: req.body.detalle_almuerzo || "",
      concesionarios: req.body.concesionarios || "",
      invitacionMasiva: Boolean(req.body.invitacion_masiva),
      alcanceInvitacionMasiva: req.body.alcance_invitacion_masiva || "colegio",
      plantilla: req.body.plantilla ?? plantillaActual.plantilla,
      plantillaBase64: req.body.plantilla_base64 ?? plantillaActual.plantillaBase64,
      plantillaVariables: req.body.plantilla_variables ?? plantillaActual.plantillaVariables,
      plantillaValidada: Boolean(req.body.plantilla_validada ?? plantillaActual.plantillaValidada),
      estado: nuevoEstado
    };
    
    sincronizarPlantillaProgramaApi(db, updated);
    db.programas[idx] = updated;
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_EDITAR", {
      id: req.params.id,
      nombre: updated.nombre,
      costo: updated.costo,
      cupos: updated.cupos
    });
    res.json({ success: true, data: mapDbProgramToApi(updated, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/programas/:id/estado", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.programas || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Programa no encontrado." });
    
    if (db.programas[idx].estado === "Finalizado" && req.body.estado === "Habilitado") {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      const hoy = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
      if (db.programas[idx].fechaFin < hoy) {
        return res.status(400).json({ success: false, message: "El programa ya finalizó por fecha de vigencia. Modifique la fecha fin para volver a usarlo." });
      }
    }
    
    const estadoAnterior = db.programas[idx].estado;
    db.programas[idx].estado = req.body.estado;
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_ESTADO", {
      id: req.params.id,
      nombre: db.programas[idx].nombre,
      estadoAnterior,
      estadoNuevo: req.body.estado
    });
    res.json({ success: true, data: mapDbProgramToApi(db.programas[idx], db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/v1/extracurricular/programas/:id", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const progAEliminar = (db.programas || []).find(p => p.id === req.params.id);
    db.programas = (db.programas || []).filter(p => p.id !== req.params.id);
    if (db.invitadosPorPrograma) {
      delete db.invitadosPorPrograma[req.params.id];
    }
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_ELIMINAR", {
      id: req.params.id,
      nombre: progAEliminar?.nombre || ""
    });
    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Invitaciones e Historial de Cargas
app.get("/api/v1/extracurricular/programas/:programaId/invitados", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: db.invitadosPorPrograma?.[req.params.programaId] || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/programas/:programaId/matriculados", async (req, res) => {
  try {
    const db = await getDb();
    const list = (db.inscripciones || [])
      .filter(item => item.programaId === req.params.programaId && item.estadoInscripcion !== "Anulada");
    res.json({ success: true, data: list.map((item) => mapDbEnrollmentToApi(item, db)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/programas/:programaId/asistencias", async (req, res) => {
  try {
    const db = await getDb();
    const prog = db.programas.find(p => p.id === req.params.programaId);
    const nomProg = normalizarTextoApi(prog?.nombre);
    const list = (db.asistencias || [])
      .filter(item => {
        const coincideId = item.programaId && String(item.programaId) === String(req.params.programaId);
        const coincideNombre = nomProg && normalizarTextoApi(item.programa) === nomProg;
        return coincideId || coincideNombre;
      });
    res.json({ success: true, data: list.map(mapDbAsistenciaToApi) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/invitaciones/buscar", async (req, res) => {
  try {
    const { dni, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    
    let result = null;
    for (const prog of programs) {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => String(item.dni).replace(/\D/g, "") === String(dni).replace(/\D/g, ""));
      if (inv) {
        result = {
          programaId: prog.id,
          programa: mapDbProgramToApi(prog, db),
          invitado: inv
        };
        break;
      }
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/programas/:programaId/invitados", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { programaId } = req.params;
    const { lista } = req.body;
    const db = await getDb();
    const existentes = db.invitadosPorPrograma[programaId] || [];
    const dniExistentes = new Set(existentes.map(item => item.dni));
    const nuevos = (lista || []).filter(item => !dniExistentes.has(item.dni));
    const duplicados = (lista || []).length - nuevos.length;
    const prog = db.programas.find(p => p.id === programaId);
    
    db.invitadosPorPrograma[programaId] = [
      ...existentes,
      ...nuevos.map(item => ({
        ...item,
        periodo: item.periodo || normalizarPeriodoApi(prog?.periodo)
      }))
    ];
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "INVITACION_MASIVA", {
      programaId,
      programaNombre: prog?.nombre || "",
      cantidad: nuevos.length,
      duplicados
    });
    res.json({ success: true, data: { importados: nuevos.length, duplicados } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/coordinacion/cargas/confirmar", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const preview = req.body;
    const db = await getDb();
    const validos = (preview.registros || []).filter(item => item.estado === "Valido");
    const registrosPorArchivo = new Map();
    const validosPorArchivo = new Map();
    const programasTocados = new Set();
    const nuevasCargas = [];
    const fechaCarga = new Date().toISOString();
    db.invitadosPorPrograma = db.invitadosPorPrograma || {};

    (preview.registros || []).forEach(item => {
      const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
      if (!registrosPorArchivo.has(archivoNombre)) registrosPorArchivo.set(archivoNombre, []);
      registrosPorArchivo.get(archivoNombre).push(item);
    });

    validos.forEach(item => {
      const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
      if (!validosPorArchivo.has(archivoNombre)) validosPorArchivo.set(archivoNombre, []);
      validosPorArchivo.get(archivoNombre).push(item);
    });

    validos.forEach(item => {
      if (!item.programaId) return;
      const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
      const grupoArchivo = validosPorArchivo.get(archivoNombre) || [];
      if (!grupoArchivo.cargaId) {
        const todayStr = new Date().toDateString();
        const existing = (db.historialCargas || []).find(
          c =>
            c.archivoNombre === "Registro individual" &&
            c.fecha &&
            new Date(c.fecha).toDateString() === todayStr
        );
        if (archivoNombre === "Registro individual" && existing) {
          grupoArchivo.cargaId = existing.id;
        } else {
          grupoArchivo.cargaId = `CARGA-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4)}`;
        }
        grupoArchivo.registrosHistorial = [];
      }
      const cargaId = grupoArchivo.cargaId;
      const existentes = db.invitadosPorPrograma[item.programaId] || [];
      const programaCarga = db.programas.find(p => p.id === item.programaId);
      if (!esProgramaCambridgeApi(programaCarga) && !gradoCorrespondeAlProgramaApi(programaCarga, item.grado)) {
        throw new Error("El alumno no esta dentro de su grado correspondiente para este taller.");
      }
      const claveAlumno = claveAlumnoInvitadoApi(item);
      const alumnoYaExiste = Boolean(claveAlumno && existentes.some(existente =>
        claveAlumnoInvitadoApi(existente) === claveAlumno
      ));
      if (alumnoYaExiste) {
        item.estado = "Duplicado";
        item.errores = [...(item.errores || []), "Alumno ya existe en este taller vigente."];
        grupoArchivo.duplicadosConfirmacion = (grupoArchivo.duplicadosConfirmacion || 0) + 1;
        return;
      }
      agregarGradoProgramaDesdeAlumnoApi(programaCarga, item.grado);
      programasTocados.add(item.programaId);
      const invitado = {
        cargaId,
        codigoEstudiante: item.codigoEstudiante || "",
        dni: item.dni,
        nombres: `${item.nombres || ""} ${item.apellidos || ""}`.trim(),
        grado: item.grado,
        seccion: item.seccion,
        nivelEducativo: item.nivelEducativo || "",
        seleccion: item.seleccion || "",
        nivelCambridge: item.nivelCambridge || "",
        periodo: normalizarPeriodoApi(preview.periodo),
        telefonoApoderado: item.telefono || "",
        correo: item.correo || "",
        observacion: item.observacion || "",
        archivoNombre,
        estado: item.estadoAlumno || "Invitado"
      };
      db.invitadosPorPrograma[item.programaId] = [
        ...existentes,
        invitado
      ];
      grupoArchivo.registrosHistorial.push({
        programaId: item.programaId,
        programaNombre: item.programaNombre || "",
        archivoNombre,
        dni: item.dni,
        codigoEstudiante: item.codigoEstudiante || "",
        nombres: invitado.nombres,
        grado: item.grado,
        seccion: item.seccion
      });
    });

    programasTocados.forEach((programaId) => {
      sincronizarGradosProgramaConInvitadosApi(db, programaId);
    });

    const duplicadosConfirmacionTotal = Array.from(validosPorArchivo.values()).reduce(
      (total, grupoArchivo) => total + (grupoArchivo.duplicadosConfirmacion || 0),
      0
    );

    validosPorArchivo.forEach((grupoArchivo, archivoNombre) => {
      if (!grupoArchivo.cargaId) return;
      const registrosArchivo = registrosPorArchivo.get(archivoNombre) || grupoArchivo;
      const importadosArchivo = (grupoArchivo.registrosHistorial || []).length;

      const todayStr = new Date().toDateString();
      const existingIndex = (db.historialCargas || []).findIndex(
        c =>
          c.archivoNombre === "Registro individual" &&
          c.fecha &&
          new Date(c.fecha).toDateString() === todayStr
      );

      if (archivoNombre === "Registro individual" && existingIndex !== -1) {
        const ec = db.historialCargas[existingIndex];
        ec.registros = [...(ec.registros || []), ...(grupoArchivo.registrosHistorial || [])];
        ec.resumen = {
          importados: (ec.resumen?.importados || 0) + importadosArchivo,
          total: (ec.resumen?.total || 0) + registrosArchivo.length,
          errores: (ec.resumen?.errores || 0) + registrosArchivo.filter(item => item.estado === "Error").length,
          duplicados: (ec.resumen?.duplicados || 0) + registrosArchivo.filter(item => item.estado === "Duplicado").length
        };
      } else {
        if (importadosArchivo === 0) return;
        nuevasCargas.push({
          id: grupoArchivo.cargaId,
          fecha: fechaCarga,
          periodo: normalizarPeriodoApi(preview.periodo),
          archivoNombre,
          archivos: [archivoNombre],
          usuario: req.user?.username || "Coordinación Académica",
          resumen: {
            importados: importadosArchivo,
            total: registrosArchivo.length,
            errores: registrosArchivo.filter(item => item.estado === "Error").length,
            duplicados: registrosArchivo.filter(item => item.estado === "Duplicado").length
          },
          registros: grupoArchivo.registrosHistorial || []
        });
      }
    });

    db.historialCargas = Array.isArray(db.historialCargas) ? db.historialCargas : [];
    db.historialCargas = [...nuevasCargas, ...db.historialCargas];

    await saveDb(db);

    const primerArchivoNombre = validos[0] ? (validos[0].archivoNombre || preview.archivoNombre || "Carga Excel") : "";
    const returnedCargaId = primerArchivoNombre ? (validosPorArchivo.get(primerArchivoNombre)?.cargaId || "") : "";

    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "CARGAR_EXCEL", {
      cargaIds: nuevasCargas.map(carga => carga.id),
      cantidad: validos.length - duplicadosConfirmacionTotal,
      periodo: preview.periodo,
      total: preview.resumen?.total || validos.length,
      errores: preview.resumen?.errores || 0,
      duplicados: (preview.resumen?.duplicados || 0) + duplicadosConfirmacionTotal
    });
    res.json({
      success: true,
      data: {
        cargaId: returnedCargaId,
        cargaIds: nuevasCargas.map(carga => carga.id),
        cargas: nuevasCargas,
        importados: validos.length - duplicadosConfirmacionTotal,
        total: preview.resumen?.total || validos.length,
        errores: preview.resumen?.errores || 0,
        duplicados: (preview.resumen?.duplicados || 0) + duplicadosConfirmacionTotal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/coordinacion/cargas", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const historial = Array.isArray(db.historialCargas) ? db.historialCargas : [];
    res.json({ success: true, data: historial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/v1/extracurricular/coordinacion/cargas/:cargaId", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { cargaId } = req.params;
    const db = await getDb();
    db.historialCargas = Array.isArray(db.historialCargas) ? db.historialCargas : [];
    db.invitadosPorPrograma = db.invitadosPorPrograma || {};
    const carga = db.historialCargas.find(item => item.id === cargaId);
    if (!carga) return res.status(404).json({ success: false, message: "No se encontro la carga seleccionada." });

    const registros = Array.isArray(carga.registros) ? carga.registros : [];
    const tieneInscripcion = registros.some(registro =>
      (db.inscripciones || []).some(inscripcion =>
        inscripcion.programaId === registro.programaId &&
        inscripcion.dniEstudiante === registro.dni &&
        inscripcion.estadoInscripcion !== "Anulada" &&
        inscripcion.estadoInscripcion !== "anulada"
      )
    );

    if (tieneInscripcion) {
      return res.status(409).json({
        success: false,
        message: "No se puede borrar esta carga porque uno o mas alumnos ya tienen inscripcion activa."
      });
    }

    let eliminados = 0;
    const programasAfectados = new Set(registros.map(registro => registro.programaId).filter(Boolean));
    programasAfectados.forEach(programaId => {
      const actuales = db.invitadosPorPrograma[programaId] || [];
      const filtrados = actuales.filter(invitado => invitado.cargaId !== cargaId);
      eliminados += actuales.length - filtrados.length;
      db.invitadosPorPrograma[programaId] = filtrados;
      sincronizarGradosProgramaConInvitadosApi(db, programaId);
    });

    db.historialCargas = db.historialCargas.filter(item => item.id !== cargaId);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "CARGA_EXCEL_REVERTIR", {
      cargaId,
      eliminados,
      archivos: carga.archivos || []
    });
    res.json({ success: true, data: { cargaId, eliminados } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/programas/:programaId/actividad", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { programaId } = req.params;
    const db = await getDb();
    const alumnos = db.invitadosPorPrograma[programaId]?.length || 0;
    const inscripciones = (db.inscripciones || []).filter(item => item.programaId === programaId).length;
    const documentos = (db.documentosGenerados || []).filter(item => item.programaId === programaId).length;
    res.json({
      success: true,
      data: {
        alumnos,
        inscripciones,
        documentos,
        tieneActividad: (alumnos + inscripciones + documentos) > 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/coordinacion/cargas/:cargaId/errores", requireRole(["coordinacion"]), async (req, res) => {
  res.json({ success: true, data: [] });
});

app.get("/api/v1/extracurricular/programas/:programaId/lista-asistencia", requireRole(["auxiliar", "coordinacion"]), async (req, res) => {
  try {
    const { programaId } = req.params;
    const db = await getDb();
    const invitados = db.invitadosPorPrograma[programaId] || [];
    const list = invitados.map(estudiante => ({
      ...estudiante,
      asistencia: Array.from({ length: 5 }, (_, index) => ({
        sesion: index + 1,
        fecha: `2026-04-${String(7 + index * 7).padStart(2, "0")}`,
        asistio: Math.random() > 0.3
      }))
    }));
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Secretaria Estudiantes y Inscripciones
app.get("/api/v1/extracurricular/secretaria/estudiantes/:dni", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    
    let student = db.estudiantes?.[dni];
    let invitacion = null;
    
    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    for (const prog of programs) {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => item.dni === dni);
      if (inv) {
        invitacion = {
          programaId: prog.id,
          programa: prog,
          invitado: inv
        };
        break;
      }
    }
    
    if (!student && invitacion) {
      student = {
        dni: invitacion.invitado.dni,
        codigoEstudiante: invitacion.invitado.codigoEstudiante || "",
        nombres: invitacion.invitado.nombres.split(" ").slice(0, -2).join(" ") || invitacion.invitado.nombres,
        apellidos: invitacion.invitado.nombres.split(" ").slice(-2).join(" ") || "",
        grado: invitacion.invitado.grado,
        seccion: invitacion.invitado.seccion,
        nivel: invitacion.invitado.nivelEducativo || "",
        fechaNacimiento: "2010-01-01",
        tipoAlumno: "Alumno invitado",
        estadoMatricula: "Activo",
        apoderado: "",
        telefonoApoderado: invitacion.invitado.telefonoApoderado || "",
        correoApoderado: invitacion.invitado.correo || "",
        tieneInvitacion: true,
        programaAsignado: invitacion.programaId,
        programaNombre: invitacion.programa.nombre,
        programaCosto: invitacion.programa.costo,
        seleccion: invitacion.invitado.seleccion || "",
        nivelCambridge: invitacion.invitado.nivelCambridge || ""
      };
    }
    
    if (student) {
      const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
      const inscrip = inscripciones[0];
      const programaInvitado = invitacion ? invitacion.programa : null;
      const plantillaInvitada = programaInvitado ? obtenerPlantillaProgramaApi(db, programaInvitado) : {};
      const cuposDisponiblesInvitado = programaInvitado
        ? Math.max(0, Number(programaInvitado.cupos || 0) - Number(programaInvitado.cuposOcupados || 0))
        : 0;
      const invitadoExcel = invitacion?.invitado || {};
      
      const resStudent = {
        id: student.dni,
        estudiante_id: student.dni,
        dni_estudiante: student.dni,
        codigo_estudiante: invitadoExcel.codigoEstudiante || student.codigoEstudiante || "",
        nombres: invitadoExcel.nombres || student.nombres,
        apellidos: invitadoExcel.nombres ? "" : (student.apellidos || ""),
        fecha_nacimiento: student.fechaNacimiento,
        grado_nombre: invitadoExcel.grado || student.grado,
        seccion: invitadoExcel.seccion || student.seccion,
        nivel_nombre: invitadoExcel.nivelEducativo || student.nivel || "",
        tipo_alumno: student.tipoAlumno || "Alumno interno",
        estado_matricula: student.estadoMatricula || "Activo",
        apoderado: student.apoderado || (invitacion ? (invitacion.invitado.apoderado || "") : ""),
        telefono_apoderado: student.telefonoApoderado || (invitacion ? (invitacion.invitado.telefonoApoderado || "") : ""),
        correo_apoderado: student.correoApoderado || (invitacion ? (invitacion.invitado.correo || "") : ""),
        tieneInvitacion: Boolean(invitacion),
        programaAsignado: invitacion ? invitacion.programaId : "",
        programaNombre: invitacion ? invitacion.programa.nombre : "",
        programaCosto: invitacion ? invitacion.programa.costo : "",
        programaGrupo: programaInvitado?.grupo || "",
        programaGrupoEtario: programaInvitado?.grupoEtario || programaInvitado?.grupo || "",
        programaHorario: programaInvitado?.horario || "",
        programaDisponible: Boolean(invitacion),
        programaHorarioConfigurado: true,
        programaDocente: programaInvitado?.responsable || programaInvitado?.docente || "No definido",
        programaCupos: programaInvitado ? `${cuposDisponiblesInvitado} cupos disponibles` : "",
        programaCuposDisponibles: cuposDisponiblesInvitado,
        programaModalidadCobro: programaInvitado?.modalidadCobro || "",
        programaRequisitos: programaInvitado?.requisitos || "",
        programaComunicadoCompleto: programaInvitado?.comunicadoCompleto || "",
        programaFechaInicio: programaInvitado?.fechaInicio || "",
        programaFechaFin: programaInvitado?.fechaFin || "",
        programaDuracionTaller: programaInvitado?.duracionTaller || "",
        programaDuracionAvisoDias: programaInvitado?.duracionAvisoDias || "",
        plantilla: plantillaInvitada.plantilla || "",
        plantillaBase64: plantillaInvitada.plantillaBase64 || "",
        plantillaVariables: plantillaInvitada.plantillaVariables || [],
        plantillaValidada: Boolean(plantillaInvitada.plantillaValidada),
        requiereUniforme: Boolean(programaInvitado?.requiereUniforme),
        requiereIndumentaria: Boolean(programaInvitado?.requiereIndumentaria),
        seleccion: invitadoExcel.seleccion || student.seleccion || "",
        nivelCambridge: invitadoExcel.nivelCambridge || student.nivelCambridge || "",
        estadoInscripcion: inscrip ? inscrip.estadoInscripcion : "No inscrito",
        estadoPago: inscrip ? (inscrip.estadoPago || "Pendiente") : "Pendiente",
        origenRegistro: inscrip ? (inscrip.origenRegistro || "Presencial") : "Base general de estudiantes"
      };
      
      res.json({ success: true, data: resStudent });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/secretaria/estudiantes", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const { nombre, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const searchVal = normalizarTextoApi(nombre);
    
    if (searchVal.length < 3) return res.json({ success: true, data: [] });
    
    const results = [];
    const seenDnis = new Set();
    
    Object.values(db.estudiantes || {}).forEach(student => {
      const searchKey = normalizarTextoApi(`${student.nombres} ${student.codigoEstudiante || ""}`);
      if (searchKey.includes(searchVal)) {
        seenDnis.add(student.dni);
        
        let invitacion = null;
        const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
        for (const prog of programs) {
          const invitados = db.invitadosPorPrograma[prog.id] || [];
          const inv = invitados.find(item => item.dni === student.dni);
          if (inv) {
            invitacion = {
              programaId: prog.id,
              programa: prog,
              invitado: inv
            };
            break;
          }
        }
        
        const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === student.dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
        const inscrip = inscripciones[0];
        const invitadoExcel = invitacion?.invitado || {};
        const camposProgramaInvitacion = obtenerCamposProgramaInvitacionApi(db, invitacion ? invitacion.programa : null, invitadoExcel.grado || student.grado);
        
        results.push({
          id: student.dni,
          estudiante_id: student.dni,
          dni_estudiante: student.dni,
          codigo_estudiante: invitadoExcel.codigoEstudiante || student.codigoEstudiante || "",
          nombres: invitadoExcel.nombres || student.nombres,
          apellidos: invitadoExcel.nombres ? "" : (student.apellidos || ""),
          fecha_nacimiento: student.fechaNacimiento,
          grado_nombre: invitadoExcel.grado || student.grado,
          seccion: invitadoExcel.seccion || student.seccion,
          nivel_nombre: invitadoExcel.nivelEducativo || student.nivel || "",
          tipo_alumno: student.tipoAlumno || "Alumno interno",
          estado_matricula: student.estadoMatricula || "Activo",
          apoderado: student.apoderado || (invitacion ? (invitacion.invitado.apoderado || "") : ""),
          telefono_apoderado: student.telefonoApoderado || (invitacion ? (invitacion.invitado.telefonoApoderado || "") : ""),
          correo_apoderado: student.correoApoderado || (invitacion ? (invitacion.invitado.correo || "") : ""),
          tieneInvitacion: Boolean(invitacion),
          programaAsignado: invitacion ? invitacion.programaId : "",
          programaNombre: invitacion ? invitacion.programa.nombre : "",
          ...camposProgramaInvitacion,
          seleccion: invitadoExcel.seleccion || student.seleccion || "",
          nivelCambridge: invitadoExcel.nivelCambridge || student.nivelCambridge || "",
          estadoInscripcion: inscrip ? inscrip.estadoInscripcion : "No inscrito",
          estadoPago: inscrip ? (inscrip.estadoPago || "Pendiente") : "Pendiente",
          origenRegistro: inscrip ? (inscrip.origenRegistro || "Presencial") : "Base general de estudiantes"
        });
      }
    });
    
    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    programs.forEach(prog => {
      (db.invitadosPorPrograma[prog.id] || []).forEach(invitado => {
        if (seenDnis.has(invitado.dni)) return;
        
        const searchKey = normalizarTextoApi(`${invitado.nombres} ${invitado.codigoEstudiante || ""}`);
        if (searchKey.includes(searchVal)) {
          seenDnis.add(invitado.dni);
          results.push({
            id: invitado.dni,
            estudiante_id: invitado.dni,
            dni_estudiante: invitado.dni,
            codigo_estudiante: invitado.codigoEstudiante || "",
            nombres: invitado.nombres,
            apellidos: "",
            fecha_nacimiento: "2010-01-01",
            grado_nombre: invitado.grado,
            seccion: invitado.seccion,
            nivel_nombre: invitado.nivelEducativo || "",
            tipo_alumno: "Alumno invitado",
            estado_matricula: "Activo",
            apoderado: "",
            telefono_apoderado: invitado.telefonoApoderado || "",
            correo_apoderado: invitado.correo || "",
            tieneInvitacion: true,
            programaAsignado: prog.id,
            programaNombre: prog.nombre,
            ...obtenerCamposProgramaInvitacionApi(db, prog, invitado.grado),
            seleccion: invitado.seleccion || "",
            nivelCambridge: invitado.nivelCambridge || "",
            estadoInscripcion: "Invitado",
            estadoPago: "Pendiente",
            origenRegistro: "Excel carga Coordinación Académica"
          });
        }
      });
    });
    
    res.json({ success: true, data: results.slice(0, 10) });
  } catch (error) {
    console.error("STUDENT SEARCH ERROR STACK:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/inscripciones", requireAuth, requireRole(["secretaria", "coordinacion", "padres"]), async (req, res) => {
  try {
    const db = await getDb();
    const enrollmentId = `INS-${String(Date.now()).slice(-6)}`;
    const { estudiante_id, programa_id, origen_inscripcion, seccion, grado, apoderado, telefono_apoderado, correo_apoderado, talla_uniforme, talla_polo, talla_short, seleccion, nivel_cambridge } = req.body;
    
    // Si es un padre, solo puede inscribir a su propio DNI (estudiante_id)
    if (req.user.role === "padres" && String(req.user.username) !== String(estudiante_id)) {
      return res.status(403).json({ success: false, message: "No está autorizado para inscribir a este estudiante." });
    }

    const prog = db.programas.find(p => p.id === programa_id);
    if (!prog) return res.status(400).json({ success: false, message: "El programa no existe." });
    
    // 1. Validar que el programa esté activo
    const progEstado = String(prog.estado || "Habilitado").toLowerCase();
    if (progEstado !== "habilitado" && progEstado !== "publicado") {
      return res.status(400).json({ success: false, message: "No se puede registrar inscripción en un programa no habilitado." });
    }

    // 2. Validar cupos disponibles
    const cuposMax = Number(prog.cupos || 0);
    const cuposOcupados = Number(prog.cuposOcupados || 0);
    if (cuposOcupados >= cuposMax) {
      return res.status(400).json({ success: false, message: "No hay cupos disponibles para este programa." });
    }

    // 3. Validar inscripciones duplicadas
    const esDuplicado = (db.inscripciones || []).some(
      item => item.dniEstudiante === estudiante_id &&
      item.programaId === programa_id &&
      item.estadoInscripcion !== "Anulada" &&
      item.estadoInscripcion !== "anulada"
    );
    if (esDuplicado) {
      return res.status(409).json({ success: false, message: "El estudiante ya cuenta con una inscripción activa en este programa." });
    }

    // 4. Padres solo puede inscribir si el programa es masivo o si el alumno esta invitado.
    // Secretaria y Coordinacion pueden registrar manualmente en programas habilitados.
    const invitadosPrograma = db.invitadosPorPrograma?.[programa_id] || [];
    const invitacionRegistro = invitadosPrograma.find(
      inv => String(inv.dni).replace(/\D/g, "") === String(estudiante_id).replace(/\D/g, "")
    );
    if (req.user.role === "padres" && !prog.invitacionMasiva) {
      if (!invitacionRegistro) {
        return res.status(400).json({ success: false, message: "El estudiante no se encuentra en la lista de invitados para este programa." });
      }
    }

    const student = db.estudiantes?.[estudiante_id] || {
      dni: estudiante_id,
      nombres: "Estudiante",
      apellidos: "",
      grado: grado || "",
      seccion: seccion || ""
    };
    const codigoRegistro = invitacionRegistro?.codigoEstudiante || student.codigoEstudiante || "";
    const nombresRegistro = invitacionRegistro?.nombres || `${student.nombres || ""} ${student.apellidos || ""}`.trim();
    const gradoRegistro = grado || invitacionRegistro?.grado || student.grado || "";
    const seccionRegistro = seccion || invitacionRegistro?.seccion || student.seccion || "";
    const plantillaPrograma = obtenerPlantillaProgramaApi(db, prog);
    
    // Almacenar estados normalizados internamente en base de datos
    const newEnrollment = {
      id: enrollmentId,
      dniEstudiante: estudiante_id,
      codigoEstudiante: codigoRegistro,
      nombresEstudiante: nombresRegistro,
      gradoEstudiante: gradoRegistro,
      seccion: seccionRegistro,
      programaId: programa_id,
      programa: prog.nombre,
      categoria: prog.categoria,
      periodo: prog.periodo || "escolar",
      horario: resolverHorarioPorGradoApi(prog, gradoRegistro) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
      docente: resolverDocentePorGradoApi(prog, gradoRegistro),
      costo: prog.costo,
      modalidadCobro: prog.modalidadCobro || "Mensual",
      fechaInicio: prog.fechaInicio,
      fechaFin: prog.fechaFin,
      requisitos: prog.requisitos || "",
      comunicado: prog.comunicado || "",
      comunicadoCompleto: prog.comunicadoCompleto || "",
      detalleCosto: prog.detalleCosto || "",
      detalleAlmuerzo: prog.detalleAlmuerzo || "",
      concesionarios: prog.concesionarios || "",
      plantilla: plantillaPrograma.plantilla,
      plantillaBase64: plantillaPrograma.plantillaBase64,
      plantillaVariables: plantillaPrograma.plantillaVariables,
      plantillaValidada: plantillaPrograma.plantillaValidada,
      apoderado: apoderado || student.apoderado || "",
      telefono: telefono_apoderado || student.telefonoApoderado || "",
      correo: correo_apoderado || student.correoApoderado || "",
      tallaUniforme: talla_uniforme || "",
      tallaPolo: talla_polo || "",
      tallaShort: talla_short || "",
      seleccion: seleccion || invitacionRegistro?.seleccion || "",
      nivelCambridge: nivel_cambridge || invitacionRegistro?.nivelCambridge || "",
      estadoInscripcion: "pendiente_pago", // estado normalizado
      estadoPago: "pendiente", // estado normalizado
      origenRegistro: origen_inscripcion || "Portal padres",
      fechaRegistro: new Date().toISOString()
    };
    
    prog.cuposOcupados = (prog.cuposOcupados || 0) + 1;
    
    db.inscripciones = db.inscripciones || [];
    db.inscripciones.push(newEnrollment);
    
    if (db.estudiantes?.[estudiante_id]) {
      db.estudiantes[estudiante_id].apoderado = apoderado || student.apoderado || "";
      db.estudiantes[estudiante_id].telefonoApoderado = telefono_apoderado || student.telefonoApoderado || "";
      db.estudiantes[estudiante_id].estadoInscripcion = "pendiente_pago";
    }
    
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "INSCRIPCION_CREAR", {
      inscripcionId: enrollmentId,
      estudianteId: estudiante_id,
      programaId: programa_id
    });

    res.json({ success: true, data: mapDbEnrollmentToApi(newEnrollment, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/inscripciones/:id/documento", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { estudiante_id, usuario, tipo_documento, plantilla } = req.body;
    const db = await getDb();
    
    const inscrip = (db.inscripciones || []).find(item => item.id === id);
    if (!inscrip) return res.status(404).json({ success: false, message: "Inscripción no encontrada." });
    
    const docId = `DOC-${String(db.nextDocumentoId || 1).padStart(3, "0")}`;
    db.nextDocumentoId = (db.nextDocumentoId || 1) + 1;
    
    const docObj = {
      id: docId,
      alumno: inscrip.nombresEstudiante,
      dniEstudiante: inscrip.dniEstudiante,
      programa: inscrip.programa,
      programaId: inscrip.programaId,
      fecha: new Date().toISOString(),
      usuario: usuario || "Asistente",
      tipoDocumento: tipo_documento || "Comunicado personalizado",
      plantilla: plantilla || ""
    };
    
    db.documentosGenerados = db.documentosGenerados || [];
    db.documentosGenerados.unshift(docObj);
    
    inscrip.documentoGenerado = true;
    inscrip.ultimoDocumentoGeneradoId = docId;
    inscrip.ultimoDocumentoGeneradoEn = docObj.fecha;
    
    await saveDb(db);
    res.json({ success: true, data: docObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/inscripciones/:inscripcionId/derivar-caja", requireRole(["secretaria"]), async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const db = await getDb();
    const idx = (db.inscripciones || []).findIndex(item => item.id === inscripcionId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Inscripción no encontrada." });
    
    const updated = {
      ...db.inscripciones[idx],
      ...req.body,
      derivadoCaja: true,
      estadoCaja: "derivado_caja",
      estadoInscripcion: db.inscripciones[idx].estadoPago === "validado" ? "confirmada" : "pendiente_pago",
      fechaDerivacionCaja: new Date().toISOString()
    };
    
    db.inscripciones[idx] = updated;
    
    const student = db.estudiantes?.[updated.dniEstudiante];
    if (student) {
      student.estadoInscripcion = updated.estadoInscripcion;
      student.estadoCaja = updated.estadoCaja;
    }
    
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Asistente", req.user?.role || "secretaria", "INSCRIPCION_ESTADO", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior: db.inscripciones[idx].estadoInscripcion,
      estadoNuevo: updated.estadoInscripcion
    });
    res.json({ success: true, data: mapDbEnrollmentToApi(updated, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/secretaria/inscripciones/buscar", requireRole(["secretaria"]), async (req, res) => {
  try {
    const { dni, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    
    const active = list.find(item => !item.derivadoCaja && item.estadoPago !== "Pagado") || list[0] || null;
    res.json({ success: true, data: active ? mapDbEnrollmentToApi(active, db) : null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/secretaria/inscripciones", requireRole(["secretaria"]), async (req, res) => {
  try {
    const { dni, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    res.json({ success: true, data: list.map((item) => mapDbEnrollmentToApi(item, db)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Padres Resumen y Datos
app.get("/api/v1/extracurricular/padres/resumen/:dni", requireRole(["padres", "secretaria"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const db = await getDb();
    const student = db.estudiantes?.[dni];
    if (!student) return res.status(404).json({ success: false, message: "Estudiante no encontrado." });
    
    const studentData = {
      id: student.dni,
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
    
    const enrollments = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && item.estadoInscripcion !== "Anulada");
    const payments = (db.pagos || []).filter(item => item.dniEstudiante === dni || enrollments.some(e => e.id === item.inscripcionId));
    const documents = (db.documentosGenerados || []).filter(item => item.dniEstudiante === dni || item.alumno === student.nombres);
    
    const invitations = [];
    const programs = db.programas || [];
    for (const prog of programs) {
      if (prog.estado !== "Habilitado" || !programaListoParaPortalPadresApi(prog)) continue;

      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => item.dni === dni);
      if (inv) {
        invitations.push({
          id: prog.id,
          nombre: prog.nombre,
          codigo_estudiante: inv.codigoEstudiante || "",
          dni: inv.dni,
          nombres: inv.nombres,
          grado: inv.grado,
          seccion: inv.seccion,
          nivel_educativo: inv.nivelEducativo || "",
          seleccion: inv.seleccion || "",
          nivel_cambridge: inv.nivelCambridge || "",
          periodo: inv.periodo || prog.periodo,
          programa_id: prog.id,
          programa: prog.nombre,
          categoria: prog.categoria || "",
          costo: prog.costo,
          horario: resolverHorarioPorGradoApi(prog, inv.grado) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
          responsable: resolverDocentePorGradoApi(prog, inv.grado),
          modalidad_cobro: prog.modalidadCobro || "",
          requisitos: prog.requisitos || "",
          comunicado: prog.comunicado || "",
          comunicado_completo: prog.comunicadoCompleto || "",
          detalle_costo: prog.detalleCosto || "",
          detalle_almuerzo: prog.detalleAlmuerzo || "",
          concesionarios: prog.concesionarios || "",
          anuncio_imagen: prog.anuncioImagen || "",
          anuncio_imagen_nombre: prog.anuncioImagenNombre || "",
          grados: prog.gradosAplicables || [],
          horarios_por_grupo: prog.horariosPorGrupo || [],
          fecha_inicio: prog.fechaInicio || "",
          fecha_fin: prog.fechaFin || "",
          estado_programa: prog.estado || "",
          requiere_uniforme: Boolean(prog.requiereUniforme),
          requiere_indumentaria: Boolean(prog.requiereIndumentaria),
          invitacion_masiva: Boolean(prog.invitacionMasiva),
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        estudiante: studentData,
        invitaciones: invitations,
        inscripciones: enrollments.map((item) => mapDbEnrollmentToApi(item, db)),
        pagos: payments.map(mapDbPaymentToApi),
        documentos: documents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/padres/:dni/apoderado", requireRole(["padres", "secretaria"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const { apoderado, telefono_apoderado, correo_apoderado } = req.body;
    const db = await getDb();
    const student = db.estudiantes?.[dni];
    if (!student) return res.status(404).json({ success: false, message: "Estudiante no encontrado." });
    
    student.apoderado = apoderado || "";
    student.telefonoApoderado = telefono_apoderado || "";
    student.correoApoderado = correo_apoderado || "";
    
    (db.inscripciones || []).forEach(item => {
      if (item.dniEstudiante === dni) {
        item.apoderado = apoderado || "";
        item.telefono = telefono_apoderado || "";
        item.correo = correo_apoderado || "";
      }
    });
    
    await saveDb(db);
    res.json({
      success: true,
      data: {
        id: student.dni,
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
        apoderado: student.apoderado,
        telefono_apoderado: student.telefonoApoderado,
        correo_apoderado: student.correoApoderado
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/pagos/comprobante", requireRole(["padres"]), upload.single("archivo"), async (req, res) => {
  try {
    const db = await getDb();
    let base64Image = "";
    if (req.file) {
      base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    if (!base64Image) {
      base64Image = req.body.comprobante_base64 || "";
    }

    const inscrip = (db.inscripciones || []).find(item => item.id === req.body.inscripcion_id);
    if (!inscrip) {
      return res.status(404).json({ success: false, message: "No se encontro la inscripcion para registrar el pago." });
    }
    
    const pagoId = `PAG-${String(Date.now()).slice(-6)}`;
    const nuevoPago = {
      id: pagoId,
      inscripcionId: req.body.inscripcion_id || "",
      dniEstudiante: req.body.dni_estudiante || inscrip.dniEstudiante || "",
      nombresEstudiante: inscrip.nombresEstudiante || "",
      programaId: inscrip.programaId || "",
      programa: req.body.nombre_programa || inscrip.programa || "",
      periodo: req.body.periodo || inscrip.periodo || "escolar",
      monto: Number(req.body.monto_pago || inscrip.costo || 0),
      formaPago: req.body.metodo_pago || "Yape",
      numeroOperacion: req.body.numero_operacion || req.body.referencia || "",
      telefonoOperacion: req.body.telefono_operacion || req.body.telefono || "",
      capturaPagoNombre: req.body.comprobante_nombre || "",
      capturaPagoBase64: base64Image,
      estado: "Por Verificar",
      estadoVerificacion: "pendiente",
      fecha: new Date().toISOString(),
      fechaPago: new Date().toISOString(),
      origenRegistro: "Portal padres"
    };
    
    db.pagos = db.pagos || [];
    db.pagos.push(nuevoPago);
    
    inscrip.estadoPago = "pendiente"; // estado normalizado
    inscrip.estadoInscripcion = "pendiente_validacion"; // estado normalizado
    inscrip.pagoId = pagoId;
    inscrip.pagoReferencia = nuevoPago.numeroOperacion;
    inscrip.pagoTelefono = nuevoPago.telefonoOperacion;
    inscrip.pagoCapturaNombre = nuevoPago.capturaPagoNombre;
    
    await saveDb(db);

    await registrarAuditoria("padre", "padres", "PAGO_COMPROBANTE_SUBIR", {
      pagoId,
      inscripcionId: req.body.inscripcion_id,
      monto: nuevoPago.monto
    });

    res.json({ success: true, data: mapDbPaymentToApi(nuevoPago) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Auxiliar
app.get("/api/v1/extracurricular/auxiliar/validar", requireRole(["auxiliar"]), async (req, res) => {
  try {
    const { dni, programa_id } = req.query;
    const db = await getDb();
    
    const inscripcion = (db.inscripciones || []).find(item => item.dniEstudiante === dni && item.programaId === programa_id && item.estadoInscripcion !== "Anulada");
    const student = db.estudiantes?.[dni];
    const pago = inscripcion ? (db.pagos || []).find(p => p.inscripcionId === inscripcion.id && p.estado !== "anulado" && p.estado !== "observado") : null;
    
    let result = {
      accesoPermitido: false,
      mensajeAcceso: "No registrado",
      accion: "Estudiante no registrado en este programa. Dirigirse a Asistente.",
      color: "rojo",
      nombres: student ? student.nombres : "",
      dni: dni,
      codigoEstudiante: student ? student.codigoEstudiante : "",
      grado: student ? student.grado : "",
      seccion: student ? student.seccion : "",
      programa: "",
      horario: "",
      estadoPago: "Pendiente",
      pagoId: "",
      inscripcionId: ""
    };
    
    if (inscripcion) {
      result.inscripcionId = inscripcion.id;
      result.programa = inscripcion.programa;
      result.horario = inscripcion.horario;
      result.pagoId = pago ? pago.id : "";
      
      const isPaid = (pago && (pago.estado === "completado" || pago.estado === "validado")) || inscripcion.estadoPago === "Pagado";
      if (isPaid) {
        result.accesoPermitido = true;
        result.mensajeAcceso = "Pago validado";
        result.accion = "Ingreso permitido.";
        result.color = "verde";
        result.estadoPago = "Pagado";
      } else if (pago && (pago.estado === "Por Verificar" || pago.estado === "Por verificar")) {
        result.accesoPermitido = true;
        result.mensajeAcceso = "Por verificar";
        result.accion = "Ingreso permitido condicional (Pago web por verificar).";
        result.color = "amarillo";
        result.estadoPago = "Por Verificar";
      } else {
        result.accesoPermitido = false;
        result.mensajeAcceso = "Pago pendiente";
        result.accion = "Tiene pagos pendientes. Dirigirse a Cajera antes de ingresar.";
        result.color = "rojo";
        result.estadoPago = "Pendiente";
      }
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/auxiliar/validar-qr", requireRole(["auxiliar"]), async (req, res) => {
  try {
    const { codigo, programa_id } = req.query;
    const dni = String(codigo || "").replace(/\D/g, "");
    const db = await getDb();
    
    const inscripcion = (db.inscripciones || []).find(item => item.dniEstudiante === dni && item.programaId === programa_id && item.estadoInscripcion !== "Anulada");
    const student = db.estudiantes?.[dni];
    const pago = inscripcion ? (db.pagos || []).find(p => p.inscripcionId === inscripcion.id && p.estado !== "anulado" && p.estado !== "observado") : null;
    
    let result = {
      accesoPermitido: false,
      mensajeAcceso: "No registrado",
      accion: "Estudiante no registrado en este programa. Dirigirse a Asistente.",
      color: "rojo",
      nombres: student ? student.nombres : "",
      dni: dni,
      codigoEstudiante: student ? student.codigoEstudiante : "",
      grado: student ? student.grado : "",
      seccion: student ? student.seccion : "",
      programa: "",
      horario: "",
      estadoPago: "Pendiente",
      pagoId: "",
      inscripcionId: ""
    };
    
    if (inscripcion) {
      result.inscripcionId = inscripcion.id;
      result.programa = inscripcion.programa;
      result.horario = inscripcion.horario;
      result.pagoId = pago ? pago.id : "";
      
      const isPaid = (pago && (pago.estado === "completado" || pago.estado === "validado")) || inscripcion.estadoPago === "Pagado";
      if (isPaid) {
        result.accesoPermitido = true;
        result.mensajeAcceso = "Pago validado";
        result.accion = "Ingreso permitido.";
        result.color = "verde";
        result.estadoPago = "Pagado";
      } else if (pago && (pago.estado === "Por Verificar" || pago.estado === "Por verificar")) {
        result.accesoPermitido = true;
        result.mensajeAcceso = "Por verificar";
        result.accion = "Ingreso permitido condicional (Pago web por verificar).";
        result.color = "amarillo";
        result.estadoPago = "Por Verificar";
      } else {
        result.accesoPermitido = false;
        result.mensajeAcceso = "Pago pendiente";
        result.accion = "Tiene pagos pendientes. Dirigirse a Cajera antes de ingresar.";
        result.color = "rojo";
        result.estadoPago = "Pendiente";
      }
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/asistencia", requireRole(["auxiliar"]), async (req, res) => {
  try {
    const { inscripcion_id, pago_id, dni_estudiante, estado_acceso, observacion, origen } = req.body;
    const db = await getDb();
    
    const inscrip = (db.inscripciones || []).find(item => item.id === inscripcion_id);
    const student = db.estudiantes?.[dni_estudiante];
    const prog = inscrip ? db.programas.find(p => p.id === inscrip.programaId) : null;
    
    const astId = `AST-${String(Date.now()).slice(-6)}`;
    const nuevaAsistencia = {
      id: astId,
      inscripcionId: inscripcion_id,
      pagoId: pago_id,
      dniEstudiante: dni_estudiante,
      codigoEstudiante: student?.codigoEstudiante || "",
      nombresEstudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : "",
      programaId: inscrip?.programaId || "",
      programa: inscrip?.programa || prog?.nombre || "",
      horario: inscrip?.horario || "",
      estadoPago: inscrip?.estadoPago || "Pendiente",
      estadoAcceso: estado_acceso || "presente",
      observacion: observacion || "",
      origen: origen || "Auxiliar",
      fechaRegistro: new Date().toISOString()
    };
    
    db.asistencias = db.asistencias || [];
    db.asistencias.push(nuevaAsistencia);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || origen || "Auxiliar", req.user?.role || "auxiliar", "ASISTENCIA_REGISTRAR", {
      alumno: nuevaAsistencia.nombresEstudiante,
      taller: nuevaAsistencia.programa,
      fecha: nuevaAsistencia.fechaRegistro,
      estado: nuevaAsistencia.estadoAcceso
    });
    res.json({ success: true, data: mapDbAsistenciaToApi(nuevaAsistencia) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Caja
app.get("/api/v1/extracurricular/pagos", requireRole(["caja"]), async (req, res) => {
  try {
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const filtered = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    res.json({ success: true, data: filtered.map(mapDbPaymentToApi) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/extracurricular/pagos", requireRole(["caja"]), async (req, res) => {
  try {
    const db = await getDb();
    const { inscripcion_id, monto, forma_pago, numero_operacion, telefono_operacion, fecha_pago, usuario_registro, dni_estudiante, nombres_estudiante, programa, periodo } = req.body;
    
    const pagoId = `PAG-${String(Date.now()).slice(-6)}`;
    const nuevoPago = {
      id: pagoId,
      inscripcionId: inscripcion_id || "",
      dniEstudiante: dni_estudiante || "",
      nombresEstudiante: nombres_estudiante || "",
      programa: programa || "",
      periodo: periodo || "escolar",
      monto: Number(monto || 0),
      formaPago: forma_pago || "Efectivo",
      numeroOperacion: numero_operacion || "",
      telefonoOperacion: telefono_operacion || "",
      capturaPagoBase64: "",
      estado: "validado", // estado normalizado
      fecha: fecha_pago || new Date().toISOString(),
      fechaPago: fecha_pago || new Date().toISOString(),
      origenRegistro: "Cajera",
      validadoPor: usuario_registro || "Cajera",
      validadoEn: new Date().toISOString()
    };
    
    db.pagos = db.pagos || [];
    db.pagos.push(nuevoPago);
    
    const inscrip = (db.inscripciones || []).find(item => item.id === inscripcion_id);
    if (inscrip) {
      inscrip.estadoPago = "validado"; // estado normalizado
      inscrip.estadoInscripcion = "confirmada"; // estado normalizado
      inscrip.pagoId = pagoId;
      inscrip.fechaPago = nuevoPago.fechaPago;
    }
    
    if (db.estudiantes?.[dni_estudiante]) {
      db.estudiantes[dni_estudiante].estadoInscripcion = "confirmada";
    }
    
    await saveDb(db);

    await registrarAuditoria(usuario_registro || "Cajera", "caja", "PAGO_REGISTRAR", {
      pagoId,
      inscripcionId: inscripcion_id,
      monto: nuevoPago.monto
    });

    res.json({ success: true, data: mapDbPaymentToApi(nuevoPago) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/pagos/:pagoId", requireRole(["caja", "padres"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const db = await getDb();
    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });
    
    const updated = {
      ...db.pagos[idx],
      monto: Number(req.body.monto || db.pagos[idx].monto),
      formaPago: req.body.formaPago || db.pagos[idx].formaPago,
      numeroOperacion: req.body.numeroOperacion || db.pagos[idx].numeroOperacion,
      telefonoOperacion: req.body.telefonoOperacion || db.pagos[idx].telefonoOperacion,
      fechaPago: req.body.fechaPago || db.pagos[idx].fechaPago
    };
    db.pagos[idx] = updated;
    
    const inscrip = (db.inscripciones || []).find(item => item.id === updated.inscripcionId);
    if (inscrip) {
      inscrip.fechaPago = updated.fechaPago;
    }
    
    await saveDb(db);
    res.json({ success: true, data: mapDbPaymentToApi(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/caja/resumen", requireRole(["caja"]), async (req, res) => {
  try {
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    
    const pagos = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && p.estado === "completado");
    const totalCobrado = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    
    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const paidInscripIds = new Set(pagos.map(p => p.inscripcionId));
    const pendingInscrip = enrollments.filter(e => !paidInscripIds.has(e.id));
    const totalPendiente = pendingInscrip.reduce((sum, e) => sum + Number(e.costo || 0), 0);
    
    res.json({
      success: true,
      data: {
        totalCobrado,
        totalPendiente,
        transacciones: pagos.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/caja/estudiantes/:dni", requireRole(["caja"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    
    const student = db.estudiantes?.[dni];
    if (!student) return res.json({ success: true, data: null });
    
    const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const activeInscrip = inscripciones.find(item => item.derivadoCaja && item.estadoPago !== "Pagado") || inscripciones[0] || null;
    
    if (activeInscrip) {
      res.json({
        success: true,
        data: {
          nombres: student.nombres,
          apellidos: student.apellidos || "",
          grado: student.grado,
          seccion: student.seccion,
          tipoAlumno: student.tipoAlumno || "Alumno interno",
          programaAsignado: activeInscrip.programaId,
          programaNombre: activeInscrip.programa,
          programaCosto: activeInscrip.costo,
          periodo: activeInscrip.periodo,
          inscripcionCaja: activeInscrip,
          sinInscripcionCaja: false,
          requiereDerivacionCaja: !activeInscrip.derivadoCaja
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          nombres: student.nombres,
          apellidos: student.apellidos || "",
          grado: student.grado,
          seccion: student.seccion,
          tipoAlumno: student.tipoAlumno || "Alumno interno",
          sinInscripcionCaja: true,
          requiereDerivacionCaja: false
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/caja/bandeja-pagos-web", requireRole(["caja"]), async (req, res) => {
  try {
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    
    const list = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && (p.estado === "Por Verificar" || p.estado === "pendiente"));
    
    const dataList = list.map(p => {
      const student = db.estudiantes?.[p.dniEstudiante];
      return {
        ...mapDbPaymentToApi(p),
        estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : p.nombresEstudiante || "",
        dniEstudiante: p.dniEstudiante,
        programa: p.programa
      };
    });
    
    res.json({ success: true, data: dataList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/pagos/:pagoId/validar", requireRole(["caja"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const { observaciones } = req.body;
    const db = await getDb();
    
    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });
    
    db.pagos[idx].estado = "validado"; // estado normalizado
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = req.user?.username || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();
    
    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "validado"; // estado normalizado
      inscrip.estadoInscripcion = "confirmada"; // estado normalizado
      inscrip.fechaPago = db.pagos[idx].validadoEn;
      inscrip.pagoObservacionCaja = observaciones || "";
    }
    
    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      db.estudiantes[inscrip.dniEstudiante].estadoInscripcion = "confirmada";
    }
    
    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "PAGO_VALIDAR", {
      pagoId,
      observaciones
    });

    res.json({ success: true, data: mapDbPaymentToApi(db.pagos[idx]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/v1/extracurricular/pagos/:pagoId/observar", requireRole(["caja"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const { observaciones } = req.body;
    const db = await getDb();
    
    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });
    
    db.pagos[idx].estado = "observado"; // estado normalizado
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = req.user?.username || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();
    
    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente"; // estado normalizado
      inscrip.estadoInscripcion = "observada"; // estado normalizado
      inscrip.pagoObservacionCaja = observaciones || "";
    }
    
    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      db.estudiantes[inscrip.dniEstudiante].estadoInscripcion = "observada";
    }
    
    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "PAGO_OBSERVAR", {
      pagoId,
      observaciones
    });

    res.json({ success: true, data: mapDbPaymentToApi(db.pagos[idx]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/caja/reporte", requireRole(["caja", "direccion"]), async (req, res) => {
  try {
    const { periodo, tipoReporte, desde, hasta, programa, medioPago, estadoPago } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    
    const payments = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    
    let reportList = [];
    
    if (tipoReporte === "pagos_registrados" || tipoReporte === "pagos_realizados") {
      reportList = payments.map(p => {
        const prog = db.programas.find(progItem => progItem.id === p.programaId || normalizarTextoApi(progItem.nombre) === normalizarTextoApi(p.programa));
        const student = db.estudiantes?.[p.dniEstudiante];
        return {
          id: p.id,
          pagoId: p.id,
          inscripcionId: p.inscripcionId || "",
          dniEstudiante: p.dniEstudiante,
          estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : p.nombresEstudiante || "",
          programaId: prog ? prog.id : p.programaId || "",
          programa: prog ? prog.nombre : p.programa || "",
          periodo: period,
          monto: p.monto,
          estadoPago: normalizarEstadoPagoReporteCaja(p),
          estadoInscripcion: "",
          formaPago: p.formaPago,
          numeroOperacion: p.numeroOperacion || "",
          telefonoOperacion: p.telefonoOperacion || "",
          origen: p.origenRegistro || "Portal padres",
          fuente: "pago",
          fecha: p.fechaPago || p.fecha || "",
          fechaRegistro: p.fecha || "",
          fechaPago: p.fechaPago || "",
          apoderado: student ? student.apoderado : "",
          telefono: student ? student.telefonoApoderado : ""
        };
      });
    } else {
      reportList = enrollments.map(e => {
        const p = payments.find(pay => pay.inscripcionId === e.id) || payments.find(pay => pay.dniEstudiante === e.dniEstudiante && (pay.programaId === e.programaId || normalizarTextoApi(pay.programa) === normalizarTextoApi(e.programa)));
        const prog = db.programas.find(progItem => progItem.id === e.programaId);
        const student = db.estudiantes?.[e.dniEstudiante];
        
        const monto = p ? p.monto : e.costo;
        const statePay = normalizarEstadoPagoReporteCaja(p, e);
        
        return {
          id: e.id,
          inscripcionId: e.id,
          dniEstudiante: e.dniEstudiante,
          estudiante: e.nombresEstudiante,
          programaId: prog ? prog.id : e.programaId || "",
          programa: prog ? prog.nombre : e.programa || "",
          periodo: period,
          monto,
          estadoPago: statePay,
          estadoInscripcion: e.estadoInscripcion || "",
          formaPago: p ? p.formaPago : "Sin pago",
          numeroOperacion: p ? p.numeroOperacion : "",
          telefonoOperacion: p ? p.telefonoOperacion : "",
          origen: p ? p.origenRegistro : e.origenRegistro || "Presencial",
          fuente: "inscripcion",
          pagoId: p ? p.id : "",
          fecha: p ? (p.fechaPago || p.fecha) : e.fechaRegistro || "",
          fechaRegistro: e.fechaRegistro || "",
          fechaPago: p ? (p.fechaPago || p.fecha) : "",
          apoderado: e.apoderado || "",
          telefono: e.telefono || ""
        };
      });
    }
    
    const finalReport = reportList.filter(row => {
      if (programa && programa !== "todos" && row.programaId !== programa) return false;
      if (medioPago && medioPago !== "todos" && row.formaPago !== medioPago) return false;
      if (estadoPago && estadoPago !== "todos" && row.estadoPago !== estadoPago) return false;
      
      const rowDate = String(row.fecha).slice(0, 10);
      if (desde && rowDate < desde) return false;
      if (hasta && rowDate > hasta) return false;
      
      const isWeb = String(row.origen).toLowerCase().includes("portal padres") || String(row.origen).toLowerCase().includes("web");
      if (tipoReporte === "registro_secretaria" && isWeb) return false;
      if (tipoReporte === "registro_web" && !isWeb) return false;
      if ((tipoReporte === "por_cobrar" || tipoReporte === "pagos_pendientes") && row.estadoPago !== "pendiente") return false;
      
      return true;
    });
    
    res.json({ success: true, data: finalReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/v1/extracurricular/pagos/:pagoId", requireRole(["caja", "padres"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const db = await getDb();
    const p = (db.pagos || []).find(pay => pay.id === pagoId);
    if (!p) return res.status(404).json({ success: false, message: "Pago no encontrado." });
    res.json({ success: true, data: mapDbPaymentToApi(p) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 10. Reportes Direccion
app.get("/api/v1/extracurricular/reportes/resumen", requireRole(["direccion"]), async (req, res) => {
  try {
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    
    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const payments = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && p.estado === "completado");
    
    const totalMatriculados = enrollments.length;
    const totalRecaudado = payments.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const pagosPendientesVerificar = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && p.estado === "Por Verificar").length;
    
    const porPrograma = {};
    (db.programas || [])
      .filter(p => normalizarPeriodoApi(p.periodo) === period)
      .forEach(p => {
        porPrograma[p.nombre] = enrollments.filter(e => e.programaId === p.id).length;
      });
      
    res.json({
      success: true,
      data: {
        resumenGeneral: {
          totalMatriculados,
          totalRecaudado,
          pagosPendientesVerificar
        },
        matriculadosPorPrograma: porPrograma,
        recaudacionPorPrograma: {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 11. Usuarios
app.use("/api/v1/usuarios", requireAuth, requireRole(["administrador"]));

app.get("/api/v1/usuarios", async (req, res) => {
  try {
    const db = await getDb();
    const sanitizedUsuarios = (db.usuarios || []).map(({ contrasena, ...u }) => u);
    res.json({ success: true, data: sanitizedUsuarios });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/v1/usuarios", async (req, res) => {
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

app.put("/api/v1/usuarios/:id", async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => u.id === req.params.id);
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

app.put("/api/v1/usuarios/:id/estado", async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => u.id === req.params.id);
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

app.post("/api/v1/usuarios/:id/resetear-contrasena", async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.usuarios || []).findIndex(u => u.id === req.params.id);
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

app.delete("/api/v1/usuarios/:id", async (req, res) => {
  try {
    const db = await getDb();
    db.usuarios = (db.usuarios || []).filter(u => u.id !== req.params.id);
    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "USUARIO_ELIMINAR", { usuarioId: req.params.id });

    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: "El archivo Excel no debe superar 5 MB.",
      LIMIT_FIELD_VALUE: "La informacion enviada para validar el Excel es demasiado pesada. Actualice la pagina e intente nuevamente.",
      LIMIT_UNEXPECTED_FILE: "Solo se puede procesar un archivo Excel por validacion.",
    };
    return res.status(400).json({ message: mensajes[error.code] || "El archivo no cumple las condiciones permitidas." });
  }

  return res.status(500).json({ message: "No se pudo procesar la solicitud." });
});

app.listen(PORT, API_HOST, () => {
  console.log(`Excel API listening on http://${API_HOST}:${PORT}`);
});
