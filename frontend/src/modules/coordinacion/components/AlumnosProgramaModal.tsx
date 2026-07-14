import {
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconFileDownload as FileDown,
  IconX as X,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { limpiarHorarioSinAlmuerzo } from "../utils/asistenciasFormatters";
import { exportPdfDaily, exportExcelDaily, exportPdfAllDays, exportExcelAllDays } from "../utils/asistenciaExports";

const tabStyle = (activo) => ({
  background: "none",
  border: "none",
  borderBottom: activo ? "3px solid #006b5b" : "3px solid transparent",
  color: activo ? "#006b5b" : "#475467",
  fontWeight: 700,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "all 0.15s ease",
});

const badgeStyle = (activo, tone) => ({
  padding: "2px 6px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 700,
  background: activo ? "#e8f7ef" : tone === "warning" ? "#fef6e7" : "#fdf2f2",
  color: activo ? "#006b5b" : tone === "warning" ? "#b25e00" : "#b42318",
});

function obtenerEstiloInscripcion(estado = "") {
  const norm = String(estado).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esActivo = ["validado", "pago validado", "completado", "inscrito", "aprobado", "matriculado"].includes(norm);
  const esAdvertencia = ["pendiente", "reserva pendiente", "reserva", "en espera"].includes(norm);
  return badgeStyle(esActivo, esAdvertencia ? "warning" : "error");
}

function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeno Academico",
  };
  return opciones[seleccion] || (seleccion || "-");
}

function AlumnosProgramaModal({
  asistencias = [],
  descargarPdfAlumnos,
  exportarAExcel,
  invitados,
  matriculados,
  onClose,
  programa,
  setSubVistaAlumnos,
  subVistaAlumnos,
}) {
  const invitadosFiltrados = useMemo(() => {
    const dnisMatriculados = new Set(
      matriculados
        .map((m) => String(m.dni || m.dniEstudiante || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const codigosMatriculados = new Set(
      matriculados
        .map((m) => String(m.codigoEstudiante || "").trim().toLowerCase())
        .filter(Boolean)
    );
    return invitados.filter((inv) => {
      const dni = String(inv.dni || "").trim().toLowerCase();
      const codigo = String(inv.codigoEstudiante || "").trim().toLowerCase();
      
      const yaMatriculadoDni = dni && dnisMatriculados.has(dni);
      const yaMatriculadoCodigo = codigo && codigosMatriculados.has(codigo);

      return !yaMatriculadoDni && !yaMatriculadoCodigo;
    });
  }, [invitados, matriculados]);

  const listaActual = subVistaAlumnos === "preinscritos"
    ? invitadosFiltrados
    : subVistaAlumnos === "asistencias"
      ? asistencias
      : matriculados;
  const puedeDescargar = subVistaAlumnos === "matriculados";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="coord-modal-overlay" onClick={onClose}>
      <div className="coord-modal coord-modal-students" onClick={(event) => event.stopPropagation()}>
        <div className="coord-modal-header">
          <h2>Alumnos del programa – {programa?.nombre}</h2>
          <button className="coord-modal-close" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="coord-modal-body">
          <div className="coord-tabs-header" style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2ece9", paddingBottom: "10px", marginBottom: "16px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className={`coord-tab-btn ${subVistaAlumnos === "preinscritos" ? "is-active" : ""}`}
                onClick={() => setSubVistaAlumnos("preinscritos")}
                style={tabStyle(subVistaAlumnos === "preinscritos")}
              >
                Pre-inscritos (Excel) ({invitadosFiltrados.length})
              </button>
              <button
                type="button"
                className={`coord-tab-btn ${subVistaAlumnos === "matriculados" ? "is-active" : ""}`}
                onClick={() => setSubVistaAlumnos("matriculados")}
                style={tabStyle(subVistaAlumnos === "matriculados")}
              >
                Matriculados (Cajera / Padres) ({matriculados.length})
              </button>
              <button
                type="button"
                className={`coord-tab-btn ${subVistaAlumnos === "asistencias" ? "is-active" : ""}`}
                onClick={() => setSubVistaAlumnos("asistencias")}
                style={tabStyle(subVistaAlumnos === "asistencias")}
              >
                Asistencia (Auxiliar) ({asistencias.length})
              </button>
            </div>

            {puedeDescargar && (
              <div className="coord-invitados-actions" style={{ display: "flex", gap: "10px", margin: 0 }}>
                <button
                  className="coord-primary-button"
                  type="button"
                  onClick={() => descargarPdfAlumnos(subVistaAlumnos)}
                  disabled={!listaActual.length}
                  style={{ display: "flex", alignItems: "center", gap: "6px", height: "34px", minHeight: "34px" }}
                >
                  <FileDown size={15} />
                  <span>Descargar PDF</span>
                </button>
                <button
                  className="coord-template-autofill"
                  type="button"
                  onClick={() => exportarAExcel(subVistaAlumnos)}
                  disabled={!listaActual.length}
                  style={{ display: "flex", alignItems: "center", gap: "6px", height: "34px", minHeight: "34px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
                >
                  <FileDown size={15} />
                  <span>Exportar Excel</span>
                </button>
              </div>
            )}
          </div>

          {subVistaAlumnos === "preinscritos" ? (
            <TablaPreinscritos
              alumnos={invitadosFiltrados}
              esCambridge={String(programa?.nombre || "").toLowerCase().includes("cambridge")}
            />
          ) : subVistaAlumnos === "asistencias" ? (
            <TablaAsistencias
              asistencias={asistencias}
              matriculados={matriculados}
              invitados={invitados}
              programa={programa}
            />
          ) : (
            <TablaMatriculados alumnos={matriculados} />
          )}
        </div>
      </div>
    </div>
  );
}

function descomponerGradoYNivel(alumno) {
  const textoGrado = String(alumno.grado || "").trim();
  const nivelExistente = alumno.nivel || alumno.nivel_nombre || alumno.nivelEducativo || "";

  if (!textoGrado) {
    return {
      grado: "—",
      nivel: nivelExistente ? (nivelExistente.charAt(0).toUpperCase() + nivelExistente.slice(1).toLowerCase()) : "—"
    };
  }

  const lower = textoGrado.toLowerCase();
  let nivel = "";
  let grado = textoGrado;

  if (lower.includes("inicial")) {
    nivel = "Inicial";
    grado = textoGrado.replace(/inicial/i, "").trim();
  } else if (lower.includes("primaria")) {
    nivel = "Primaria";
    grado = textoGrado.replace(/primaria/i, "").trim();
  } else if (lower.includes("secundaria")) {
    nivel = "Secundaria";
    grado = textoGrado.replace(/secundaria/i, "").trim();
  }

  if (!nivel && nivelExistente) {
    nivel = nivelExistente.charAt(0).toUpperCase() + nivelExistente.slice(1).toLowerCase();
  }

  return {
    grado: grado || "—",
    nivel: nivel || "—"
  };
}

function TablaPreinscritos({ alumnos, esCambridge }) {
  if (!alumnos.length) {
    return <p className="coord-process-note">No hay invitados registrados para este programa.</p>;
  }
  const mostrarCambridge = esCambridge && alumnos.some((alumno) => alumno.seleccion || alumno.nivelCambridge);

  return (
    <div className="coord-table-wrap">
      <table className="coord-table">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Código</th>
            <th>Estudiante</th>
            <th>Grado</th>
            <th>Nivel</th>
            {mostrarCambridge ? <th>Ingreso Cambridge</th> : null}
            {mostrarCambridge ? <th>Nivel Cambridge</th> : null}
          </tr>
        </thead>
        <tbody>
          {alumnos.map((alumno, index) => {
            const { grado, nivel } = descomponerGradoYNivel(alumno);
            return (
              <tr key={`${alumno.dni || alumno.codigoEstudiante || alumno.nombres}-${index}`}>
                <td>{alumno.dni || "Sin DNI"}</td>
                <td>{alumno.codigoEstudiante || "—"}</td>
                <td>{alumno.nombres}</td>
                <td>{grado}</td>
                <td>{nivel}</td>
                {mostrarCambridge ? <td>{describirSeleccionCambridge(alumno.seleccion)}</td> : null}
                {mostrarCambridge ? <td>{alumno.nivelCambridge || "Pendiente"}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TablaMatriculados({ alumnos }) {
  if (!alumnos.length) {
    return <p className="coord-process-note">No hay alumnos matriculados aún para este programa.</p>;
  }

  return (
    <div className="coord-table-wrap">
      <table className="coord-table">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Código</th>
            <th>Estudiante</th>
            <th>Grado</th>
            <th>Nivel</th>
            <th>Estado Inscripción</th>
            <th>Canal</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map((alumno, index) => {
            const { grado, nivel } = descomponerGradoYNivel(alumno);
            return (
              <tr key={`${alumno.dni || alumno.codigoEstudiante || alumno.nombres}-${index}`}>
                <td>{alumno.dni || "Sin DNI"}</td>
                <td>{alumno.codigoEstudiante || "—"}</td>
                <td><strong>{alumno.nombres}</strong></td>
                <td>{grado}</td>
                <td>{nivel}</td>
                <td>
                  <span style={obtenerEstiloInscripcion(alumno.estadoInscripcion)}>
                    {alumno.estadoInscripcion}
                  </span>
                </td>
                <td><span style={{ fontSize: "11px", fontWeight: 600, color: "#475467" }}>{alumno.origenRegistro}</span></td>
                <td><span style={{ fontSize: "11px", color: "#667085" }}>{alumno.fechaRegistro ? alumno.fechaRegistro.split("T")[0] : "—"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatearFechaAsistencia(valor) {
  if (!valor) return "Sin fecha";
  let fecha;
  if (typeof valor === "string" && valor.length === 10 && valor.includes("-")) {
    const [y, m, d] = valor.split("-").map(Number);
    fecha = new Date(y, m - 1, d);
  } else {
    fecha = new Date(valor);
  }
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  
  const diaSemana = fecha.toLocaleDateString("es-PE", { weekday: "long" });
  const diaNum = String(fecha.getDate()).padStart(2, "0");
  const mesNombre = fecha.toLocaleDateString("es-PE", { month: "long" });
  
  const capDiaSemana = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  const capMesNombre = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
  
  return `${capDiaSemana} ${diaNum} de ${capMesNombre}`;
}

function obtenerFechaAsistencia(asistencia = {}) {
  return asistencia.fechaRegistro || asistencia.fecha || asistencia.createdAt || asistencia.fechaAsistencia || "";
}

function obtenerDniAsistencia(asistencia = {}) {
  return asistencia.dni || asistencia.dniEstudiante || asistencia.estudianteId || "";
}

function obtenerNombreAsistencia(asistencia = {}) {
  return asistencia.nombres || asistencia.nombresEstudiante || asistencia.nombres_estudiante || asistencia.estudianteNombre || asistencia.alumno || "";
}

function obtenerCodigoAsistencia(asistencia = {}) {
  return asistencia.codigoEstudiante || asistencia.codigo_estudiante || asistencia.codigoAlumno || "";
}

function obtenerHorarioAsistencia(asistencia = {}) {
  const raw = asistencia.horario || asistencia.horarioTaller || asistencia.programaHorario || "";
  const sinAlmuerzo = limpiarHorarioSinAlmuerzo(raw);
  return sinAlmuerzo.replace(/^[^:]+:\s*/, "");
}

function obtenerEstadoAccesoAsistencia(asistencia = {}) {
  return asistencia.estadoAcceso || asistencia.estado || asistencia.estadoAsistencia || "";
}

function formatearHoraAsistencia(valor) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearHoraYFechaAsistencia(valor, esRango) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  const horaText = fecha.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (esRango) {
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes} ${horaText}`;
  }
  return horaText;
}

function claveFechaAsistencia(valor) {
  if (!valor) return "sin-fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "sin-fecha";
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function agruparAsistenciasPorFecha(asistencias) {
  return asistencias.reduce((grupos, asistencia) => {
    const fecha = obtenerFechaAsistencia(asistencia);
    const clave = claveFechaAsistencia(fecha);
    if (!grupos[clave]) {
      grupos[clave] = {
        clave,
        titulo: formatearFechaAsistencia(fecha),
        filas: [],
      };
    }
    grupos[clave].filas.push(asistencia);
    return grupos;
  }, {});
}

function TablaAsistencias({ asistencias, matriculados = [], invitados = [], programa }: { asistencias: any[]; matriculados: any[]; invitados: any[]; programa: any }) {
  const [fechaInicioSeleccionada, setFechaInicioSeleccionada] = useState("");
  const [fechaFinSeleccionada, setFechaFinSeleccionada] = useState("");
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("todos");
  const [tallerSeleccionado, setTallerSeleccionado] = useState("todos");
  const [rangoExportar, setRangoExportar] = useState("dia");

  const grupos = useMemo(
    () => Object.values(agruparAsistenciasPorFecha(asistencias))
      .sort((a, b) => String(b.clave).localeCompare(String(a.clave))),
    [asistencias]
  );

  useEffect(() => {
    if (grupos.length > 0 && !fechaInicioSeleccionada) {
      setFechaInicioSeleccionada(grupos[0].clave);
      setFechaFinSeleccionada(grupos[0].clave);
    }
  }, [grupos, fechaInicioSeleccionada]);

  const esUnicoDia = fechaInicioSeleccionada === fechaFinSeleccionada;

  const grupoActivo = useMemo(() => {
    const found = grupos.find((grupo) => grupo.clave === fechaInicioSeleccionada);
    if (found) return found;
    if (fechaInicioSeleccionada) {
      return {
        clave: fechaInicioSeleccionada,
        titulo: formatearFechaAsistencia(fechaInicioSeleccionada),
        filas: [],
      };
    }
    return grupos[0] || { clave: "", titulo: "", filas: [] };
  }, [grupos, fechaInicioSeleccionada]);

  const indiceActivo = grupos.findIndex((grupo) => grupo.clave === grupoActivo?.clave);

  const filasEnRango = useMemo(() => {
    if (!fechaInicioSeleccionada || !fechaFinSeleccionada) return [];
    return asistencias.filter((asistencia) => {
      const fechaClave = claveFechaAsistencia(obtenerFechaAsistencia(asistencia));
      return fechaClave >= fechaInicioSeleccionada && fechaClave <= fechaFinSeleccionada;
    });
  }, [asistencias, fechaInicioSeleccionada, fechaFinSeleccionada]);

  const tituloRango = useMemo(() => {
    if (!fechaInicioSeleccionada || !fechaFinSeleccionada) return "Asistencia";
    if (fechaInicioSeleccionada === fechaFinSeleccionada) {
      return formatearFechaAsistencia(fechaInicioSeleccionada);
    }
    return `Rango: Del ${formatearFechaAsistencia(fechaInicioSeleccionada)} al ${formatearFechaAsistencia(fechaFinSeleccionada)}`;
  }, [fechaInicioSeleccionada, fechaFinSeleccionada]);

  // Extraer todos los docentes únicos del programa (del docente principal o los docentes por grupo)
  const profesores = useMemo(() => {
    if (!programa) return [];
    const setDocentes = new Set<string>();
    
    if (Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0) {
      programa.talleresDeportivos.forEach((t: any) => {
        if (tallerSeleccionado !== "todos" && String(t.deporte).trim().toLowerCase() !== tallerSeleccionado.trim().toLowerCase()) {
          return;
        }
        const doc = t.docente || t.responsable;
        if (doc) {
          const parts = String(doc).split(/[,/]+|\s+y\s+/i);
          parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed) setDocentes.add(trimmed);
          });
        }
      });
    } else {
      if (programa.responsable) {
        const parts = String(programa.responsable).split(/[,/]+|\s+y\s+/i);
        parts.forEach(part => {
          const trimmed = part.trim();
          if (trimmed) setDocentes.add(trimmed);
        });
      }
      
      if (Array.isArray(programa.horariosPorGrupo)) {
        programa.horariosPorGrupo.forEach((g: any) => {
          if (g.responsable) {
            const parts = String(g.responsable).split(/[,/]+|\s+y\s+/i);
            parts.forEach(part => {
              const trimmed = part.trim();
              if (trimmed) setDocentes.add(trimmed);
            });
          }
        });
      }
    }
    
    return Array.from(setDocentes).filter(Boolean).sort();
  }, [programa, tallerSeleccionado]);

  // Resetear la selección de profesor si el taller seleccionado cambia y el profesor ya no está en la lista filtrada
  useEffect(() => {
    if (profesorSeleccionado !== "todos" && !profesores.includes(profesorSeleccionado)) {
      setProfesorSeleccionado("todos");
    }
  }, [profesores, profesorSeleccionado]);

  // Resolver el profesor/docente asignado a un alumno según su grado y nivel
  const obtenerDocenteResponsable = useCallback((dni: string) => {
    const alumnoMatriculado = matriculados.find(m => m.dni === dni || m.dniEstudiante === dni);
    const alumnoInvitado = invitados.find(i => i.dni === dni);
    const alumnoRef = alumnoMatriculado || alumnoInvitado || {};
    
    if (!programa) return "";

    // Si es un taller deportivo con bloques por edad
    if (Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0) {
      const { grado, nivel } = descomponerGradoYNivel(alumnoRef);
      if (!grado || grado === "—") return programa.responsable || "Sin asignar";
      
      const num = parseInt(grado, 10);
      let edad = isNaN(num) ? 6 : num;
      const lowerNivel = String(nivel || "").toLowerCase();
      if (lowerNivel.includes("primaria")) {
        edad = num + 5;
      } else if (lowerNivel.includes("secundaria")) {
        edad = num + 11;
      } else if (lowerNivel.includes("inicial")) {
        edad = num;
      }
      if (edad < 6) edad = 6;

      const matchedBlock = programa.talleresDeportivos.find((t: any) => 
        edad >= Number(t.edadMinima || t.edad_minima || 0) && edad <= Number(t.edadMaxima || t.edad_maxima || 99)
      );
      
      return matchedBlock?.docente || matchedBlock?.responsable || programa.responsable || "Sin asignar";
    }
    
    if (!Array.isArray(programa.horariosPorGrupo) || programa.horariosPorGrupo.length === 0) {
      return programa.responsable || "Sin asignar";
    }
    
    const { grado, nivel } = descomponerGradoYNivel(alumnoRef);
    if (!grado || grado === "—") return programa.responsable || "Sin asignar";
    
    const searchKey = `${nivel}:${grado}`.trim().toLowerCase();
    const grupo = programa.horariosPorGrupo.find((g: any) => 
      Array.isArray(g.grados) && g.grados.some((gk: string) => 
        String(gk).trim().toLowerCase() === searchKey
      )
    );
    
    return grupo?.responsable || programa.responsable || "Sin asignar";
  }, [programa, matriculados, invitados]);

  const talleresList = useMemo(() => {
    if (!programa || !Array.isArray(programa.talleresDeportivos)) return [];
    const setTalleres = new Set<string>();
    programa.talleresDeportivos.forEach((t: any) => {
      if (t.deporte) setTalleres.add(t.deporte);
    });
    return Array.from(setTalleres).sort();
  }, [programa]);

  const normalizarString = (txt: string) => 
    String(txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Filtrar las filas del grupo activo según el profesor y taller seleccionados
  const filasFiltradas = useMemo(() => {
    let filas = filasEnRango;
    
    if (profesorSeleccionado !== "todos") {
      filas = filas.filter((asistencia: any) => {
        const dni = obtenerDniAsistencia(asistencia);
        const prof = obtenerDocenteResponsable(dni);
        return String(prof).toLowerCase().includes(profesorSeleccionado.toLowerCase());
      });
    }

    if (tallerSeleccionado !== "todos") {
      filas = filas.filter((asistencia: any) => {
        const horarioText = obtenerHorarioAsistencia(asistencia) || asistencia.horario || "";
        return normalizarString(horarioText).includes(normalizarString(tallerSeleccionado));
      });
    }

    // Ordenar de más reciente a más antiguo
    return [...filas].sort((a, b) => {
      const valA = obtenerFechaAsistencia(a);
      const valB = obtenerFechaAsistencia(b);
      return String(valB).localeCompare(String(valA));
    });
  }, [filasEnRango, profesorSeleccionado, tallerSeleccionado, obtenerDocenteResponsable]);

  // Helper para contar la asistencia filtrada por profesor y taller en la lista de opciones
  const obtenerConteoFiltrado = (grupoFilas: any[]) => {
    let filas = grupoFilas || [];
    
    if (profesorSeleccionado !== "todos") {
      filas = filas.filter((asistencia: any) => {
        const dni = obtenerDniAsistencia(asistencia);
        const prof = obtenerDocenteResponsable(dni);
        return String(prof).toLowerCase().includes(profesorSeleccionado.toLowerCase());
      });
    }

    if (tallerSeleccionado !== "todos") {
      filas = filas.filter((asistencia: any) => {
        const horarioText = obtenerHorarioAsistencia(asistencia) || asistencia.horario || "";
        return normalizarString(horarioText).includes(normalizarString(tallerSeleccionado));
      });
    }

    return filas.length;
  };

  const ejecutarExportarPdf = async () => {
    if (!programa || !fechaInicioSeleccionada) return;
    
    const matriculadosFilt = profesorSeleccionado === "todos" 
      ? matriculados 
      : matriculados.filter(m => String(obtenerDocenteResponsable(m.dni || m.dniEstudiante)).toLowerCase().includes(profesorSeleccionado.toLowerCase()));
      
    const customGrupoActivo = {
      clave: `${fechaInicioSeleccionada}_${fechaFinSeleccionada}`,
      titulo: tituloRango,
      filas: filasFiltradas
    };
    
    await exportPdfDaily({
      programaSeleccionado: {
        ...programa,
        responsable: profesorSeleccionado === "todos" ? programa.responsable : profesorSeleccionado
      },
      grupoActivo: customGrupoActivo,
      matriculados: matriculadosFilt,
      matriculadosOrdenados: matriculadosFilt,
      hasMatriculados: matriculadosFilt.length > 0,
      asistencias: asistencias,
    });
  };

  const ejecutarExportarExcel = async () => {
    if (!programa || !fechaInicioSeleccionada) return;
    
    const matriculadosFilt = profesorSeleccionado === "todos" 
      ? matriculados 
      : matriculados.filter(m => String(obtenerDocenteResponsable(m.dni || m.dniEstudiante)).toLowerCase().includes(profesorSeleccionado.toLowerCase()));
      
    const customGrupoActivo = {
      clave: `${fechaInicioSeleccionada}_${fechaFinSeleccionada}`,
      titulo: tituloRango,
      filas: filasFiltradas
    };
    
    await exportExcelDaily({
      programaSeleccionado: {
        ...programa,
        responsable: profesorSeleccionado === "todos" ? programa.responsable : profesorSeleccionado
      },
      grupoActivo: customGrupoActivo,
      matriculados: matriculadosFilt,
      matriculadosOrdenados: matriculadosFilt,
      hasMatriculados: matriculadosFilt.length > 0,
      asistencias: asistencias,
    });
  };

  const ejecutarExportarHistorialPdf = async () => {
    if (!programa || !grupos || grupos.length === 0) return;
    await exportPdfAllDays({
      programaSeleccionado: programa,
      grupos: grupos,
      matriculados: matriculados,
      invitados: invitados,
    });
  };

  const ejecutarExportarHistorialExcel = async () => {
    if (!programa || !grupos || grupos.length === 0) return;
    await exportExcelAllDays({
      programaSeleccionado: programa,
      grupos: grupos,
      matriculados: matriculados,
      invitados: invitados,
    });
  };

  const irAnterior = () => {
    if (indiceActivo < grupos.length - 1) {
      const nuevaFecha = grupos[indiceActivo + 1].clave;
      setFechaInicioSeleccionada(nuevaFecha);
      setFechaFinSeleccionada(nuevaFecha);
    }
  };

  const irSiguiente = () => {
    if (indiceActivo > 0) {
      const nuevaFecha = grupos[indiceActivo - 1].clave;
      setFechaInicioSeleccionada(nuevaFecha);
      setFechaFinSeleccionada(nuevaFecha);
    }
  };

  if (!asistencias.length) {
    return <p className="coord-process-note">Aun no hay asistencias registradas por Auxiliar para este programa.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      {/* Barra de Filtros: Solo para Fecha, Taller y Profesor */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "10px 16px",
        background: "#f8fafc",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        marginBottom: "2px",
        flexWrap: "wrap"
      }}>
        {/* Navegación y Rango de Fechas */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Fecha:</span>
          <button
            type="button"
            onClick={irAnterior}
            disabled={!esUnicoDia || indiceActivo >= grupos.length - 1}
            title="Día anterior"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #d0d5dd",
              background: "#ffffff",
              color: "#344054",
              cursor: (!esUnicoDia || indiceActivo >= grupos.length - 1) ? "not-allowed" : "pointer",
              opacity: (!esUnicoDia || indiceActivo >= grupos.length - 1) ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <div>
            <input
              type="date"
              value={fechaInicioSeleccionada}
              onChange={(e) => setFechaInicioSeleccionada(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: "#1d2939",
                fontSize: "14px",
                fontWeight: "600",
                height: "36px",
                cursor: "pointer",
                outline: "none",
                width: "140px",
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                fontFamily: "inherit",
              }}
            />
          </div>

          <span style={{ fontSize: "14px", fontWeight: "600", color: "#667085" }}>al</span>

          <div>
            <input
              type="date"
              value={fechaFinSeleccionada}
              onChange={(e) => setFechaFinSeleccionada(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: "#1d2939",
                fontSize: "14px",
                fontWeight: "600",
                height: "36px",
                cursor: "pointer",
                outline: "none",
                width: "140px",
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="button"
            onClick={irSiguiente}
            disabled={!esUnicoDia || indiceActivo <= 0}
            title="Día siguiente"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #d0d5dd",
              background: "#ffffff",
              color: "#344054",
              cursor: (!esUnicoDia || indiceActivo <= 0) ? "not-allowed" : "pointer",
              opacity: (!esUnicoDia || indiceActivo <= 0) ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* selectores de Filtros */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {talleresList.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Taller:</span>
              <select
                value={tallerSeleccionado}
                onChange={(e) => setTallerSeleccionado(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d0d5dd",
                  background: "#ffffff",
                  color: "#1d2939",
                  fontSize: "14px",
                  fontWeight: "600",
                  height: "36px",
                  cursor: "pointer",
                  outline: "none",
                  minWidth: "150px",
                  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                }}
              >
                <option value="todos">Todos los talleres</option>
                {talleresList.map((taller) => (
                  <option key={taller} value={taller}>
                    {taller}
                  </option>
                ))}
              </select>
            </div>
          )}

          {profesores.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Profesor:</span>
              <select
                value={profesorSeleccionado}
                onChange={(e) => setProfesorSeleccionado(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d0d5dd",
                  background: "#ffffff",
                  color: "#1d2939",
                  fontSize: "14px",
                  fontWeight: "600",
                  height: "36px",
                  cursor: "pointer",
                  outline: "none",
                  minWidth: "180px",
                  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                }}
              >
                <option value="todos">Todos los profesores</option>
                {profesores.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="coord-table-wrap">
        {/* Cabecera de la Tabla: Título, Contador y Herramientas de Exportación */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          background: "#f1f5f9",
          borderBottom: "1px solid #cbd5e1",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <strong style={{ color: "#0f172a", fontSize: "15px" }}>{tituloRango}</strong>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              background: "#e2e8f0",
              color: "#475467",
              padding: "2px 8px",
              borderRadius: "12px"
            }}>
              {filasFiltradas.length} alumno{filasFiltradas.length === 1 ? "" : "s"} {filasFiltradas.length === 1 ? "asistió" : "asistieron"}
            </span>
          </div>

          {/* Selector de rango y descarga de reportes */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={rangoExportar}
              onChange={(e) => setRangoExportar(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontSize: "12px",
                fontWeight: "600",
                height: "28px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="dia">Solo este día</option>
              <option value="historial">Historial completo</option>
            </select>

            <button
              type="button"
              onClick={rangoExportar === "dia" ? ejecutarExportarPdf : ejecutarExportarHistorialPdf}
              title={rangoExportar === "dia" ? "Exportar PDF del día" : "Descargar PDF de todo el historial"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FileDown size={12} />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={rangoExportar === "dia" ? ejecutarExportarExcel : ejecutarExportarHistorialExcel}
              title={rangoExportar === "dia" ? "Exportar Excel del día" : "Exportar Excel de todo el historial"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid #86efac",
                background: "#ecfdf5",
                color: "#047857",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FileDown size={12} />
              <span>Excel</span>
            </button>
          </div>
        </div>
        <table className="coord-table" style={{ tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "12%" }}>DNI</th>
              <th style={{ width: "28%" }}>Estudiante</th>
              <th style={{ width: "8%" }}>Grado</th>
              <th style={{ width: "12%" }}>Nivel</th>
              <th style={{ width: "12%" }}>Acceso</th>
              <th style={{ width: "12%" }}>Hora</th>
              <th style={{ width: "16%" }}>Observación</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "24px", fontSize: "14px" }}>
                  No hay asistencias registradas para esta fecha.
                </td>
              </tr>
            ) : (
              filasFiltradas.map((asistencia, index) => {
                const dni = obtenerDniAsistencia(asistencia);
                const alumnoMatriculado = matriculados.find(m => m.dni === dni || m.dniEstudiante === dni);
                const alumnoInvitado = invitados.find(i => i.dni === dni);
                const alumnoRef = alumnoMatriculado || alumnoInvitado || {};
                const { grado, nivel } = descomponerGradoYNivel(alumnoRef);

                const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asistencia);
                const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
                const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));
                const toneAcceso = String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "warning" : "error";
                return (
                  <tr key={`${asistencia.id || dni || obtenerNombreAsistencia(asistencia)}-${index}`}>
                    <td>{dni || "Sin DNI"}</td>
                    <td><strong>{obtenerNombreAsistencia(asistencia) || "-"}</strong></td>
                    <td>{grado}</td>
                    <td>{nivel}</td>
                    <td>
                      <span style={badgeStyle(esAccesoPermitido, toneAcceso)}>
                        {textoAcceso}
                      </span>
                    </td>
                    <td>{formatearHoraYFechaAsistencia(obtenerFechaAsistencia(asistencia), !esUnicoDia)}</td>
                    <td>{asistencia.observacion || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AlumnosProgramaModal;
