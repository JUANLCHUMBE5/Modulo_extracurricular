import { validarDni, validarTelefono, validarTextoSeguro } from "../../../services/validators";
import { normalizarComparacion } from "./secretariaRules";

export function validarFormularioRegistro({
  estudiante,
  formulario,
  periodo,
  programas,
  programasParaSelector,
  clavesProgramasRegistrados,
  registroAdicional,
  programaActualizado,
}) {
  if (!estudiante) {
    return "Primero busque un estudiante registrado.";
  }

  if (estudiante.esExterno) {
    if (!validarDni(formulario.dniExterno)) {
      return "Ingrese el DNI del alumno externo con 8 numeros.";
    }
    if (!validarTextoSeguro(formulario.nombresExterno)) {
      return "Ingrese el nombre completo del alumno externo.";
    }
    if (!validarTextoSeguro(formulario.edadExterno) || Number(formulario.edadExterno) <= 0) {
      return "Seleccione la fecha de nacimiento del estudiante.";
    }
    if (!validarTextoSeguro(formulario.domicilioExterno)) {
      return "Ingrese el domicilio del estudiante.";
    }
    if (!formulario.sexoExterno) {
      return "Seleccione el sexo del estudiante.";
    }
    if (!validarTextoSeguro(formulario.gradoExterno)) {
      return "Ingrese el grado del alumno externo.";
    }
  }

  const seleccionoProgramaDistinto = Boolean(formulario.programa && formulario.programa !== estudiante.programaAsignado);
  const requiereSeleccionPrograma = periodo === "verano" || !estudiante.tieneInvitacion || registroAdicional || seleccionoProgramaDistinto;
  const programaUnicoRegistro = programasParaSelector.length === 1 ? programasParaSelector[0] : null;
  const programaIdRegistro = requiereSeleccionPrograma
    ? (formulario.programa || programaUnicoRegistro?.id || "")
    : estudiante.programaAsignado;

  if (requiereSeleccionPrograma && !programaIdRegistro) {
    return programas.length === 0
      ? "No hay programas habilitados para este periodo. Coordinación Académica debe registrar o habilitar uno."
      : "Seleccione el programa o taller disponible para este periodo.";
  }

  if (!programaActualizado) {
    return "No se encontro el programa actualizado para este periodo. Actualice y vuelva a intentar.";
  }

  if (
    registroAdicional &&
    (
      clavesProgramasRegistrados.has(`id:${programaActualizado.id}`) ||
      clavesProgramasRegistrados.has(`nombre:${normalizarComparacion(programaActualizado.nombre)}`)
    )
  ) {
    return "El estudiante ya tiene una inscripcion registrada en este programa.";
  }

  if (!registroAdicional && periodo === "escolar" && !estudiante.tieneInvitacion && !programaActualizado.invitacionMasiva && !validarTextoSeguro(formulario.observacion)) {
    return "La inscripcion excepcional requiere una observacion obligatoria.";
  }

  if (periodo === "verano" && !validarTextoSeguro(formulario.colegioProcedencia)) {
    return "Ingrese el colegio de procedencia del estudiante.";
  }

  if (!validarTextoSeguro(formulario.apoderado)) {
    return "Ingrese el nombre del apoderado sin caracteres especiales.";
  }

  if (!validarTelefono(formulario.telefono)) {
    return "Ingrese un telefono de contacto valido de 9 numeros.";
  }

  if (programaActualizado.requiereUniforme && !formulario.tallaUniforme) {
    return "Seleccione la talla de uniforme requerida por el taller.";
  }

  if (programaActualizado.requiereIndumentaria && (!formulario.tallaPolo || !formulario.tallaShort)) {
    return "Seleccione la talla de polo y short para la indumentaria deportiva.";
  }

  if (!formulario.aceptaCondiciones) {
    return "Debe confirmar que el apoderado acepta las condiciones del programa.";
  }

  return null;
}
