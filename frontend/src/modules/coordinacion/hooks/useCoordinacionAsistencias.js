import { useState, useEffect, useMemo } from "react";
import {
  agruparAsistenciasPorFecha,
  claveFechaAsistencia,
  obtenerDniAsistencia,
  obtenerFechaAsistencia,
  obtenerNombreAsistencia,
  formatearHoraAsistencia,
  limpiarHorarioSinAlmuerzo,
} from "../utils/asistenciasFormatters";
import {
  compararGrados,
  generarFechasProgramadas,
} from "../utils/asistenciaHelpers";
import {
  exportExcelDaily,
  exportPdfDaily,
  exportExcelMonthly,
  exportPdfMonthly,
  exportPdfIndividual,
} from "../utils/asistenciaExports";
import { resolverHorarioPorGrado, resolverDocentePorGrado } from "../../secretaria/services/secretariaServiceUtils";

/**
 * Hook personalizado para manejar el estado y exportaciones de las asistencias extracurriculares.
 * 
 * @param {Object} params Parámetros de inicialización.
 * @param {Array} params.programas Listado de programas/talleres extracurriculares activos.
 * @param {Function} params.listarAsistenciasPrograma Llamada API para listar registros de asistencia.
 * @param {Function} params.listarMatriculados Llamada API para listar alumnos matriculados.
 */
export default function useCoordinacionAsistencias({
  programas = [],
  listarAsistenciasPrograma,
  listarMatriculados,
}) {
  const [tallerId, setTallerId] = useState("");
  const [asistencias, setAsistencias] = useState([]);
  const [matriculados, setMatriculados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [vistaTipo, setVistaTipo] = useState("diario"); // "diario" | "mensual"
  const [busqueda, setBusqueda] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");

  /**
   * Carga de manera síncrona los datos de asistencia e inscritos del taller seleccionado.
   */
  useEffect(() => {
    if (!tallerId) {
      setAsistencias([]);
      setMatriculados([]);
      setFechaSeleccionada("");
      setBusqueda("");
      setGradoSeleccionado("");
      return;
    }

    const cargarDatosTaller = async () => {
      setCargando(true);
      setMensaje("");
      try {
        if (tallerId === "TODOS_TALLERES") {
          const activePrograms = programas.filter((p) => p.estado !== "Archivado");
          const allPromises = activePrograms.map((prog) =>
            Promise.all([
              listarAsistenciasPrograma(prog.id),
              listarMatriculados(prog.id)
            ])
          );
          const results = await Promise.all(allPromises);

          let combinedAsistencias = [];
          let combinedMatriculados = [];

          results.forEach(([asistResult, matricResult], idx) => {
            const progId = activePrograms[idx].id;
            const taggedAsist = (asistResult || []).map((a) => ({ ...a, tallerId: progId }));
            const taggedMatric = (matricResult || []).map((m) => ({ ...m, tallerId: progId }));
            combinedAsistencias.push(...taggedAsist);
            combinedMatriculados.push(...taggedMatric);
          });

          setAsistencias(combinedAsistencias);
          setMatriculados(combinedMatriculados);
          setFechaSeleccionada("");
          setGradoSeleccionado("TODOS");
        } else {
          const [asistResult, matricResult] = await Promise.all([
            listarAsistenciasPrograma(tallerId),
            listarMatriculados(tallerId)
          ]);
          setAsistencias(asistResult || []);
          setMatriculados(matricResult || []);
          setFechaSeleccionada("");
          setGradoSeleccionado("TODOS");
        }
      } catch (err) {
        setAsistencias([]);
        setMatriculados([]);
        setMensaje(err.message || "No se pudieron cargar los datos de asistencia.");
        setTipoMsg("error");
      } finally {
        setCargando(false);
      }
    };

    cargarDatosTaller();
  }, [tallerId, listarAsistenciasPrograma, listarMatriculados, programas]);

  const programaSeleccionado = useMemo(() => {
    return programas.find((p) => p.id === tallerId);
  }, [tallerId, programas]);

  // Agrupado de asistencias por fecha
  const gruposFecha = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.values(agrupado).sort((a, b) => b.clave.localeCompare(a.clave));
  }, [asistencias]);

  // Determina las columnas de fechas para el reporte consolidado
  const fechasColumnas = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    const fechasDeAsistencias = Object.keys(agrupado);
    
    let fechasProgramadas = [];
    if (tallerId && tallerId !== "TODOS_TALLERES" && programaSeleccionado) {
      fechasProgramadas = generarFechasProgramadas(
        programaSeleccionado,
        programaSeleccionado.fechaInicio,
        programaSeleccionado.fechaFin
      );
    } else if (tallerId === "TODOS_TALLERES") {
      const activePrograms = programas.filter((p) => p.estado !== "Archivado");
      const setFechasAll = new Set();
      activePrograms.forEach((p) => {
        const fechasProg = generarFechasProgramadas(p, p.fechaInicio, p.fechaFin);
        fechasProg.forEach(f => setFechasAll.add(f));
      });
      fechasProgramadas = Array.from(setFechasAll);
    }

    const unionFechas = Array.from(new Set([...fechasDeAsistencias, ...fechasProgramadas])).sort();

    return unionFechas.map((clave) => {
      const [year, month, day] = clave.split("-");
      const dateObj = new Date(clave + "T00:00:00");
      const diasNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const diaSemanaNombre = diasNombres[dateObj.getDay()];
      
      const infoGrupo = agrupado[clave];
      return {
        clave,
        labelDDMM: `${diaSemanaNombre} ${day}/${month}`,
        titulo: infoGrupo ? infoGrupo.titulo : `${diaSemanaNombre} ${day}/${month}`,
      };
    });
  }, [asistencias, tallerId, programaSeleccionado, programas]);

  // Mapa rápido de búsqueda para la matriz de asistencia consolidada
  const checkMap = useMemo(() => {
    const map = new Map();
    asistencias.forEach((asist) => {
      const fechaRaw = obtenerFechaAsistencia(asist);
      const dateKey = claveFechaAsistencia(fechaRaw);
      const dni = String(obtenerDniAsistencia(asist) || "").trim();
      if (dni && dateKey) {
        const hora = formatearHoraAsistencia(fechaRaw);
        map.set(`${dni}:${dateKey}`, hora);
      }
    });
    return map;
  }, [asistencias]);

  const matriculadosOrdenados = useMemo(() => {
    return [...matriculados].sort((a, b) =>
      String(a.nombres || a.nombresEstudiante || "").localeCompare(String(b.nombres || b.nombresEstudiante || ""))
    );
  }, [matriculados]);

  // Obtiene los grados académicos que corresponden al taller
  const gradosHabilitados = useMemo(() => {
    if (!programaSeleccionado) return [];

    if (Array.isArray(programaSeleccionado.horariosPorGrupo) && programaSeleccionado.horariosPorGrupo.length > 0) {
      const setGrados = new Set();
      programaSeleccionado.horariosPorGrupo.forEach((grupo) => {
        if (Array.isArray(grupo.grados)) {
          grupo.grados.forEach((g) => setGrados.add(g));
        }
      });
      return Array.from(setGrados).sort();
    }

    if (Array.isArray(programaSeleccionado.gradosAplicables) && programaSeleccionado.gradosAplicables.length > 0) {
      return [...programaSeleccionado.gradosAplicables].sort();
    }

    const setGrados = new Set();
    matriculados.forEach((alumno) => {
      const g = alumno.grado || alumno.gradoEstudiante;
      if (g) setGrados.add(g);
    });
    return Array.from(setGrados).sort();
  }, [programaSeleccionado, matriculados]);

  // Formatea los grados para cargarlos en el combobox de filtrado
  const selectGradosData = useMemo(() => {
    const list = gradosHabilitados.map((g) => {
      const parts = String(g || "").split(":");
      let label = g;
      if (parts.length === 2) {
        const nivel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        label = `${parts[1]}° ${nivel}`;
      } else {
        const match = g.match(/(\d+)\s+(\w+)/);
        if (match) {
          const nivel = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
          label = `${match[1]}° ${nivel}`;
        }
      }
      return {
        value: g,
        label: label,
      };
    });
    if (list.length > 0) {
      list.unshift({ value: "TODOS", label: "Todos los grados" });
    }
    return list;
  }, [gradosHabilitados]);

  const horarioDeGrado = useMemo(() => {
    if (!programaSeleccionado) return "";
    let result = "";
    if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
      const resuelto = resolverHorarioPorGrado(programaSeleccionado, gradoSeleccionado);
      if (resuelto) result = resuelto;
    }
    if (!result && programaSeleccionado.horario) {
      result = programaSeleccionado.horario;
    }
    if (!result && Array.isArray(programaSeleccionado.horariosPorGrupo) && programaSeleccionado.horariosPorGrupo.length > 0) {
      const items = programaSeleccionado.horariosPorGrupo.map((g) => {
        const dia = g.dia || "";
        const horas = (g.horaInicio && g.horaFin) ? ` ${g.horaInicio}-${g.horaFin}` : "";
        return `${dia}${horas}`;
      }).filter(Boolean);
      const uniqueItems = Array.from(new Set(items));
      if (uniqueItems.length > 0) {
        result = uniqueItems.join(" | ");
      }
    }
    return limpiarHorarioSinAlmuerzo(result);
  }, [programaSeleccionado, gradoSeleccionado]);

  const docenteDeGrado = useMemo(() => {
    if (!programaSeleccionado) return "";
    if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
      const resuelto = resolverDocentePorGrado(programaSeleccionado, gradoSeleccionado);
      if (resuelto && resuelto !== "No definido") return resuelto;
    }
    if (programaSeleccionado.responsable) {
      return programaSeleccionado.responsable;
    }
    if (Array.isArray(programaSeleccionado.horariosPorGrupo) && programaSeleccionado.horariosPorGrupo.length > 0) {
      const docentes = programaSeleccionado.horariosPorGrupo
        .map((g) => g.responsable || g.tutora || "")
        .filter(Boolean);
      const uniqueDocentes = Array.from(new Set(docentes));
      if (uniqueDocentes.length > 0) {
        return uniqueDocentes.join(", ");
      }
    }
    return "No asignado";
  }, [programaSeleccionado, gradoSeleccionado]);

  const gradoLabel = useMemo(() => {
    if (!gradoSeleccionado) return "";
    return selectGradosData.find((g) => g.value === gradoSeleccionado)?.label || gradoSeleccionado;
  }, [gradoSeleccionado, selectGradosData]);

  // Lista de alumnos matriculados filtrados por búsqueda y grado
  const matriculadosFiltrados = useMemo(() => {
    let list = matriculadosOrdenados;
    if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
      list = list.filter((alumno) => {
        const gAlumno = alumno.grado || alumno.gradoEstudiante || "";
        return compararGrados(gAlumno, gradoSeleccionado);
      });
    } else if (gradosHabilitados.length > 0 && !gradoSeleccionado) {
      return [];
    }

    const query = busqueda.trim().toLowerCase();
    if (!query) return list;
    return list.filter((alumno) => {
      const nombre = String(alumno.nombres || alumno.nombresEstudiante || "").toLowerCase();
      const dni = String(alumno.dni || alumno.dniEstudiante || "").toLowerCase();
      const codigo = String(alumno.codigoEstudiante || "").toLowerCase();
      return nombre.includes(query) || dni.includes(query) || codigo.includes(query);
    });
  }, [matriculadosOrdenados, gradoSeleccionado, gradosHabilitados, busqueda]);

  const grupoActivo = useMemo(() => {
    if (!gruposFecha.length) return null;
    return gruposFecha.find((g) => g.clave === fechaSeleccionada) || gruposFecha[0];
  }, [gruposFecha, fechaSeleccionada]);

  // Lista de registros de asistencia diarios filtrados por búsqueda y grado
  const filasGrupoActivoFiltradas = useMemo(() => {
    if (!grupoActivo) return [];
    let list = grupoActivo.filas;

    if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
      list = list.filter((asist) => {
        const dniAsist = String(asist.dni || obtenerDniAsistencia(asist) || "").trim();
        const matriculado = matriculados.find((m) => String(m.dni || "").trim() === dniAsist);
        const gAlumno = matriculado ? (matriculado.grado || matriculado.gradoEstudiante || "") : "";
        return compararGrados(gAlumno, gradoSeleccionado);
      });
    } else if (gradosHabilitados.length > 0 && !gradoSeleccionado) {
      return [];
    }

    const query = busqueda.trim().toLowerCase();
    if (!query) return list;
    return list.filter((asist) => {
      const nombre = String(obtenerNombreAsistencia(asist) || "").toLowerCase();
      const dni = String(obtenerDniAsistencia(asist) || "").toLowerCase();
      const codigo = String(asist.codigoEstudiante || "").toLowerCase();
      return nombre.includes(query) || dni.includes(query) || codigo.includes(query);
    });
  }, [grupoActivo, gradoSeleccionado, gradosHabilitados, matriculados, busqueda]);

  useEffect(() => {
    if (grupoActivo && !fechaSeleccionada) {
      setFechaSeleccionada(grupoActivo.clave);
    }
  }, [grupoActivo, fechaSeleccionada]);

  const indiceActivo = useMemo(() => {
    if (!grupoActivo) return -1;
    return gruposFecha.findIndex((g) => g.clave === grupoActivo.clave);
  }, [gruposFecha, grupoActivo]);

  /**
   * Navega a la fecha de asistencia cronológica anterior.
   */
  const irAnterior = () => {
    if (indiceActivo < gruposFecha.length - 1) {
      setFechaSeleccionada(gruposFecha[indiceActivo + 1].clave);
    }
  };

  /**
   * Navega a la fecha de asistencia cronológica posterior.
   */
  const irSiguiente = () => {
    if (indiceActivo > 0) {
      setFechaSeleccionada(gruposFecha[indiceActivo - 1].clave);
    }
  };

  // --- MANEJADORES DE EXPORTACIÓN ---

  /**
   * Descarga la lista diaria filtrada en Excel.
   */
  const handleExportExcelDaily = async () => {
    try {
      const progSel = tallerId === "TODOS_TALLERES" ? {
        id: "TODOS_TALLERES",
        nombre: "Todos los talleres",
        responsable: "Varios Docentes",
        horario: "Varios Horarios",
      } : {
        ...programaSeleccionado,
        nombre: gradoLabel ? `${programaSeleccionado.nombre} - ${gradoLabel}` : programaSeleccionado.nombre,
        horario: limpiarHorarioSinAlmuerzo(horarioDeGrado || programaSeleccionado.horario),
        responsable: docenteDeGrado || programaSeleccionado.responsable,
      };

      await exportExcelDaily({
        programaSeleccionado: progSel,
        grupoActivo: grupoActivo ? {
          ...grupoActivo,
          filas: filasGrupoActivoFiltradas,
        } : null,
        matriculadosOrdenados: matriculadosFiltrados,
        hasMatriculados: matriculadosFiltrados.length > 0,
        asistencias,
        programas,
      });
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar a Excel.");
      setTipoMsg("error");
    }
  };

  /**
   * Descarga la lista diaria filtrada en PDF.
   */
  const handleExportPdfDaily = () => {
    try {
      const progSel = tallerId === "TODOS_TALLERES" ? {
        id: "TODOS_TALLERES",
        nombre: "Todos los talleres",
        responsable: "Varios Docentes",
        horario: "Varios Horarios",
      } : {
        ...programaSeleccionado,
        nombre: gradoLabel ? `${programaSeleccionado.nombre} - ${gradoLabel}` : programaSeleccionado.nombre,
        horario: limpiarHorarioSinAlmuerzo(horarioDeGrado || programaSeleccionado.horario),
        responsable: docenteDeGrado || programaSeleccionado.responsable,
      };

      exportPdfDaily({
        programaSeleccionado: progSel,
        grupoActivo: grupoActivo ? {
          ...grupoActivo,
          filas: filasGrupoActivoFiltradas,
        } : null,
        matriculadosOrdenados: matriculadosFiltrados,
        matriculados: matriculadosFiltrados,
        hasMatriculados: matriculadosFiltrados.length > 0,
        asistencias,
        programas,
      });
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar a PDF.");
      setTipoMsg("error");
    }
  };

  /**
   * Descarga la matriz mensual en Excel.
   */
  const handleExportExcelMonthly = async () => {
    try {
      const progSel = tallerId === "TODOS_TALLERES" ? {
        id: "TODOS_TALLERES",
        nombre: "Todos los talleres",
        responsable: "Varios Docentes",
        horario: "Varios Horarios",
      } : {
        ...programaSeleccionado,
        nombre: gradoLabel ? `${programaSeleccionado.nombre} - ${gradoLabel}` : programaSeleccionado.nombre,
        horario: limpiarHorarioSinAlmuerzo(horarioDeGrado || programaSeleccionado.horario),
        responsable: docenteDeGrado || programaSeleccionado.responsable,
      };

      await exportExcelMonthly({
        programaSeleccionado: progSel,
        matriculados: matriculadosFiltrados,
        matriculadosOrdenados: matriculadosFiltrados,
        fechasColumnas,
        checkMap,
        programas,
      });
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar consolidado a Excel.");
      setTipoMsg("error");
    }
  };

  /**
   * Descarga la matriz mensual en PDF horizontal.
   */
  const handleExportPdfMonthly = () => {
    try {
      const progSel = tallerId === "TODOS_TALLERES" ? {
        id: "TODOS_TALLERES",
        nombre: "Todos los talleres",
        responsable: "Varios Docentes",
        horario: "Varios Horarios",
      } : {
        ...programaSeleccionado,
        nombre: gradoLabel ? `${programaSeleccionado.nombre} - ${gradoLabel}` : programaSeleccionado.nombre,
        horario: limpiarHorarioSinAlmuerzo(horarioDeGrado || programaSeleccionado.horario),
        responsable: docenteDeGrado || programaSeleccionado.responsable,
      };

      exportPdfMonthly({
        programaSeleccionado: progSel,
        matriculados: matriculadosFiltrados,
        matriculadosOrdenados: matriculadosFiltrados,
        fechasColumnas,
        checkMap,
        programas,
      });
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar consolidado a PDF.");
      setTipoMsg("error");
    }
  };

  /**
   * Descarga el reporte individual detallado de asistencias de un alumno.
   */
  const handleExportPdfIndividual = (alumno) => {
    try {
      const rawProgSel = tallerId === "TODOS_TALLERES" ? (programas.find((p) => p.id === alumno.tallerId) || {
        id: alumno.tallerId,
        nombre: "Taller Detallado",
        responsable: "No asignado",
        horario: "Por definir",
      }) : {
        ...programaSeleccionado,
        nombre: gradoLabel ? `${programaSeleccionado.nombre} - ${gradoLabel}` : programaSeleccionado.nombre,
        horario: horarioDeGrado || programaSeleccionado.horario,
        responsable: docenteDeGrado || programaSeleccionado.responsable,
      };

      const progSel = {
        ...rawProgSel,
        horario: limpiarHorarioSinAlmuerzo(rawProgSel.horario),
      };

      exportPdfIndividual({
        programaSeleccionado: progSel,
        alumno,
        fechasColumnas,
        checkMap,
      });
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar el reporte individual de asistencia.");
      setTipoMsg("error");
    }
  };

  const selectProgramasData = useMemo(() => {
    const list = programas
      .filter((p) => p.estado !== "Archivado")
      .map((prog) => ({
        value: prog.id,
        label: `${prog.id} - ${prog.nombre}`,
      }));
    if (list.length > 0) {
      list.unshift({ value: "TODOS_TALLERES", label: "Todos los talleres" });
    }
    return list;
  }, [programas]);

  const selectFechasData = useMemo(() => {
    return gruposFecha.map((grupo) => {
      let filasFiltradas = grupo.filas;
      if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
        filasFiltradas = filasFiltradas.filter((asist) => {
          const dniAsist = String(asist.dni || obtenerDniAsistencia(asist) || "").trim();
          const matriculado = matriculados.find((m) => String(m.dni || "").trim() === dniAsist);
          const gAlumno = matriculado ? (matriculado.grado || matriculado.gradoEstudiante || "") : "";
          return compararGrados(gAlumno, gradoSeleccionado);
        });
      }
      return {
        value: grupo.clave,
        label: `${grupo.titulo} (${filasFiltradas.length} asistencia${filasFiltradas.length === 1 ? "" : "s"})`,
      };
    });
  }, [gruposFecha, gradoSeleccionado, matriculados]);

  const hasMatriculados = matriculados.length > 0;

  return {
    tallerId,
    setTallerId,
    asistencias,
    matriculados,
    cargando,
    fechaSeleccionada,
    setFechaSeleccionada,
    mensaje,
    setMensaje,
    tipoMsg,
    setTipoMsg,
    vistaTipo,
    setVistaTipo,
    busqueda,
    setBusqueda,
    gradoSeleccionado,
    setGradoSeleccionado,
    
    // Computados
    programaSeleccionado,
    gruposFecha,
    fechasColumnas,
    checkMap,
    selectGradosData,
    horarioDeGrado,
    docenteDeGrado,
    gradoLabel,
    matriculadosFiltrados,
    grupoActivo,
    filasGrupoActivoFiltradas,
    indiceActivo,
    selectProgramasData,
    selectFechasData,
    hasMatriculados,
    
    // Métodos
    irAnterior,
    irSiguiente,
    handleExportExcelDaily,
    handleExportPdfDaily,
    handleExportExcelMonthly,
    handleExportPdfMonthly,
    handleExportPdfIndividual,
  };
}
