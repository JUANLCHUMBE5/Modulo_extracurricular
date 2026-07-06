import { obtenerProgramaPorId } from "../services/secretariaService";
import {
  calcularEdadSecretaria,
  esProgramaCambridgeSecretaria,
  normalizarComparacion,
} from "./secretariaRules";
import {
  resolverDocentePorGradoLocal,
  resolverHorarioPorGradoLocal,
  resolverTutoraPorGradoLocal,
} from "./horariosSecretaria";

export function construirPayloadInscripcion({
  estudiante,
  formulario,
  programaActualizado,
  programaParaRegistro,
  periodo,
  registroAdicional,
  esCicloVerano,
}) {
  const dniRegistro = estudiante.esExterno ? formulario.dniExterno.trim() : estudiante.dni;
  const nombresRegistro = estudiante.esExterno
    ? formulario.nombresExterno.trim()
    : estudiante.nombres;
  const gradoRegistro = estudiante.esExterno
    ? formulario.gradoExterno.trim()
    : estudiante.grado || "";
  const edadRegistro = calcularEdadSecretaria(estudiante, formulario);
  const tipoAlumnoVeranoAutomatico = estudiante.esExterno ? "Alumno externo" : "Alumno interno";

  const horarioRegistro = resolverHorarioPorGradoLocal(programaActualizado, gradoRegistro)
    || programaActualizado.horario;
  const docenteRegistro = resolverDocentePorGradoLocal(programaActualizado, gradoRegistro);
  const tutoraRegistro = resolverTutoraPorGradoLocal(programaActualizado, gradoRegistro);

  const registrarDatosCambridge = esProgramaCambridgeSecretaria(programaActualizado);
  const seleccionCambridgeRegistro = registrarDatosCambridge
    ? (programaParaRegistro?.seleccion || estudiante.seleccion || "")
    : "";
  const nivelCambridgeRegistro = registrarDatosCambridge
    ? (programaParaRegistro?.nivelCambridge || estudiante.nivelCambridge || "")
    : "";

  return {
    dniEstudiante: dniRegistro,
    codigoEstudiante: estudiante.codigoEstudiante || "",
    gradoEstudiante: gradoRegistro,
    seccionEstudiante: estudiante.esExterno ? "" : estudiante.seccion || "",
    nombresEstudiante: nombresRegistro,
    esExterno: estudiante.esExterno,
    esNuevoVerano: Boolean(estudiante.esExterno),
    edadEstudiante: edadRegistro ? String(edadRegistro) : "",
    domicilioEstudiante: estudiante.esExterno ? formulario.domicilioExterno.trim() : "",
    sexoEstudiante: estudiante.esExterno ? formulario.sexoExterno : "",
    tipoAlumno: esCicloVerano ? tipoAlumnoVeranoAutomatico : estudiante.tipoAlumno,
    tipoInscripción:
      registroAdicional
        ? "Curso adicional"
        : esCicloVerano
        ? (tipoAlumnoVeranoAutomatico === "Alumno externo" ? "Verano externo" : "Verano interno")
        :
        periodo === "escolar" && !estudiante.tieneInvitacion && !programaActualizado.invitacionMasiva
          ? "Excepcional"
          : "Regular",
    programa: programaActualizado.nombre,
    programaId: programaActualizado.id,
    colegioProcedencia: formulario.colegioProcedencia.trim(),
    horario: horarioRegistro,
    docente: docenteRegistro,
    tutora: tutoraRegistro,
    costo: programaActualizado.costo,
    cupos: programaActualizado.cupos,
    requiereUniforme: programaActualizado.requiereUniforme,
    periodo,
    apoderado: formulario.apoderado.trim(),
    telefono: formulario.telefono,
    correo: "",
    medioEnvio: "Impreso",
    seleccion: seleccionCambridgeRegistro,
    nivelCambridge: nivelCambridgeRegistro,
    tallaUniforme: formulario.tallaUniforme,
    tallaPolo: formulario.tallaPolo,
    tallaShort: formulario.tallaShort,
    observacion: registroAdicional
      ? (formulario.observacion.trim() || "Curso adicional registrado por Asistente.")
      : formulario.observacion.trim(),
    origenRegistro: registroAdicional
      ? "Curso adicional por Asistente"
      : estudiante.esExterno
        ? "Alumno externo de ciclo verano"
        : esCicloVerano
          ? "Alumno interno de ciclo verano"
          : estudiante.tieneInvitacion
            ? "Alumno invitado por Coordinación Académica"
            : "Registro excepcional por Asistente",
  };
}

export async function completarInscripcionConProgramaActual({
  registro,
  estudiante,
  programaParaRegistro,
  periodo,
  programas,
}) {
  const programaId = registro.programaId || estudiante?.programaAsignado || programaParaRegistro?.id;
  let programaActual = null;

  if (programaId) {
    programaActual = await obtenerProgramaPorId(programaId, periodo).catch(() => null);
  }

  if (!programaActual) {
    programaActual = programas.find((programa) =>
      normalizarComparacion(programa.nombre) === normalizarComparacion(registro.programa)
    ) || programaParaRegistro;
  }

  if (!programaActual) return registro;

  return {
    ...registro,
    programaId: programaActual.id || registro.programaId,
    programa: programaActual.nombre || registro.programa,
    horario: resolverHorarioPorGradoLocal(programaActual, registro.gradoEstudiante || registro.grado || estudiante?.grado) || registro.horario || programaActual.horario,
    docente: resolverDocentePorGradoLocal(programaActual, registro.gradoEstudiante || registro.grado || estudiante?.grado) || registro.docente,
    tutora: resolverTutoraPorGradoLocal(programaActual, registro.gradoEstudiante || registro.grado || estudiante?.grado) || registro.tutora || "",
    costo: programaActual.costo ?? registro.costo,
    modalidadCobro: programaActual.modalidadCobro || registro.modalidadCobro,
    fechaInicio: programaActual.fechaInicio || registro.fechaInicio,
    fechaFin: programaActual.fechaFin || registro.fechaFin,
    duracionTaller: programaActual.duracionTaller || registro.duracionTaller,
    duracionAvisoDias: programaActual.duracionAvisoDias || registro.duracionAvisoDias,
    requisitos: programaActual.requisitos || registro.requisitos,
    plantilla: programaActual.plantilla || registro.plantilla,
    plantillaBase64: programaActual.plantillaBase64 || registro.plantillaBase64,
    plantillaVariables: programaActual.plantillaVariables || registro.plantillaVariables || [],
    requiereUniforme: programaActual.requiereUniforme ?? registro.requiereUniforme,
    requiereIndumentaria: programaActual.requiereIndumentaria ?? registro.requiereIndumentaria,
    seleccion: registro.seleccion || estudiante?.seleccion || "",
    nivelCambridge: registro.nivelCambridge || estudiante?.nivelCambridge || "",
    tipoComunicado: programaActual.tipoComunicado || registro.tipoComunicado || "Otro genérico",
    tipoDocumento: programaActual.tipoDocumento || registro.tipoDocumento || "Comunicado",
    numeroDocumento: programaActual.numeroDocumento || registro.numeroDocumento || "",
    areaTematica: programaActual.areaTematica || registro.areaTematica || "No aplica",
    motivoJustificacion: programaActual.motivoJustificacion || registro.motivoJustificacion || programaActual.comunicado || registro.comunicado || "",
    nombreCiclo: programaActual.nombreCiclo || registro.nombreCiclo || "Ciclo I",
    duracion: programaActual.duracion || registro.duracion || programaActual.duracionTaller || registro.duracionTaller || "",
    tablaHorariosNivel: programaActual.tablaHorariosNivel || registro.tablaHorariosNivel || [],
    incluyeAlmuerzo: programaActual.incluyeAlmuerzo !== undefined ? Boolean(programaActual.incluyeAlmuerzo) : Boolean(registro.incluyeAlmuerzo),
    horarioRecepcionAlmuerzo: programaActual.horarioRecepcionAlmuerzo || registro.horarioRecepcionAlmuerzo || "",
    detalleAlmuerzo: programaActual.detalleAlmuerzo || registro.detalleAlmuerzo || "",
    concesionarios: programaActual.concesionarios || registro.concesionarios || "",
    modalidadesCambridge: programaActual.modalidadesCambridge || registro.modalidadesCambridge || [],
    costoCiclo: programaActual.costoCiclo || registro.costoCiclo || programaActual.costo || registro.costo || "",
    montoPrimerPago: programaActual.montoPrimerPago || registro.montoPrimerPago || "",
    comunicado: programaActual.comunicado || registro.comunicado || "",
    comunicadoCompleto: programaActual.comunicadoCompleto || registro.comunicadoCompleto || "",
  };
}
