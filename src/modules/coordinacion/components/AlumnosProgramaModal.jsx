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

function AlumnosProgramaModal({
  descargarPdfAlumnos,
  exportarAExcel,
  invitados,
  matriculados,
  onClose,
  programa,
  setSubVistaAlumnos,
  subVistaAlumnos,
}) {
  const listaActual = subVistaAlumnos === "preinscritos" ? invitados : matriculados;

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
          </div>

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

          {subVistaAlumnos === "preinscritos" ? (
            <TablaPreinscritos alumnos={invitados} />
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

export default AlumnosProgramaModal;
