import { useState, useMemo, useEffect } from "react";
import { apiDb } from "../../../services/dbApi";
import {
  agruparAsistenciasPorFecha,
  claveFechaAsistencia,
  obtenerDniAsistencia,
  obtenerFechaAsistencia,
  obtenerNombreAsistencia,
  formatearHoraAsistencia,
  limpiarHorarioSinAlmuerzo,
  compararGrados,
  generarFechasProgramadas,
} from "../utils/asistenciasFormatters";
import {
  exportExcelDaily,
  exportPdfDaily,
  exportExcelMonthly,
  exportPdfMonthly,
  exportPdfIndividual,
} from "../utils/asistenciaExports";
import { resolverHorarioPorGrado, resolverDocentePorGrado } from "../../secretaria/services/secretariaServiceUtils";

interface UseAsistenciasProps {
  programas: any[];
  listarAsistenciasPrograma: (programaId: string) => Promise<any[]>;
  listarMatriculados: (programaId: string) => Promise<any[]>;
}

export default function useAsistencias({
  programas,
  listarAsistenciasPrograma,
  listarMatriculados,
}: UseAsistenciasProps) {
  const [tallerId, setTallerId] = useState("");
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [matriculados, setMatriculados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [vistaTipo, setVistaTipo] = useState("diario"); // "diario" | "mensual"
  const [busqueda, setBusqueda] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");

  // Fetch asistencias and matriculados whenever selected tallerId changes
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

          let combinedAsistencias: any[] = [];
          let combinedMatriculados: any[] = [];

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
          setFechaSeleccionada(""); // Reset date selection
          setGradoSeleccionado("TODOS"); // Default to TODOS
        }
      } catch (err: any) {
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

  // Group fetched attendance data by date (newest first for dropdown)
  const gruposFecha = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.values(agrupado).sort((a: any, b: any) => b.clave.localeCompare(a.clave));
  }, [asistencias]);

  // Chronological dates list for the monthly matrix
  const fechasColumnas = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    const fechasDeAsistencias = Object.keys(agrupado);
    
    let fechasProgramadas: string[] = [];
    if (tallerId && tallerId !== "TODOS_TALLERES" && programaSeleccionado) {
      fechasProgramadas = generarFechasProgramadas(
        programaSeleccionado,
        programaSeleccionado.fechaInicio,
        programaSeleccionado.fechaFin
      );
    } else if (tallerId === "TODOS_TALLERES") {
      const activePrograms = programas.filter((p) => p.estado !== "Archivado");
      const setFechasAll = new Set<string>();
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

  // Attendance lookup map helper (stores entry time for monthly matrix)
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

  // Sort matriculados alphabetically
  const matriculadosOrdenados = useMemo(() => {
    return [...matriculados].sort((a, b) =>
      String(a.nombres || a.nombresEstudiante || "").localeCompare(String(b.nombres || b.nombresEstudiante || ""))
    );
  }, [matriculados]);

  // Get list of enabled grades for the selected workshop
  const gradosHabilitados = useMemo(() => {
    if (!programaSeleccionado) return [];

    if (Array.isArray(programaSeleccionado.horariosPorGrupo) && programaSeleccionado.horariosPorGrupo.length > 0) {
      const setGrados = new Set();
      programaSeleccionado.horariosPorGrupo.forEach((grupo) => {
        if (Array.isArray(grupo.grados)) {
          grupo.grados.forEach((g) => setGrados.add(g));
        }
      });
      return Array.from(setGrados).sort() as string[];
    }

    if (Array.isArray(programaSeleccionado.gradosAplicables) && programaSeleccionado.gradosAplicables.length > 0) {
      return [...programaSeleccionado.gradosAplicables].sort() as string[];
    }

    const setGrados = new Set();
    matriculados.forEach((alumno) => {
      const g = alumno.grado || alumno.gradoEstudiante;
      if (g) setGrados.add(g);
    });
    return Array.from(setGrados).sort() as string[];
  }, [programaSeleccionado, matriculados]);

  // Format grades for select dropdown
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

  // Resolve schedule for selected grade
  const horarioDeGrado = useMemo(() => {
    if (!programaSeleccionado) return "";
    
    let result = "";
    
    // Try to resolve specific schedule for the selected grade first
    if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
      const resuelto = resolverHorarioPorGrado(programaSeleccionado, gradoSeleccionado);
      if (resuelto) result = resuelto;
    }
    
    // Fallback to general schedule
    if (!result && programaSeleccionado.horario) {
      result = programaSeleccionado.horario;
    }
    
    // Fallback to group schedules summary if general schedule is empty
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

  // Resolve teacher for selected grade
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

  // Label for selected grade
  const gradoLabel = useMemo(() => {
    if (!gradoSeleccionado) return "";
    return selectGradosData.find((g) => g.value === gradoSeleccionado)?.label || gradoSeleccionado;
  }, [gradoSeleccionado, selectGradosData]);

  // Search and grade filter for students
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

  // Active date group for daily view
  const grupoActivo = useMemo(() => {
    if (!gruposFecha.length) return null;
    return gruposFecha.find((g) => g.clave === fechaSeleccionada) || gruposFecha[0];
  }, [gruposFecha, fechaSeleccionada]);

  // Search and grade filter for daily view rows
  const filasGrupoActivoFiltradas = useMemo(() => {
    if (!grupoActivo) return [];

    let list = grupoActivo.filas;

    if (gradoSeleccionado && gradoSeleccionado !== "TODOS") {
      list = list.filter((asist: any) => {
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
    return list.filter((asist: any) => {
      const nombre = String(obtenerNombreAsistencia(asist) || "").toLowerCase();
      const dni = String(obtenerDniAsistencia(asist) || "").toLowerCase();
      const codigo = String(asist.codigoEstudiante || "").toLowerCase();
      return nombre.includes(query) || dni.includes(query) || codigo.includes(query);
    });
  }, [grupoActivo, gradoSeleccionado, gradosHabilitados, matriculados, busqueda]);

  // Set active date key when active group changes
  useEffect(() => {
    if (grupoActivo && !fechaSeleccionada) {
      setFechaSeleccionada(grupoActivo.clave);
    }
  }, [grupoActivo, fechaSeleccionada]);

  const indiceActivo = useMemo(() => {
    if (!grupoActivo) return -1;
    return gruposFecha.findIndex((g) => g.clave === grupoActivo.clave);
  }, [gruposFecha, grupoActivo]);

  const irAnterior = () => {
    if (indiceActivo < gruposFecha.length - 1) {
      setFechaSeleccionada(gruposFecha[indiceActivo + 1].clave);
    }
  };

  const irSiguiente = () => {
    if (indiceActivo > 0) {
      setFechaSeleccionada(gruposFecha[indiceActivo - 1].clave);
    }
  };

  const programaExportInfo = useMemo(() => {
    if (tallerId === "TODOS_TALLERES") {
      return {
        id: "TODOS_TALLERES",
        nombre: "Todos los talleres",
        responsable: "Varios Docentes",
        horario: "Varios Horarios",
      };
    }
    if (!programaSeleccionado) return null;
    return {
      ...programaSeleccionado,
      nombre: gradoLabel ? `${programaSeleccionado.nombre} - ${gradoLabel}` : programaSeleccionado.nombre,
      horario: limpiarHorarioSinAlmuerzo(horarioDeGrado || programaSeleccionado.horario),
      responsable: docenteDeGrado || programaSeleccionado.responsable,
    };
  }, [tallerId, programaSeleccionado, gradoLabel, horarioDeGrado, docenteDeGrado]);

  // Excel Export Handler (Daily View)
  const handleExportExcelDaily = async () => {
    try {
      if (!programaExportInfo) return;
      await exportExcelDaily({
        programaSeleccionado: programaExportInfo,
        grupoActivo: grupoActivo ? {
          ...grupoActivo,
          filas: filasGrupoActivoFiltradas,
        } : null,
        matriculadosOrdenados: matriculadosFiltrados,
        hasMatriculados: matriculadosFiltrados.length > 0,
        asistencias,
        programas,
      });
    } catch (err: any) {
      setMensaje(err.message || "No se pudo exportar a Excel.");
      setTipoMsg("error");
    }
  };

  // PDF Export Handler (Daily View)
  const handleExportPdfDaily = () => {
    try {
      if (!programaExportInfo) return;
      exportPdfDaily({
        programaSeleccionado: programaExportInfo,
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
    } catch (err: any) {
      setMensaje(err.message || "No se pudo exportar a PDF.");
      setTipoMsg("error");
    }
  };

  // Excel Export Handler (Monthly Matrix View)
  const handleExportExcelMonthly = async () => {
    try {
      if (!programaExportInfo) return;
      await exportExcelMonthly({
        programaSeleccionado: programaExportInfo,
        matriculados: matriculadosFiltrados,
        matriculadosOrdenados: matriculadosFiltrados,
        fechasColumnas,
        checkMap,
        programas,
      });
    } catch (err: any) {
      setMensaje(err.message || "No se pudo exportar consolidado a Excel.");
      setTipoMsg("error");
    }
  };

  // PDF Export Handler (Monthly Matrix View - Landscape)
  const handleExportPdfMonthly = () => {
    try {
      if (!programaExportInfo) return;
      exportPdfMonthly({
        programaSeleccionado: programaExportInfo,
        matriculados: matriculadosFiltrados,
        matriculadosOrdenados: matriculadosFiltrados,
        fechasColumnas,
        checkMap,
        programas,
      });
    } catch (err: any) {
      setMensaje(err.message || "No se pudo exportar consolidado a PDF.");
      setTipoMsg("error");
    }
  };

  // PDF Export Handler (Individual Attendance Report)
  const handleExportPdfIndividual = (alumno: any) => {
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
    } catch (err: any) {
      setMensaje(err.message || "No se pudo exportar el reporte individual de asistencia.");
      setTipoMsg("error");
    }
  };

  const selectProgramasData = useMemo(() => {
    const list = programas
      .filter((p) => (p.estado || "Habilitado") === "Habilitado")
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
        filasFiltradas = filasFiltradas.filter((asist: any) => {
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
    programaSeleccionado,
    gruposFecha,
    fechasColumnas,
    checkMap,
    gradosHabilitados,
    selectGradosData,
    horarioDeGrado,
    docenteDeGrado,
    gradoLabel,
    matriculadosFiltrados,
    grupoActivo,
    filasGrupoActivoFiltradas,
    indiceActivo,
    irAnterior,
    irSiguiente,
    handleExportExcelDaily,
    handleExportPdfDaily,
    handleExportExcelMonthly,
    handleExportPdfMonthly,
    handleExportPdfIndividual,
    selectProgramasData,
    selectFechasData,
    hasMatriculados,
  };
}
