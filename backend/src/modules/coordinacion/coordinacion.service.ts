import { randomUUID } from "crypto";
import { getDb, saveDb } from "../../database/dbLocal.js";
import { registrarAuditoria } from "../../services/audit.service.js";
import { enviarCorreoGenerico, generarCorreoInvitacion } from "../../services/mail.service.js";
import { limpiarDni, normalizarPeriodo, parseJsonArray, parseJsonObject } from "../../services/file.service.js";
import { generarPreviewCargaExcel } from "../../services/excel.service.js";
import {
  mapDbProgramToApi,
  mapDbAsistenciaToApi,
  sincronizarPlantillaProgramaApi,
  sincronizarGradosProgramaConInvitadosApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  tieneHorariosPorGrupoApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  obtenerCamposProgramaInvitacionApi,
  obtenerPlantillaProgramaApi,
  gradoCorrespondeAlProgramaApi,
  agregarGradoProgramaDesdeAlumnoApi,
  programaListoParaPortalPadresApi,
  programaDisponibleParaGradoApi,
  obtenerGradoCompletoApi,
  mapDbEnrollmentToApi
} from "../../shared/mappers.js";

const INSTITUTIONAL_ASSET_KEYS = [
  "logoInstitucion",
  "logoCambridge",
  "firmaCoordinacion",
  "firmaDireccion",
  "selloInstitucion",
];

function normalizarConfiguracionInstitucional(valor: any = {}): any {
  const origen = (valor && typeof valor === "object" ? valor : {}) as any;
  return INSTITUTIONAL_ASSET_KEYS.reduce((acc: any, key) => {
    const item = origen[key];
    acc[key] = item && typeof item === "object"
      ? {
          nombre: String(item.nombre || ""),
          tipo: String(item.tipo || ""),
          dataUrl: String(item.dataUrl || ""),
          actualizadoEn: String(item.actualizadoEn || ""),
        }
      : null;
    return acc;
  }, {});
}

function esDiaCorrecto(horarioStr: string): boolean {
  if (!horarioStr) return false;
  
  let hoyEsp = "lunes";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      weekday: "long"
    });
    const weekdayEnglish = formatter.format(new Date()).toLowerCase();
    const mapping: Record<string, string> = {
      sunday: "domingo",
      monday: "lunes",
      tuesday: "martes",
      wednesday: "miercoles",
      thursday: "jueves",
      friday: "viernes",
      saturday: "sabado"
    };
    hoyEsp = mapping[weekdayEnglish] || "lunes";
  } catch (e) {
    const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    hoyEsp = diasSemana[new Date().getDay()] || "lunes";
  }

  const normalizar = (txt: string) => String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
    
  const horarioNorm = normalizar(horarioStr);
  const diasSemanaLista = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const diasEncontrados = diasSemanaLista.filter(dia => horarioNorm.includes(dia));
  if (diasEncontrados.length === 0) return false;
  return horarioNorm.includes(hoyEsp);
}

function limpiarCodigo(valor: any): string {
  return String(valor || "").trim().toUpperCase();
}

function normalizarTexto(valor: any): string {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mismoCodigo(a: any, b: any): boolean {
  const valorA = limpiarCodigo(a);
  const valorB = limpiarCodigo(b);
  return Boolean(valorA && valorB && valorA === valorB);
}

function normalizarIdentificadores(ids: any = {}): Record<string, string> {
  const dniVal = ids.dni || ids.dniEstudiante || ids.estudianteDni;
  const cleanDniVal = dniVal ? String(dniVal).replace(/\D/g, "").slice(0, 8) : "";
  return {
    dni: cleanDniVal,
    codigoEstudiante: limpiarCodigo(ids.codigoEstudiante || ids.codigoAlumno),
    inscripcionId: limpiarCodigo(ids.inscripcionId || ids.idInscripcion),
    pagoId: limpiarCodigo(ids.pagoId || ids.idPago),
    programaId: limpiarCodigo(ids.programaId || ids.idPrograma),
    codigoOriginal: String(ids.codigoOriginal || ids.codigo || "").trim(),
  };
}

function obtenerMinutosRestantesIngresoReciente(
  asistenciasList: any[],
  studentDni: string,
  studentCode: string,
  programId: string,
  nowMs: number = Date.now()
): number {
  if (!Array.isArray(asistenciasList)) return 0;
  const cleanDni = studentDni ? String(studentDni).replace(/\D/g, "") : "";
  const cleanCode = studentCode ? String(studentCode).trim() : "";
  let maxRestante = 0;
  asistenciasList.forEach(ast => {
    const astDni = ast.dniEstudiante ? String(ast.dniEstudiante).replace(/\D/g, "") : "";
    const astCode = ast.codigoEstudiante ? String(ast.codigoEstudiante).trim() : "";
    const coincideEstudiante = (cleanDni && astDni === cleanDni) || (cleanCode && astCode === cleanCode);
    if (!coincideEstudiante) return;
    const coincidePrograma = ast.programaId === programId;
    if (!coincidePrograma) return;
    const fechaAst = new Date(ast.fechaRegistro);
    if (isNaN(fechaAst.getTime())) return;
    const diffMs = nowMs - fechaAst.getTime();
    const limiteMs = 15 * 60 * 1000;
    if (diffMs >= 0 && diffMs < limiteMs) {
      const mins = Math.ceil((limiteMs - diffMs) / 60000);
      if (mins > maxRestante) maxRestante = mins;
    }
  });
  return maxRestante;
}

function normalizarEstadoPago(valor: any): string {
  const msg = normalizarTexto(valor);
  if (["completado", "pagado", "validado", "pago validado"].some((estado) => msg.includes(estado))) return "pagado";
  if (["cancelado", "anulado", "rechazado"].some((estado) => msg.includes(estado))) return "anulado";
  return "pendiente";
}

function resolverEstadoPago(inscripcion: any, pago: any): string {
  const estadoPago = normalizarEstadoPago(pago?.estado);
  const estadoInscripcion = normalizarEstadoPago(inscripcion?.estadoPago);
  if (estadoPago === "pagado" || estadoInscripcion === "pagado") return "pagado";
  if (estadoPago === "anulado" || estadoInscripcion === "anulado") return "anulado";
  return "pendiente";
}

function ordenarPorFecha(items: any[], campoPreferido: string = "fechaRegistro"): any[] {
  return [...items].sort((a, b) => {
    const fechaA = new Date(a?.[campoPreferido] || a?.fechaPago || a?.fecha || a?.createdAt || 0).getTime();
    const fechaB = new Date(b?.[campoPreferido] || b?.fechaPago || b?.fecha || b?.createdAt || 0).getTime();
    return fechaB - fechaA;
  });
}

function obtenerHorarioDeInscripcion(db: any, inscripcion: any, estudiante: any): string {
  const prog = (db.programas || []).find((p: any) => p.id === inscripcion?.programaId);
  
  if (prog && tieneHorariosPorGrupoApi(prog)) {
    const gradoEst = inscripcion?.gradoEstudiante 
      || inscripcion?.grado 
      || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "");
    const horarioDinamico = resolverHorarioPorGradoApi(prog, gradoEst);
    if (horarioDinamico) return horarioDinamico;
  }
  
  if (inscripcion?.horario && !inscripcion.horario.includes("no configurado") && !inscripcion.horario.includes("No registrado")) {
    return inscripcion.horario;
  }
  
  if (!prog) return "";
  
  const gradoEst = inscripcion?.gradoEstudiante 
    || inscripcion?.grado 
    || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "");
    
  return resolverHorarioPorGradoApi(prog, gradoEst)
    || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario)
    || "";
}

function nombreProgramaValido(valor: any): string {
  const texto = String(valor || "").trim();
  return texto && normalizarTexto(texto) !== "sin programa" ? texto : "";
}

function buscarProgramaPorNombre(db: any, nombre: any): any {
  const nombreNormalizado = normalizarTexto(nombreProgramaValido(nombre));
  if (!nombreNormalizado) return null;
  return (db.programas || []).find((programa: any) =>
    normalizarTexto(programa.nombre || programa.programa || programa.nombre_programa) === nombreNormalizado
  ) || null;
}

function resolverProgramaAsociado(db: any, inscripcion: any = {}, estudiante: any = null, pago: any = null, horario: string = ""): any {
  const programas = db.programas || [];
  
  const porId = programas.find((programa: any) =>
    mismoCodigo(programa.id, inscripcion.programaId) ||
    mismoCodigo(programa.id, pago?.programaId) ||
    mismoCodigo(programa.programaId, inscripcion.programaId) ||
    mismoCodigo(programa.programaId, pago?.programaId)
  );
  if (porId) return porId;

  const porNombre = buscarProgramaPorNombre(db, inscripcion.programa) ||
    buscarProgramaPorNombre(db, inscripcion.programaNombre) ||
    buscarProgramaPorNombre(db, pago?.programa) ||
    buscarProgramaPorNombre(db, pago?.programaNombre);
  if (porNombre) return porNombre;

  const dni = String(inscripcion.dniEstudiante || pago?.dniEstudiante || pago?.estudianteDni || estudiante?.dni || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  const inscripcionesDni = (db.inscripciones || [])
    .filter((item: any) => {
      const itemDni = String(item.dniEstudiante || "").replace(/\D/g, "").slice(0, 8);
      return dni && itemDni === dni && normalizarTexto(item.estadoInscripcion) !== "anulada";
    })
    .map((item: any) => {
      const itemPago = encontrarPagoInscripcion(db, item, { dni });
      const itemPrograma = programas.find((programa: any) =>
        mismoCodigo(programa.id, item.programaId) ||
        normalizarTexto(programa.nombre) === normalizarTexto(nombreProgramaValido(item.programa))
      );
      return { item, itemPago, itemPrograma };
    })
    .filter((item: any) => item.itemPrograma);

  const pagada = inscripcionesDni.find(({ item, itemPago }: any) => resolverEstadoPago(item, itemPago) === "pagado");
  if (pagada?.itemPrograma) return pagada.itemPrograma;
  if (inscripcionesDni[0]?.itemPrograma) return inscripcionesDni[0].itemPrograma;

  const pagoDni = ordenarPorFecha((db.pagos || []).filter((item: any) => {
    const itemDni = String(item.dniEstudiante || item.estudianteDni || "").replace(/\D/g, "").slice(0, 8);
    return dni && itemDni === dni && !["cancelado", "anulado", "rechazado"].includes(normalizarTexto(item.estado));
  }), "fechaPago").find((item: any) => item.programaId || nombreProgramaValido(item.programa || item.programaNombre));
  const programaPago = pagoDni
    ? programas.find((programa: any) => mismoCodigo(programa.id, pagoDni.programaId)) || buscarProgramaPorNombre(db, pagoDni.programa || pagoDni.programaNombre)
    : null;
  if (programaPago) return programaPago;

  const horarioNormalizado = normalizarTexto(horario || inscripcion.horario);
  if (horarioNormalizado) {
    const gradoEstudiante = inscripcion.gradoEstudiante || inscripcion.grado || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "");
    const porHorario = programas.find((programa: any) => {
      const horarioPrograma = resolverHorarioPorGradoApi(programa, gradoEstudiante) ||
        (tieneHorariosPorGrupoApi(programa) ? "" : programa.horario);
      const horarioProgNormalizado = normalizarTexto(horarioPrograma);
      return horarioProgNormalizado && (horarioProgNormalizado === horarioNormalizado || horarioProgNormalizado.includes(horarioProgNormalizado) || horarioProgNormalizado.includes(horarioNormalizado));
    });
    if (porHorario) return porHorario;
  }

  return null;
}

function encontrarPagoInscripcion(db: any, inscripcion: any, ids: any = {}): any {
  const pagos = db.pagos || [];
  if (ids.pagoId) {
    const pagoDirecto = pagos.find((pago: any) => mismoCodigo(pago.id, ids.pagoId));
    if (pagoDirecto) return pagoDirecto;
  }
  if (inscripcion?.pagoId) {
    const pagoPorId = pagos.find((pago: any) => mismoCodigo(pago.id, inscripcion.pagoId));
    if (pagoPorId) return pagoPorId;
  }
  const pagoPorInscripcionValido = pagos.find((pago: any) =>
    pago.inscripcionId && inscripcion?.id && mismoCodigo(pago.inscripcionId, inscripcion.id) &&
    !["cancelado", "anulado", "rechazado"].includes(String(pago.estado || "").toLowerCase().trim())
  );
  if (pagoPorInscripcionValido) return pagoPorInscripcionValido;

  const pagoPorInscripcion = pagos.find((pago: any) =>
    pago.inscripcionId && inscripcion?.id && mismoCodigo(pago.inscripcionId, inscripcion.id)
  );
  if (pagoPorInscripcion) return pagoPorInscripcion;
  const coincidencias = pagos.filter((pago: any) => {
    const pagoDni = pago.dniEstudiante || pago.estudianteDni;
    const cleanPagoDni = pagoDni ? String(pagoDni).replace(/\D/g, "").slice(0, 8) : "";
    const cleanInsDni = inscripcion?.dniEstudiante ? String(inscripcion.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
    const mismoDni = cleanPagoDni === cleanInsDni;
    const mismoPrograma = mismoCodigo(pago.programaId, inscripcion?.programaId)
      || normalizarTexto(pago.programa || pago.programaNombre) === normalizarTexto(inscripcion?.programa);
    return mismoDni && mismoPrograma;
  });
  const coincidenciasOrdenadas = ordenarPorFecha(coincidencias, "fechaPago");
  const coincidenciaValida = coincidenciasOrdenadas.find((pago) =>
    !["cancelado", "anulado", "rechazado"].includes(String(pago.estado || "").toLowerCase().trim())
  );
  return coincidenciaValida || coincidenciasOrdenadas[0] || null;
}

function buscarEstudiante(db: any, ids: any, inscripcion: any): any {
  let estudiantes: any[] = [];
  if (Array.isArray(db.estudiantes)) estudiantes = db.estudiantes;
  else if (db.estudiantes && typeof db.estudiantes === "object") estudiantes = Object.values(db.estudiantes);
  const insDni = inscripcion?.dniEstudiante ? String(inscripcion.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
  const dni = ids.dni || insDni;
  const codigo = ids.codigoEstudiante || inscripcion?.codigoEstudiante || "";
  return estudiantes.find((estudiante: any) => {
    const estDni = estudiante.dni ? String(estudiante.dni).replace(/\D/g, "").slice(0, 8) : "";
    return estDni === dni;
  }) || estudiantes.find((estudiante: any) => codigo && mismoCodigo(estudiante.codigoEstudiante, codigo)) || null;
}

function buscarInscripcion(db: any, ids: any): any {
  const inscripciones = (db.inscripciones || []).filter((item: any) => normalizarTexto(item.estadoInscripcion) !== "anulada");
  const pagos = db.pagos || [];
  if (ids.inscripcionId) {
    const directa = inscripciones.find((item: any) => mismoCodigo(item.id, ids.inscripcionId));
    if (directa) return directa;
  }
  if (ids.pagoId) {
    const pago = pagos.find((item: any) => mismoCodigo(item.id, ids.pagoId));
    if (pago?.inscripcionId) {
      const directa = inscripciones.find((item: any) => mismoCodigo(item.id, pago.inscripcionId));
      if (directa) return directa;
    }
  }
  const candidatas = inscripciones.filter((item: any) => coincideInscripcion(item, ids));
  if (candidatas.length === 0) return null;

  if (ids.programaId) {
    const porPrograma = candidatas.filter((item: any) => mismoCodigo(item.programaId, ids.programaId));
    if (porPrograma.length) return ordenarPorFecha(porPrograma)[0] || null;
  }

  const candidatasHoy = candidatas.filter((item: any) => {
    const estudiante = buscarEstudiante(db, ids, item);
    const horario = obtenerHorarioDeInscripcion(db, item, estudiante);
    return esDiaCorrecto(horario);
  });
  if (candidatasHoy.length > 0) {
    const paid = candidatasHoy.filter((ins: any) => {
      const p = encontrarPagoInscripcion(db, ins, ids);
      const estNorm = resolverEstadoPago(ins, p);
      return estNorm === "pagado";
    });
    if (paid.length > 0) return ordenarPorFecha(paid)[0];

    const processing = candidatasHoy.filter((ins: any) => {
      const p = encontrarPagoInscripcion(db, ins, ids);
      return p && (p.estado === "Por Verificar" || p.estado === "Por verificar" || p.estado === "Pago en proceso");
    });
    if (processing.length > 0) return ordenarPorFecha(processing)[0];

    return ordenarPorFecha(candidatasHoy)[0];
  }

  const paid = candidatas.filter((ins: any) => {
    const p = encontrarPagoInscripcion(db, ins, ids);
    const estNorm = resolverEstadoPago(ins, p);
    return estNorm === "pagado";
  });
  if (paid.length > 0) return ordenarPorFecha(paid)[0];

  const processing = candidatas.filter((ins: any) => {
    const p = encontrarPagoInscripcion(db, ins, ids);
    return p && (p.estado === "Por Verificar" || p.estado === "Por verificar" || p.estado === "Pago en proceso");
  });
  if (processing.length > 0) return ordenarPorFecha(processing)[0];

  return ordenarPorFecha(candidatas)[0] || null;
}

function coincideInscripcion(inscripcion: any, ids: any): boolean {
  if (!inscripcion) return false;
  const insDni = inscripcion.dniEstudiante ? String(inscripcion.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
  if (ids.dni && insDni === ids.dni) return true;
  if (ids.codigoEstudiante && mismoCodigo(inscripcion.codigoEstudiante, ids.codigoEstudiante)) return true;
  if (ids.codigoOriginal && mismoCodigo(inscripcion.id, ids.codigoOriginal)) return true;
  if (ids.codigoOriginal && mismoCodigo(inscripcion.codigoEstudiante, ids.codigoOriginal)) return true;
  return false;
}

interface RespuestaInscripcionParams {
  inscripcion: any;
  estudiante: any;
  pago: any;
  programa: string;
  programaId: string;
  estadoAcceso: string;
  estadoPago: string;
  accesoPermitido: boolean;
  mensajeAcceso: string;
  accion: string;
  color: string;
  horario: string;
}

function crearRespuestaInscripcion({
  inscripcion,
  estudiante,
  pago,
  programa,
  programaId,
  estadoAcceso,
  estadoPago,
  accesoPermitido,
  mensajeAcceso,
  accion,
  color,
  horario,
}: RespuestaInscripcionParams): any {
  const programaValido = (valor: any) => {
    const texto = String(valor || "").trim();
    return texto && texto.toLowerCase() !== "sin programa" ? texto : "";
  };
  return {
    dni: inscripcion.dniEstudiante || estudiante?.dni || pago?.dniEstudiante || pago?.estudianteDni || "",
    codigoEstudiante: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombres: inscripcion.nombresEstudiante || estudiante?.nombres || pago?.nombresEstudiante || pago?.estudianteNombre || "Estudiante",
    grado: inscripcion.gradoEstudiante || estudiante?.grado || "",
    seccion: inscripcion.seccionEstudiante || estudiante?.seccion || "",
    programa: programaValido(programa) || programaValido(inscripcion.programa) || programaValido(pago?.programa) || programaValido(pago?.programaNombre) || "Sin programa",
    programaId: programaId || inscripcion.programaId || pago?.programaId || "",
    horario: horario || inscripcion.horario || "Horario no registrado",
    inscripcionId: inscripcion.id || "",
    estadoInscripcion: inscripcion.estadoInscripcion || "",
    estadoPago,
    estadoAcceso,
    accesoPermitido,
    mensajeAcceso,
    accion,
    color,
    pagoId: pago?.id || inscripcion.pagoId || "",
    fechaPago: pago?.fechaPago || pago?.fecha || inscripcion.fechaPago || "",
    monto: Number(pago?.monto ?? inscripcion.costo ?? 0),
  };
}

function crearRespuestaNoRegistrado(ids: any, estudiante: any): any {
  return {
    dni: ids.dni || estudiante?.dni || "",
    codigoEstudiante: ids.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombres: estudiante?.nombres || ids.codigoOriginal || "Codigo no registrado",
    grado: estudiante?.grado || "",
    seccion: estudiante?.seccion || "",
    programa: "Sin inscripcion activa",
    programaId: "",
    horario: "No registrado",
    inscripcionId: "",
    estadoInscripcion: "No registrado",
    estadoPago: "No registrado",
    estadoAcceso: "no_registrado",
    accesoPermitido: false,
    mensajeAcceso: "No registrado",
    accion: "No esta registrado en un programa activo. Verificar en Asistente antes de permitir el ingreso.",
    color: "rojo",
    pagoId: "",
    fechaPago: "",
    monto: 0,
  };
}

function resolverValidacion(db: any, identificadores: any = {}): any {
  const ids = normalizarIdentificadores(identificadores);
  const inscripcion = buscarInscripcion(db, ids);
  const estudiante = buscarEstudiante(db, ids, inscripcion);
  
  if (!inscripcion) {
    const studentDni = ids.dni || (estudiante?.dni ? String(estudiante.dni).replace(/\D/g, "").slice(0, 8) : "");
    let programaPreInscrito = null;
    
    if (studentDni) {
      for (const [progId, listaInvitados] of Object.entries(db.invitadosPorPrograma || {}) as any) {
        const esInvitado = (listaInvitados || []).some((inv: any) => {
          const invDni = String(inv?.dni || "").replace(/\D/g, "").slice(0, 8);
          const targetDniStr = String(studentDni || "").replace(/\D/g, "").slice(0, 8);
          return invDni === targetDniStr && invDni !== "";
        });
        if (esInvitado) {
          const prog = (db.programas || []).find((p: any) => p.id === progId);
          if (prog) {
            programaPreInscrito = prog;
            break;
          }
        }
      }
    }
    
    if (programaPreInscrito) {
      return {
        dni: studentDni || ids.codigoOriginal || "",
        codigoEstudiante: ids.codigoEstudiante || estudiante?.codigoEstudiante || "",
        nombres: estudiante?.nombres || ids.codigoOriginal || "Estudiante",
        grado: estudiante?.grado || "",
        seccion: estudiante?.seccion || "",
        programa: programaPreInscrito.nombre,
        programaId: programaPreInscrito.id,
        horario: programaPreInscrito.horario || "No registrado",
        inscripcionId: "",
        estadoInscripcion: "Pre-inscrito",
        estadoPago: "Pendiente",
        estadoAcceso: "pre_inscrito",
        accesoPermitido: false,
        mensajeAcceso: "No inscrito",
        accion: `No está inscrito. Acercarse a Caja o Asistente para proceder con la matrícula en ${programaPreInscrito.nombre}.`,
        color: "rojo",
        pagoId: "",
        fechaPago: "",
        monto: Number(programaPreInscrito.costo || 0),
      };
    }
    
    return crearRespuestaNoRegistrado(ids, estudiante);
  }
  
  const pago = encontrarPagoInscripcion(db, inscripcion, ids);
  const estadoNormalizado = resolverEstadoPago(inscripcion, pago);
  const horario = obtenerHorarioDeInscripcion(db, inscripcion, estudiante);
  
  const dbProg = resolverProgramaAsociado(db, inscripcion, estudiante, pago, horario);
  const programaNombre = nombreProgramaValido(dbProg?.nombre) ||
    nombreProgramaValido(inscripcion.programa) ||
    nombreProgramaValido(pago?.programa) ||
    nombreProgramaValido(pago?.programaNombre) ||
    "Sin programa";
  const programaId = dbProg?.id || inscripcion.programaId || pago?.programaId || "";

  if (estadoNormalizado === "pagado") {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const hoyStr = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

    if (inscripcion.fechaInicio && hoyStr < inscripcion.fechaInicio) {
      const fechaFmt = inscripcion.fechaInicio.split("-").reverse().join("/");
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Taller no iniciado",
        accion: `El taller aún no ha iniciado. La fecha de inicio es el ${fechaFmt}.`,
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }

    if (inscripcion.fechaFin && hoyStr > inscripcion.fechaFin) {
      const fechaFmt = inscripcion.fechaFin.split("-").reverse().join("/");
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Taller finalizado",
        accion: `El taller ya ha finalizado (finalizó el ${fechaFmt}).`,
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }

    if (!esDiaCorrecto(horario)) {
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Hoy no le toca este taller",
        accion: "El alumno está matriculado en este taller, pero las clases corresponden a otros días de la semana.",
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }

    const minsRestantes = obtenerMinutosRestantesIngresoReciente(
      db.asistencias || [],
      ids.dni || estudiante?.dni,
      ids.codigoEstudiante || estudiante?.codigoEstudiante,
      inscripcion.programaId
    );
    if (minsRestantes > 0) {
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "ya_registrado",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Ya registrado",
        accion: `Este estudiante ya registró su ingreso hace poco. Podrá registrarse nuevamente en ${minsRestantes} minuto(s).`,
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }
    
    return crearRespuestaInscripcion({
      inscripcion,
      estudiante,
      pago,
      estadoAcceso: "pagado",
      estadoPago: "Pagado",
      accesoPermitido: true,
      mensajeAcceso: "Pago validado",
      accion: "Ingreso permitido.",
      color: "verde",
      horario,
      programa: programaNombre,
      programaId,
    });
  }
  
  if (estadoNormalizado === "anulado") {
    return crearRespuestaInscripcion({
      inscripcion,
      estudiante,
      pago,
      estadoAcceso: "anulado",
      estadoPago: "Anulado",
      accesoPermitido: false,
      mensajeAcceso: "Pago anulado",
      accion: "Registro anulado. Verificar en Asistente o Cajera antes de permitir el ingreso.",
      color: "rojo",
      horario,
      programa: programaNombre,
      programaId,
    });
  }
  
  const esProceso = pago && (pago.estado === "Por Verificar" || pago.estado === "Por verificar" || pago.estado === "Pago en proceso");
  return crearRespuestaInscripcion({
    inscripcion,
    estudiante,
    pago,
    estadoAcceso: "pendiente",
    estadoPago: esProceso ? "Pago en proceso" : "Pendiente",
    accesoPermitido: false,
    mensajeAcceso: esProceso ? "Pago en proceso" : "Pago pendiente",
    accion: esProceso
      ? "Tiene un pago en proceso de verificación. Debe acercarse a Caja para su aprobación."
      : "Falta pagar. Debe acercarse a Caja para regularizar el pago.",
    color: "rojo",
    horario,
    programa: programaNombre,
    programaId,
  });
}

function resolverValidacionPorNombre(db: any, nombreQuery: string, programaId: string = ""): any {
  const queryNormalizada = normalizarTexto(nombreQuery);
  if (queryNormalizada.length < 3) {
    throw new Error("El nombre de busqueda debe tener al menos 3 caracteres.");
  }
  const inscripciones = (db.inscripciones || []).filter((item: any) => normalizarTexto(item.estadoInscripcion) !== "anulada");
  let matchesInscripcion = inscripciones.filter((ins: any) =>
    normalizarTexto(ins.nombresEstudiante).includes(queryNormalizada)
  );
  if (programaId) {
    matchesInscripcion = matchesInscripcion.filter((ins: any) => mismoCodigo(ins.programaId, programaId));
  }
  const resultadosInscripciones = matchesInscripcion.map((ins: any) => {
    const ids = normalizarIdentificadores({
      dni: ins.dniEstudiante,
      codigoEstudiante: ins.codigoEstudiante,
      inscripcionId: ins.id,
      programaId: ins.programaId
    });
    try {
      return resolverValidacion(db, ids);
    } catch {
      return {
        dni: ins.dniEstudiante,
        codigoEstudiante: ins.codigoEstudiante,
        nombres: ins.nombresEstudiante,
        grado: ins.gradoEstudiante || "",
        seccion: ins.seccionEstudiante || "",
        programa: ins.programa || "",
        horario: ins.horario || "",
        estadoAcceso: "no_registrado",
        accesoPermitido: false,
        inscripcionId: ins.id
      };
    }
  });
  let resultadosEstudiantes: any[] = [];
  if (!programaId) {
    let estudiantes: any[] = [];
    if (Array.isArray(db.estudiantes)) estudiantes = db.estudiantes;
    else if (db.estudiantes && typeof db.estudiantes === "object") estudiantes = Object.values(db.estudiantes);
    const dniConInscripcion = new Set(matchesInscripcion.map((ins: any) => {
      return ins.dniEstudiante ? String(ins.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
    }));
    const matchesEstudiante = estudiantes.filter((est: any) => {
      const nomCompleto = `${est.nombres || ""} ${est.apellidos || ""}`;
      const estDni = est.dni ? String(est.dni).replace(/\D/g, "").slice(0, 8) : "";
      return normalizarTexto(nomCompleto).includes(queryNormalizada) && !dniConInscripcion.has(estDni);
    });
    resultadosEstudiantes = matchesEstudiante.map((est: any) => {
      const ids = normalizarIdentificadores({
        dni: est.dni,
        codigoEstudiante: est.codigoEstudiante
      });
      return resolverValidacion(db, ids);
    });
  }
  const todosResultados = [...resultadosInscripciones, ...resultadosEstudiantes];
  if (todosResultados.length === 0) {
    throw new Error(`No se encontro ningun estudiante que coincida con "${nombreQuery}".`);
  }
  if (todosResultados.length === 1) {
    return todosResultados[0];
  }
  return { isMultiple: true, matches: todosResultados };
}

function extraerDesdeJson(texto: string): any {
  try {
    const json = JSON.parse(texto);
    if (!json || typeof json !== "object") return null;
    return idsDesdeObjeto(json);
  } catch {
    return null;
  }
}

function extraerDesdeUrl(texto: string): any {
  try {
    const url = new URL(texto);
    const params = Object.fromEntries(url.searchParams.entries());
    const segmentos = url.pathname.split("/").filter(Boolean).join(" ");
    return idsDesdeObjeto({ ...params, codigo: `${segmentos} ${url.hash || ""}` });
  } catch {
    return null;
  }
}

function idsDesdeObjeto(obj: any = {}): any {
  const codigo = obj.codigo || obj.code || obj.qr || obj.token || "";
  const textoExtendido = [
    codigo,
    obj.id,
    obj.path,
    obj.payload,
    obj.inscripcion,
    obj.registro,
  ].filter(Boolean).join(" ");
  return {
    dni: obj.dni || obj.dniEstudiante || obj.estudianteDni || textoExtendido.match(/\b\d{8}\b/)?.[0] || "",
    codigoEstudiante: obj.codigoEstudiante || obj.codigoAlumno || textoExtendido.match(/\b(?:EST|EXT)-[A-Z0-9-]+\b/i)?.[0] || "",
    inscripcionId: obj.inscripcionId || obj.idInscripcion || obj.registroId || textoExtendido.match(/\bINS-[A-Z0-9-]+\b/i)?.[0] || "",
    pagoId: obj.pagoId || obj.idPago || textoExtendido.match(/\bPAG-[A-Z0-9-]+\b/i)?.[0] || "",
    programaId: obj.programaId || obj.idPrograma || "",
  };
}

function extraerIdentificadoresCodigo(codigo: any): Record<string, string> {
  const texto = String(codigo || "").trim();
  const ids: any = { codigoOriginal: texto };
  if (!texto) return ids;
  const desdeJson = extraerDesdeJson(texto);
  if (desdeJson) return normalizarIdentificadores({ ...ids, ...desdeJson });
  const desdeUrl = extraerDesdeUrl(texto);
  if (desdeUrl) return normalizarIdentificadores({ ...ids, ...desdeUrl });
  const dni = texto.match(/\b\d{8}\b/)?.[0] || "";
  const inscripcionId = texto.match(/\bINS-[A-Z0-9-]+\b/i)?.[0] || "";
  const pagoId = texto.match(/\bPAG-[A-Z0-9-]+\b/i)?.[0] || "";
  const codigoEstudiante = texto.match(/\b(?:EST|EXT)-[A-Z0-9-]+\b/i)?.[0] || "";
  return normalizarIdentificadores({
    ...ids,
    dni,
    inscripcionId,
    pagoId,
    codigoEstudiante,
  });
}

function buscarInscripcionAsistencia(db: any, asistencia: any = {}, programaId: string = ""): any {
  const dni = asistencia.dniEstudiante || asistencia.dni || "";
  const programaNombre = normalizarTextoApi(asistencia.programa);
  return (db.inscripciones || []).find((item: any) => asistencia.inscripcionId && item.id === asistencia.inscripcionId)
    || (db.inscripciones || []).find((item: any) =>
      dni &&
      item.dniEstudiante === dni &&
      (
        (programaId && item.programaId === programaId) ||
        (asistencia.programaId && item.programaId === asistencia.programaId) ||
        (programaNombre && normalizarTextoApi(item.programa) === programaNombre)
      )
    )
    || null;
}

function enriquecerAsistenciaPrograma(db: any, asistencia: any = {}, programaId: string = ""): any {
  const inscripcion = buscarInscripcionAsistencia(db, asistencia, programaId);
  const estudiante = db.estudiantes?.[asistencia.dniEstudiante || inscripcion?.dniEstudiante] || null;
  const programa = (db.programas || []).find((item: any) => item.id === (inscripcion?.programaId || asistencia.programaId || programaId))
    || (db.programas || []).find((item: any) => normalizarTextoApi(item.nombre) === normalizarTextoApi(inscripcion?.programa || asistencia.programa))
    || null;
  const gradoEstudiante = inscripcion?.gradoEstudiante
    || inscripcion?.grado
    || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "")
    || "";
  const horario = asistencia.horario
    || inscripcion?.horario
    || resolverHorarioPorGradoApi(programa, gradoEstudiante)
    || (programa && tieneHorariosPorGrupoApi(programa) ? "Horario no configurado para este grado" : programa?.horario)
    || "";

  return {
    ...asistencia,
    inscripcionId: asistencia.inscripcionId || inscripcion?.id || "",
    dniEstudiante: asistencia.dniEstudiante || inscripcion?.dniEstudiante || estudiante?.dni || "",
    codigoEstudiante: asistencia.codigoEstudiante || inscripcion?.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombresEstudiante: asistencia.nombresEstudiante
      || inscripcion?.nombresEstudiante
      || (estudiante ? `${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim() : ""),
    programaId: asistencia.programaId || inscripcion?.programaId || programaId || "",
    programa: asistencia.programa || inscripcion?.programa || programa?.nombre || "",
    horario,
    estadoPago: asistencia.estadoPago || inscripcion?.estadoPago || "Pendiente",
  };
}

function normalizeIncomingProgram(body: any = {}): any {
  const result = { ...body };
  
  if (body.nombre_programa !== undefined) {
    result.nombre = body.nombre_programa;
    delete result.nombre_programa;
  }
  if (body.fecha_inicio !== undefined) {
    result.fechaInicio = body.fecha_inicio;
    delete result.fecha_inicio;
  }
  if (body.fecha_fin !== undefined) {
    result.fechaFin = body.fecha_fin;
    delete result.fecha_fin;
  }
  if (body.monto !== undefined) {
    result.costo = body.monto;
    delete result.monto;
  }
  if (body.grados !== undefined) {
    result.gradosAplicables = body.grados;
    delete result.grados;
  }
  if (body.modalidad_cobro !== undefined) {
    result.modalidadCobro = body.modalidad_cobro;
    delete result.modalidad_cobro;
  }
  if (body.requiere_uniforme !== undefined) {
    result.requiereUniforme = Boolean(body.requiere_uniforme);
    delete result.requiere_uniforme;
  }
  if (body.comunicado_completo !== undefined) {
    result.comunicadoCompleto = body.comunicado_completo;
    delete result.comunicado_completo;
  }
  if (body.detalle_costo !== undefined) {
    result.detalleCosto = body.detalle_costo;
    delete result.detalle_costo;
  }
  if (body.detalle_almuerzo !== undefined) {
    result.detalleAlmuerzo = body.detalle_almuerzo;
    delete result.detalle_almuerzo;
  }
  if (body.tipo_comunicado !== undefined) {
    result.tipoComunicado = body.tipo_comunicado;
    delete result.tipo_comunicado;
  }
  if (body.tipo_documento !== undefined) {
    result.tipoDocumento = body.tipo_documento;
    delete result.tipo_documento;
  }
  if (body.numero_documento !== undefined) {
    result.numeroDocumento = body.numero_documento;
    delete result.numero_documento;
  }
  if (body.area_tematica !== undefined) {
    result.areaTematica = body.area_tematica;
    delete result.area_tematica;
  }
  if (body.area__tematica !== undefined) {
    result.areaTematica = body.area__tematica;
    delete result.area__tematica;
  }

  return result;
}

export class CoordinacionService {
  async getCategorias() {
    const db = await getDb();
    return db.categorias || [];
  }

  async crearCategoria(nombre: string) {
    const db = await getDb();
    db.categorias = db.categorias || [];
    if (!db.categorias.includes(nombre)) {
      db.categorias.push(nombre);
      await saveDb(db);
    }
    return db.categorias;
  }

  async eliminarCategoria(nombre: string) {
    const db = await getDb();
    db.categorias = (db.categorias || []).filter((c: string) => c !== nombre);
    await saveDb(db);
    return db.categorias;
  }

  async getConfiguracionInstitucional() {
    const db = await getDb();
    return normalizarConfiguracionInstitucional(db.configuracionInstitucional);
  }

  async updateConfiguracionInstitucional(operatorUsername: string, data: any) {
    const db = await getDb();
    db.configuracionInstitucional = normalizarConfiguracionInstitucional(data);
    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "CONFIGURACION_EDITAR");
    return db.configuracionInstitucional;
  }

  async getProgramas(periodo: string) {
    const db = await getDb();
    const list = db.programas || [];
    if (periodo) {
      const period = normalizarPeriodoApi(periodo);
      return list.filter((p: any) => normalizarPeriodoApi(p.periodo) === period).map(mapDbProgramToApi);
    }
    return list.map(mapDbProgramToApi);
  }

  async getProgramaById(id: string) {
    const db = await getDb();
    const prog = (db.programas || []).find((p: any) => p.id === id);
    if (!prog) {
      throw new Error("Programa no encontrado.");
    }
    return mapDbProgramToApi(prog);
  }

  async crearPrograma(operatorUsername: string, body: any) {
    const db = await getDb();
    const pid = `PRG-${String(db.nextProgramaId || 100).padStart(3, "0")}`;
    db.nextProgramaId = (db.nextProgramaId || 100) + 1;

    const normalizedBody = normalizeIncomingProgram(body);

    const nuevo = {
      id: pid,
      ...normalizedBody,
      costo: Number(normalizedBody.costo || 0),
      cupos: Number(normalizedBody.cupos || 0),
      cuposOcupados: 0,
      gradosAplicables: normalizedBody.gradosAplicables || [],
      horariosPorGrupo: normalizedBody.horariosPorGrupo || [],
      tablaHorariosNivel: normalizedBody.tablaHorariosNivel || [],
      estado: normalizedBody.estado || "Borrador",
      periodo: normalizedBody.periodo || "escolar"
    };

    db.programas = db.programas || [];
    db.programas.push(nuevo);
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_CREAR", { programaId: pid, nombre: nuevo.nombre });

    return mapDbProgramToApi(nuevo);
  }

  async subirDocumentoPrograma(operatorUsername: string, body: any) {
    const { id, plantillaBase64, plantillaVariables, plantillaNombre, plantilla } = body;
    const db = await getDb();

    if (!id) {
      // Crear nuevo programa desde documento
      const pid = `PRG-${String(db.nextProgramaId || 100).padStart(3, "0")}`;
      db.nextProgramaId = (db.nextProgramaId || 100) + 1;

      const nuevo = {
        id: pid,
        nombre: body.nombre_programa || body.nombre || "Taller desde Documento",
        categoria: body.categoria || "General",
        fechaInicio: body.fecha_inicio || new Date().toISOString().split("T")[0],
        fechaFin: body.fecha_fin || new Date().toISOString().split("T")[0],
        costo: Number(body.monto || body.costo || 0),
        cupos: Number(body.cupos || 0),
        cuposOcupados: 0,
        gradosAplicables: body.grados || [],
        horariosPorGrupo: [],
        tablaHorariosNivel: [],
        estado: "Borrador",
        periodo: body.periodo || "escolar",
        modalidadCobro: body.modalidad_cobro || "Mensual",
        requiereUniforme: Boolean(body.requiere_uniforme),
        horario: body.horario || "Por definir",
        grupo: body.grupo || "Por definir",
        dias: body.dias || [],
        plantilla: plantillaNombre || plantilla || "",
        plantillaBase64: plantillaBase64 || "",
        plantillaVariables: plantillaVariables || [],
        plantillaValidada: true,
        creadoDesdeDocumento: true,
        comunicado: body.comunicado || "",
        comunicadoCompleto: body.comunicado_completo || "",
        requisitos: body.requisitos || "",
        detalleCosto: body.detalle_costo || "",
        detalleAlmuerzo: body.detalle_almuerzo || "",
        concesionarios: body.concesionarios || "",
        tipoComunicado: body.tipo_comunicado || body.tipoComunicado || "",
        tipoDocumento: body.tipo_documento || body.tipoDocumento || "",
        numeroDocumento: body.numero_documento || body.numeroDocumento || "",
        areaTematica: body.area_tematica || body.areaTematica || ""
      };

      db.programas = db.programas || [];
      db.programas.push(nuevo);
      await saveDb(db);

      await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_CREAR", { programaId: pid, nombre: nuevo.nombre });

      return mapDbProgramToApi(nuevo);
    }

    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    db.programas[idx].plantillaBase64 = plantillaBase64;
    db.programas[idx].plantillaVariables = plantillaVariables || [];
    db.programas[idx].plantilla = plantillaNombre || plantilla || db.programas[idx].plantilla || "";
    db.programas[idx].plantillaNombre = plantillaNombre || plantilla || "";
    db.programas[idx].plantillaValidada = true;
    db.programas[idx].creadoDesdeDocumento = true;

    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_PLANTILLA", { programaId: id });

    return mapDbProgramToApi(db.programas[idx]);
  }

  async updatePrograma(operatorUsername: string, id: string, body: any) {
    const db = await getDb();
    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    const anterior = db.programas[idx];
    const normalizedBody = normalizeIncomingProgram(body);
    const updated = {
      ...anterior,
      ...normalizedBody,
      costo: Number(normalizedBody.costo !== undefined ? normalizedBody.costo : (anterior.costo || 0)),
      cupos: Number(normalizedBody.cupos !== undefined ? normalizedBody.cupos : (anterior.cupos || 0)),
      gradosAplicables: normalizedBody.gradosAplicables || anterior.gradosAplicables || [],
      horariosPorGrupo: normalizedBody.horariosPorGrupo || anterior.horariosPorGrupo || [],
      tablaHorariosNivel: normalizedBody.tablaHorariosNivel || anterior.tablaHorariosNivel || [],
      tipoComunicado: normalizedBody.tipoComunicado !== undefined ? normalizedBody.tipoComunicado : anterior.tipoComunicado,
      tipoDocumento: normalizedBody.tipoDocumento !== undefined ? normalizedBody.tipoDocumento : anterior.tipoDocumento,
      numeroDocumento: normalizedBody.numeroDocumento !== undefined ? normalizedBody.numeroDocumento : anterior.numeroDocumento,
      areaTematica: normalizedBody.areaTematica !== undefined ? normalizedBody.areaTematica : anterior.areaTematica
    };

    db.programas[idx] = updated;
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_EDITAR", { programaId: id });

    return mapDbProgramToApi(updated);
  }

  async updateProgramaEstado(operatorUsername: string, id: string, estado: string) {
    const db = await getDb();
    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    const anterior = db.programas[idx].estado;
    db.programas[idx].estado = estado;
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_ESTADO", {
      programaId: id,
      estadoAnterior: anterior,
      estadoNuevo: estado
    });

    return mapDbProgramToApi(db.programas[idx]);
  }

  async deletePrograma(operatorUsername: string, id: string) {
    const db = await getDb();
    db.programas = (db.programas || []).filter((p: any) => p.id !== id);
    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_ELIMINAR", { programaId: id });
    return true;
  }

  async getInvitados(programaId: string) {
    const db = await getDb();
    return db.invitadosPorPrograma?.[programaId] || [];
  }

  async getMatriculados(programaId: string) {
    const db = await getDb();
    const list = (db.inscripciones || [])
      .filter((item: any) => item.programaId === programaId && item.estadoInscripcion !== "Anulada")
      .map((item: any) => mapDbEnrollmentToApi(item, db));
    return list;
  }

  async getAsistencias(programaId: string) {
    const db = await getDb();
    const list = (db.asistencias || [])
      .filter((item: any) => item.programaId === programaId)
      .map(mapDbAsistenciaToApi);
    return list;
  }

  async buscarInvitaciones(q: string) {
    if (!q) return [];
    const db = await getDb();
    const searchVal = normalizarTextoApi(q);
    const results: any[] = [];
    const programas = db.programas || [];

    programas.forEach((prog: any) => {
      const invitados = db.invitadosPorPrograma?.[prog.id] || [];
      invitados.forEach((inv: any) => {
        const key = normalizarTextoApi(`${inv.nombres} ${inv.dni} ${inv.codigoEstudiante || ""}`);
        if (key.includes(searchVal)) {
          results.push({
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado || "",
            seccion: inv.seccion || "",
            programaNombre: prog.nombre,
            programaId: prog.id,
            costo: prog.costo || 0,
            horario: resolverHorarioPorGradoApi(prog, inv.grado) || prog.horario || ""
          });
        }
      });
    });
    return results;
  }

  async invitarEstudiante(operatorUsername: string, programaId: string, body: any) {
    const { dni, nombres, grado, seccion, email, telefono, seleccion, nivelCambridge } = body;
    if (!dni || !nombres) {
      throw new Error("DNI y nombres son obligatorios.");
    }

    const db = await getDb();
    const prog = (db.programas || []).find((p: any) => p.id === programaId);
    if (!prog) {
      throw new Error("Programa no encontrado.");
    }

    db.invitadosPorPrograma = db.invitadosPorPrograma || {};
    db.invitadosPorPrograma[programaId] = db.invitadosPorPrograma[programaId] || [];

    const esDuplicado = db.invitadosPorPrograma[programaId].some((i: any) => i.dni === dni);
    if (esDuplicado) {
      throw new Error("El estudiante ya se encuentra invitado a este programa.");
    }

    const nuevoInvitado = {
      dni,
      nombres,
      grado: grado || "",
      seccion: seccion || "",
      correo: email || "",
      telefonoApoderado: telefono || "",
      seleccion: seleccion || "",
      nivelCambridge: nivelCambridge || "",
      createdAt: new Date().toISOString()
    };

    db.invitadosPorPrograma[programaId].push(nuevoInvitado);
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "INVITACION_CREAR", { programaId, estudianteDni: dni });

    // Envío de correo electrónico si hay destinatario
    if (email) {
      const { asunto, html } = generarCorreoInvitacion(nombres, prog.nombre, String(prog.costo || 0), resolverHorarioPorGradoApi(prog, grado) || prog.horario || "");
      enviarCorreoGenerico({
        para: email,
        asunto,
        html
      }).catch(err => console.error("[INVITATION MAIL ERROR]", err.message));
    }

    return nuevoInvitado;
  }

  async confirmarCargaExcel(operatorUsername: string, body: any) {
    const { periodo, programaId, registros } = body;
    if (!Array.isArray(registros) || registros.length === 0) {
      throw new Error("No hay registros para importar.");
    }

    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const idCarga = (db.nextCargaId || 1);
    db.nextCargaId = idCarga + 1;

    let importados = 0;
    let duplicados = 0;

    db.invitadosPorPrograma = db.invitadosPorPrograma || {};

    const registrosHistorial: any[] = [];

    registros.forEach((reg: any) => {
      const pId = reg.programaId || programaId;
      if (!pId) return;

      db.invitadosPorPrograma[pId] = db.invitadosPorPrograma[pId] || [];

      const existe = db.invitadosPorPrograma[pId].some((i: any) => String(i.dni).replace(/\D/g, "") === String(reg.dni).replace(/\D/g, ""));
      if (existe) {
        duplicados++;
        return;
      }

      const nuevo = {
        dni: reg.dni,
        codigoEstudiante: reg.codigo_estudiante || "",
        nombres: `${reg.nombres} ${reg.apellidos || ""}`.trim(),
        grado: reg.grado || "",
        seccion: reg.seccion || "",
        correo: reg.correo_apoderado || reg.correo || "",
        telefonoApoderado: reg.telefono_apoderado || reg.telefono || "",
        seleccion: reg.seleccion || "",
        nivelCambridge: reg.nivel_cambridge || "",
        nivelEducativo: reg.nivel_educativo || reg.nivel || "",
        cargaId: idCarga
      };

      db.invitadosPorPrograma[pId].push(nuevo);
      importados++;

      registrosHistorial.push({
        dni: reg.dni,
        nombres: nuevo.nombres,
        programaId: pId
      });
    });

    const historialItem = {
      id: String(idCarga),
      fecha: new Date().toISOString(),
      periodo: period,
      usuario: operatorUsername || "Coordinador",
      resumen: {
        importados,
        duplicados,
        total: registros.length
      },
      registros: registrosHistorial
    };

    db.historialCargas = db.historialCargas || [];
    db.historialCargas.unshift(historialItem);

    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinador", "coordinacion", "CARGA_EXCEL_CONFIRMAR", {
      cargaId: idCarga,
      importados,
      duplicados
    });

    return historialItem;
  }

  async getCargasHistory() {
    const db = await getDb();
    return db.historialCargas || [];
  }

  async deleteCargaHistory(operatorUsername: string, cargaId: string) {
    const db = await getDb();
    const idx = (db.historialCargas || []).findIndex((h: any) => String(h.id) === String(cargaId));
    if (idx === -1) {
      throw new Error("Carga no encontrada.");
    }

    const item = db.historialCargas[idx];
    const registrosCarga = item.registros || [];

    registrosCarga.forEach((reg: any) => {
      if (reg.programaId && db.invitadosPorPrograma?.[reg.programaId]) {
        db.invitadosPorPrograma[reg.programaId] = db.invitadosPorPrograma[reg.programaId].filter((i: any) =>
          !(i.dni === reg.dni && String(i.cargaId) === String(cargaId))
        );
      }
    });

    db.historialCargas = db.historialCargas.filter((h: any) => String(h.id) !== String(cargaId));
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinador", "coordinacion", "CARGA_EXCEL_REVERTIR", { cargaId });

    return true;
  }

  async getCargaErrors(cargaId: string) {
    // Nota: Legacy controller mock/real errors
    return [];
  }

  async getProgramaActividades(programaId: string) {
    const db = await getDb();
    const filteredLogs = (db.auditLogs || []).filter((log: any) => {
      const details = log.details || {};
      return details.programaId === programaId || details.programa_id === programaId;
    });
    return ordenarPorFecha(filteredLogs);
  }

  async getProgramaListaAsistencia(programaId: string) {
    const db = await getDb();
    const enrollments = (db.inscripciones || []).filter((item: any) => item.programaId === programaId && item.estadoInscripcion !== "Anulada");
    const asistencias = db.asistencias || [];

    const pageList = enrollments.map((inscrip: any) => {
      const student = db.estudiantes?.[inscrip.dniEstudiante] || null;
      const filteredAst = asistencias.filter((a: any) =>
        a.dniEstudiante === inscrip.dniEstudiante && (a.programaId === programaId || normalizarTexto(a.programa) === normalizarTexto(inscrip.programa))
      );
      
      const lastAst = filteredAst.length ? ordenarPorFecha(filteredAst)[0] : null;

      return {
        inscripcionId: inscrip.id,
        dniEstudiante: inscrip.dniEstudiante,
        codigoEstudiante: inscrip.codigoEstudiante,
        nombresEstudiante: inscrip.nombresEstudiante,
        gradoEstudiante: inscrip.gradoEstudiante || (student ? obtenerGradoCompletoApi(student.grado, student.nivel) : ""),
        seccion: inscrip.seccion || "",
        estadoPago: inscrip.estadoPago || "Pendiente",
        asistenciasRegistradas: filteredAst.length,
        ultimoIngreso: lastAst ? lastAst.fechaRegistro : null
      };
    });

    return pageList;
  }

  async registrarAsistencia(operatorUsername: string, body: any) {
    const { inscripcion_id, pago_id, dni_estudiante, estado_acceso, observacion, origen } = body;
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

    await registrarAuditoria(operatorUsername || origen || "Auxiliar", "auxiliar", "ASISTENCIA_REGISTRAR", {
      alumno: nuevaAsistencia.nombresEstudiante,
      taller: nuevaAsistencia.programa,
      fecha: nuevaAsistencia.fechaRegistro,
      estado: nuevaAsistencia.estadoAcceso
    });

    return mapDbAsistenciaToApi(nuevaAsistencia);
  }

  async validarIngresoAuxiliar(busqueda: string, programaId: string) {
    const db = await getDb();
    const query = String(busqueda || "").trim();

    if (/^\d+$/.test(query)) {
      const dniLimpio = String(query).replace(/\D/g, "").slice(0, 8);
      if (dniLimpio.length !== 8) {
        throw new Error("El DNI debe contener exactamente 8 numeros.");
      }
      return resolverValidacion(db, { dni: dniLimpio, codigoOriginal: dniLimpio, programaId });
    } else {
      return resolverValidacionPorNombre(db, query, programaId);
    }
  }

  async validarIngresoQrAuxiliar(codigo: string) {
    const db = await getDb();
    const ids = extraerIdentificadoresCodigo(codigo);
    return resolverValidacion(db, ids);
  }
}
