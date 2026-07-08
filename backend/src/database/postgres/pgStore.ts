import { sequelize } from "./connection.js";
import { isPgEnabled } from "./pgClient.js";
import { LocalDatabase, Programa, Inscripcion, Pago, Asistencia } from "../types.js";
import {
  CategoriaModel,
  UsuarioModel,
  EstudianteModel,
  ProgramaModel,
  ProgramaConfiguracionModel,
  ProgramaHorarioModel,
  ProgramaServicioModel,
  ProgramaDocumentoModel,
  ProgramaAnuncioModel,
  InvitadoProgramaModel,
  InscripcionModel,
  PagoModel,
  AsistenciaModel,
  HistorialCargaModel,
  AuditLogModel,
  ConfiguracionModel,
} from "./models/models.js";

export { isPgEnabled };

/**
 * Inicializa el esquema de PostgreSQL 17 utilizando Sequelize sync.
 */
async function initializeSchema(): Promise<void> {
  console.log("🛠️  [DATABASE] Inicializando esquemas mediante Sequelize ORM...");
  await sequelize.sync();
  console.log("✅ [DATABASE] Tablas e índices sincronizados con éxito.");
}

/**
 * Carga todo el estado de la base de datos de forma paralela desde PostgreSQL 17 usando Sequelize.
 */
export async function loadDatabaseFromPg(defaults: LocalDatabase): Promise<LocalDatabase> {
  try {
    await initializeSchema();

    // Carga paralela concurrente de todas las tablas para evitar cuellos de botella por latencia de red
    const [
      dbUsuarios,
      dbEstudiantes,
      progs,
      dbInscripciones,
      dbPagos,
      dbAsistencias,
      dbInvitados,
      dbCategorias,
      dbConfig,
      dbCargas,
      dbAudit,
    ] = await Promise.all([
      UsuarioModel.findAll(),
      EstudianteModel.findAll(),
      ProgramaModel.findAll({
        include: [
          { model: ProgramaConfiguracionModel, as: "configuracion" },
          { model: ProgramaHorarioModel, as: "horarioInfo" },
          { model: ProgramaServicioModel, as: "servicioInfo" },
          { model: ProgramaDocumentoModel, as: "documentoInfo" },
          { model: ProgramaAnuncioModel, as: "anuncioInfo" },
        ],
      }),
      InscripcionModel.findAll(),
      PagoModel.findAll(),
      AsistenciaModel.findAll(),
      InvitadoProgramaModel.findAll(),
      CategoriaModel.findAll(),
      ConfiguracionModel.findOne(),
      HistorialCargaModel.findAll(),
      AuditLogModel.findAll(),
    ]);

    // 1. Usuarios
    const usuarios = dbUsuarios.map((u) => u.get({ plain: true }));

    // 2. Estudiantes
    const estudiantes: Record<string, any> = {};
    dbEstudiantes.forEach((e) => {
      const plain = e.get({ plain: true });
      estudiantes[plain.dni] = plain;
    });

    // 3. Programas (Aplanar las sub-tablas 1-1 en el formato del caché local)
    const programas: Programa[] = progs.map((p) => {
      const data = p.get({ plain: true });
      const { configuracion, horarioInfo, servicioInfo, documentoInfo, anuncioInfo, ...rest } = data;
      return {
        ...rest,
        ...configuracion,
        ...horarioInfo,
        ...servicioInfo,
        ...documentoInfo,
        ...anuncioInfo,
        costo: Number(rest.costo || 0),
        cupos: Number(rest.cupos || 0),
        cuposOcupados: Number(rest.cuposOcupados || 0),
        duracionAvisoDias: configuracion?.duracionAvisoDias ? Number(configuracion.duracionAvisoDias) : undefined,
        edadMinima: configuracion?.edadMinima ? Number(configuracion.edadMinima) : undefined,
        edadMaxima: configuracion?.edadMaxima ? Number(configuracion.edadMaxima) : undefined,
        costoCiclo: servicioInfo?.costoCiclo ? Number(servicioInfo.costoCiclo) : undefined,
        montoPrimerPago: servicioInfo?.montoPrimerPago ? Number(servicioInfo.montoPrimerPago) : undefined,
        anuncioImagenTamano: anuncioInfo?.anuncioImagenTamano ? Number(anuncioInfo.anuncioImagenTamano) : undefined,
      };
    });

    // 4. Inscripciones
    const inscripciones: Inscripcion[] = dbInscripciones.map((ins) => {
      const plain = ins.get({ plain: true });
      return {
        ...plain,
        costoOriginal: Number(plain.costoOriginal || 0),
        descuentoValor: Number(plain.descuentoValor || 0),
        descuentoMonto: Number(plain.descuentoMonto || 0),
      };
    });

    // 5. Pagos
    const pagos: Pago[] = dbPagos.map((p) => {
      const plain = p.get({ plain: true });
      return {
        ...plain,
        monto: Number(plain.monto || 0),
      };
    });

    // 6. Asistencias
    const asistencias: Asistencia[] = dbAsistencias.map((a) => a.get({ plain: true }));

    // 7. Invitados por Programa
    const invitadosPorPrograma: Record<string, any[]> = {};
    dbInvitados.forEach((inv) => {
      const plain = inv.get({ plain: true });
      const progId = plain.programaId;
      if (!invitadosPorPrograma[progId]) invitadosPorPrograma[progId] = [];
      invitadosPorPrograma[progId].push(plain);
    });

    // 8. Categorías
    const mappedCats = dbCategorias.map((cat) => cat.nombre || cat.id);

    // 9. Configuración
    const configuracionInstitucional = dbConfig ? dbConfig.get({ plain: true }) : defaults.configuracionInstitucional || {};

    return {
      usuarios: usuarios.length ? usuarios : defaults.usuarios,
      estudiantes: Object.keys(estudiantes).length ? estudiantes : defaults.estudiantes,
      programas: programas.length ? programas : defaults.programas,
      invitadosPorPrograma: Object.keys(invitadosPorPrograma).length ? invitadosPorPrograma : defaults.invitadosPorPrograma,
      inscripciones,
      documentosGenerados: defaults.documentosGenerados || [],
      pagos,
      asistencias,
      historialCargas: dbCargas.map((c) => c.get({ plain: true })),
      syncEvents: [],
      categorias: mappedCats.length ? mappedCats : defaults.categorias,
      configuracionInstitucional,
      auditLogs: dbAudit.map((l) => l.get({ plain: true })),
    } as any as LocalDatabase;
  } catch (err) {
    console.error("❌ Error al cargar la base de datos desde PostgreSQL:", err);
    throw err;
  }
}

/**
 * Guarda y sincroniza selectivamente en PostgreSQL 17 solo las tablas que hayan sufrido cambios.
 */
export async function saveDatabaseToPg(db: LocalDatabase, changes: string[] = []): Promise<void> {
  const shouldSync = (colName: string) => changes.length === 0 || changes.includes(colName);

  try {
    await initializeSchema();

    await sequelize.transaction(async (t) => {
      // 1. Sincronizar usuarios
      if (shouldSync("usuarios")) {
        await UsuarioModel.destroy({ where: {}, force: true, transaction: t });
        if (db.usuarios?.length > 0) {
          await UsuarioModel.bulkCreate(db.usuarios as any[], { transaction: t });
        }
      }

      // 2. Sincronizar estudiantes
      if (shouldSync("estudiantes")) {
        await EstudianteModel.destroy({ where: {}, force: true, transaction: t });
        const studentKeys = Object.keys(db.estudiantes || {});
        if (studentKeys.length > 0) {
          const list = studentKeys.map((dni) => db.estudiantes[dni]);
          await EstudianteModel.bulkCreate(list as any[], { transaction: t });
        }
      }

      // 3. Sincronizar programas
      if (shouldSync("programas")) {
        await ProgramaModel.destroy({ where: {}, force: true, transaction: t });
        if (db.programas?.length > 0) {
          // Guardar tabla base
          await ProgramaModel.bulkCreate(db.programas as any[], { transaction: t });

          // Preparar y guardar extensiones 1-1
          const configs: any[] = [];
          const horarios: any[] = [];
          const servicios: any[] = [];
          const documentos: any[] = [];
          const anuncios: any[] = [];

          db.programas.forEach((pr) => {
            configs.push({
              programaId: pr.id,
              duracionAvisoDias: pr.duracionAvisoDias || 0,
              horaLimiteAviso: pr.horaLimiteAviso || "",
              edadMinima: pr.edadMinima || 0,
              edadMaxima: pr.edadMaxima || 0,
              grupoEtario: pr.grupoEtario || "",
              requisitos: pr.requisitos || "",
              comunicado: pr.comunicado || "",
              comunicadoCompleto: pr.comunicadoCompleto || "",
              detalleCosto: pr.detalleCosto || "",
              creadoDesdeDocumento: pr.creadoDesdeDocumento || false,
              duracionTaller: pr.duracionTaller || "",
              invitacionMasiva: pr.invitacionMasiva || false,
              alcanceInvitacionMasiva: pr.alcanceInvitacionMasiva || "",
              tipoComunicado: pr.tipoComunicado || "",
              motivoJustificacion: pr.motivoJustificacion || "",
              docente: pr.docente || pr.responsable || "",
              responsable: pr.responsable || "",
              estado: pr.estado || "",
            });

            horarios.push({
              programaId: pr.id,
              horaInicio: pr.horaInicio || "",
              horaFin: pr.horaFin || "",
              horariosPorGrupo: pr.horariosPorGrupo || [],
              tablaHorariosNivel: pr.tablaHorariosNivel || [],
            });

            servicios.push({
              programaId: pr.id,
              requiereUniforme: pr.requiereUniforme || false,
              requiereIndumentaria: pr.requiereIndumentaria || false,
              incluyeAlmuerzo: pr.incluyeAlmuerzo || false,
              horarioRecepcionAlmuerzo: pr.horarioRecepcionAlmuerzo || "",
              concesionarios: pr.concesionarios || [],
              detalleAlmuerzo: pr.detalleAlmuerzo || "",
              nivelCambridge: pr.nivelCambridge || "",
              modalidadesCambridge: pr.modalidadesCambridge || [],
              costoCiclo: pr.costoCiclo || 0,
              montoPrimerPago: pr.montoPrimerPago || 0,
              cicloI: pr.cicloI || {},
              cicloII: pr.cicloII || {},
              nombreCiclo: pr.nombreCiclo || "",
            });

            documentos.push({
              programaId: pr.id,
              plantilla: pr.plantilla || "",
              plantillaBase64: pr.plantillaBase64 || "",
              plantillaVariables: pr.plantillaVariables || [],
              plantillaValidada: pr.plantillaValidada || false,
              tipoDocumento: pr.tipoDocumento || "",
              numeroDocumento: pr.numeroDocumento || "",
              areaTematica: pr.areaTematica || "",
            });

            anuncios.push({
              programaId: pr.id,
              anuncioImagen: pr.anuncioImagen || "",
              anuncioImagenNombre: pr.anuncioImagenNombre || "",
              anuncioImagenTamano: pr.anuncioImagenTamano || 0,
              anuncioImagenComprimida: pr.anuncioImagenComprimida || false,
            });
          });

          await Promise.all([
            ProgramaConfiguracionModel.bulkCreate(configs, { transaction: t }),
            ProgramaHorarioModel.bulkCreate(horarios, { transaction: t }),
            ProgramaServicioModel.bulkCreate(servicios, { transaction: t }),
            ProgramaDocumentoModel.bulkCreate(documentos, { transaction: t }),
            ProgramaAnuncioModel.bulkCreate(anuncios, { transaction: t }),
          ]);
        }
      }

      // 4. Sincronizar inscripciones
      if (shouldSync("inscripciones")) {
        await InscripcionModel.destroy({ where: {}, force: true, transaction: t });
        if (db.inscripciones?.length > 0) {
          await InscripcionModel.bulkCreate(db.inscripciones as any[], { transaction: t });
        }
      }

      // 5. Sincronizar pagos
      if (shouldSync("pagos")) {
        await PagoModel.destroy({ where: {}, force: true, transaction: t });
        if (db.pagos?.length > 0) {
          await PagoModel.bulkCreate(db.pagos as any[], { transaction: t });
        }
      }

      // 6. Sincronizar asistencias
      if (shouldSync("asistencias")) {
        await AsistenciaModel.destroy({ where: {}, force: true, transaction: t });
        if (db.asistencias?.length > 0) {
          await AsistenciaModel.bulkCreate(db.asistencias as any[], { transaction: t });
        }
      }

      // 7. Sincronizar invitados
      if (shouldSync("invitados")) {
        await InvitadoProgramaModel.destroy({ where: {}, force: true, transaction: t });
        const list: any[] = [];
        for (const progId of Object.keys(db.invitadosPorPrograma || {})) {
          const sublist = db.invitadosPorPrograma[progId] || [];
          sublist.forEach((inv) => {
            list.push({
              programaId: progId,
              dni: inv.dni,
              nombres: inv.nombres,
              grado: inv.grado,
              seccion: inv.seccion,
              seleccion: inv.seleccion,
              nivelCambridge: inv.nivelCambridge,
            });
          });
        }
        if (list.length > 0) {
          await InvitadoProgramaModel.bulkCreate(list, { transaction: t });
        }
      }

      // 8. Sincronizar categorías
      if (shouldSync("categorias")) {
        await CategoriaModel.destroy({ where: {}, force: true, transaction: t });
        if (db.categorias?.length > 0) {
          const list = db.categorias.map((cat) => ({ id: cat, nombre: cat }));
          await CategoriaModel.bulkCreate(list, { transaction: t });
        }
      }

      // 9. Sincronizar configuración institucional
      if (shouldSync("configuracionInstitucional") && db.configuracionInstitucional) {
        await ConfiguracionModel.destroy({ where: {}, force: true, transaction: t });
        const cfg = db.configuracionInstitucional as any;
        await ConfiguracionModel.create(
          {
            id: "GLOBAL_CONFIG",
            nombreInstitucion: cfg.nombreInstitucion || "",
            periodoActivo: cfg.periodoActivo || "",
            logoUrl: cfg.logoUrl || "",
            direccion: cfg.direccion || "",
            telefono: cfg.telefono || "",
          },
          { transaction: t }
        );
      }

      // 10. Historial de Cargas e Audit Logs
      if (shouldSync("historialCargas")) {
        await HistorialCargaModel.destroy({ where: {}, force: true, transaction: t });
        if (db.historialCargas?.length > 0) {
          await HistorialCargaModel.bulkCreate(db.historialCargas as any[], { transaction: t });
        }
      }

      if (shouldSync("auditLogs")) {
        await AuditLogModel.destroy({ where: {}, force: true, transaction: t });
        if (db.auditLogs?.length > 0) {
          await AuditLogModel.bulkCreate(db.auditLogs as any[], { transaction: t });
        }
      }
    });

    console.log("✅ [DATABASE] Guardado y sincronización en PostgreSQL exitosa.");
  } catch (err) {
    console.error("❌ Error al guardar la base de datos en PostgreSQL:", err);
    throw err;
  }
}
