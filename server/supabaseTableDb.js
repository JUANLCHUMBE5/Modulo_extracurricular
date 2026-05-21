import { initialData } from "../src/services/localDbClient.js";

const TABLES = {
  categorias: { key: "categorias", idKey: "nombre", kind: "string-array" },
  estudiantes: { key: "estudiantes", idKey: "dni", kind: "object-map", columns: estudianteColumns },
  programas: { key: "programas", idKey: "id", kind: "array", columns: programaColumns },
  invitados_por_programa: { key: "invitadosPorPrograma", idKey: "dni", kind: "group-map", parentKey: "programa_id", columns: invitadoColumns },
  inscripciones: { key: "inscripciones", idKey: "id", kind: "array", columns: inscripcionColumns },
  documentos_generados: { key: "documentosGenerados", idKey: "id", kind: "array", columns: documentoColumns },
  pagos: { key: "pagos", idKey: "id", kind: "array", columns: pagoColumns },
  asistencias: { key: "asistencias", idKey: "id", kind: "array", columns: asistenciaColumns },
  historial_cargas: { key: "historialCargas", idKey: "id", kind: "array", columns: cargaColumns },
  usuarios: { key: "usuarios", idKey: "id", kind: "array", columns: usuarioColumns },
  plantillas_programa: { key: "plantillasPorPrograma", idKey: "programa_id", kind: "object-map", columns: plantillaColumns },
};

export function isSupabaseTablesEnabled() {
  return String(process.env.SUPABASE_STORAGE_MODE || "").toLowerCase() === "tables";
}

export async function getSupabaseTablesDb(client) {
  const db = clone(initialData);

  await Promise.all(
    Object.entries(TABLES).map(async ([table, config]) => {
      const { data, error } = await client.from(table).select("*");
      if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
      assignTableRows(db, config, data || []);
    })
  );

  return mergeWithDefaults(db, clone(initialData));
}

export async function saveSupabaseTablesDb(client, data) {
  const db = mergeWithDefaults(data || {}, clone(initialData));

  for (const [table, config] of Object.entries(TABLES)) {
    const rows = buildTableRows(db, config);
    const { error: deleteError } = await client
      .from(table)
      .delete()
      .neq("id", "__never__");

    if (deleteError) throw new Error(`No se pudo limpiar ${table}: ${deleteError.message}`);
    if (!rows.length) continue;

    const { error: upsertError } = await client.from(table).upsert(rows, { onConflict: "id" });
    if (upsertError) throw new Error(`No se pudo guardar ${table}: ${upsertError.message}`);
  }

  return db;
}

export async function resetSupabaseTablesDb(client) {
  return saveSupabaseTablesDb(client, clone(initialData));
}

function assignTableRows(db, config, rows) {
  if (config.kind === "string-array") {
    db[config.key] = rows.map((row) => row.nombre || row.id).filter(Boolean);
    return;
  }

  if (config.kind === "object-map") {
    db[config.key] = {};
    rows.forEach((row) => {
      const id = row[config.idKey] || row.id;
      if (!id) return;
      db[config.key][id] = row.data || {};
    });
    return;
  }

  if (config.kind === "group-map") {
    db[config.key] = {};
    rows.forEach((row) => {
      const parentId = row[config.parentKey];
      if (!parentId) return;
      if (!db[config.key][parentId]) db[config.key][parentId] = [];
      db[config.key][parentId].push(row.data || {});
    });
    return;
  }

  db[config.key] = rows.map((row) => row.data || {});
}

function buildTableRows(db, config) {
  if (config.kind === "string-array") {
    return (db[config.key] || []).map((nombre) => ({
      id: String(nombre),
      nombre: String(nombre),
      data: { nombre: String(nombre) },
    }));
  }

  if (config.kind === "object-map") {
    return Object.entries(db[config.key] || {}).map(([id, value]) => ({
      id: String(id),
      [config.idKey]: String(id),
      ...(config.columns ? config.columns(value || {}, id) : {}),
      data: value || {},
    }));
  }

  if (config.kind === "group-map") {
    const rows = [];
    Object.entries(db[config.key] || {}).forEach(([parentId, items]) => {
      (items || []).forEach((item, index) => {
        const itemId = item[config.idKey] || item.codigoEstudiante || item.nombres || index;
        rows.push({
          id: `${parentId}:${itemId}`,
          [config.parentKey]: parentId,
          [config.idKey]: String(itemId),
          ...(config.columns ? config.columns(item || {}, parentId) : {}),
          data: item,
        });
      });
    });
    return rows;
  }

  return (db[config.key] || []).map((item, index) => ({
    id: String(item[config.idKey] || index),
    ...(config.columns ? config.columns(item || {}) : {}),
    data: item,
  }));
}

function estudianteColumns(item) {
  return {
    nombres: item.nombres || "",
    grado: item.grado || "",
    seccion: item.seccion || "",
    tipo_alumno: item.tipoAlumno || "",
  };
}

function programaColumns(item) {
  return {
    nombre: item.nombre || "",
    periodo: item.periodo || "",
    estado: item.estado || "",
    costo: Number(item.costo || 0),
    cupos: Number(item.cupos || 0),
    cupos_ocupados: Number(item.cuposOcupados || 0),
  };
}

function invitadoColumns(item, programaId) {
  return {
    programa_id: programaId,
    dni: item.dni || "",
    nombres: item.nombres || "",
    grado: item.grado || "",
    seccion: item.seccion || "",
    estado: item.estado || "",
  };
}

function inscripcionColumns(item) {
  return {
    programa_id: item.programaId || "",
    dni_estudiante: item.dniEstudiante || "",
    nombres_estudiante: item.nombresEstudiante || "",
    estado_inscripcion: item.estadoInscripcion || item.estadoInscripción || "",
    estado_pago: item.estadoPago || "",
    fecha_registro: item.fechaRegistro || null,
  };
}

function documentoColumns(item) {
  return {
    programa_id: item.programaId || "",
    dni_estudiante: item.dniEstudiante || "",
    fecha: item.fecha || null,
    tipo_documento: item.tipoDocumento || "",
  };
}

function pagoColumns(item) {
  return {
    inscripcion_id: item.inscripcionId || "",
    dni_estudiante: item.dniEstudiante || "",
    estado_pago: item.estadoPago || item.estado || "",
    fecha: item.fecha || null,
    monto: Number(item.monto || item.total || 0),
  };
}

function asistenciaColumns(item) {
  return {
    programa_id: item.programaId || "",
    inscripcion_id: item.inscripcionId || "",
    fecha: item.fecha || null,
  };
}

function cargaColumns(item) {
  return {
    programa_id: item.programaId || "",
    fecha: item.fecha || item.creadoEn || null,
    estado: item.estado || "",
  };
}

function usuarioColumns(item) {
  return {
    usuario: item.usuario || "",
    rol: item.rol || "",
    estado: item.estado || "",
  };
}

function plantillaColumns(item, programaId) {
  return {
    programa_id: programaId,
    plantilla: item.plantilla || "",
    actualizada_en: item.plantillaActualizadaEn || null,
  };
}

function mergeWithDefaults(stored, defaults) {
  return {
    ...defaults,
    ...stored,
    categorias: stored.categorias || defaults.categorias,
    estudiantes: { ...defaults.estudiantes, ...(stored.estudiantes || {}) },
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
    usuarios: stored.usuarios || defaults.usuarios,
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
