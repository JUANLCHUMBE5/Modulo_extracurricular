import { useState } from "react";

const grupoHorarioDraftInicial = {
  grados: [],
  dia: "Jueves",
  aula: "",
  almuerzoInicio: "14:20",
  almuerzoFin: "15:10",
  horaInicio: "15:20",
  horaFin: "17:20",
  responsable: "",
  tutora: "",
  cupos: 20,
};

interface UseSeccionFechasHorariosProps {
  esCambridgeForm: boolean;
  actualizarGrupoHorario: (index: number, grupo: any) => void;
  agregarGrupoHorario: (grupo: any) => void;
}

export default function useSeccionFechasHorarios({
  esCambridgeForm,
  actualizarGrupoHorario,
  agregarGrupoHorario,
}: UseSeccionFechasHorariosProps) {
  const [mostrarGrupoModal, setMostrarGrupoModal] = useState(false);
  const [grupoDraft, setGrupoDraft] = useState<any>(grupoHorarioDraftInicial);
  const [grupoDraftError, setGrupoDraftError] = useState("");
  const [grupoDraftErrorTick, setGrupoDraftErrorTick] = useState(0);
  const [indiceGrupoEditando, setIndiceGrupoEditando] = useState<number | null>(null);

  function actualizarGrupoDraft(campo: string, valor: any) {
    setGrupoDraftError("");
    setGrupoDraft((actual: any) => ({ ...actual, [campo]: valor }));
  }

  function toggleGradoDraft(valor: string) {
    setGrupoDraftError("");
    setGrupoDraft((actual: any) => {
      const grados = Array.isArray(actual.grados) ? actual.grados : [];
      return {
        ...actual,
        grados: grados.includes(valor)
          ? grados.filter((item: string) => item !== valor)
          : [...grados, valor],
      };
    });
  }

  function cerrarGrupoModal() {
    setMostrarGrupoModal(false);
    setGrupoDraft(grupoHorarioDraftInicial);
    setGrupoDraftError("");
    setIndiceGrupoEditando(null);
  }

  function guardarGrupoDraft() {
    const grados = Array.isArray(grupoDraft.grados) ? grupoDraft.grados.filter(Boolean) : [];
    const dias = String(grupoDraft.dia || "").split(",").map(d => d.trim()).filter(Boolean);

    const targetHoraInicio = grupoDraft.horaInicio || "15:20";
    const targetHoraFin = grupoDraft.horaFin || "17:20";
    const targetAlmInicio = grupoDraft.almuerzoInicio || "";
    const targetAlmFin = grupoDraft.almuerzoFin || "";
    const targetAula = grupoDraft.aula || "";

    if ((!esCambridgeForm && !grados.length) || !dias.length) {
      setGrupoDraftError(esCambridgeForm ? "Faltan días del bloque." : "Faltan grados o días del bloque.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    if (!targetHoraInicio || !targetHoraFin) {
      setGrupoDraftError("Defina las horas de inicio y fin de clase.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }
    if (targetHoraInicio >= targetHoraFin) {
      setGrupoDraftError("La hora de inicio de clase debe ser menor a la hora de fin.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    if (grupoDraft.almuerzoInicio && grupoDraft.almuerzoFin) {
      if (!targetAlmInicio || !targetAlmFin) {
        setGrupoDraftError("Complete las horas de inicio y fin de almuerzo.");
        setGrupoDraftErrorTick((actual) => actual + 1);
        return;
      }
      if (targetAlmInicio >= targetAlmFin) {
        setGrupoDraftError("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
        setGrupoDraftErrorTick((actual) => actual + 1);
        return;
      }
    }

    if (!String(grupoDraft.responsable || "").trim()) {
      setGrupoDraftError("Ingrese el docente o tutor responsable del bloque.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    const cuposVal = Number(grupoDraft.cupos);
    if (grupoDraft.cupos === "" || Number.isNaN(cuposVal) || cuposVal <= 0) {
      setGrupoDraftError("Ingrese un número de cupos válido para el bloque (mínimo 1).");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    const grupoCompleto = {
      ...grupoDraft,
      horaInicio: targetHoraInicio,
      horaFin: targetHoraFin,
      almuerzoInicio: targetAlmInicio,
      almuerzoFin: targetAlmFin,
      aula: targetAula,
    };

    if (indiceGrupoEditando !== null) {
      actualizarGrupoHorario(indiceGrupoEditando, grupoCompleto);
    } else {
      agregarGrupoHorario({ ...grupoCompleto, id: grupoDraft.id || `grupo-${Date.now()}` });
    }
    cerrarGrupoModal();
  }

  function iniciarEdicionGrupo(index: number, grupo: any) {
    setIndiceGrupoEditando(index);
    setGrupoDraft(grupo);
    setMostrarGrupoModal(true);
  }

  function iniciarAdicionGrupo() {
    setIndiceGrupoEditando(null);
    setGrupoDraft(grupoHorarioDraftInicial);
    setMostrarGrupoModal(true);
  }

  return {
    mostrarGrupoModal,
    grupoDraft,
    grupoDraftError,
    grupoDraftErrorTick,
    indiceGrupoEditando,
    actualizarGrupoDraft,
    toggleGradoDraft,
    cerrarGrupoModal,
    guardarGrupoDraft,
    iniciarEdicionGrupo,
    iniciarAdicionGrupo,
  };
}
