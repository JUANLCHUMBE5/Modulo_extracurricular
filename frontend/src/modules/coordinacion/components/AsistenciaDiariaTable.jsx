import { Button } from "@mantine/core";
import { IconFileDownload as FileDown } from "@tabler/icons-react";
import {
  obtenerDniAsistencia,
  obtenerNombreAsistencia,
  obtenerEstadoAccesoAsistencia,
  obtenerFechaAsistencia,
  formatearHoraAsistencia,
  badgeStyle,
} from "../utils/asistenciasFormatters";

function AsistenciaDiariaTable({
  grupoActivo,
  filasGrupoActivoFiltradas,
  matriculadosFiltrados,
  handleExportPdfIndividual,
  programas = [],
  tallerId = "",
}) {
  return (
    <div className="coord-table-wrap">
      <table className="coord-table">
        <thead>
          <tr>
            {grupoActivo && <th>Hora</th>}
            <th>DNI</th>
            <th>Código</th>
            <th>Estudiante</th>
            {tallerId === "TODOS_TALLERES" && <th>Taller</th>}
            <th>Grado</th>
            <th>Pago</th>
            <th>Acceso</th>
            <th>{grupoActivo ? "Observación" : "Observación / Firma"}</th>
            <th style={{ width: "80px", textAlign: "center" }}>Reporte</th>
          </tr>
        </thead>
        <tbody>
          {grupoActivo ? (
            filasGrupoActivoFiltradas.length > 0 ? (
              filasGrupoActivoFiltradas.map((asist, index) => {
                const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
                const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
                const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));
                const toneAcceso = String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "warning" : "error";

                const dniAsist = obtenerDniAsistencia(asist);
                const matchedAlumno = dniAsist ? matriculadosFiltrados.find(m => String(m.dni || "").trim() === String(dniAsist).trim()) : null;
                const gValue = matchedAlumno ? (matchedAlumno.grado || matchedAlumno.gradoEstudiante) : "";
                const tIdValue = matchedAlumno ? matchedAlumno.tallerId : asist.tallerId;

                const parts = String(gValue || "").split(":");
                let labelGrado = gValue;
                if (parts.length === 2) {
                  const nivel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
                  labelGrado = `${parts[1]}° ${nivel}`;
                } else {
                  const match = String(gValue).match(/(\d+)\s+(\w+)/);
                  if (match) {
                    const nivel = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
                    labelGrado = `${match[1]}° ${nivel}`;
                  }
                }

                const tallerObj = tIdValue ? programas.find(p => p.id === tIdValue) : null;
                const labelTaller = tallerObj ? (tallerObj.nombre.split(" - ")[1] || tallerObj.nombre) : "";
                const displaySub = [
                  tallerId === "TODOS_TALLERES" && labelTaller ? labelTaller : "",
                  labelGrado ? labelGrado : ""
                ].filter(Boolean).join(" - ");

                return (
                  <tr key={`${asist.id || obtenerDniAsistencia(asist) || obtenerNombreAsistencia(asist)}-${index}`}>
                    {grupoActivo && <td>{formatearHoraAsistencia(obtenerFechaAsistencia(asist))}</td>}
                    <td>{obtenerDniAsistencia(asist) || "Sin DNI"}</td>
                    <td>{asist.codigoEstudiante || "—"}</td>
                    <td><span style={{ fontWeight: 500 }}>{obtenerNombreAsistencia(asist) || "—"}</span></td>
                    {tallerId === "TODOS_TALLERES" && <td>{labelTaller || "—"}</td>}
                    <td>{labelGrado || "—"}</td>
                    <td>
                      <span style={badgeStyle(String(asist.estadoPago).toLowerCase() === "pagado", "warning")}>
                        {asist.estadoPago || "Pendiente"}
                      </span>
                    </td>
                    <td>
                      <span style={badgeStyle(esAccesoPermitido, toneAcceso)}>
                        {textoAcceso}
                      </span>
                    </td>
                    <td>{asist.observacion || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <Button
                        variant="subtle"
                        color="teal"
                        size="xs"
                        onClick={() => handleExportPdfIndividual({
                          dni: obtenerDniAsistencia(asist),
                          nombres: obtenerNombreAsistencia(asist),
                          codigoEstudiante: asist.codigoEstudiante || "",
                          telefono: asist.telefono || "",
                          tallerId: tIdValue,
                          grado: gValue,
                        })}
                        title="Descargar Reporte Individual"
                      >
                        <FileDown size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={tallerId === "TODOS_TALLERES" ? 10 : 9} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                  No se encontraron estudiantes para la búsqueda.
                </td>
              </tr>
            )
          ) : (
            matriculadosFiltrados.length > 0 ? (
              matriculadosFiltrados.map((alumno, index) => {
                const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
                const textoAcceso = esAccesoPermitido ? "Permitido" : (String(alumno.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");

                const gValue = alumno.grado || alumno.gradoEstudiante || "";
                const tIdValue = alumno.tallerId;

                const parts = String(gValue || "").split(":");
                let labelGrado = gValue;
                if (parts.length === 2) {
                  const nivel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
                  labelGrado = `${parts[1]}° ${nivel}`;
                } else {
                  const match = String(gValue).match(/(\d+)\s+(\w+)/);
                  if (match) {
                    const nivel = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
                    labelGrado = `${match[1]}° ${nivel}`;
                  }
                }

                const tallerObj = tIdValue ? programas.find(p => p.id === tIdValue) : null;
                const labelTaller = tallerObj ? (tallerObj.nombre.split(" - ")[1] || tallerObj.nombre) : "";
                const displaySub = [
                  tallerId === "TODOS_TALLERES" && labelTaller ? labelTaller : "",
                  labelGrado ? labelGrado : ""
                ].filter(Boolean).join(" - ");

                return (
                  <tr key={`${alumno.dni || alumno.id || index}-${index}`}>
                    <td>{alumno.dni || alumno.dniEstudiante || "Sin DNI"}</td>
                    <td>{alumno.codigoEstudiante || "—"}</td>
                    <td><span style={{ fontWeight: 500 }}>{alumno.nombres || alumno.nombresEstudiante || "—"}</span></td>
                    {tallerId === "TODOS_TALLERES" && <td>{labelTaller || "—"}</td>}
                    <td>{labelGrado || "—"}</td>
                    <td>
                      <span style={badgeStyle(String(alumno.estadoPago).toLowerCase() === "pagado", "warning")}>
                        {alumno.estadoPago || "Pendiente"}
                      </span>
                    </td>
                    <td>
                      <span style={badgeStyle(esAccesoPermitido, "warning")}>
                        {textoAcceso}
                      </span>
                    </td>
                    <td><span style={{ color: "#cbd5e1" }}>_________________</span></td>
                    <td style={{ textAlign: "center" }}>
                      <Button
                        variant="subtle"
                        color="teal"
                        size="xs"
                        onClick={() => handleExportPdfIndividual(alumno)}
                        title="Descargar Reporte Individual"
                      >
                        <FileDown size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={tallerId === "TODOS_TALLERES" ? 9 : 8} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                  No se encontraron estudiantes matriculados para la búsqueda.
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AsistenciaDiariaTable;
