import { useState } from "react";
import { cambiarEstadoPrograma, eliminarPrograma } from "../../services/coordinacionService";
import { datosProgramaAFormulario, sugerirNumeroDocumento } from "../../utils/coordinacionFormHelpers";
import { fechaActualInput } from "../../../../services/dateService";

interface UseCoordinacionAccionesProgramaProps {
  programas: any[];
  puedeCrearProgramas: boolean;
  puedeEditarProgramas: boolean;
  mostrarMsg: (msg: string, tipo?: string) => void;
  coordinacionForm: any;
  setModoEditar: (val: boolean) => void;
  documentos: any;
  setAlertaConfiguracion: (val: string) => void;
  navigate: any;
  embedded: boolean;
  setShowModal: (val: boolean) => void;
  cargarDatos: () => Promise<void>;
}

export default function useCoordinacionAccionesPrograma({
  programas,
  puedeCrearProgramas,
  puedeEditarProgramas,
  mostrarMsg,
  coordinacionForm,
  setModoEditar,
  documentos,
  setAlertaConfiguracion,
  navigate,
  embedded,
  setShowModal,
  cargarDatos,
}: UseCoordinacionAccionesProgramaProps) {
  const [programaAFinalizar, setProgramaAFinalizar] = useState<any>(null);
  const [programaAArchivar, setProgramaAArchivar] = useState<any>(null);

  function abrirCrear() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento("Comunicado", programas);
    coordinacionForm.setForm({
      id: "",
      nombre: "",
      categoria: "",
      costo: "",
      periodo: "escolar",
      fechaInicio: "",
      fechaFin: "",
      cupos: "20",
      modalidadCobro: "Unico",
      dias: [],
      gradosAplicables: [],
      horariosPorGrupo: [],
      talleresDeportivos: [],
      tipoComunicado: "Otro genérico",
      tipoDocumento: "Comunicado",
      numeroDocumento: numSugerido,
    });
    setModoEditar(false);
    coordinacionForm.setIndiceTallerEditando(null);
    coordinacionForm.setTallerDepForm({
      deporte: "Vóley",
      custom: "",
      minEdad: "6",
      maxEdad: "9",
      dias: ["Jueves"],
      horaInicio: "15:50",
      horaFin: "16:50",
      cupos: "20",
      nivel: "Formativo",
      docente: "",
    });
    documentos.setProgramaDocsId("");
    documentos.setLecturaDocumento(null);
    documentos.setPlantillaInputKey((actual: number) => actual + 1);
    setAlertaConfiguracion("");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  function abrirCrearDesdeDocumento() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento("Comunicado", programas);
    coordinacionForm.setForm((actual: any) => ({
      ...actual,
      id: "",
      numeroDocumento: actual.numeroDocumento || numSugerido,
    }));
    setModoEditar(false);
    coordinacionForm.setIndiceTallerEditando(null);
    setAlertaConfiguracion("");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  function abrirEditar(prog: any) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    coordinacionForm.setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    coordinacionForm.setIndiceTallerEditando(null);
    documentos.setProgramaDocsId("");
    documentos.setLecturaDocumento(null);
    documentos.setPlantillaInputKey((actual: number) => actual + 1);
    setAlertaConfiguracion("");
    if (!embedded) {
      navigate(`/coordinacion/registrar-programa?id=${prog.id}`);
    } else {
      setShowModal(true);
    }
  }

  async function toggleEstado(prog: any) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para cambiar el estado de programas.");
    const nuevo = prog.estado === "Habilitado" ? "Deshabilitado" : "Habilitado";
    try {
      await cambiarEstadoPrograma(prog.id, nuevo);
      mostrarMsg(`Programa ${nuevo.toLowerCase()}.`, "success");
      await cargarDatos();
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo cambiar el estado del programa.");
    }
  }

  async function finalizarPrograma(prog: any) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para finalizar programas.");
    setProgramaAFinalizar(prog);
  }

  async function confirmarFinalizar() {
    if (!programaAFinalizar) return;
    const prog = programaAFinalizar;
    setProgramaAFinalizar(null);
    try {
      await cambiarEstadoPrograma(prog.id, "Finalizado");
      mostrarMsg(
        `Programa "${prog.nombre}" finalizado. La inscripción se ha cerrado. Puede clonarlo para un nuevo ciclo.`,
        "success"
      );
      await cargarDatos();
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo finalizar el programa.");
    }
  }

  async function eliminarCurso(prog: any) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para archivar programas.");
    setProgramaAArchivar(prog);
  }

  async function confirmarArchivar() {
    if (!programaAArchivar) return;
    const prog = programaAArchivar;
    setProgramaAArchivar(null);
    try {
      await eliminarPrograma(prog.id);
      mostrarMsg("Programa archivado correctamente.", "success");
      await cargarDatos();
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo archivar el programa.");
    }
  }

  async function restaurarPrograma(prog: any) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para restaurar programas.");
    try {
      await cambiarEstadoPrograma(prog.id, "Deshabilitado");
      mostrarMsg(`Programa "${prog.nombre}" restaurado como Deshabilitado.`, "success");
      await cargarDatos();
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo restaurar el programa.");
    }
  }

  function clonarPrograma(prog: any) {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento(prog.tipoDocumento || "Comunicado", programas);
    const datos = datosProgramaAFormulario(prog);

    if (Array.isArray(datos.talleresDeportivos)) {
      datos.talleresDeportivos = datos.talleresDeportivos.map((t, idx) => ({
        ...t,
        id: `taller-clon-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
        cuposOcupados: 0,
      }));
    }

    if (Array.isArray(datos.horariosPorGrupo)) {
      datos.horariosPorGrupo = datos.horariosPorGrupo.map((g, idx) => ({
        ...g,
        id: `grupo-clon-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
        cuposOcupados: 0,
      }));
    }

    coordinacionForm.setForm({
      ...datos,
      id: "",
      fechaInicio: fechaActualInput(),
      fechaFin: fechaActualInput(),
      cuposOcupados: 0,
      estado: "Deshabilitado",
      numeroDocumento: numSugerido,
    });
    setModoEditar(false);
    documentos.setProgramaDocsId("");
    documentos.setLecturaDocumento(null);
    documentos.setPlantillaInputKey((actual: number) => actual + 1);
    setAlertaConfiguracion("");
    mostrarMsg(`Datos del taller "${prog.nombre}" clonados. Asigne las nuevas fechas y guarde.`, "success");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  return {
    programaAFinalizar,
    setProgramaAFinalizar,
    programaAArchivar,
    setProgramaAArchivar,
    abrirCrear,
    abrirCrearDesdeDocumento,
    abrirEditar,
    toggleEstado,
    finalizarPrograma,
    confirmarFinalizar,
    eliminarCurso,
    confirmarArchivar,
    restaurarPrograma,
    clonarPrograma,
  };
}
