import { useSecretariaSearch } from "./useSecretariaSearch";
import { useSecretariaRegistration } from "./useSecretariaRegistration";

export function useSecretariaState({ onClearDelegatedModule } = {}) {
  // Use closure placeholders to break the circular dependency between search and registration hooks
  let onApplyCallback = async (studentData, registroExistente, compatibles, iniciarRegistro) => {};
  let onRegisterExternoCallback = async (dniSugerido) => {};

  const search = useSecretariaSearch({
    onClearDelegatedModule,
    onApply: async (studentData, registroExistente, compatibles, iniciarRegistro) => {
      await onApplyCallback(studentData, registroExistente, compatibles, iniciarRegistro);
    },
    onRegisterExterno: async (dniSugerido) => {
      await onRegisterExternoCallback(dniSugerido);
    }
  });

  const registration = useSecretariaRegistration({
    periodo: search.periodo,
    estudiante: search.estudiante,
    inscripcion: search.inscripcion,
    inscripcionesEstudiante: search.inscripcionesEstudiante,
    programas: search.programas,
    setEstudiante: search.setEstudiante,
    setInscripción: search.setInscripción,
    setInscripcionesEstudiante: search.setInscripcionesEstudiante,
    limpiarBusquedaEstudiante: search.limpiarBusquedaEstudiante,
    setDni: search.setDni,
    mensaje: search.mensaje,
    setMensaje: search.setMensaje,
    cargarProgramasDelPeriodo: search.cargarProgramasDelPeriodo,
    registroDesdeLista: search.registroDesdeLista,
    setRegistroDesdeLista: search.setRegistroDesdeLista,
  });

  // Wire up the placeholders to the instantiated handlers
  onApplyCallback = registration.aplicarEstudianteEncontradoCallback;
  onRegisterExternoCallback = registration.abrirRegistroAlumnoExterno;

  return {
    ...search,
    ...registration,
  };
}
