import pg from "pg";
import { getPool, isPgEnabled } from "./pgClient.js";
import { LocalDatabase, Programa, Inscripcion, Pago, Asistencia } from "../types.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export { isPgEnabled };

/**
 * Script de inicialización DDL para crear las tablas en PostgreSQL 17 si no existen.
 * Lee dinámicamente los archivos SQL individuales desde el directorio de configuración.
 */
async function initializeSchema(client: pg.PoolClient): Promise<void> {
  let tablesDir = path.resolve(__dirname, "./tables");
  try {
    await fs.access(tablesDir);
  } catch {
    tablesDir = path.resolve(process.cwd(), "src/database/postgres/tables");
  }
  const files = [
    "01_usuarios.sql",
    "02_categorias.sql",
    "03_estudiantes.sql",
    "04_estudiantes_externos.sql",
    "05_configuracion.sql",
    "06_programas.sql",
    "07_programas_configuraciones.sql",
    "08_programas_horarios.sql",
    "09_programas_servicios.sql",
    "10_programas_documentos.sql",
    "11_programas_anuncios.sql",
    "12_invitados_programa.sql",
    "13_inscripciones.sql",
    "14_pagos.sql",
    "15_asistencias.sql",
    "16_audit_logs.sql",
    "17_historial_cargas.sql",
  ];

  console.log("🛠️  [DATABASE] Cargando e inicializando esquemas SQL modulares...");
  for (const file of files) {
    const filePath = path.join(tablesDir, file);
    try {
      const sql = await fs.readFile(filePath, "utf8");
      await client.query(sql);
    } catch (err: any) {
      console.error(`❌ Error al ejecutar el script de tabla ${file}:`, err.message);
      throw err;
    }
  }
  console.log("✅ [DATABASE] Inicialización de tablas finalizada con éxito.");
}


/**
 * Carga todo el estado de la base de datos de forma paralela desde PostgreSQL 17.
 */
export async function loadDatabaseFromPg(defaults: LocalDatabase): Promise<LocalDatabase> {
  const p = getPool();
  const client = await p.connect();
  try {
    await initializeSchema(client);

    const progQuery = `
      SELECT 
        p.*,
        c."duracionAvisoDias", c."horaLimiteAviso", c."edadMinima", c."edadMaxima", c."grupoEtario", c.requisitos, c.comunicado, c."comunicadoCompleto", c."detalleCosto", c."creadoDesdeDocumento", c."duracionTaller", c."invitacionMasiva", c."alcanceInvitacionMasiva", c."tipoComunicado", c."motivoJustificacion", c.docente, c.responsable, c.estado,
        h."horaInicio", h."horaFin", h."horariosPorGrupo", h."tablaHorariosNivel",
        s."requiereUniforme", s."requiereIndumentaria", s."incluyeAlmuerzo", s."horarioRecepcionAlmuerzo", s.concesionarios, s."detalleAlmuerzo", s."nivelCambridge", s."modalidadesCambridge", s."costoCiclo", s."montoPrimerPago", s."cicloI", s."cicloII", s."nombreCiclo",
        d.plantilla, d."plantillaBase64", d."plantillaVariables", d."plantillaValidada", d."tipoDocumento", d."numeroDocumento", d."areaTematica",
        a."anuncioImagen", a."anuncioImagenNombre", a."anuncioImagenTamano", a."anuncioImagenComprimida"
      FROM programas p
      LEFT JOIN programas_configuraciones c ON c."programaId" = p.id
      LEFT JOIN programas_horarios h ON h."programaId" = p.id
      LEFT JOIN programas_servicios s ON s."programaId" = p.id
      LEFT JOIN programas_documentos d ON d."programaId" = p.id
      LEFT JOIN programas_anuncios a ON a."programaId" = p.id
    `;

    // Carga paralela concurrente de todas las tablas para evitar cuellos de botella por latencia de red
    const [
      resUsuarios,
      resEstudiantes,
      resProgs,
      resInscrip,
      resPagos,
      resAsistencias,
      resInvitados,
      resCategorias,
      resConfig,
      resCargas,
      resAudit
    ] = await Promise.all([
      client.query('SELECT * FROM usuarios'),
      client.query('SELECT * FROM estudiantes'),
      client.query(progQuery),
      client.query('SELECT * FROM inscripciones'),
      client.query('SELECT * FROM pagos'),
      client.query('SELECT * FROM asistencias'),
      client.query('SELECT * FROM invitados_programa'),
      client.query('SELECT * FROM categorias'),
      client.query('SELECT * FROM configuracion LIMIT 1'),
      client.query('SELECT * FROM historial_cargas'),
      client.query('SELECT * FROM audit_logs')
    ]);

    // 1. Usuarios
    const usuarios = resUsuarios.rows;

    // 2. Estudiantes
    const estudiantes: Record<string, any> = {};
    resEstudiantes.rows.forEach(r => { estudiantes[r.dni] = r; });

    // 3. Programas
    const programas: Programa[] = resProgs.rows.map(r => ({
      ...r,
      costo: Number(r.costo || 0),
      cupos: Number(r.cupos || 0),
      cuposOcupados: Number(r.cuposOcupados || 0),
      duracionAvisoDias: r.duracionAvisoDias ? Number(r.duracionAvisoDias) : undefined,
      edadMinima: r.edadMinima ? Number(r.edadMinima) : undefined,
      edadMaxima: r.edadMaxima ? Number(r.edadMaxima) : undefined,
      costoCiclo: r.costoCiclo ? Number(r.costoCiclo) : undefined,
      montoPrimerPago: r.montoPrimerPago ? Number(r.montoPrimerPago) : undefined,
      anuncioImagenTamano: r.anuncioImagenTamano ? Number(r.anuncioImagenTamano) : undefined,
    }));

    // 4. Inscripciones
    const inscripciones: Inscripcion[] = resInscrip.rows.map(r => ({
      ...r,
      ...r.extraFields,
      costoOriginal: Number(r.costoOriginal || 0),
      descuentoValor: Number(r.descuentoValor || 0),
      descuentoMonto: Number(r.descuentoMonto || 0),
      extraFields: undefined
    }));

    // 5. Pagos
    const pagos: Pago[] = resPagos.rows.map(r => ({
      ...r,
      ...r.extraFields,
      monto: Number(r.monto || 0),
      extraFields: undefined
    }));

    // 6. Asistencias
    const asistencias: Asistencia[] = resAsistencias.rows.map(r => ({
      ...r,
      ...r.extraFields,
      extraFields: undefined
    }));

    // 7. Invitados
    const invitadosPorPrograma: Record<string, any[]> = {};
    resInvitados.rows.forEach(r => {
      const progId = r.programaId;
      if (!invitadosPorPrograma[progId]) invitadosPorPrograma[progId] = [];
      invitadosPorPrograma[progId].push(r);
    });

    // 8. Categorías
    const mappedCats = resCategorias.rows.map((r: any) => r.nombre || r.id);

    // 9. Configuración
    const configuracionInstitucional = resConfig.rows[0] || defaults.configuracionInstitucional || {};

    return {
      usuarios: usuarios.length ? usuarios : defaults.usuarios,
      estudiantes: Object.keys(estudiantes).length ? estudiantes : defaults.estudiantes,
      programas: programas.length ? programas : defaults.programas,
      invitadosPorPrograma: Object.keys(invitadosPorPrograma).length ? invitadosPorPrograma : defaults.invitadosPorPrograma,
      inscripciones,
      documentosGenerados: defaults.documentosGenerados || [],
      pagos,
      asistencias,
      historialCargas: resCargas.rows,
      syncEvents: [],
      categorias: mappedCats.length ? mappedCats : defaults.categorias,
      configuracionInstitucional,
      auditLogs: resAudit.rows
    } as any as LocalDatabase;
  } finally {
    client.release();
  }
}

/**
 * Guarda y sincroniza selectivamente en PostgreSQL 17 solo las tablas que hayan sufrido cambios.
 */
export async function saveDatabaseToPg(db: LocalDatabase, changes: string[] = []): Promise<void> {
  const p = getPool();
  const client = await p.connect();
  
  // Si no se especifican cambios, asumimos que debemos sincronizar todo
  const shouldSync = (colName: string) => changes.length === 0 || changes.includes(colName);

  try {
    await client.query("BEGIN");
    await initializeSchema(client);

    // 1. Sincronizar usuarios
    if (shouldSync("usuarios")) {
      await client.query("DELETE FROM usuarios");
      for (const u of (db.usuarios || [])) {
        await client.query(
          `INSERT INTO usuarios (id, nombre, usuario, contrasena, rol, estado, permisos) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (id) DO UPDATE SET nombre=$2, usuario=$3, contrasena=$4, rol=$5, estado=$6, permisos=$7`,
          [u.id, u.nombre, u.usuario, u.contrasena, u.rol, u.estado, JSON.stringify(u.permisos || [])]
        );
      }
    }

    // 2. Sincronizar estudiantes
    if (shouldSync("estudiantes")) {
      const studentKeys = Object.keys(db.estudiantes || {});
      if (studentKeys.length > 0) {
        const placeholders = studentKeys.map((_, i) => `$${i + 1}`).join(",");
        await client.query(`DELETE FROM estudiantes WHERE DNI NOT IN (${placeholders})`, studentKeys);
        for (const dni of studentKeys) {
          const s = db.estudiantes[dni] as any;
          await client.query(
            `INSERT INTO estudiantes (dni, "codigoEstudiante", nombres, apellidos, grado, nivel, seccion, sexo, "fechaNacimiento", "tipoAlumno", "estadoMatricula", apoderado, "telefonoApoderado", "correoApoderado", "estadoInscripcion", "estadoCaja") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
             ON CONFLICT (dni) DO UPDATE SET "codigoEstudiante"=$2, nombres=$3, apellidos=$4, grado=$5, nivel=$6, seccion=$7, sexo=$8, "fechaNacimiento"=$9, "tipoAlumno"=$10, "estadoMatricula"=$11, apoderado=$12, "telefonoApoderado"=$13, "correoApoderado"=$14, "estadoInscripcion"=$15, "estadoCaja"=$16`,
            [s.dni, s.codigoEstudiante, s.nombres, s.apellidos || "", s.grado, s.nivel, s.seccion, s.sexo, s.fechaNacimiento, s.tipoAlumno, s.estadoMatricula, s.apoderado, s.telefonoApoderado, s.correoApoderado, s.estadoInscripcion, s.estadoCaja]
          );
        }
      } else {
        await client.query("DELETE FROM estudiantes");
      }
    }

    // 3. Sincronizar programas
    if (shouldSync("programas")) {
      const progIds = (db.programas || []).map(p => p.id);
      if (progIds.length > 0) {
        const placeholders = progIds.map((_, i) => `$${i + 1}`).join(",");
        await client.query(`DELETE FROM programas WHERE id NOT IN (${placeholders})`, progIds);
        for (const pr of (db.programas || [])) {
          await client.query(
            `INSERT INTO programas (id, nombre, categoria, "fechaInicio", "fechaFin", costo, cupos, "cuposOcupados", "gradosAplicables", periodo, "modalidadCobro", horario, grupo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET nombre=$2, categoria=$3, "fechaInicio"=$4, "fechaFin"=$5, costo=$6, cupos=$7, "cuposOcupados"=$8, "gradosAplicables"=$9, periodo=$10, "modalidadCobro"=$11, horario=$12, grupo=$13`,
            [pr.id, pr.nombre, pr.categoria, pr.fechaInicio, pr.fechaFin, pr.costo, pr.cupos, pr.cuposOcupados, JSON.stringify(pr.gradosAplicables || []), pr.periodo, pr.modalidadCobro, pr.horario, pr.grupo]
          );

          await client.query(
            `INSERT INTO programas_configuraciones ("programaId", "duracionAvisoDias", "horaLimiteAviso", "edadMinima", "edadMaxima", "grupoEtario", requisitos, comunicado, "comunicadoCompleto", "detalleCosto", "creadoDesdeDocumento", "duracionTaller", "invitacionMasiva", "alcanceInvitacionMasiva", "tipoComunicado", "motivoJustificacion", docente, responsable, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             ON CONFLICT ("programaId") DO UPDATE SET "duracionAvisoDias"=$2, "horaLimiteAviso"=$3, "edadMinima"=$4, "edadMaxima"=$5, "grupoEtario"=$6, requisitos=$7, comunicado=$8, "comunicadoCompleto"=$9, "detalleCosto"=$10, "creadoDesdeDocumento"=$11, "duracionTaller"=$12, "invitacionMasiva"=$13, "alcanceInvitacionMasiva"=$14, "tipoComunicado"=$15, "motivoJustificacion"=$16, docente=$17, responsable=$18, estado=$19`,
            [pr.id, pr.duracionAvisoDias || 0, pr.horaLimiteAviso || "", pr.edadMinima || 0, pr.edadMaxima || 0, pr.grupoEtario || "", pr.requisitos || "", pr.comunicado || "", pr.comunicadoCompleto || "", pr.detalleCosto || "", pr.creadoDesdeDocumento || false, pr.duracionTaller || "", pr.invitacionMasiva || false, pr.alcanceInvitacionMasiva || "", pr.tipoComunicado || "", pr.motivoJustificacion || "", pr.docente || pr.responsable || "", pr.responsable || "", pr.estado || ""]
          );

          await client.query(
            `INSERT INTO programas_horarios ("programaId", "horaInicio", "horaFin", "horariosPorGrupo", "tablaHorariosNivel")
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT ("programaId") DO UPDATE SET "horaInicio"=$2, "horaFin"=$3, "horariosPorGrupo"=$4, "tablaHorariosNivel"=$5`,
            [pr.id, pr.horaInicio || "", pr.horaFin || "", JSON.stringify(pr.horariosPorGrupo || []), JSON.stringify(pr.tablaHorariosNivel || [])]
          );

          await client.query(
            `INSERT INTO programas_servicios ("programaId", "requiereUniforme", "requiereIndumentaria", "incluyeAlmuerzo", "horarioRecepcionAlmuerzo", concesionarios, "detalleAlmuerzo", "nivelCambridge", "modalidadesCambridge", "costoCiclo", "montoPrimerPago", "cicloI", "cicloII", "nombreCiclo")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT ("programaId") DO UPDATE SET "requiereUniforme"=$2, "requiereIndumentaria"=$3, "incluyeAlmuerzo"=$4, "horarioRecepcionAlmuerzo"=$5, concesionarios=$6, "detalleAlmuerzo"=$7, "nivelCambridge"=$8, "modalidadesCambridge"=$9, "costoCiclo"=$10, "montoPrimerPago"=$11, "cicloI"=$12, "cicloII"=$13, "nombreCiclo"=$14`,
            [pr.id, pr.requiereUniforme || false, pr.requiereIndumentaria || false, pr.incluyeAlmuerzo || false, pr.horarioRecepcionAlmuerzo || "", JSON.stringify(pr.concesionarios || []), pr.detalleAlmuerzo || "", pr.nivelCambridge || "", JSON.stringify(pr.modalidadesCambridge || []), pr.costoCiclo || 0, pr.montoPrimerPago || 0, JSON.stringify(pr.cicloI || {}), JSON.stringify(pr.cicloII || {}), pr.nombreCiclo || ""]
          );

          await client.query(
            `INSERT INTO programas_documentos ("programaId", plantilla, "plantillaBase64", "plantillaVariables", "plantillaValidada", "tipoDocumento", "numeroDocumento", "areaTematica")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT ("programaId") DO UPDATE SET plantilla=$2, "plantillaBase64"=$3, "plantillaVariables"=$4, "plantillaValidada"=$5, "tipoDocumento"=$6, "numeroDocumento"=$7, "areaTematica"=$8`,
            [pr.id, pr.plantilla || "", pr.plantillaBase64 || "", JSON.stringify(pr.plantillaVariables || []), pr.plantillaValidada || false, pr.tipoDocumento || "", pr.numeroDocumento || "", pr.areaTematica || ""]
          );

          await client.query(
            `INSERT INTO programas_anuncios ("programaId", "anuncioImagen", "anuncioImagenNombre", "anuncioImagenTamano", "anuncioImagenComprimida")
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT ("programaId") DO UPDATE SET "anuncioImagen"=$2, "anuncioImagenNombre"=$3, "anuncioImagenTamano"=$4, "anuncioImagenComprimida"=$5`,
            [pr.id, pr.anuncioImagen || "", pr.anuncioImagenNombre || "", pr.anuncioImagenTamano || 0, pr.anuncioImagenComprimida || false]
          );
        }
      } else {
        await client.query("DELETE FROM programas");
      }
    }

    // 4. Sincronizar inscripciones
    if (shouldSync("inscripciones")) {
      const inscripIds = (db.inscripciones || []).map(i => i.id);
      if (inscripIds.length > 0) {
        const placeholders = inscripIds.map((_, i) => `$${i + 1}`).join(",");
        await client.query(`DELETE FROM inscripciones WHERE id NOT IN (${placeholders})`, inscripIds);
        for (const ins of (db.inscripciones || [])) {
          const extraFields = { ...ins };
          const knownKeys = ["id", "dniEstudiante", "programaId", "estadoPago", "pagoId", "costoOriginal", "descuentoAprobado", "descuentoTipo", "descuentoValor", "descuentoMonto", "descuentoJustificacion", "descuentoAprobadoPor", "descuentoFechaAprobacion", "derivadoCaja", "estadoCaja", "origenRegistro", "fechaRegistro"];
          knownKeys.forEach(k => delete (extraFields as any)[k]);

          await client.query(
            `INSERT INTO inscripciones (id, "dniEstudiante", "programaId", "estadoPago", "pagoId", "costoOriginal", "descuentoAprobado", "descuentoTipo", "descuentoValor", "descuentoMonto", "descuentoJustificacion", "descuentoAprobadoPor", "descuentoFechaAprobacion", "derivadoCaja", "estadoCaja", "origenRegistro", "fechaRegistro", "extraFields")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             ON CONFLICT (id) DO UPDATE SET "dniEstudiante"=$2, "programaId"=$3, "estadoPago"=$4, "pagoId"=$5, "costoOriginal"=$6, "descuentoAprobado"=$7, "descuentoTipo"=$8, "descuentoValor"=$9, "descuentoMonto"=$10, "descuentoJustificacion"=$11, "descuentoAprobadoPor"=$12, "descuentoFechaAprobacion"=$13, "derivadoCaja"=$14, "estadoCaja"=$15, "origenRegistro"=$16, "fechaRegistro"=$17, "extraFields"=$18`,
            [ins.id, ins.dniEstudiante, ins.programaId, ins.estadoPago, ins.pagoId, ins.costoOriginal, ins.descuentoAprobado, ins.descuentoTipo, ins.descuentoValor, ins.descuentoMonto, ins.descuentoJustificacion, ins.descuentoAprobadoPor, ins.descuentoFechaAprobacion, ins.derivadoCaja, ins.estadoCaja, ins.origenRegistro, ins.fechaRegistro, JSON.stringify(extraFields)]
          );
        }
      } else {
        await client.query("DELETE FROM inscripciones");
      }
    }

    // 5. Sincronizar pagos
    if (shouldSync("pagos")) {
      const pagoIds = (db.pagos || []).map(p => p.id);
      if (pagoIds.length > 0) {
        const placeholders = pagoIds.map((_, i) => `$${i + 1}`).join(",");
        await client.query(`DELETE FROM pagos WHERE id NOT IN (${placeholders})`, pagoIds);
        for (const pay of (db.pagos || [])) {
          const extraFields = { ...pay };
          const knownKeys = ["id", "inscripcionId", "dniEstudiante", "programaId", "monto", "formaPago", "numeroOperacion", "telefonoOperacion", "capturaPagoNombre", "capturaPagoBase64", "estado", "fecha", "fechaPago", "origenRegistro", "nroRecibo"];
          knownKeys.forEach(k => delete (extraFields as any)[k]);

          await client.query(
            `INSERT INTO pagos (id, "inscripcionId", "dniEstudiante", "programaId", monto, "formaPago", "numeroOperacion", "telefonoOperacion", "capturaPagoNombre", "capturaPagoBase64", estado, fecha, "fechaPago", "origenRegistro", "nroRecibo", "extraFields")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (id) DO UPDATE SET "inscripcionId"=$2, "dniEstudiante"=$3, "programaId"=$4, monto=$5, "formaPago"=$6, "numeroOperacion"=$7, "telefonoOperacion"=$8, "capturaPagoNombre"=$9, "capturaPagoBase64"=$10, estado=$11, fecha=$12, "fechaPago"=$13, "origenRegistro"=$14, "nroRecibo"=$15, "extraFields"=$16`,
            [pay.id, pay.inscripcionId, pay.dniEstudiante, pay.programaId, pay.monto, pay.formaPago, pay.numeroOperacion, pay.telefonoOperacion, pay.capturaPagoNombre, pay.capturaPagoBase64, pay.estado, pay.fecha, pay.fechaPago, pay.origenRegistro, pay.nroRecibo, JSON.stringify(extraFields)]
          );
        }
      } else {
        await client.query("DELETE FROM pagos");
      }
    }

    // 6. Sincronizar asistencias
    if (shouldSync("asistencias")) {
      const asistenciaIds = (db.asistencias || []).map(a => a.id);
      if (asistenciaIds.length > 0) {
        const placeholders = asistenciaIds.map((_, i) => `$${i + 1}`).join(",");
        await client.query(`DELETE FROM asistencias WHERE id NOT IN (${placeholders})`, asistenciaIds);
        for (const ast of (db.asistencias || [])) {
          const extraFields = { ...ast };
          const knownKeys = ["id", "inscripcionId", "pagoId", "dniEstudiante", "programaId", "estadoAcceso", "observacion", "origen", "fechaRegistro"];
          knownKeys.forEach(k => delete (extraFields as any)[k]);

          await client.query(
            `INSERT INTO asistencias (id, "inscripcionId", "pagoId", "dniEstudiante", "programaId", "estadoAcceso", observacion, origen, "fechaRegistro", "extraFields")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET "inscripcionId"=$2, "pagoId"=$3, "dniEstudiante"=$4, "programaId"=$5, "estadoAcceso"=$6, observacion=$7, origen=$8, "fechaRegistro"=$9, "extraFields"=$10`,
            [ast.id, ast.inscripcionId, ast.pagoId, ast.dniEstudiante, ast.programaId, ast.estadoAcceso, ast.observacion, ast.origen, ast.fechaRegistro, JSON.stringify(extraFields)]
          );
        }
      } else {
        await client.query("DELETE FROM asistencias");
      }
    }

    // 7. Sincronizar invitados
    if (shouldSync("invitados")) {
      await client.query("DELETE FROM invitados_programa");
      for (const progId of Object.keys(db.invitadosPorPrograma || {})) {
        const list = db.invitadosPorPrograma[progId] || [];
        for (const inv of list) {
          await client.query(
            `INSERT INTO invitados_programa ("programaId", DNI, nombres, grado, seccion, seleccion, "nivelCambridge")
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT ("programaId", DNI) DO NOTHING`,
            [progId, inv.dni, inv.nombres, inv.grado, inv.seccion, inv.seleccion, inv.nivelCambridge]
          );
        }
      }
    }

    // 8. Sincronizar categorías
    if (shouldSync("categorias")) {
      await client.query("DELETE FROM categorias");
      for (const cat of (db.categorias || [])) {
        await client.query(
          `INSERT INTO categorias (id, nombre) VALUES ($1, $1)
           ON CONFLICT (id) DO NOTHING`,
          [cat]
        );
      }
    }

    // 9. Sincronizar configuración global
    if (shouldSync("configuracionInstitucional") && db.configuracionInstitucional) {
      const cfg = db.configuracionInstitucional as any;
      await client.query(
        `INSERT INTO configuracion (id, "nombreInstitucion", "periodoActivo", "logoUrl", direccion, telefono)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET "nombreInstitucion"=$2, "periodoActivo"=$3, "logoUrl"=$4, direccion=$5, telefono=$6`,
        ["GLOBAL_CONFIG", cfg.nombreInstitucion || "", cfg.periodoActivo || "", cfg.logoUrl || "", cfg.direccion || "", cfg.telefono || ""]
      );
    }

    // 10. Audit Logs y Cargas
    if (shouldSync("historialCargas")) {
      await client.query("DELETE FROM historial_cargas");
      for (const hc of (db.historialCargas || [])) {
        await client.query(
          `INSERT INTO historial_cargas (id, fecha, periodo, "archivoNombre", archivos, usuario, resumen, registros)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [hc.id, hc.fecha, hc.periodo, hc.archivoNombre, JSON.stringify(hc.archivos || {}), hc.usuario, JSON.stringify(hc.resumen || {}), JSON.stringify(hc.registros || [])]
        );
      }
    }

    if (shouldSync("auditLogs")) {
      await client.query("DELETE FROM audit_logs");
      for (const log of (db.auditLogs || [])) {
        await client.query(
          `INSERT INTO audit_logs (id, fecha, usuario, rol, accion, detalles)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [log.id, log.fecha, log.usuario, log.rol, log.accion, JSON.stringify(log.detalles || {})]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
