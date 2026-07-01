import useCoordinacionProgramasForm from "./useCoordinacionProgramasForm";
import useCoordinacionProgramasCrud from "./useCoordinacionProgramasCrud";

/**
 * Hook orquestador del sub-módulo de programas/talleres extracurriculares.
 * Une la gestión de formularios (useCoordinacionProgramasForm) con el ciclo de vida y CRUD (useCoordinacionProgramasCrud).
 */
export default function useCoordinacionProgramas({
  user,
  embedded,
  categorias,
  mostrarMsg,
  cargarDatos,
  navigate,
  onAbrirFormulario
}) {
  // Generamos un contenedor mutable para poder referenciar la lista de programas
  // dentro de las validaciones y sugerencias del formulario sin crear dependencias circulares.
  let listadoProgramasRef = [];

  const formState = useCoordinacionProgramasForm({
    get programas() {
      return listadoProgramasRef;
    },
    mostrarMsg,
    sugerirNumeroDocumento: (tipoDoc, list) => {
      const anio = new Date().getFullYear();
      const prefix = tipoDoc === "Carta" ? "CAR" : "COM";
      const count = (list || []).filter(p => {
        const pAnio = p.fechaInicio ? new Date(p.fechaInicio).getFullYear() : anio;
        const pTipo = p.tipoDocumento || "Comunicado";
        return pTipo === tipoDoc && pAnio === anio;
      }).length;

      const correlativo = String(count + 1).padStart(3, "0");
      return `${prefix}-${correlativo}-${anio}`;
    }
  });

  const crudState = useCoordinacionProgramasCrud({
    user,
    embedded,
    categorias,
    mostrarMsg,
    cargarDatos,
    navigate,
    onAbrirFormulario,
    formState
  });

  // Asignamos la lista reactiva de programas para que esté disponible en las funciones del formulario
  listadoProgramasRef = crudState.programas;

  return {
    ...formState,
    ...crudState,
  };
}
