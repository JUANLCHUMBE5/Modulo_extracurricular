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
  const listaActual = subVistaAlumnos === "preinscritos"
    ? invitados
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
          <div className="coord-tabs-header" style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2ece9", paddingBottom: "10px", marginBottom: "16px" }}>
            <button
              type="button"
              className={`coord-tab-btn ${subVistaAlumnos === "preinscritos" ? "is-active" : ""}`}
              onClick={() => setSubVistaAlumnos("preinscritos")}
              style={tabStyle(subVistaAlumnos === "preinscritos")}
            >
              Pre-inscritos (Excel) ({invitados.length})
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

          {puedeDescargar ? (
            <div className="coord-invitados-actions" style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button
                className="coord-primary-button"
                type="button"
                onClick={() => descargarPdfAlumnos(subVistaAlumnos)}
                disabled={!listaActual.length}
                style={{ display: "flex", alignItems: "center", gap: "6px", height: "38px", minHeight: "38px" }}
              >
                <FileDown size={15} />
                <span>Descargar PDF</span>
              </button>
              <button
                className="coord-template-autofill"
                type="button"
                onClick={() => exportarAExcel(subVistaAlumnos)}
                disabled={!listaActual.length}
                style={{ display: "flex", alignItems: "center", gap: "6px", height: "38px", minHeight: "38px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
              >
                <FileDown size={15} />
                <span>Exportar Excel</span>
              </button>
            </div>
          ) : null}

          {subVistaAlumnos === "preinscritos" ? (
            <TablaPreinscritos
              alumnos={invitados}
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
  const fecha = new Date(valor);
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
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("todos");

  const grupos = useMemo(
    () => Object.values(agruparAsistenciasPorFecha(asistencias))
      .sort((a, b) => String(b.clave).localeCompare(String(a.clave))),
    [asistencias]
  );

  const grupoActivo = grupos.find((grupo) => grupo.clave === fechaSeleccionada) || grupos[0];
  const indiceActivo = grupos.findIndex((grupo) => grupo.clave === grupoActivo?.clave);

  // Extraer todos los docentes únicos del programa (del docente principal o los docentes por grupo)
  const profesores = useMemo(() => {
    if (!programa) return [];
    const setDocentes = new Set<string>();
    
    if (Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0) {
      programa.talleresDeportivos.forEach((t: any) => {
        const doc = t.docente || t.responsable;
        if (doc) {
          setDocentes.add(doc);
        }
      });
    } else {
      if (programa.responsable) {
        setDocentes.add(programa.responsable);
      }
      
      if (Array.isArray(programa.horariosPorGrupo)) {
        programa.horariosPorGrupo.forEach((g: any) => {
          if (g.responsable) {
            setDocentes.add(g.responsable);
          }
        });
      }
    }
    
    return Array.from(setDocentes).filter(Boolean).sort();
  }, [programa]);

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

  // Filtrar las filas del grupo activo según el profesor seleccionado
  const filasFiltradas = useMemo(() => {
    const filas = grupoActivo?.filas || [];
    if (profesorSeleccionado === "todos") return filas;
    return filas.filter((asistencia: any) => {
      const dni = obtenerDniAsistencia(asistencia);
      const prof = obtenerDocenteResponsable(dni);
      return String(prof).trim().toLowerCase() === profesorSeleccionado.trim().toLowerCase();
    });
  }, [grupoActivo, profesorSeleccionado, obtenerDocenteResponsable]);

  // Helper para contar la asistencia filtrada por profesor en la lista de opciones
  const obtenerConteoFiltrado = (grupoFilas: any[]) => {
    if (profesorSeleccionado === "todos") return grupoFilas.length;
    return grupoFilas.filter((asistencia: any) => {
      const dni = obtenerDniAsistencia(asistencia);
      const prof = obtenerDocenteResponsable(dni);
      return String(prof).trim().toLowerCase() === profesorSeleccionado.trim().toLowerCase();
    }).length;
  };

  const ejecutarExportarPdf = async () => {
    if (!programa || !grupoActivo) return;
    
    const matriculadosFilt = profesorSeleccionado === "todos" 
      ? matriculados 
      : matriculados.filter(m => obtenerDocenteResponsable(m.dni || m.dniEstudiante) === profesorSeleccionado);
      
    const customGrupoActivo = {
      ...grupoActivo,
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
    if (!programa || !grupoActivo) return;
    
    const matriculadosFilt = profesorSeleccionado === "todos" 
      ? matriculados 
      : matriculados.filter(m => obtenerDocenteResponsable(m.dni || m.dniEstudiante) === profesorSeleccionado);
      
    const customGrupoActivo = {
      ...grupoActivo,
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
      setFechaSeleccionada(grupos[indiceActivo + 1].clave);
    }
  };

  const irSiguiente = () => {
    if (indiceActivo > 0) {
      setFechaSeleccionada(grupos[indiceActivo - 1].clave);
    }
  };

  if (!asistencias.length) {
    return <p className="coord-process-note">Aun no hay asistencias registradas por Auxiliar para este programa.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Fecha:</span>
          <button
            type="button"
            onClick={irAnterior}
            disabled={indiceActivo >= grupos.length - 1}
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
              cursor: indiceActivo >= grupos.length - 1 ? "not-allowed" : "pointer",
              opacity: indiceActivo >= grupos.length - 1 ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ position: "relative" }}>
            <select
              value={grupoActivo?.clave || ""}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                padding: "8px 36px 8px 12px",
                borderRadius: "8px",
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: "#1d2939",
                fontSize: "14px",
                fontWeight: "600",
                height: "36px",
                cursor: "pointer",
                outline: "none",
                minWidth: "240px",
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23344054' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
              }}
            >
              {grupos.map((grupo) => {
                const conteo = obtenerConteoFiltrado(grupo.filas);
                return (
                  <option key={grupo.clave} value={grupo.clave}>
                    {grupo.titulo} ({conteo} {conteo === 1 ? "asistencia" : "asistencias"})
                  </option>
                );
              })}
            </select>
          </div>
          <button
            type="button"
            onClick={irSiguiente}
            disabled={indiceActivo <= 0}
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
              cursor: indiceActivo <= 0 ? "not-allowed" : "pointer",
              opacity: indiceActivo <= 0 ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {profesores.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px" }}>
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

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={ejecutarExportarPdf}
            title="Exportar la asistencia del día seleccionado a PDF"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #d0d5dd",
              background: "#ffffff",
              color: "#344054",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <FileDown size={14} />
            <span>PDF (Día)</span>
          </button>
          <button
            type="button"
            onClick={ejecutarExportarExcel}
            title="Exportar la asistencia del día seleccionado a Excel"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <FileDown size={14} />
            <span>Excel (Día)</span>
          </button>
          <button
            type="button"
            onClick={ejecutarExportarHistorialPdf}
            title="Descargar todos los días registrados en un solo PDF (cada día en una página)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #d1e9ff",
              background: "#f0f9ff",
              color: "#00539c",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <FileDown size={14} />
            <span>PDF (Historial)</span>
          </button>
          <button
            type="button"
            onClick={ejecutarExportarHistorialExcel}
            title="Exportar todos los días registrados en un solo Excel (cada día en una pestaña distinta)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #86efac",
              background: "#ecfdf5",
              color: "#047857",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <FileDown size={14} />
            <span>Excel (Historial)</span>
          </button>
        </div>
      </div>

      <div className="coord-table-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <strong style={{ color: "#0f172a" }}>{grupoActivo?.titulo}</strong>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#475467" }}>
            {filasFiltradas.length} alumno{filasFiltradas.length === 1 ? "" : "s"} asistieron
          </span>
        </div>
        <table className="coord-table">
          <thead>
            <tr>
              <th>DNI</th>
              <th>Estudiante</th>
              <th>Grado</th>
              <th>Nivel</th>
              <th>Acceso</th>
              <th>Hora</th>
              <th>Observacion</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((asistencia, index) => {
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
                  <td>{formatearHoraAsistencia(obtenerFechaAsistencia(asistencia))}</td>
                  <td>{asistencia.observacion || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AlumnosProgramaModal;
