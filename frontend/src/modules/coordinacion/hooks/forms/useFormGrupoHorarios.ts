import { normalizarListaGrados } from "../../utils/coordinacionProgramUtils";
import { horarioGrupoInicial } from "../../constants/coordinacionFormDefaults";

interface UseFormGrupoHorariosProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export default function useFormGrupoHorarios({ form, setForm }: UseFormGrupoHorariosProps) {
  function agregarGrupoHorario(grupo = horarioGrupoInicial) {
    setForm((actual: any) => {
      const nuevaLista = [
        ...(Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []),
        { ...grupo, id: grupo.id || `grupo-${Date.now()}` },
      ];
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        usaHorariosPorBloque: true,
        gradosAplicables: normalizarListaGrados([
          ...normalizarListaGrados(actual.gradosAplicables),
          ...normalizarListaGrados(grupo.grados),
        ]),
        horariosPorGrupo: nuevaLista,
        cupos: String(totalCupos),
      };
    });
  }

  function quitarGrupoHorario(index: number) {
    setForm((actual: any) => {
      const nuevaLista = (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).filter(
        (_, itemIndex) => itemIndex !== index
      );
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        horariosPorGrupo: nuevaLista,
        cupos: nuevaLista.length > 0 ? String(totalCupos) : actual.cupos,
      };
    });
  }

  function actualizarGrupoHorario(index: number, campo: any, valor?: any) {
    setForm((actual: any) => {
      const lista = Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : [];
      const nuevaLista = lista.map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        if (campo && typeof campo === "object") {
          return { ...campo, id: grupo.id || campo.id || `grupo-${Date.now()}` };
        }
        return { ...grupo, [campo]: valor };
      });
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        horariosPorGrupo: nuevaLista,
        cupos: String(totalCupos),
      };
    });
  }

  function toggleGradoGrupo(index: number, valor: string) {
    setForm((actual: any) => ({
      ...actual,
      horariosPorGrupo: (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).map(
        (grupo, itemIndex) => {
          if (itemIndex !== index) return grupo;
          const grados = normalizarListaGrados(grupo.grados);
          return {
            ...grupo,
            grados: grados.includes(valor) ? grados.filter((item) => item !== valor) : [...grados, valor],
          };
        }
      ),
    }));
  }

  return {
    agregarGrupoHorario,
    quitarGrupoHorario,
    actualizarGrupoHorario,
    toggleGradoGrupo,
  };
}
