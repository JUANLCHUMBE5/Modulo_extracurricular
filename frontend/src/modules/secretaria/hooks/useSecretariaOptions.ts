import { useMemo } from "react";
import { calcularEdadSecretaria, normalizarComparacion, programaDisponibleParaEdadSecretaria } from "../utils/secretariaRules";
import { programaDisponibleParaGrado } from "../services/secretariaServiceUtils";

export function useSecretariaOptions({
  periodo,
  estudiante,
  programas,
  formulario,
  inscripcionesEstudiante,
  modoCursoAdicional,
}: any) {
  const esCicloVerano = periodo === "verano";
  const edadAlumnoFormulario = calcularEdadSecretaria(estudiante, formulario);
  const gradoEstudiante = estudiante?.esExterno
    ? formulario.gradoExterno
    : estudiante?.grado;

  const programaAsignado = estudiante
    ? programas.find((programa: any) => programa.id === estudiante.programaAsignado)
    : null;
  const programaSeleccionado = programas.find((programa: any) => programa.id === formulario.programa);

  const tieneInvitacionOperativa = Boolean(estudiante?.tieneInvitacion) && Boolean(programaAsignado);

  const baseCompatibles = useMemo(() => {
    return esCicloVerano
      ? programas
          .filter((programa) => (programa.estado || "Habilitado") === "Habilitado")
          .filter((programa) => programaDisponibleParaEdadSecretaria(programa, String(edadAlumnoFormulario)))
      : programas
          .filter((programa) => (programa.estado || "Habilitado") === "Habilitado")
          .filter((programa) => {
            if (!estudiante) return true;
            return programaDisponibleParaGrado(programa, gradoEstudiante || "");
          });
  }, [esCicloVerano, programas, edadAlumnoFormulario, estudiante, gradoEstudiante]);

  const programasCompatiblesFormulario = useMemo(() => {
    if (!tieneInvitacionOperativa) {
      return baseCompatibles.filter((p) => {
        if (!p.invitacionMasiva) return false;
        
        const alcance = String(p.alcanceInvitacionMasiva || "colegio").toLowerCase();
        const nivelEstudiante = String(estudiante?.nivel || "").toLowerCase();
        if (alcance.includes("inicial") && !nivelEstudiante.includes("inicial")) return false;
        if (alcance.includes("primaria") && !nivelEstudiante.includes("primaria")) return false;
        if (alcance.includes("secundaria") && !nivelEstudiante.includes("secundaria")) return false;
        return true;
      });
    }
    return baseCompatibles;
  }, [baseCompatibles, tieneInvitacionOperativa, estudiante]);

  const programaAsignadoInvitacion = useMemo(() => {
    return tieneInvitacionOperativa ? {
      id: estudiante.programaAsignado,
      nombre: estudiante.programaNombre,
      grupo: estudiante.programaGrupo,
      grupoEtario: estudiante.programaGrupoEtario,
      horario: estudiante.programaHorario,
      docente: estudiante.programaDocente,
      costo: estudiante.programaCosto,
      cupos: estudiante.programaCupos,
      cuposDisponibles: estudiante.programaCuposDisponibles,
      modalidadCobro: estudiante.programaModalidadCobro,
      requisitos: estudiante.programaRequisitos,
      fechaInicio: estudiante.programaFechaInicio,
      fechaFin: estudiante.programaFechaFin,
      duracionTaller: estudiante.programaDuracionTaller,
      duracionAvisoDias: estudiante.programaDuracionAvisoDias,
      seleccion: estudiante.seleccion,
      nivelCambridge: estudiante.nivelCambridge,
      plantilla: estudiante.plantilla,
      plantillaBase64: estudiante.plantillaBase64,
      plantillaVariables: estudiante.plantillaVariables,
      requiereUniforme: estudiante.requiereUniforme,
      requiereIndumentaria: estudiante.requiereIndumentaria,
    } : null;
  }, [tieneInvitacionOperativa, estudiante]);

  const clavesProgramasRegistrados = useMemo(() => {
    return new Set(
      inscripcionesEstudiante.flatMap((item: any) => [
        item.programaId ? `id:${item.programaId}` : "",
        item.programa ? `nombre:${normalizarComparacion(item.programa)}` : "",
      ]).filter(Boolean)
    );
  }, [inscripcionesEstudiante]);

  const programasCursoAdicional = useMemo(() => {
    return programasCompatiblesFormulario.filter((programa) =>
      !clavesProgramasRegistrados.has(`id:${programa.id}`) &&
      !clavesProgramasRegistrados.has(`nombre:${normalizarComparacion(programa.nombre)}`)
    );
  }, [programasCompatiblesFormulario, clavesProgramasRegistrados]);

  const programasParaSelector = useMemo(() => {
    return modoCursoAdicional
      ? programasCursoAdicional
      : programaAsignadoInvitacion
        ? [
            programaAsignadoInvitacion,
            ...programasCompatiblesFormulario.filter((programa) => programa.id !== programaAsignadoInvitacion.id),
          ]
        : programasCompatiblesFormulario;
  }, [modoCursoAdicional, programasCursoAdicional, programaAsignadoInvitacion, programasCompatiblesFormulario]);

  const programaUnicoDisponible = programasParaSelector.length === 1 ? programasParaSelector[0] : null;
  const mostrarSelectorPrograma = programasParaSelector.length > 1;

  const programaParaRegistro = programaSeleccionado || programaUnicoDisponible || (modoCursoAdicional ? null : (programaAsignado || programaAsignadoInvitacion));

  return {
    esCicloVerano,
    edadAlumnoFormulario,
    gradoEstudiante,
    programaAsignado,
    programaSeleccionado,
    programasCompatiblesFormulario,
    tieneInvitacionOperativa,
    programaAsignadoInvitacion,
    clavesProgramasRegistrados,
    programasCursoAdicional,
    programasParaSelector,
    programaUnicoDisponible,
    mostrarSelectorPrograma,
    programaParaRegistro,
    tieneTalleresGradoBase: baseCompatibles.length > 0,
  };
}
