import { useState } from "react";
import {
  listarInvitados,
  listarMatriculados,
  listarAsistenciasPrograma,
} from "../services/coordinacionService";
import { descargarListaAlumnosPdf } from "../utils/pdfUtils";
import { descargarListaAlumnosExcel } from "../utils/excelUtils";

export default function useCoordinacionInvitados({
  puedeVerAlumnos,
  mostrarMsg,
}) {
  const [showInvitados, setShowInvitados] = useState(false);
  const [invitados, setInvitados] = useState([]);
  const [matriculados, setMatriculados] = useState([]);
  const [asistenciasPrograma, setAsistenciasPrograma] = useState([]);
  const [subVistaAlumnos, setSubVistaAlumnos] = useState("preinscritos");
  const [progSeleccionado, setProgSeleccionado] = useState(null);

  async function refrescarAlumnosModal(prog) {
    if (!prog) return;
    try {
      const lista = await listarInvitados(prog.id);
      const listaMatriculados = await listarMatriculados(prog.id);
      const listaAsistencias = await listarAsistenciasPrograma(prog.id);
      setInvitados(lista);
      setMatriculados(listaMatriculados);
      setAsistenciasPrograma(listaAsistencias);
    } catch (err) {
      console.warn("Error refrescando alumnos modal:", err);
    }
  }

  async function verInvitados(prog) {
    if (!puedeVerAlumnos) return mostrarMsg("No tiene permiso para ver alumnos.");
    setProgSeleccionado(prog);
    setSubVistaAlumnos("preinscritos");
    const lista = await listarInvitados(prog.id);
    const listaMatriculados = await listarMatriculados(prog.id);
    const listaAsistencias = await listarAsistenciasPrograma(prog.id);
    setInvitados(lista);
    setMatriculados(listaMatriculados);
    setAsistenciasPrograma(listaAsistencias);
    setShowInvitados(true);
  }

  function descargarPdfAlumnos(tipo) {
    if (!progSeleccionado) return;
    if (tipo === "preinscritos") {
      mostrarMsg("Solo se puede descargar la lista de alumnos matriculados.", "warning");
      return;
    }
    const isPre = tipo === "preinscritos";
    const lista = isPre ? invitados : matriculados;
    if (!lista.length) {
      mostrarMsg("No hay alumnos en esta lista para descargar.", "warning");
      return;
    }

    descargarListaAlumnosPdf(progSeleccionado, lista);
    mostrarMsg("Lista de alumnos descargada en PDF.", "success");
  }

  async function exportarAExcel(tipo) {
    if (!progSeleccionado) return;
    if (tipo === "preinscritos") {
      mostrarMsg("Solo se puede exportar la lista de alumnos matriculados.", "warning");
      return;
    }
    const isPre = tipo === "preinscritos";
    const data = isPre ? invitados : matriculados;
    if (!data.length) {
      mostrarMsg("No hay datos para exportar.", "warning");
      return;
    }

    try {
      await descargarListaAlumnosExcel(progSeleccionado, tipo, data);
      mostrarMsg("Archivo Excel descargado.", "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo exportar el archivo Excel.");
    }
  }

  return {
    showInvitados,
    setShowInvitados,
    invitados,
    setInvitados,
    matriculados,
    setMatriculados,
    asistenciasPrograma,
    setAsistenciasPrograma,
    subVistaAlumnos,
    setSubVistaAlumnos,
    progSeleccionado,
    setProgSeleccionado,
    refrescarAlumnosModal,
    verInvitados,
    descargarPdfAlumnos,
    exportarAExcel,
  };
}
