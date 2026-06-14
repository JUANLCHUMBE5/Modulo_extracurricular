import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initialData } from "../src/services/localDbClient.js";
import { supabase } from "./supabaseClient.js"; // IMPORTAMOS TU CLIENTE NUEVO
import {
  getOfficialDb,
  isOfficialApiEnabled,
  resetOfficialDb,
  saveOfficialDb,
} from "./officialApiDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");
let writeQueue = Promise.resolve();
let mutationQueue = Promise.resolve();
let cachedDb = null;
let cachedDbMtimeMs = 0;

// ==========================================
// MIGRACIÓN A SUPABASE INTERCEPTOR LOGIC
// ==========================================

const COLUMNAS_USUARIOS = ["id", "nombre", "usuario", "rol", "estado", "contrasena"];
const COLUMNAS_ESTUDIANTES = ["dni", "codigoEstudiante", "nombres", "grado", "seccion", "nivel", "sexo", "fechaNacimiento", "tipoAlumno", "estadoMatricula", "apoderado", "telefonoApoderado", "correoApoderado", "estadoInscripcion", "estadoCaja"];
const COLUMNAS_PROGRAMAS = ["id", "nombre", "categoria", "fechaInicio", "fechaFin", "costo", "cupos", "cuposOcupados", "gradosAplicables", "periodo", "modalidadCobro", "duracionAvisoDias", "requiereUniforme", "requiereIndumentaria", "horario", "grupo", "plantilla", "plantillaBase64"];
const COLUMNAS_INSCRIPCIONES = ["id", "dniEstudiante", "codigoEstudiante", "nombresEstudiante", "gradoEstudiante", "seccion", "programaId", "programa", "categoria", "periodo", "horario", "docente", "costo", "modalidadCobro", "fechaInicio", "fechaFin", "estadoPago", "pagoId"];
const COLUMNAS_PAGOS = ["id", "inscripcionId", "dniEstudiante", "nombresEstudiante", "programaId", "programa", "periodo", "monto", "formaPago", "numeroOperacion", "telefonoOperacion", "capturaPagoNombre", "capturaPagoBase64", "estado", "fechaPago"];
const COLUMNAS_ASISTENCIAS = ["id", "inscripcionId", "pagoId", "dniEstudiante", "codigoEstudiante", "nombresEstudiante", "programaId", "programa", "horario", "estadoPago", "estadoAcceso", "observacion", "origen", "fechaRegistro"];
const COLUMNAS_INVITADOS = ["programaId", "dni", "nombres", "grado", "seccion"];

function sanearObjeto(obj, llavesValidas) {
  if (!obj || typeof obj !== "object") return obj;
  const nuevo = {};
  llavesValidas.forEach(k => {
    if (obj[k] !== undefined) {
      nuevo[k] = obj[k];
    }
  });
  return nuevo;
}

function sanearLista(lista, llavesValidas) {
  return (Array.isArray(lista) ? lista : []).map(item => sanearObjeto(item, llavesValidas));
}

async function readFromSupabase() {
  try {
    // 1. Traemos todas las tablas en paralelo para máxima velocidad
    const [
      resUsuarios, resEstudiantes, resProgramas, resInscripciones, 
      resPagos, resAsistencias, resInvitados, resLogs, resCategorias
    ] = await Promise.all([
      supabase.from("usuarios").select("*"),
      supabase.from("estudiantes").select("*"),
      supabase.from("programas").select("*"),
      supabase.from("inscripciones").select("*"),
      supabase.from("pagos").select("*"),
      supabase.from("asistencias").select("*"),
      supabase.from("invitados_programa").select("*"),
      supabase.from("audit_logs").select("*"),
      supabase.from("categorias").select("*")
    ]);

    // 2. Mapeo y transformación de formatos (De Filas SQL a Objetos Indexados JSON)
    const estudiantesObj = {};
    (resEstudiantes.data || []).forEach(e => {
      estudiantesObj[e.dni] = e;
    });

    const invitadosObj = {};
    (resInvitados.data || []).forEach(i => {
      if (!invitadosObj[i.programaId]) invitadosObj[i.programaId] = [];
      const existe = invitadosObj[i.programaId].some(inv => inv.dni === i.dni);
      if (!existe) {
        invitadosObj[i.programaId].push({
          dni: i.dni,
          nombres: i.nombres,
          grado: i.grado,
          seccion: i.seccion
        });
      }
    });

    const EXTRA_FIELDS = [
      "horaInicio",
      "horaFin",
      "horaLimiteAviso",
      "anuncioImagen",
      "anuncioImagenNombre",
      "talleresDeportivos",
      "horariosPorGrupo",
      "edadMinima",
      "edadMaxima",
      "grupoEtario",
      "requisitos",
      "comunicado",
      "comunicadoCompleto",
      "detalleCosto",
      "detalleAlmuerzo",
      "concesionarios",
      "creadoDesdeDocumento",
      "estado",
      "responsable",
      "docente",
      "duracionTaller",
      "cicloI",
      "cicloII",
      "invitacionMasiva",
      "alcanceInvitacionMasiva",
      "anuncioImagenTamano",
      "anuncioImagenComprimida",
      "plantillaVariables",
      "plantillaValidada"
    ];

    const rawProgramas = resProgramas.data || [];
    const programasList = rawProgramas.map(p => {
      let restoredGrupo = p.grupo;
      if (p.grupo && p.grupo.startsWith("{")) {
        try {
          const meta = JSON.parse(p.grupo);
          EXTRA_FIELDS.forEach(field => {
            if (meta[field] !== undefined) {
              p[field] = meta[field];
            }
          });
          restoredGrupo = meta.originalGrupo || "";
        } catch (e) {
          console.error("Error parsing program metadata JSON:", e);
        }
      }
      p.grupo = restoredGrupo;
      return p;
    });

    // Construimos plantillasPorPrograma directamente a partir de las columnas plantilla y plantillaBase64 en programas
    const plantillasObj = {};
    programasList.forEach(p => {
      if (p.plantilla) {
        plantillasObj[p.id] = {
          plantilla: p.plantilla,
          plantillaBase64: p.plantillaBase64 || "",
          plantillaVariables: p.plantillaVariables || [],
          plantillaActualizadaEn: p.plantillaActualizadaEn || new Date().toISOString()
        };
      }
    });

    let maxProgNum = 0;
    programasList.forEach(p => {
      const match = String(p.id || "").match(/PROG-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxProgNum) maxProgNum = num;
      }
    });

    const categoriasArray = (resCategorias.data || []).map(c => c.categoria);
    const finalCategorias = categoriasArray.length ? categoriasArray : initialData.categorias;

    // 3. Retornamos la estructura exacta simulando db.json
    return {
      usuarios: resUsuarios.data || [],
      estudiantes: estudiantesObj,
      programas: programasList,
      inscripciones: (resInscripciones.data || []).map(ins => {
        ins.estadoInscripcion = ins.estadoPago || "Pendiente de pago";
        ins.apoderado = estudiantesObj[ins.dniEstudiante]?.apoderado || "";
        return ins;
      }),
      pagos: (resPagos.data || []).map(pag => {
        pag.nroOperacion = pag.numeroOperacion || "";
        pag.fechaRegistro = pag.fechaPago || "";
        return pag;
      }),
      asistencias: resAsistencias.data || [],
      invitadosPorPrograma: invitadosObj,
      auditLogs: resLogs.data || [],
      plantillasPorPrograma: plantillasObj,
      categorias: finalCategorias, 
      documentosGenerados: [],
      historialCargas: [],
      nextProgramaId: maxProgNum + 1
    };
  } catch (err) {
    console.error("❌ Error conectando a Supabase desde backend:", err);
    return clone(initialData);
  }
}

async function writeToSupabase(db) {
  try {
    // 1. Preparamos inserciones limpias limpiando objetos y transformándolos a listas SQL
    const usuarios = db.usuarios || [];
    const estudiantes = Object.values(db.estudiantes || {});
    const inscripciones = (db.inscripciones || []).map(ins => {
      return {
        ...ins,
        estadoPago: ins.estadoPago || ins.estadoInscripcion || "Pendiente de pago"
      };
    });
    const pagos = (db.pagos || []).map(pag => {
      return {
        ...pag,
        formaPago: pag.formaPago || pag.metodoPago || "Yape",
        numeroOperacion: pag.numeroOperacion || pag.nroOperacion || "",
        telefonoOperacion: pag.telefonoOperacion || pag.telefono || ""
      };
    });
    const asistencias = db.asistencias || [];
    const auditLogs = db.auditLogs || [];

    const EXTRA_FIELDS = [
      "horaInicio",
      "horaFin",
      "horaLimiteAviso",
      "anuncioImagen",
      "anuncioImagenNombre",
      "talleresDeportivos",
      "horariosPorGrupo",
      "edadMinima",
      "edadMaxima",
      "grupoEtario",
      "requisitos",
      "comunicado",
      "comunicadoCompleto",
      "detalleCosto",
      "detalleAlmuerzo",
      "concesionarios",
      "creadoDesdeDocumento",
      "estado",
      "responsable",
      "docente",
      "duracionTaller",
      "cicloI",
      "cicloII",
      "invitacionMasiva",
      "alcanceInvitacionMasiva",
      "anuncioImagenTamano",
      "anuncioImagenComprimida",
      "plantillaVariables",
      "plantillaValidada"
    ];

    // Enriquecemos los programas con los datos de plantilla guardados en plantillasPorPrograma antes del upsert
    const programas = (db.programas || []).map(p => {
      const templateData = db.plantillasPorPrograma?.[p.id] || {};
      const baseProg = {
        ...p,
        plantilla: p.plantilla || "",
        plantillaBase64: p.plantillaBase64 || templateData.plantillaBase64 || "",
        plantillaVariables: p.plantillaVariables || templateData.plantillaVariables || [],
        plantillaValidada: p.plantillaValidada !== undefined ? p.plantillaValidada : (templateData.plantillaValidada !== undefined ? templateData.plantillaValidada : false)
      };

      // Serializamos los campos adicionales en la columna 'grupo'
      const meta = {};
      EXTRA_FIELDS.forEach(field => {
        if (baseProg[field] !== undefined) {
          meta[field] = baseProg[field];
        }
      });
      meta.originalGrupo = baseProg.grupo || "";

      return {
        ...baseProg,
        grupo: JSON.stringify(meta)
      };
    });

    const invitados_programa = [];
    Object.entries(db.invitadosPorPrograma || {}).forEach(([progId, lista]) => {
      if (Array.isArray(lista)) {
        lista.forEach(inv => {
          invitados_programa.push({
            programaId: progId,
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado,
            seccion: inv.seccion
          });
        });
      }
    });

    // 2. Eliminar registros huérfanos físicamente en Supabase (sincronizar eliminaciones)
    const activeUserIds = usuarios.map(u => u.id).filter(Boolean);
    const activeProgramIds = programas.map(p => p.id).filter(Boolean);
    const activeEnrollmentIds = inscripciones.map(i => i.id).filter(Boolean);
    const activePagoIds = pagos.map(p => p.id).filter(Boolean);
    const activeAsistenciaIds = asistencias.map(a => a.id).filter(Boolean);

    const deleteResults = await Promise.all([
      // Eliminar usuarios huérfanos
      activeUserIds.length 
        ? supabase.from("usuarios").delete().filter("id", "not.in", `(${activeUserIds.join(",")})`) 
        : supabase.from("usuarios").delete().neq("id", ""),
      // Eliminar programas huérfanos
      activeProgramIds.length 
        ? supabase.from("programas").delete().filter("id", "not.in", `(${activeProgramIds.join(",")})`) 
        : supabase.from("programas").delete().neq("id", ""),
      // Eliminar invitados cuyos programas ya no existen
      activeProgramIds.length 
        ? supabase.from("invitados_programa").delete().filter("programaId", "not.in", `(${activeProgramIds.join(",")})`) 
        : supabase.from("invitados_programa").delete().neq("programaId", ""),
      // Eliminar inscripciones huérfanas
      activeEnrollmentIds.length 
        ? supabase.from("inscripciones").delete().filter("id", "not.in", `(${activeEnrollmentIds.join(",")})`) 
        : supabase.from("inscripciones").delete().neq("id", ""),
      // Eliminar pagos huérfanos
      activePagoIds.length 
        ? supabase.from("pagos").delete().filter("id", "not.in", `(${activePagoIds.join(",")})`) 
        : supabase.from("pagos").delete().neq("id", ""),
      // Eliminar asistencias huérfanas
      activeAsistenciaIds.length 
        ? supabase.from("asistencias").delete().filter("id", "not.in", `(${activeAsistenciaIds.join(",")})`) 
        : supabase.from("asistencias").delete().neq("id", "")
    ]);

    deleteResults.forEach((res, i) => {
      if (res.error) {
        console.error(`❌ Error en delete index ${i}:`, res.error);
      }
    });

    // Sincronizar eliminaciones de invitados dentro de programas existentes: borrar todos para insertar los actuales
    const syncInvitadosProms = Object.keys(db.invitadosPorPrograma || {}).map(async (progId) => {
      const res = await supabase.from("invitados_programa").delete().eq("programaId", progId);
      if (res.error) {
        console.error(`❌ Error en delete invitados de ${progId}:`, res.error);
      }
      return res;
    });
    await Promise.all(syncInvitadosProms);

    // 3. Subimos todo de golpe usando Upsert (Si existe actualiza, si no lo inserta)
    // Usamos .upsert() con claves primarias definidas en tu SQL
    const results = await Promise.all([
      usuarios.length ? supabase.from("usuarios").upsert(sanearLista(usuarios, COLUMNAS_USUARIOS)) : Promise.resolve({ error: null }),
      estudiantes.length ? supabase.from("estudiantes").upsert(sanearLista(estudiantes, COLUMNAS_ESTUDIANTES)) : Promise.resolve({ error: null }),
      programas.length ? supabase.from("programas").upsert(sanearLista(programas, COLUMNAS_PROGRAMAS)) : Promise.resolve({ error: null }),
      inscripciones.length ? supabase.from("inscripciones").upsert(sanearLista(inscripciones, COLUMNAS_INSCRIPCIONES)) : Promise.resolve({ error: null }),
      pagos.length ? supabase.from("pagos").upsert(sanearLista(pagos, COLUMNAS_PAGOS)) : Promise.resolve({ error: null }),
      asistencias.length ? supabase.from("asistencias").upsert(sanearLista(asistencias, COLUMNAS_ASISTENCIAS)) : Promise.resolve({ error: null }),
      invitados_programa.length ? supabase.from("invitados_programa").insert(sanearLista(invitados_programa, COLUMNAS_INVITADOS)) : Promise.resolve({ error: null }),
      auditLogs.length ? supabase.from("audit_logs").upsert(auditLogs) : Promise.resolve({ error: null })
    ]);

    for (const res of results) {
      if (res && res.error) {
        throw new Error(`Error en operación de base de datos Supabase: ${res.error.message || JSON.stringify(res.error)}`);
      }
    }

    // 4. Sincronizar categorías (borrar e insertar para asegurar coincidencia exacta)
    const categoriasList = db.categorias || [];
    if (categoriasList.length) {
      const deleteRes = await supabase.from("categorias").delete().neq("id", 0);
      if (deleteRes.error) {
        console.warn(`⚠️ Warning: No se pudo limpiar categorías en Supabase: ${deleteRes.error.message}`);
      } else {
        const catRows = categoriasList.map(c => ({ categoria: c }));
        const insertRes = await supabase.from("categorias").insert(catRows);
        if (insertRes.error) {
          console.warn(`⚠️ Warning: No se pudo insertar categorías en Supabase: ${insertRes.error.message}`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error al persistir en Supabase:", err);
    throw err;
  }
}

// ==========================================
// FUNCIONES EXPORTADAS (INTERCEPTADAS)
// ==========================================

export async function getDb() {
  if (isOfficialApiEnabled()) {
    return getOfficialDb();
  }

  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") {
    return readFromSupabase();
  }

  return readLocalDb();
}

export async function saveDb(data) {
  if (isOfficialApiEnabled()) {
    return saveOfficialDb(data);
  }

  let currentDb = null;
  try {
    currentDb = (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") 
      ? await readFromSupabase() 
      : await readLocalDb();
  } catch {
    // Ignore if source doesn't exist.
  }

  const db = mergeWithDefaults(data || {}, clone(initialData));

  if (currentDb && Array.isArray(currentDb.usuarios)) {
    const passwordMap = new Map();
    currentDb.usuarios.forEach(u => {
      if (u.usuario && u.contrasena) {
        passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
      }
    });

    if (Array.isArray(db.usuarios)) {
      db.usuarios.forEach(u => {
        const key = String(u.usuario || "").toLowerCase();
        if (key && !u.contrasena && passwordMap.has(key)) {
          u.contrasena = passwordMap.get(key);
        }
      });
    }
  }

  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") {
    await writeToSupabase(db);
    cachedDb = db;
    return db;
  }

  await queueDbWrite(db);
  return db;
}

export async function updateDb(mutator) {
  if (isOfficialApiEnabled()) {
    const db = await getOfficialDb();
    const updated = await mutator(db);
    return saveOfficialDb(updated || db);
  }

  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") {
    return queueDbMutation(async () => {
      const current = mergeWithDefaults(await readFromSupabase(), clone(initialData));
      const updated = await mutator(current);
      if (updated && Array.isArray(updated.usuarios)) {
        const passwordMap = new Map();
        current.usuarios.forEach(u => {
          if (u.usuario && u.contrasena) {
            passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
          }
        });
        updated.usuarios.forEach(u => {
          const key = String(u.usuario || "").toLowerCase();
          if (key && !u.contrasena && passwordMap.has(key)) {
            u.contrasena = passwordMap.get(key);
          }
        });
      }
      return saveDb(updated || current);
    });
  }

  return queueDbMutation(async () => {
    const current = mergeWithDefaults(await readLocalDb(), clone(initialData));
    const updated = await mutator(current);
    if (updated && Array.isArray(updated.usuarios)) {
      const passwordMap = new Map();
      current.usuarios.forEach(u => {
        if (u.usuario && u.contrasena) {
          passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
        }
      });
      updated.usuarios.forEach(u => {
        const key = String(u.usuario || "").toLowerCase();
        if (key && !u.contrasena && passwordMap.has(key)) {
          u.contrasena = passwordMap.get(key);
        }
      });
    }
    return saveDb(updated || current);
  });
}

export async function resetDb() {
  if (isOfficialApiEnabled()) {
    return resetOfficialDb();
  }

  return saveDb(clone(initialData));
}

export function getDbSource() {
  if (isOfficialApiEnabled()) return "official-api";
  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") return "supabase-cloud";
  return "local-json";
}

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await saveDb(clone(initialData));
  }
}

async function readLocalDb() {
  await ensureDb();

  const stats = await fs.stat(DB_PATH);
  if (cachedDb && cachedDbMtimeMs === stats.mtimeMs) {
    return cachedDb;
  }

  const raw = await fs.readFile(DB_PATH, "utf8");
  cachedDb = parseDb(raw);
  cachedDbMtimeMs = stats.mtimeMs;
  return cachedDb;
}

function mergeWithDefaults(stored, defaults) {
  return {
    ...defaults,
    ...stored,
    categorias: stored.categorias || defaults.categorias,
    estudiantes: stored.estudiantes || defaults.estudiantes,
    programas: stored.programas || defaults.programas,
    invitadosPorPrograma: {
      ...defaults.invitadosPorPrograma,
      ...(stored.invitadosPorPrograma || {}),
    },
    inscripciones: stored.inscripciones || defaults.inscripciones,
    documentosGenerados: stored.documentosGenerados || defaults.documentosGenerados,
    pagos: stored.pagos || defaults.pagos,
    asistencias: stored.asistencias || defaults.asistencias,
    historialCargas: stored.historialCargas || defaults.historialCargas,
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
    usuarios: stored.usuarios || defaults.usuarios,
    auditLogs: stored.auditLogs || defaults.auditLogs || [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function parseDb(raw) {
  const text = stripBom(raw);
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = /position (\d+)/.exec(error.message || "");
    if (!match) throw error;

    const repaired = text.slice(0, Number(match[1])).trimEnd();
    const parsed = JSON.parse(repaired);
    void queueDbWrite(parsed);
    return parsed;
  }
}

async function writeDbFile(db) {
  const tmpPath = `${DB_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, DB_PATH);
  const stats = await fs.stat(DB_PATH);
  cachedDb = db;
  cachedDbMtimeMs = stats.mtimeMs;
}

function queueDbWrite(db) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => writeDbFile(db));
  return writeQueue;
}

function queueDbMutation(task) {
  mutationQueue = mutationQueue
    .catch(() => undefined)
    .then(task);
  return mutationQueue;
}
