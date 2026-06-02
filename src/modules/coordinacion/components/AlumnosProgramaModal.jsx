import {
  IconFileDownload as FileDown,
  IconX as X,
} from "@tabler/icons-react";

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

function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Certificado oficial",
    B: "B - Admission Test",
    C: "C - Desempeno academico",
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
              Matriculados (Caja / Padres) ({matriculados.length})
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
          ) : (
            <p className="coord-process-note" style={{ marginBottom: "16px" }}>
              {subVistaAlumnos === "asistencias"
                ? ""
                : ""}
            </p>
          )}

          {subVistaAlumnos === "preinscritos" ? (
            <TablaPreinscritos alumnos={invitados} />
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

function TablaPreinscritos({ alumnos }) {
  if (!alumnos.length) {
    return <p className="coord-process-note">No hay invitados registrados para este programa.</p>;
  }
  const mostrarCambridge = alumnos.some((alumno) => alumno.seleccion || alumno.nivelCambridge);

  return (
    <div className="coord-table-wrap">
      <table className="coord-table">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Código</th>
            <th>Estudiante</th>
            <th>Grado</th>
            <th>Sección</th>
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
              <td>{alumno.seccion}</td>
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
            <th>Sección</th>
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
              <td>{alumno.seccion}</td>
              <td>
                <span style={badgeStyle(alumno.estadoInscripcion === "Pago validado", "warning")}>
                  {alumno.estadoInscripcion}
                </span>
              </td>
              <td>
                <span style={badgeStyle(alumno.estadoPago === "Pagado", "error")}>
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
    const clave = claveFechaAsistencia(asistencia.fechaRegistro);
    if (!grupos[clave]) {
      grupos[clave] = {
        clave,
        titulo: formatearFechaAsistencia(asistencia.fechaRegistro),
        filas: [],
      };
    }
    grupos[clave].filas.push(asistencia);
    return grupos;
  }, {});
}

function TablaAsistencias({ asistencias }) {
  if (!asistencias.length) {
    return <p className="coord-process-note">Aun no hay asistencias registradas por Auxiliar para este programa.</p>;
  }

  const grupos = Object.values(agruparAsistenciasPorFecha(asistencias));

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {grupos.map((grupo) => (
        <div key={grupo.clave} className="coord-table-wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <strong style={{ color: "#0f172a" }}>{grupo.titulo}</strong>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#475467" }}>
              {grupo.filas.length} asistencia{grupo.filas.length === 1 ? "" : "s"}
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
              {grupo.filas.map((asistencia, index) => (
                <tr key={`${asistencia.id || asistencia.dni || asistencia.nombres}-${index}`}>
                  <td>{formatearHoraAsistencia(asistencia.fechaRegistro)}</td>
                  <td>{asistencia.dni || "Sin DNI"}</td>
                  <td>{asistencia.codigoEstudiante || "-"}</td>
                  <td><strong>{asistencia.nombres || "-"}</strong></td>
                  <td>{asistencia.horario || "-"}</td>
                  <td>
                    <span style={badgeStyle(String(asistencia.estadoPago).toLowerCase() === "pagado", "warning")}>
                      {asistencia.estadoPago || "Pendiente"}
                    </span>
                  </td>
                  <td>
                    <span style={badgeStyle(String(asistencia.estadoAcceso).toLowerCase() === "permitido", "error")}>
                      {asistencia.estadoAcceso || "Sin validar"}
                    </span>
                  </td>
                  <td>{asistencia.observacion || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default AlumnosProgramaModal;
