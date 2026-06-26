import {
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconFileDownload as FileDown,
  IconX as X,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

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

function obtenerEstiloPago(estado = "") {
  const norm = String(estado).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esActivo = ["pagado", "completado", "validado", "pago validado", "exitoso", "aprobado"].includes(norm);
  const esAdvertencia = ["pendiente", "verificando", "por verificar", "en verificacion", "pago en proceso", "pago en ..."].some(term => norm.includes(term));
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
            <TablaAsistencias asistencias={asistencias} />
          ) : (
            <TablaMatriculados alumnos={matriculados} />
          )}
        </div>
      </div>
    </div>
  );
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
            {mostrarCambridge ? <th>Ingreso Cambridge</th> : null}
            {mostrarCambridge ? <th>Nivel Cambridge</th> : null}
          </tr>
        </thead>
        <tbody>
          {alumnos.map((alumno, index) => (
            <tr key={`${alumno.dni || alumno.codigoEstudiante || alumno.nombres}-${index}`}>
              <td>{alumno.dni || "Sin DNI"}</td>
              <td>{alumno.codigoEstudiante || "—"}</td>
              <td>{alumno.nombres}</td>
              <td>{alumno.grado}</td>
              {mostrarCambridge ? <td>{describirSeleccionCambridge(alumno.seleccion)}</td> : null}
              {mostrarCambridge ? <td>{alumno.nivelCambridge || "Pendiente"}</td> : null}
            </tr>
          ))}
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
            <th>Estado Inscripción</th>
            <th>Estado Pago</th>
            <th>Canal</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map((alumno, index) => (
            <tr key={`${alumno.dni || alumno.codigoEstudiante || alumno.nombres}-${index}`}>
              <td>{alumno.dni || "Sin DNI"}</td>
              <td>{alumno.codigoEstudiante || "—"}</td>
              <td><strong>{alumno.nombres}</strong></td>
              <td>{alumno.grado}</td>
              <td>
                <span style={obtenerEstiloInscripcion(alumno.estadoInscripcion)}>
                  {alumno.estadoInscripcion}
                </span>
              </td>
              <td>
                <span style={obtenerEstiloPago(alumno.estadoPago)}>
                  {alumno.estadoPago}
                </span>
              </td>
              <td><span style={{ fontSize: "11px", fontWeight: 600, color: "#475467" }}>{alumno.origenRegistro}</span></td>
              <td><span style={{ fontSize: "11px", color: "#667085" }}>{alumno.fechaRegistro ? alumno.fechaRegistro.split("T")[0] : "—"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatearFechaAsistencia(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  const texto = fecha.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerFechaAsistencia(asistencia = {}) {
  return asistencia.fechaRegistro || asistencia.fecha || asistencia.createdAt || asistencia.fechaAsistencia || "";
}

function obtenerDniAsistencia(asistencia = {}) {
  return asistencia.dni || asistencia.dniEstudiante || asistencia.estudianteId || "";
}

function obtenerNombreAsistencia(asistencia = {}) {
  return asistencia.nombres || asistencia.nombresEstudiante || asistencia.estudianteNombre || asistencia.alumno || "";
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

function TablaAsistencias({ asistencias }) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  const grupos = useMemo(
    () => Object.values(agruparAsistenciasPorFecha(asistencias))
      .sort((a, b) => String(b.clave).localeCompare(String(a.clave))),
    [asistencias]
  );

  const grupoActivo = grupos.find((grupo) => grupo.clave === fechaSeleccionada) || grupos[0];
  const indiceActivo = grupos.findIndex((grupo) => grupo.clave === grupoActivo?.clave);

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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "6px" }}>
        <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Fecha de asistencia:</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              {grupos.map((grupo) => (
                <option key={grupo.clave} value={grupo.clave}>
                  {grupo.titulo} ({grupo.filas.length} {grupo.filas.length === 1 ? "asistencia" : "asistencias"})
                </option>
              ))}
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
      </div>

      <div className="coord-table-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <strong style={{ color: "#0f172a" }}>{grupoActivo?.titulo}</strong>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#475467" }}>
            {grupoActivo?.filas.length || 0} alumno{grupoActivo?.filas.length === 1 ? "" : "s"} asistieron
          </span>
        </div>
        <table className="coord-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>DNI</th>
              <th>Codigo</th>
              <th>Estudiante</th>
              <th>Horario del taller</th>
              <th>Pago</th>
              <th>Acceso</th>
              <th>Observacion</th>
            </tr>
          </thead>
          <tbody>
            {(grupoActivo?.filas || []).map((asistencia, index) => {
              const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asistencia);
              const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
              const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));
              const toneAcceso = String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "warning" : "error";
              return (
                <tr key={`${asistencia.id || obtenerDniAsistencia(asistencia) || obtenerNombreAsistencia(asistencia)}-${index}`}>
                  <td>{formatearHoraAsistencia(obtenerFechaAsistencia(asistencia))}</td>
                  <td>{obtenerDniAsistencia(asistencia) || "Sin DNI"}</td>
                  <td>{asistencia.codigoEstudiante || "-"}</td>
                  <td><strong>{obtenerNombreAsistencia(asistencia) || "-"}</strong></td>
                  <td>{asistencia.horario || "-"}</td>
                  <td>
                    <span style={badgeStyle(String(asistencia.estadoPago).toLowerCase() === "pagado", "warning")}>
                      {asistencia.estadoPago || "Pendiente"}
                    </span>
                  </td>
                  <td>
                    <span style={badgeStyle(esAccesoPermitido, toneAcceso)}>
                      {textoAcceso}
                    </span>
                  </td>
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
