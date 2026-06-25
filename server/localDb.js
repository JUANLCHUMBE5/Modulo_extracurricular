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
import { createSyncEvent, emitSyncEvent } from "./syncBus.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");
let writeQueue = Promise.resolve();
let mutationQueue = Promise.resolve();
let cachedDb = null;
let cachedDbMtimeMs = 0;
let lastFetchedTime = 0;
let activeReadPromise = null;
const MAX_SYNC_EVENTS = 100;
const CACHE_TTL_MS = Number(process.env.SUPABASE_CACHE_TTL_MS || 300000); // 5 minutos por defecto para caché en memoria de Supabase

// ==========================================
// MIGRACIÓN A SUPABASE INTERCEPTOR LOGIC
// ==========================================

const COLUMNAS_USUARIOS = ["id", "nombre", "usuario", "rol", "estado", "contrasena", "permisos"];
const COLUMNAS_ESTUDIANTES = ["dni", "codigoEstudiante", "nombres", "grado", "seccion", "nivel", "sexo", "fechaNacimiento", "tipoAlumno", "estadoMatricula", "apoderado", "telefonoApoderado", "correoApoderado", "estadoInscripcion", "estadoCaja"];
const COLUMNAS_PROGRAMAS = ["id", "nombre", "categoria", "fechaInicio", "fechaFin", "costo", "cupos", "cuposOcupados", "gradosAplicables", "periodo", "modalidadCobro", "horario", "grupo"];
const COLUMNAS_PROGRAMAS_CONFIG = ["programaId", "duracionAvisoDias", "horaLimiteAviso", "edadMinima", "edadMaxima", "grupoEtario", "requisitos", "comunicado", "comunicadoCompleto", "detalleCosto", "creadoDesdeDocumento", "duracionTaller", "invitacionMasiva", "alcanceInvitacionMasiva", "tipoComunicado", "motivoJustificacion", "duracion", "docente", "responsable", "estado"];
const COLUMNAS_PROGRAMAS_HORARIOS = ["programaId", "horaInicio", "horaFin", "horariosPorGrupo", "tablaHorariosNivel"];
const COLUMNAS_PROGRAMAS_SERVICIOS = ["programaId", "requiereUniforme", "requiereIndumentaria", "talleresDeportivos", "incluyeAlmuerzo", "horarioRecepcionAlmuerzo", "concesionarios", "detalleAlmuerzo", "nivelCambridge", "modalidadesCambridge", "costoCiclo", "montoPrimerPago", "cicloI", "cicloII", "nombreCiclo"];
const COLUMNAS_PROGRAMAS_DOCUMENTOS = ["programaId", "plantilla", "plantillaBase64", "plantillaVariables", "plantillaValidada", "tipoDocumento", "numeroDocumento", "areaTematica"];
const COLUMNAS_PROGRAMAS_ANUNCIOS = ["programaId", "anuncioImagen", "anuncioImagenNombre", "anuncioImagenTamano", "anuncioImagenComprimida"];
const COLUMNAS_INSCRIPCIONES = [
  "id", "dniEstudiante", "codigoEstudiante", "nombresEstudiante", "gradoEstudiante", "seccion",
  "programaId", "programa", "categoria", "periodo", "horario", "docente", "costo",
  "modalidadCobro", "fechaInicio", "fechaFin", "estadoPago", "pagoId",
  "costoOriginal", "descuentoAprobado", "descuentoTipo", "descuentoValor", "descuentoMonto",
  "descuentoJustificacion", "descuentoAprobadoPor", "descuentoFechaAprobacion",
  "derivadoCaja", "estadoCaja", "origenRegistro", "fechaRegistro"
];
const COLUMNAS_PAGOS = ["id", "inscripcionId", "dniEstudiante", "nombresEstudiante", "programaId", "programa", "periodo", "monto", "formaPago", "numeroOperacion", "telefonoOperacion", "capturaPagoNombre", "capturaPagoBase64", "estado", "fechaPago", "origenRegistro", "nro_recibo"];
const COLUMNAS_ASISTENCIAS = ["id", "inscripcionId", "pagoId", "dniEstudiante", "codigoEstudiante", "nombresEstudiante", "programaId", "programa", "horario", "estadoPago", "estadoAcceso", "observacion", "origen", "fechaRegistro"];
const COLUMNAS_INVITADOS = ["programaId", "dni", "nombres", "grado", "seccion", "seleccion", "nivelCambridge"];
const COLUMNAS_HISTORIAL_CARGAS = ["id", "fecha", "periodo", "archivoNombre", "archivos", "usuario", "resumen", "registros"];

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

function getDifferences(newList, oldList, keyField, columnKeys) {
  const newMap = new Map((newList || []).map(item => [String(item[keyField]), item]));
  const oldMap = new Map((oldList || []).map(item => [String(item[keyField]), item]));

  const added = [];
  const modified = [];
  const deletedIds = [];

  for (const [key, newItem] of newMap.entries()) {
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      added.push(newItem);
    } else {
      let changed = false;
      for (const col of columnKeys) {
        const v1 = newItem[col];
        const v2 = oldItem[col];
        if (typeof v1 === 'object' || typeof v2 === 'object') {
          if (JSON.stringify(v1) !== JSON.stringify(v2)) {
            changed = true;
            break;
          }
        } else if (v1 !== v2) {
          changed = true;
          break;
        }
      }
      if (changed) {
        modified.push(newItem);
      }
    }
  }

  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) {
      deletedIds.push(key);
    }
  }

  return { added, modified, deletedIds };
}

function stringifyComparable(value) {
  return JSON.stringify(value ?? null);
}

function detectSyncChanges(newDb = {}, oldDb = {}) {
  const checks = [
    ["usuarios", newDb.usuarios, oldDb.usuarios],
    ["estudiantes", newDb.estudiantes, oldDb.estudiantes],
    ["programas", newDb.programas, oldDb.programas],
    ["inscripciones", newDb.inscripciones, oldDb.inscripciones],
    ["pagos", newDb.pagos, oldDb.pagos],
    ["asistencias", newDb.asistencias, oldDb.asistencias],
    ["invitados", newDb.invitadosPorPrograma, oldDb.invitadosPorPrograma],
    ["correlativos", newDb.correlativos, oldDb.correlativos],
    ["categorias", newDb.categorias, oldDb.categorias],
    ["configuracionInstitucional", newDb.configuracionInstitucional, oldDb.configuracionInstitucional],
  ];

  return checks
    .filter(([, nextValue, prevValue]) => stringifyComparable(nextValue) !== stringifyComparable(prevValue))
    .map(([name]) => name);
}

async function readFromSupabase() {
  try {
    // 1. Traemos todas las tablas en paralelo para máxima velocidad
    const [
      resUsuarios, resEstudiantes, resProgramas, resInscripciones,
      resPagos, resAsistencias, resInvitados, resLogs, resCategorias, resHistorial,
      resConfiguracion,
      resProgConfig, resProgHorarios, resProgServicios, resProgDocumentos, resProgAnuncios,
      resEstudiantesExternos
    ] = await Promise.all([
      supabase.from("usuarios").select("*"),
      supabase.from("estudiantes").select("*"),
      supabase.from("programas").select("*"),
      supabase.from("inscripciones").select("*"),
      supabase.from("pagos").select("*"),
      supabase.from("asistencias").select("*"),
      supabase.from("invitados_programa").select("*"),
      supabase.from("audit_logs").select("*").order("fecha", { ascending: false }).limit(200),
      supabase.from("categorias").select("*"),
      supabase.from("historial_cargas").select("*").order("fecha", { ascending: false }).limit(20),
      supabase.from("configuracion").select("*"),
      // Tablas normalizadas 1:1 de programas
      supabase.from("programas_configuraciones").select("*"),
      supabase.from("programas_horarios").select("*"),
      supabase.from("programas_servicios").select("*"),
      supabase.from("programas_documentos").select("*"),
      supabase.from("programas_anuncios").select("*"),
      // Tabla separada de estudiantes externos (verano)
      supabase.from("estudiantes_externos").select("*").then(r => r).catch(() => ({ data: [] }))
    ]);

    // 2. Mapeo y transformación de formatos (De Filas SQL a Objetos Indexados JSON)
    const estudiantesObj = {};
    (resEstudiantes.data || []).forEach(e => {
      estudiantesObj[e.dni] = e;
    });
    // Mergear estudiantes externos (sin sobreescribir alumnos del colegio)
    (resEstudiantesExternos.data || []).forEach(e => {
      if (!estudiantesObj[e.dni]) {
        estudiantesObj[e.dni] = { ...e, esExterno: true, tipoAlumno: e.tipoAlumno || "Alumno externo" };
      }
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
          seccion: i.seccion,
          seleccion: i.seleccion || "",
          nivelCambridge: i.nivelCambridge || ""
        });
      }
    });

    const progConfigMap = new Map();
    (resProgConfig.data || []).forEach(row => progConfigMap.set(row.programaId, row));

    const progHorariosMap = new Map();
    (resProgHorarios.data || []).forEach(row => progHorariosMap.set(row.programaId, row));

    const progServiciosMap = new Map();
    (resProgServicios.data || []).forEach(row => progServiciosMap.set(row.programaId, row));

    const progDocumentosMap = new Map();
    (resProgDocumentos.data || []).forEach(row => progDocumentosMap.set(row.programaId, row));

    const progAnunciosMap = new Map();
    (resProgAnuncios.data || []).forEach(row => progAnunciosMap.set(row.programaId, row));

    const EXTRA_FIELDS = [
      "horaInicio",
      "horaFin",
      "horaLimiteAviso",
      "usarFechaLimiteInscripcion",
      "fechaAperturaInscripcion",
      "horaAperturaInscripcion",
      "fechaLimiteInscripcion",
      "horaLimiteInscripcion",
      "anuncioImagen",
      "anuncioImagenNombre",
      "talleresDeportivos",
      "horariosPorGrupo",
      "dias",
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
      "plantillaValidada",
      "tipoComunicado",
      "tipoDocumento",
      "numeroDocumento",
      "areaTematica",
      "motivoJustificacion",
      "nombreCiclo",
      "duracion",
      "tablaHorariosNivel",
      "incluyeAlmuerzo",
      "horarioRecepcionAlmuerzo",
      "nivelCambridge",
      "modalidadesCambridge",
      "costoCiclo",
      "montoPrimerPago"
    ];

    const rawProgramas = resProgramas.data || [];
    const programasList = rawProgramas.map(p => {
      // Unir los campos desde las 5 tablas de relacion 1:1
      const config = progConfigMap.get(p.id) || {};
      const horarios = progHorariosMap.get(p.id) || {};
      const servicios = progServiciosMap.get(p.id) || {};
      const documentos = progDocumentosMap.get(p.id) || {};
      const anuncios = progAnunciosMap.get(p.id) || {};

      Object.assign(p, config, horarios, servicios, documentos, anuncios);
      delete p.programaId; // Limpiamos la columna de unión de tablas secundarias

      // Mapear campos antiguos del campo serializado 'grupo' para retrocompatibilidad total
      let restoredGrupo = p.grupo;
      if (p.grupo && p.grupo.startsWith("{")) {
        try {
          const meta = JSON.parse(p.grupo);
          EXTRA_FIELDS.forEach(field => {
            if (p[field] === undefined || p[field] === null) {
              if (meta[field] !== undefined) {
                p[field] = meta[field];
              }
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

    let correlativosObj = { recibo: "", egreso: "" };
    let syncEvents = [];
    let configuracionInstitucional = {};
    
    // Intentar leer de la tabla configuracion primero
    if (resConfiguracion && resConfiguracion.data) {
      const row = resConfiguracion.data.find(r => r.clave === "correlativos");
      if (row && row.valor) {
        try {
          correlativosObj = JSON.parse(row.valor);
        } catch (e) {
          console.error("Error parsing correlativos from configuracion table:", e);
        }
      }
      const syncRow = resConfiguracion.data.find(r => r.clave === "sync_events");
      if (syncRow && syncRow.valor) {
        try {
          syncEvents = JSON.parse(syncRow.valor);
        } catch (e) {
          console.error("Error parsing sync_events from configuracion table:", e);
        }
      }
      const institucionRow = resConfiguracion.data.find(r => r.clave === "configuracion_institucional");
      if (institucionRow && institucionRow.valor) {
        try {
          configuracionInstitucional = JSON.parse(institucionRow.valor);
        } catch (e) {
          console.error("Error parsing configuracion_institucional from configuracion table:", e);
        }
      }
    }

    // Fallback: si no se encontró en la tabla configuracion, buscar en categorias (por compatibilidad)
    if (!correlativosObj.reciboActual && !correlativosObj.recibo) {
      const configRows = categoriasArray.filter(c => String(c).startsWith("CONFIG_CORRELATIVOS:"));
      const configRow = configRows[configRows.length - 1];
      if (configRow) {
        try {
          correlativosObj = JSON.parse(configRow.slice("CONFIG_CORRELATIVOS:".length));
        } catch (e) {
          console.error("Error parsing correlativos config from legacy categorias:", e);
        }
      }
    }

    const finalCategorias = (categoriasArray.length ? categoriasArray : initialData.categorias)
      .filter(c => !String(c).startsWith("CONFIG_CORRELATIVOS:"))
      .filter(c => {
        const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normal !== "ingles";
      });

    // 3. Retornamos la estructura exacta simulando db.json
    return {
      usuarios: resUsuarios.data || [],
      estudiantes: estudiantesObj,
      programas: programasList,
      inscripciones: (resInscripciones.data || []).map(ins => {
        ins.estadoInscripcion = ins.estadoPago || "Pendiente de pago";
        ins.apoderado = estudiantesObj[ins.dniEstudiante]?.apoderado || "";
        ins.telefono = estudiantesObj[ins.dniEstudiante]?.telefonoApoderado || "";
        ins.derivadoCaja = ins.derivadoCaja ?? false;
        ins.estadoCaja = ins.estadoCaja || "";

        // Determinar origenRegistro de forma inteligente para que el panel de Dirección lo identifique como Web/Padres
        const pagoAsociado = (resPagos.data || []).find(p => p.inscripcionId === ins.id);
        if (pagoAsociado && (String(pagoAsociado.formaPago).toLowerCase() === "yape" || pagoAsociado.capturaPagoBase64)) {
          ins.origenRegistro = "Portal padres";
        } else {
          ins.origenRegistro = ins.origenRegistro || "Presencial";
        }
        return ins;
      }),
      pagos: (resPagos.data || []).map(pag => {
        pag.nroOperacion = pag.numeroOperacion || "";
        pag.fechaRegistro = pag.fechaPago || "";
        pag.nroRecibo = pag.nroRecibo || pag.nro_recibo || "";
        return pag;
      }),
      asistencias: resAsistencias.data || [],
      invitadosPorPrograma: invitadosObj,
      auditLogs: resLogs.data || [],
      plantillasPorPrograma: plantillasObj,
      categorias: finalCategorias,
      configuracionInstitucional,
      correlativos: correlativosObj,
      syncEvents: Array.isArray(syncEvents) ? syncEvents.slice(-MAX_SYNC_EVENTS) : [],
      documentosGenerados: [],
      historialCargas: (resHistorial && resHistorial.data) ? resHistorial.data.map(hc => {
        return {
          id: hc.id,
          fecha: hc.fecha,
          periodo: hc.periodo,
          archivoNombre: hc.archivoNombre,
          archivos: Array.isArray(hc.archivos) ? hc.archivos : [],
          usuario: hc.usuario,
          resumen: hc.resumen || { importados: 0, total: 0, errores: 0, duplicados: 0 },
          registros: Array.isArray(hc.registros) ? hc.registros : []
        };
      }) : [],
      nextProgramaId: maxProgNum + 1
    };
  } catch (err) {
    console.error("❌ Error conectando a Supabase desde backend:", err);
    return clone(initialData);
  }
}

async function writeToSupabase(db, currentDb) {
  const normalizarNumero = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const normalizarFecha = (val) => {
    if (val === undefined || val === null || val === "" || String(val).trim() === "") return null;
    return val;
  };

  const normalizarBoolean = (val) => {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === "boolean") return val;
    const s = String(val).toLowerCase().trim();
    if (s === "true" || s === "1" || s === "si" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
    return null;
  };

  const EXTRA_FIELDS = [
    "horaInicio",
    "horaFin",
    "horaLimiteAviso",
    "usarFechaLimiteInscripcion",
    "fechaAperturaInscripcion",
    "horaAperturaInscripcion",
    "fechaLimiteInscripcion",
    "horaLimiteInscripcion",
    "anuncioImagen",
    "anuncioImagenNombre",
    "talleresDeportivos",
    "horariosPorGrupo",
    "dias",
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
    "plantillaValidada",
    "tipoComunicado",
    "tipoDocumento",
    "numeroDocumento",
    "areaTematica",
    "motivoJustificacion",
    "nombreCiclo",
    "duracion",
    "tablaHorariosNivel",
    "incluyeAlmuerzo",
    "horarioRecepcionAlmuerzo",
    "nivelCambridge",
    "modalidadesCambridge",
    "costoCiclo",
    "montoPrimerPago"
  ];

  try {
    const oldDb = currentDb || {
      usuarios: [],
      estudiantes: {},
      programas: [],
      inscripciones: [],
      pagos: [],
      asistencias: [],
      invitadosPorPrograma: {},
      auditLogs: [],
      historialCargas: [],
      categorias: [],
      configuracionInstitucional: {},
      correlativos: { recibo: "", egreso: "" }
    };

    // --- NORMALIZACIÓN DE NUEVOS DATOS (db) ---
    const normalizedUsuarios = db.usuarios || [];
    const normalizedEstudiantes = Object.values(db.estudiantes || {});
    
    const normalizedInscripciones = (db.inscripciones || []).map(ins => ({
      ...ins,
      pagoId: (ins.pagoId === "" || ins.pagoId === "null" || ins.pagoId === undefined) ? null : ins.pagoId,
      estadoPago: ins.estadoPago || ins.estadoInscripcion || "Pendiente de pago",
      fechaInicio: normalizarFecha(ins.fechaInicio),
      fechaFin: normalizarFecha(ins.fechaFin),
      descuentoFechaAprobacion: normalizarFecha(ins.descuentoFechaAprobacion),
      fechaRegistro: normalizarFecha(ins.fechaRegistro),
      costo: normalizarNumero(ins.costo),
      costoOriginal: normalizarNumero(ins.costoOriginal),
      descuentoValor: normalizarNumero(ins.descuentoValor),
      descuentoMonto: normalizarNumero(ins.descuentoMonto)
    }));

    const normalizedPagos = (db.pagos || []).map(pag => ({
      ...pag,
      inscripcionId: (pag.inscripcionId === "" || pag.inscripcionId === "null" || pag.inscripcionId === undefined) ? null : pag.inscripcionId,
      dniEstudiante: (pag.dniEstudiante === "" || pag.dniEstudiante === "null" || pag.dniEstudiante === undefined) ? null : pag.dniEstudiante,
      programaId: (pag.programaId === "" || pag.programaId === "null" || pag.programaId === undefined) ? null : pag.programaId,
      formaPago: pag.formaPago || pag.metodoPago || "Yape",
      numeroOperacion: pag.numeroOperacion || pag.nroOperacion || "",
      telefonoOperacion: pag.telefonoOperacion || pag.telefono || "",
      nro_recibo: pag.nroRecibo || pag.nro_recibo || "",
      fechaPago: normalizarFecha(pag.fechaPago || pag.fechaRegistro),
      monto: normalizarNumero(pag.monto)
    }));

    const normalizedAsistencias = (db.asistencias || []).map(ast => ({
      ...ast,
      pagoId: (ast.pagoId === "" || ast.pagoId === "null" || ast.pagoId === undefined) ? null : ast.pagoId,
      inscripcionId: (ast.inscripcionId === "" || ast.inscripcionId === "null" || ast.inscripcionId === undefined) ? null : ast.inscripcionId,
      dniEstudiante: (ast.dniEstudiante === "" || ast.dniEstudiante === "null" || ast.dniEstudiante === undefined) ? null : ast.dniEstudiante,
      programaId: (ast.programaId === "" || ast.programaId === "null" || ast.programaId === undefined) ? null : ast.programaId,
      fechaRegistro: normalizarFecha(ast.fechaRegistro)
    }));

    const normalizedAuditLogs = db.auditLogs || [];

    const normalizedHistorialCargas = (db.historialCargas || []).map(hc => ({
      id: hc.id,
      fecha: normalizarFecha(hc.fecha),
      periodo: hc.periodo,
      archivoNombre: hc.archivoNombre,
      archivos: hc.archivos || [],
      usuario: hc.usuario,
      resumen: hc.resumen || {},
      registros: hc.registros || []
    }));

    const mapPrograma = (p, sourceDb) => {
      const templateData = sourceDb.plantillasPorPrograma?.[p.id] || {};
      const baseProg = {
        ...p,
        plantilla: p.plantilla || "",
        plantillaBase64: p.plantillaBase64 || templateData.plantillaBase64 || "",
        plantillaVariables: p.plantillaVariables || templateData.plantillaVariables || [],
        plantillaValidada: normalizarBoolean(p.plantillaValidada !== undefined ? p.plantillaValidada : (templateData.plantillaValidada !== undefined ? templateData.plantillaValidada : false)),
        duracionAvisoDias: normalizarNumero(p.duracionAvisoDias),
        edadMinima: normalizarNumero(p.edadMinima),
        edadMaxima: normalizarNumero(p.edadMaxima),
        costoCiclo: normalizarNumero(p.costoCiclo),
        montoPrimerPago: normalizarNumero(p.montoPrimerPago),
        anuncioImagenTamano: normalizarNumero(p.anuncioImagenTamano),
        costo: normalizarNumero(p.costo),
        cupos: normalizarNumero(p.cupos),
        cuposOcupados: normalizarNumero(p.cuposOcupados),
        duracionTaller: normalizarNumero(p.duracionTaller),
        duracion: normalizarNumero(p.duracion),
        invitacionMasiva: normalizarBoolean(p.invitacionMasiva),
        creadoDesdeDocumento: normalizarBoolean(p.creadoDesdeDocumento),
        requiereUniforme: normalizarBoolean(p.requiereUniforme),
        requiereIndumentaria: normalizarBoolean(p.requiereIndumentaria),
        incluyeAlmuerzo: normalizarBoolean(p.incluyeAlmuerzo),
        cicloI: normalizarBoolean(p.cicloI),
        cicloII: normalizarBoolean(p.cicloII),
        usarFechaLimiteInscripcion: normalizarBoolean(p.usarFechaLimiteInscripcion),
        fechaAperturaInscripcion: normalizarFecha(p.fechaAperturaInscripcion),
        horaAperturaInscripcion: p.horaAperturaInscripcion || "",
        fechaLimiteInscripcion: normalizarFecha(p.fechaLimiteInscripcion),
        horaLimiteInscripcion: p.horaLimiteInscripcion || ""
      };

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
    };

    const normalizedProgramas = (db.programas || []).map(p => mapPrograma(p, db));

    // --- NORMALIZACIÓN DE DATOS ANTERIORES (oldDb) ---
    const oldUsuarios = oldDb.usuarios || [];
    const oldEstudiantes = Object.values(oldDb.estudiantes || {});
    
    const oldInscripciones = (oldDb.inscripciones || []).map(ins => ({
      ...ins,
      pagoId: (ins.pagoId === "" || ins.pagoId === "null" || ins.pagoId === undefined) ? null : ins.pagoId,
      estadoPago: ins.estadoPago || ins.estadoInscripcion || "Pendiente de pago",
      fechaInicio: normalizarFecha(ins.fechaInicio),
      fechaFin: normalizarFecha(ins.fechaFin),
      descuentoFechaAprobacion: normalizarFecha(ins.descuentoFechaAprobacion),
      fechaRegistro: normalizarFecha(ins.fechaRegistro),
      costo: normalizarNumero(ins.costo),
      costoOriginal: normalizarNumero(ins.costoOriginal),
      descuentoValor: normalizarNumero(ins.descuentoValor),
      descuentoMonto: normalizarNumero(ins.descuentoMonto)
    }));

    const oldPagos = (oldDb.pagos || []).map(pag => ({
      ...pag,
      inscripcionId: (pag.inscripcionId === "" || pag.inscripcionId === "null" || pag.inscripcionId === undefined) ? null : pag.inscripcionId,
      dniEstudiante: (pag.dniEstudiante === "" || pag.dniEstudiante === "null" || pag.dniEstudiante === undefined) ? null : pag.dniEstudiante,
      programaId: (pag.programaId === "" || pag.programaId === "null" || pag.programaId === undefined) ? null : pag.programaId,
      formaPago: pag.formaPago || pag.metodoPago || "Yape",
      numeroOperacion: pag.numeroOperacion || pag.nroOperacion || "",
      telefonoOperacion: pag.telefonoOperacion || pag.telefono || "",
      nro_recibo: pag.nroRecibo || pag.nro_recibo || "",
      fechaPago: normalizarFecha(pag.fechaPago || pag.fechaRegistro),
      monto: normalizarNumero(pag.monto)
    }));

    const oldAsistencias = (oldDb.asistencias || []).map(ast => ({
      ...ast,
      pagoId: (ast.pagoId === "" || ast.pagoId === "null" || ast.pagoId === undefined) ? null : ast.pagoId,
      inscripcionId: (ast.inscripcionId === "" || ast.inscripcionId === "null" || ast.inscripcionId === undefined) ? null : ast.inscripcionId,
      dniEstudiante: (ast.dniEstudiante === "" || ast.dniEstudiante === "null" || ast.dniEstudiante === undefined) ? null : ast.dniEstudiante,
      programaId: (ast.programaId === "" || ast.programaId === "null" || ast.programaId === undefined) ? null : ast.programaId,
      fechaRegistro: normalizarFecha(ast.fechaRegistro)
    }));

    const oldAuditLogs = oldDb.auditLogs || [];

    const oldHistorialCargas = (oldDb.historialCargas || []).map(hc => ({
      id: hc.id,
      fecha: normalizarFecha(hc.fecha),
      periodo: hc.periodo,
      archivoNombre: hc.archivoNombre,
      archivos: hc.archivos || [],
      usuario: hc.usuario,
      resumen: hc.resumen || {},
      registros: hc.registros || []
    }));

    const oldProgramas = (oldDb.programas || []).map(p => mapPrograma(p, oldDb));

    // --- PROCESAMIENTO Y EJECUCIÓN DIFERENCIAL ---

    // Obtener todas las diferencias primero
    // --- SEPARAR ESTUDIANTES INTERNOS Y EXTERNOS ---
    const esEstudianteExterno = (e) => {
      if (String(e.tipoAlumno || "").toLowerCase().includes("externo")) return true;
      if (String(e.codigoEstudiante || "").startsWith("EXT-")) return true;
      if (e.esExterno === true) return true;
      return false;
    };

    const estudiantesInternos = normalizedEstudiantes.filter(e => !esEstudianteExterno(e));
    const estudiantesExternos = normalizedEstudiantes.filter(e => esEstudianteExterno(e));
    const oldEstudiantesInternos = oldEstudiantes.filter(e => !esEstudianteExterno(e));
    const oldEstudiantesExternos = oldEstudiantes.filter(e => esEstudianteExterno(e));

    const diffUsuarios = getDifferences(normalizedUsuarios, oldUsuarios, "id", COLUMNAS_USUARIOS);
    const diffEstudiantes = getDifferences(estudiantesInternos, oldEstudiantesInternos, "dni", COLUMNAS_ESTUDIANTES);
    const diffEstudiantesExt = getDifferences(estudiantesExternos, oldEstudiantesExternos, "dni", COLUMNAS_ESTUDIANTES);
    const diffProgramas = getDifferences(normalizedProgramas, oldProgramas, "id", COLUMNAS_PROGRAMAS);
    const diffInscripciones = getDifferences(normalizedInscripciones, oldInscripciones, "id", COLUMNAS_INSCRIPCIONES);
    const diffPagos = getDifferences(normalizedPagos, oldPagos, "id", COLUMNAS_PAGOS);
    const diffAsistencias = getDifferences(normalizedAsistencias, oldAsistencias, "id", COLUMNAS_ASISTENCIAS);
    const diffAudit = getDifferences(normalizedAuditLogs, oldAuditLogs, "id", ["id", "usuario", "rol", "fecha", "accion", "detalles"]);
    const diffCargas = getDifferences(normalizedHistorialCargas, oldHistorialCargas, "id", COLUMNAS_HISTORIAL_CARGAS);

    // FASE A: BORRAR REGISTROS EN ORDEN DE DEPENDENCIAS (de más dependientes a menos dependientes)
    
    // A.1. Borrar asistencias
    if (diffAsistencias.deletedIds.length) {
      const res = await supabase.from("asistencias").delete().in("id", diffAsistencias.deletedIds);
      if (res.error) console.error("❌ Error eliminando asistencias:", res.error.message);
    }

    // A.2. Borrar pagos (primero desvinculamos pagoId en inscripciones y asistencias que referencien a los pagos eliminados)
    if (diffPagos.deletedIds.length) {
      await supabase.from("inscripciones").update({ pagoId: null }).in("pagoId", diffPagos.deletedIds);
      await supabase.from("asistencias").update({ pagoId: null }).in("pagoId", diffPagos.deletedIds);
      const res = await supabase.from("pagos").delete().in("id", diffPagos.deletedIds);
      if (res.error) console.error("❌ Error eliminando pagos:", res.error.message);
    }

    // A.3. Borrar inscripciones (desvinculando pagoId y referencias en asistencias primero para evitar restricciones de FK)
    if (diffInscripciones.deletedIds.length) {
      await supabase.from("inscripciones").update({ pagoId: null }).in("id", diffInscripciones.deletedIds);
      await supabase.from("asistencias").update({ inscripcionId: null }).in("inscripcionId", diffInscripciones.deletedIds);
      const res = await supabase.from("inscripciones").delete().in("id", diffInscripciones.deletedIds);
      if (res.error) console.error("❌ Error eliminando inscripciones:", res.error.message);
    }

    // A.4. Borrar invitados de programas eliminados y luego los programas
    if (diffProgramas.deletedIds.length) {
      await supabase.from("invitados_programa").delete().in("programaId", diffProgramas.deletedIds);
      const res = await supabase.from("programas").delete().in("id", diffProgramas.deletedIds);
      if (res.error) console.error("❌ Error eliminando programas:", res.error.message);
    }

    // A.5. Borrar estudiantes (solo internos de la tabla estudiantes)
    if (diffEstudiantes.deletedIds.length) {
      const res = await supabase.from("estudiantes").delete().in("dni", diffEstudiantes.deletedIds);
      if (res.error) console.error("❌ Error eliminando estudiantes:", res.error.message);
    }

    // A.5b. Borrar estudiantes externos de su tabla separada
    if (diffEstudiantesExt.deletedIds.length) {
      const res = await supabase.from("estudiantes_externos").delete().in("dni", diffEstudiantesExt.deletedIds);
      if (res.error) console.error("❌ Error eliminando estudiantes_externos:", res.error.message);
    }

    // A.6. Borrar usuarios
    if (diffUsuarios.deletedIds.length) {
      const res = await supabase.from("usuarios").delete().in("id", diffUsuarios.deletedIds);
      if (res.error) console.error("❌ Error eliminando usuarios:", res.error.message);
    }

    // A.7. Borrar historial_cargas
    if (diffCargas.deletedIds.length) {
      const res = await supabase.from("historial_cargas").delete().in("id", diffCargas.deletedIds);
      if (res.error) console.error("❌ Error eliminando historial_cargas:", res.error.message);
    }

    // A.8. Borrar audit_logs
    if (diffAudit.deletedIds.length) {
      const res = await supabase.from("audit_logs").delete().in("id", diffAudit.deletedIds);
      if (res.error) console.error("❌ Error eliminando audit_logs:", res.error.message);
    }

    // FASE B: AGREGAR O ACTUALIZAR REGISTROS (de menos dependientes a más dependientes)

    // B.1. Upsert de catálogos y tablas base (usuarios, estudiantes, programas)
    if (diffUsuarios.added.length || diffUsuarios.modified.length) {
      const toUpsert = [...diffUsuarios.added, ...diffUsuarios.modified];
      const res = await supabase.from("usuarios").upsert(sanearLista(toUpsert, COLUMNAS_USUARIOS));
      if (res.error) throw new Error(`Error insertando/actualizando usuarios: ${res.error.message}`);
    }

    // B.1b. Upsert de estudiantes INTERNOS (solo alumnos del colegio → tabla "estudiantes")
    if (diffEstudiantes.added.length || diffEstudiantes.modified.length) {
      const toUpsert = [...diffEstudiantes.added, ...diffEstudiantes.modified];
      const res = await supabase.from("estudiantes").upsert(sanearLista(toUpsert, COLUMNAS_ESTUDIANTES));
      if (res.error) throw new Error(`Error insertando/actualizando estudiantes: ${res.error.message}`);
    }

    // B.1c. Upsert de estudiantes EXTERNOS (alumnos externos verano → tabla "estudiantes_externos")
    if (diffEstudiantesExt.added.length || diffEstudiantesExt.modified.length) {
      const toUpsert = [...diffEstudiantesExt.added, ...diffEstudiantesExt.modified];
      const res = await supabase.from("estudiantes_externos").upsert(sanearLista(toUpsert, COLUMNAS_ESTUDIANTES));
      if (res.error) console.error("❌ Error insertando/actualizando estudiantes_externos:", res.error.message);
    }

    if (diffProgramas.added.length || diffProgramas.modified.length) {
      const toUpsert = [...diffProgramas.added, ...diffProgramas.modified];
      const res = await supabase.from("programas").upsert(sanearLista(toUpsert, COLUMNAS_PROGRAMAS));
      if (res.error) throw new Error(`Error insertando/actualizando programas: ${res.error.message}`);

      // Tablas secundarias 1:1 de programas
      const progConfigs = toUpsert.map(p => ({ programaId: p.id, ...p }));
      const progHorarios = toUpsert.map(p => ({ programaId: p.id, ...p }));
      const progServicios = toUpsert.map(p => ({ programaId: p.id, ...p }));
      const progDocumentos = toUpsert.map(p => ({ programaId: p.id, ...p }));
      const progAnuncios = toUpsert.map(p => ({ programaId: p.id, ...p }));

      const tablesToUpsert = [
        { name: "programas_configuraciones", data: progConfigs, columns: COLUMNAS_PROGRAMAS_CONFIG },
        { name: "programas_horarios", data: progHorarios, columns: COLUMNAS_PROGRAMAS_HORARIOS },
        { name: "programas_servicios", data: progServicios, columns: COLUMNAS_PROGRAMAS_SERVICIOS },
        { name: "programas_documentos", data: progDocumentos, columns: COLUMNAS_PROGRAMAS_DOCUMENTOS },
        { name: "programas_anuncios", data: progAnuncios, columns: COLUMNAS_PROGRAMAS_ANUNCIOS }
      ];

      for (const t of tablesToUpsert) {
        const { error } = await supabase.from(t.name).upsert(sanearLista(t.data, t.columns));
        if (error) {
          console.error(`❌ Error en tabla secundaria de programas '${t.name}':`, error.message);
          console.error("Lote afectado:", JSON.stringify(t.data, null, 2));
          throw new Error(`Error en tablas secundarias de programas: ${error.message}`);
        }
      }
    }

    // B.2. Upsert de inscripciones con pagoId = null para evitar dependencias circulares con pagos
    const insToUpsert = [...diffInscripciones.added, ...diffInscripciones.modified];
    if (insToUpsert.length) {
      const insSinPago = insToUpsert.map(ins => ({ ...ins, pagoId: null }));
      const res = await supabase.from("inscripciones").upsert(sanearLista(insSinPago, COLUMNAS_INSCRIPCIONES));
      if (res.error) throw new Error(`Error insertando/actualizando inscripciones (fase 1): ${res.error.message}`);
    }

    // B.3. Upsert de pagos
    const pagosToUpsert = [...diffPagos.added, ...diffPagos.modified];
    if (pagosToUpsert.length) {
      const res = await supabase.from("pagos").upsert(sanearLista(pagosToUpsert, COLUMNAS_PAGOS));
      if (res.error) throw new Error(`Error insertando/actualizando pagos: ${res.error.message}`);
    }

    // B.4. Upsert de asistencias
    const asistenciasToUpsert = [...diffAsistencias.added, ...diffAsistencias.modified];
    if (asistenciasToUpsert.length) {
      const res = await supabase.from("asistencias").upsert(sanearLista(asistenciasToUpsert, COLUMNAS_ASISTENCIAS));
      if (res.error) throw new Error(`Error insertando/actualizando asistencias: ${res.error.message}`);
    }

    // B.5. Upsert de audit logs
    const auditToUpsert = [...diffAudit.added, ...diffAudit.modified];
    if (auditToUpsert.length) {
      const res = await supabase.from("audit_logs").upsert(auditToUpsert);
      if (res.error) throw new Error(`Error insertando/actualizando audit_logs: ${res.error.message}`);
    }

    // B.6. Upsert de historial cargas
    const cargasToUpsert = [...diffCargas.added, ...diffCargas.modified];
    if (cargasToUpsert.length) {
      const res = await supabase.from("historial_cargas").upsert(sanearLista(cargasToUpsert, COLUMNAS_HISTORIAL_CARGAS));
      if (res.error) throw new Error(`Error insertando/actualizando historial_cargas: ${res.error.message}`);
    }

    // B.7. Enlazar pagoId en inscripciones (Fase 2)
    const inscripcionesConPago = insToUpsert.filter(ins => ins.pagoId !== null && ins.pagoId !== undefined && ins.pagoId !== "");
    if (inscripcionesConPago.length) {
      const enlacePromesas = inscripcionesConPago.map(ins => 
        supabase.from("inscripciones").update({ pagoId: ins.pagoId }).eq("id", ins.id)
      );
      const enlaceResultados = await Promise.all(enlacePromesas);
      for (const res of enlaceResultados) {
        if (res.error) {
          console.warn(`⚠️ Warning: No se pudo enlazarpagoId en inscripciones: ${res.error.message}`);
        }
      }
    }

    // 10. Alumnos Invitados (invitados_programa)
    const deletedProgIdsSet = new Set(diffProgramas.deletedIds);
    const allProgIds = [...new Set([
      ...Object.keys(db.invitadosPorPrograma || {}),
      ...Object.keys(oldDb.invitadosPorPrograma || {})
    ])].filter(id => !deletedProgIdsSet.has(id));

    for (const progId of allProgIds) {
      const newGuests = db.invitadosPorPrograma?.[progId] || [];
      const oldGuests = oldDb.invitadosPorPrograma?.[progId] || [];

      const sortGuests = (list) => [...list].sort((a, b) => String(a.dni).localeCompare(String(b.dni)));
      const newGuestsSorted = sortGuests(newGuests);
      const oldGuestsSorted = sortGuests(oldGuests);

      if (JSON.stringify(newGuestsSorted) !== JSON.stringify(oldGuestsSorted)) {
        const delRes = await supabase.from("invitados_programa").delete().eq("programaId", progId);
        if (delRes.error) {
          console.error(`❌ Error al borrar invitados antiguos para programa ${progId}:`, delRes.error);
        }

        if (newGuests.length) {
          const guestRows = newGuests.map(inv => ({
            programaId: progId,
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado,
            seccion: inv.seccion,
            seleccion: inv.seleccion || "",
            nivelCambridge: inv.nivelCambridge || ""
          }));
          const insRes = await supabase.from("invitados_programa").insert(sanearLista(guestRows, COLUMNAS_INVITADOS));
          if (insRes.error) {
            console.error(`❌ Error al insertar invitados nuevos para programa ${progId}:`, insRes.error);
          }
        }
      }
    }

    // 11. Categorías y Correlativos
    const newCats = [...(db.categorias || [])].sort();
    const oldCats = [...(oldDb.categorias || [])].sort();
    if (JSON.stringify(newCats) !== JSON.stringify(oldCats)) {
      const deleteRes = await supabase.from("categorias").delete().neq("id", 0);
      if (deleteRes.error) {
        console.warn(`⚠️ Warning: No se pudo limpiar categorías en Supabase: ${deleteRes.error.message}`);
      } else {
        const catRows = (db.categorias || []).map(c => ({ categoria: c }));
        catRows.push({
          categoria: "CONFIG_CORRELATIVOS:" + JSON.stringify(db.correlativos || { recibo: "", egreso: "" })
        });
        const insertRes = await supabase.from("categorias").insert(catRows);
        if (insertRes.error) {
          console.warn(`⚠️ Warning: No se pudo insertar categorías en Supabase: ${insertRes.error.message}`);
        }
      }
    } else {
      // 12. Correlativos (solo si las categorías no cambiaron, pero los correlativos sí)
      const newCorr = db.correlativos || { recibo: "", egreso: "" };
      const oldCorr = oldDb.correlativos || { recibo: "", egreso: "" };
      if (JSON.stringify(newCorr) !== JSON.stringify(oldCorr)) {
        try {
          const configVal = JSON.stringify(newCorr);
          const resConfig = await supabase.from("configuracion").upsert({
            clave: "correlativos",
            valor: configVal,
            updated_at: new Date().toISOString()
          }, { onConflict: "clave" });
          if (resConfig.error) {
            console.warn(`⚠️ Warning: No se pudo guardar configuración en tabla 'configuracion' de Supabase: ${resConfig.error.message}`);
          }
        } catch (confErr) {
          console.warn(`⚠️ Warning: Error guardando correlativos:`, confErr);
        }
        
        try {
          const newConfigString = "CONFIG_CORRELATIVOS:" + JSON.stringify(newCorr);
          await supabase.from("categorias").delete().like("categoria", "CONFIG_CORRELATIVOS:%");
          await supabase.from("categorias").insert({ categoria: newConfigString });
        } catch (catConfigErr) {
          console.warn("⚠️ Warning: Error actualizando correlativos en tabla categorias:", catConfigErr);
        }
      }
    }

    const newSyncEvents = Array.isArray(db.syncEvents) ? db.syncEvents.slice(-MAX_SYNC_EVENTS) : [];
    const oldSyncEvents = Array.isArray(oldDb.syncEvents) ? oldDb.syncEvents.slice(-MAX_SYNC_EVENTS) : [];
    if (JSON.stringify(newSyncEvents) !== JSON.stringify(oldSyncEvents)) {
      try {
        const resSync = await supabase.from("configuracion").upsert({
          clave: "sync_events",
          valor: JSON.stringify(newSyncEvents),
          updated_at: new Date().toISOString()
        }, { onConflict: "clave" });
        if (resSync.error) {
          console.warn(`Warning: No se pudo guardar sync_events en Supabase: ${resSync.error.message}`);
        }
      } catch (syncErr) {
        console.warn("Warning: Error guardando sync_events:", syncErr);
      }
    }

    const newInstitutionConfig = db.configuracionInstitucional || {};
    const oldInstitutionConfig = oldDb.configuracionInstitucional || {};
    if (JSON.stringify(newInstitutionConfig) !== JSON.stringify(oldInstitutionConfig)) {
      try {
        const resInstitution = await supabase.from("configuracion").upsert({
          clave: "configuracion_institucional",
          valor: JSON.stringify(newInstitutionConfig),
          updated_at: new Date().toISOString()
        }, { onConflict: "clave" });
        if (resInstitution.error) {
          console.warn(`Warning: No se pudo guardar configuracion_institucional en Supabase: ${resInstitution.error.message}`);
        }
      } catch (institutionErr) {
        console.warn("Warning: Error guardando configuracion_institucional:", institutionErr);
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
    if (cachedDb && (Date.now() - lastFetchedTime < CACHE_TTL_MS)) {
      return clone(cachedDb);
    }
    if (!activeReadPromise) {
      activeReadPromise = readFromSupabase()
        .then((db) => {
          cachedDb = db;
          lastFetchedTime = Date.now();
          activeReadPromise = null;
          return db;
        })
        .catch((err) => {
          activeReadPromise = null;
          throw err;
        });
    }
    const db = await activeReadPromise;
    return clone(db);
  }

  return readLocalDb();
}

export async function saveDb(data) {
  if (isOfficialApiEnabled()) {
    return saveOfficialDb(data);
  }

  let currentDb = null;
  const isSupabase = process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase";
  try {
    if (isSupabase) {
      currentDb = cachedDb || await getDb();
    } else {
      currentDb = await readLocalDb();
    }
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

  const changes = currentDb ? detectSyncChanges(db, currentDb) : [];
  const syncEvent = createSyncEvent(changes);
  if (syncEvent) {
    db.syncEvents = [
      ...(Array.isArray(db.syncEvents) ? db.syncEvents : []),
      syncEvent,
    ].slice(-MAX_SYNC_EVENTS);
  }

  if (isSupabase) {
    await writeToSupabase(db, currentDb);
    cachedDb = db;
    lastFetchedTime = Date.now();
    emitSyncEvent(syncEvent);
    return db;
  }

  await queueDbWrite(db);
  emitSyncEvent(syncEvent);
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
      const current = mergeWithDefaults(
        await getDb(),
        clone(initialData)
      );
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
  let correlativosObj = stored.correlativos || defaults.correlativos || { recibo: "", egreso: "" };
  const storedCats = stored.categorias || [];
  const configRow = storedCats.find(c => String(c).startsWith("CONFIG_CORRELATIVOS:"));
  if (configRow) {
    try {
      correlativosObj = JSON.parse(configRow.slice("CONFIG_CORRELATIVOS:".length));
    } catch {}
  }

  return {
    ...defaults,
    ...stored,
    correlativos: correlativosObj,
    configuracionInstitucional: stored.configuracionInstitucional || defaults.configuracionInstitucional || {},
    categorias: (stored.categorias || defaults.categorias || [])
      .filter(c => !String(c).startsWith("CONFIG_CORRELATIVOS:"))
      .filter(c => {
        const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normal !== "ingles";
      }),
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
    syncEvents: Array.isArray(stored.syncEvents) ? stored.syncEvents.slice(-MAX_SYNC_EVENTS) : [],
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
