import { useState, useMemo, useEffect } from "react";
import {
  Alert as MantineAlert,
  Select,
  Button,
  Badge,
  Loader,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import {
  IconCalendar as CalendarDays,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconFileDownload as FileDown,
  IconUserCheck as UserCheck,
  IconAlertCircle as AlertCircle,
  IconSearch as Search,
  IconSchool as School,
} from "@tabler/icons-react";
import { apiDb } from "../../../services/dbApi";
import {
  agruparAsistenciasPorFecha,
  badgeStyle,
  calcularEdad,
  claveFechaAsistencia,
  obtenerDniAsistencia,
  obtenerEstadoAccesoAsistencia,
  obtenerFechaAsistencia,
  obtenerNombreAsistencia,
  formatearHoraAsistencia,
  limpiarHorarioSinAlmuerzo,
} from "../utils/asistenciasFormatters";
import {
  exportExcelDaily,
  exportPdfDaily,
  exportExcelMonthly,
  exportPdfMonthly,
  exportPdfIndividual,
} from "../utils/asistenciaExports";
import { resolverHorarioPorGrado, resolverDocentePorGrado } from "../../secretaria/services/secretariaServiceUtils";
import AsistenciaDiariaTable from "./AsistenciaDiariaTable";
import AsistenciaMensualTable from "./AsistenciaMensualTable";

function AsistenciasView({ programas = [], listarAsistenciasPrograma, listarMatriculados, toggleSidebarButton }) {


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

  // Helper function for safe, normalized string matching
  function normalizarTextoSimple(val = "") {
    return String(val || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function compararGrados(g1 = "", g2 = "") {
    const t1 = String(g1 || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const t2 = String(g2 || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
      
    if (t1 === t2) return true;

    const num1 = t1.match(/\d+/)?.[0] || "";
    const num2 = t2.match(/\d+/)?.[0] || "";
    if (!num1 || !num2 || num1 !== num2) return false;

    const nivel1 = ["inicial", "primaria", "secundaria"].find((n) => t1.includes(n)) || "";
    const nivel2 = ["inicial", "primaria", "secundaria"].find((n) => t2.includes(n)) || "";

    return nivel1 === nivel2;
  }

  const parseDiasSemana = (texto = "") => {
    const norm = String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const diasEncontrados = [];
    if (norm.includes("lunes")) diasEncontrados.push(1);
    if (norm.includes("martes")) diasEncontrados.push(2);
    if (norm.includes("miercoles")) diasEncontrados.push(3);
    if (norm.includes("jueves")) diasEncontrados.push(4);
    if (norm.includes("viernes")) diasEncontrados.push(5);
    if (norm.includes("sabado")) diasEncontrados.push(6);
    if (norm.includes("domingo")) diasEncontrados.push(0);
    return diasEncontrados;
  };

  const generarFechasProgramadas = (prog, inicioStr, finStr) => {
    if (!inicioStr || !finStr) return [];
    
    let textoDias = "";
    if (Array.isArray(prog?.horariosPorGrupo) && prog.horariosPorGrupo.length > 0) {
      textoDias = prog.horariosPorGrupo.map(g => g.dia).join(", ");
    } else {
      textoDias = prog?.horario || "";
    }
    
    const diasSemana = parseDiasSemana(textoDias);
    if (diasSemana.length === 0) return [];
    
    const start = new Date(inicioStr + "T00:00:00");
    const end = new Date(finStr + "T00:00:00");
    
    const dates = [];
    let current = new Date(start);
    let safety = 0;
    while (current <= end && safety < 366) {
      safety++;
      const dayOfWeek = current.getDay();
      if (diasSemana.includes(dayOfWeek)) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, "0");
        const day = String(current.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

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
          setFechaSeleccionada(""); // Reset date selection
          setGradoSeleccionado("TODOS"); // Default to TODOS
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

  const programmeSeleccionado = useMemo(() => {
    return programas.find((p) => p.id === tallerId);
  }, [tallerId, programas]);

  const programaSeleccionado = programmeSeleccionado;

  // Group fetched attendance data by date (newest first for dropdown)
  const gruposFecha = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.values(agrupado).sort((a, b) => b.clave.localeCompare(a.clave));
  }, [asistencias]);

  // Chronological dates list for the monthly matrix
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

  // Excel Export Handler (Daily View)
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

  // PDF Export Handler (Daily View)
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

  // Excel Export Handler (Monthly Matrix View)
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

  // PDF Export Handler (Monthly Matrix View - Landscape)
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

  // PDF Export Handler (Individual Attendance Report)
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

  return (
    <>
      <header className="coord-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {toggleSidebarButton}
          <div>
            <span className="coord-topbar-eyebrow">Gestión académica</span>
            <h1>Asistencia y Control</h1>
          </div>
        </div>
      </header>

      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
            <span className="coord-title-icon" style={{ width: "32px", height: "32px" }}><UserCheck size={18} /></span>
            <div>
              <h2 style={{ fontSize: "15px" }}>Control Central de Asistencias</h2>
              <p style={{ fontSize: "12px", marginTop: "1px" }}>Consulte y descargue reportes diarios de asistencia por cada programa.</p>
            </div>
          </div>

          <div className="coord-filtros-card-mantine" style={{ padding: "0", background: "transparent", border: "none", marginBottom: "8px" }}>
            <div className="coord-filtros-row-mantine" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "8px" }}>
              {/* Taller */}
              <div style={{ flex: "2 1 280px" }}>
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                      <UserCheck size={13} style={{ color: "#176c60" }} /> Seleccionar Taller
                    </span>
                  }
                  placeholder="Elija un programa..."
                  value={tallerId}
                  onChange={(value) => setTallerId(value || "")}
                  data={selectProgramasData}
                  size="sm"
                  searchable
                  clearable
                  style={{ width: "100%" }}
                />
              </div>

              {/* Grado selector */}
              {tallerId && selectGradosData.length > 0 && (
                <div style={{ flex: "1 1 200px" }}>
                  <Select
                    label={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                        <School size={13} style={{ color: "#176c60" }} /> Seleccionar Grado
                      </span>
                    }
                    placeholder="Elija un grado..."
                    value={gradoSeleccionado}
                    onChange={(value) => setGradoSeleccionado(value || "TODOS")}
                    data={selectGradosData}
                    size="sm"
                    searchable
                    clearable
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {/* Fecha selector - visible only in daily mode */}
              {vistaTipo === "diario" && (
                <div style={{ flex: "1 1 240px" }}>
                  <Select
                    label={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                        <CalendarDays size={13} style={{ color: "#176c60" }} /> Fecha
                      </span>
                    }
                    placeholder={
                      !tallerId
                        ? "Elija un taller primero"
                        : (selectGradosData.length > 0 && !gradoSeleccionado)
                        ? "Elija un grado primero"
                        : selectFechasData.length
                        ? "Seleccione una fecha..."
                        : "Sin asistencias"
                    }
                    value={fechaSeleccionada}
                    onChange={(value) => setFechaSeleccionada(value || "")}
                    data={selectFechasData}
                    size="sm"
                    disabled={!tallerId || (selectGradosData.length > 0 && !gradoSeleccionado) || !selectFechasData.length}
                    style={{ width: "100%" }}
                    allowDeselect={false}
                  />
                </div>
              )}

              {/* Export Buttons */}
              {tallerId && hasMatriculados && (!selectGradosData.length || gradoSeleccionado) && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
                  {vistaTipo === "diario" && (
                    <>
                      <Button
                        color="sanrafael"
                        onClick={handleExportPdfDaily}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px" }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        color="teal"
                        onClick={handleExportExcelDaily}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px", background: "#f0fdf4" }}
                      >
                        Excel
                      </Button>
                    </>
                  )}
                  {vistaTipo === "mensual" && (
                    <>
                      <Button
                        color="sanrafael"
                        onClick={handleExportPdfMonthly}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px" }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        color="teal"
                        onClick={handleExportExcelMonthly}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px", background: "#f0fdf4" }}
                      >
                        Excel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {mensaje && (
            <MantineAlert
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={<AlertCircle size={18} />}
              style={{ marginBottom: "16px" }}
            >
              {mensaje}
            </MantineAlert>
          )}

          {/* Schedule Info Card */}
          {tallerId && tallerId !== "TODOS_TALLERES" && gradoSeleccionado && !cargando && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              marginBottom: "10px",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Horario de Grado Resuelto
                  </span>
                  <h3 style={{ margin: "1px 0 0 0", color: "#1e3a8a", fontSize: "15px" }}>
                    {programaSeleccionado?.nombre} - {gradoLabel}
                  </h3>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "9px", color: "#60a5fa", fontWeight: 600 }}>DOCENTE</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>{docenteDeGrado || "No asignado"}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "9px", color: "#60a5fa", fontWeight: 600 }}>HORARIO GENERAL</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>{horarioDeGrado || "No definido"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tallerId && !cargando && (!selectGradosData.length || gradoSeleccionado) && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
              <SegmentedControl
                value={vistaTipo}
                onChange={setVistaTipo}
                data={[
                  { label: "Asistencia Diaria", value: "diario" },
                  { label: "Consolidado Mensual (Matriz)", value: "mensual" },
                ]}
                color="teal"
                size="xs"
              />

              <TextInput
                placeholder="Buscar por DNI, nombre o código..."
                leftSection={<Search size={14} style={{ color: "#64748b" }} />}
                value={busqueda}
                onChange={(event) => setBusqueda(event.currentTarget.value)}
                style={{ width: "260px" }}
                size="sm"
                clearable
              />
            </div>
          )}

          {cargando ? (
            <div className="coord-loading" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader color="teal" />
            </div>
          ) : !tallerId ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
              <UserCheck size={36} style={{ color: "#000000", marginBottom: "6px" }} />
              <h3 style={{ color: "#000000", margin: 0, fontSize: "16px", fontWeight: 600 }}>Seleccione un taller</h3>
              <p style={{ color: "#000000", fontSize: "13px", marginTop: "2px", fontWeight: 500 }}>Elija un taller del listado para comenzar a explorar las asistencias.</p>
            </div>
          ) : (selectGradosData.length > 0 && !gradoSeleccionado) ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
              <School size={36} style={{ color: "#000000", marginBottom: "6px" }} />
              <h3 style={{ color: "#000000", margin: 0, fontSize: "16px", fontWeight: 600 }}>Seleccione un grado</h3>
              <p style={{ color: "#000000", fontSize: "13px", marginTop: "2px", fontWeight: 500 }}>Este taller tiene grados habilitados. Seleccione uno para ver el horario y la asistencia.</p>
            </div>
          ) : (asistencias.length === 0 && !hasMatriculados) ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
              <AlertCircle size={36} style={{ color: "#000000", marginBottom: "6px" }} />
              <h3 style={{ color: "#000000", margin: 0, fontSize: "16px", fontWeight: 600 }}>Sin registros de asistencia</h3>
              <p style={{ color: "#000000", fontSize: "13px", marginTop: "2px", fontWeight: 500 }}>Este taller no cuenta con alumnos matriculados ni asistencias registradas.</p>
            </div>
          ) : vistaTipo === "diario" ? (
            (grupoActivo || (asistencias.length === 0 && hasMatriculados)) ? (
              <div style={{ marginTop: "8px" }}>
                {asistencias.length === 0 && (
                  <MantineAlert color="teal" radius="md" style={{ marginBottom: "16px" }}>
                    <strong>Plantilla de asistencia:</strong> Mostrando los estudiantes matriculados. Aún no se han registrado asistencias para este taller. Puede descargar el listado en PDF o Excel.
                  </MantineAlert>
                )}
                {/* Pagination-style Date Picker Bar */}
                {grupoActivo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between", flexWrap: "wrap", padding: "4px 0", background: "transparent", border: "none", borderBottom: "1px dashed #cbd5e1", borderRadius: 0, marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#000000" }}>Navegar Fechas:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={irAnterior}
                        disabled={indiceActivo >= gruposFecha.length - 1}
                        title="Día anterior"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid #d0d5dd",
                          background: "#ffffff",
                          color: "#000000",
                          cursor: indiceActivo >= gruposFecha.length - 1 ? "not-allowed" : "pointer",
                          opacity: indiceActivo >= gruposFecha.length - 1 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#000000", padding: "0 6px" }}>
                        {grupoActivo.titulo}
                      </span>
                      <button
                        type="button"
                        onClick={irSiguiente}
                        disabled={indiceActivo <= 0}
                        title="Día siguiente"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid #d0d5dd",
                          background: "#ffffff",
                          color: "#000000",
                          cursor: indiceActivo <= 0 ? "not-allowed" : "pointer",
                          opacity: indiceActivo <= 0 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <Badge color="sanrafael" size="sm">
                      {filasGrupoActivoFiltradas.length} alumno{filasGrupoActivoFiltradas.length === 1 ? "" : "s"} encontrados
                    </Badge>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", background: "transparent", border: "none", borderBottom: "1px dashed #cbd5e1", borderRadius: 0, marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#000000" }}>Fecha:</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#000000" }}>
                      Plantilla de control físico (Sin registros de asistencia)
                    </span>
                    <Badge color="teal" size="sm">
                      {matriculadosFiltrados.length} alumno{matriculadosFiltrados.length === 1 ? "" : "s"} encontrados
                    </Badge>
                  </div>
                )}

                <AsistenciaDiariaTable
                  grupoActivo={grupoActivo}
                  filasGrupoActivoFiltradas={filasGrupoActivoFiltradas}
                  matriculadosFiltrados={matriculadosFiltrados}
                  handleExportPdfIndividual={handleExportPdfIndividual}
                  programas={programas}
                  tallerId={tallerId}
                />
              </div>
            ) : null
          ) : (
            // Monthly Matrix view (matches physical binder sheet)
            <AsistenciaMensualTable
              hasMatriculados={hasMatriculados}
              asistencias={asistencias}
              fechasColumnas={fechasColumnas}
              matriculadosFiltrados={matriculadosFiltrados}
              checkMap={checkMap}
              handleExportPdfIndividual={handleExportPdfIndividual}
              programas={programas}
              tallerId={tallerId}
            />
          )}
        </article>
      </section>
    </>
  );
}

export default AsistenciasView;
