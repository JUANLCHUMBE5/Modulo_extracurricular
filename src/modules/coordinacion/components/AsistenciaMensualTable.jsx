import {
  Alert as MantineAlert,
  Button,
  Badge,
} from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconFileDownload as FileDown,
} from "@tabler/icons-react";

function AsistenciaMensualTable({
  hasMatriculados,
  asistencias,
  fechasColumnas,
  matriculadosFiltrados,
  checkMap,
  handleExportPdfIndividual,
  programas = [],
  tallerId = "",
}) {
  return (
    <div style={{ marginTop: "8px" }}>
      {!hasMatriculados ? (
        <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px" }}>
          <AlertCircle size={32} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
          <p style={{ color: "#64748b" }}>No hay alumnos matriculados en este taller para generar el consolidado mensual.</p>
        </div>
      ) : (
        <>
          {asistencias.length === 0 && (
            <MantineAlert color="teal" radius="md" style={{ marginBottom: "16px" }}>
              <strong>Plantilla de consolidado mensual:</strong> Aún no se han registrado asistencias para este taller. Se muestran las columnas vacías para control manual. Puede exportarla en PDF o Excel.
            </MantineAlert>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>
              Consolidado mensual de asistencias registradas por el auxiliar.
            </span>
            <Badge color="sanrafael" size="sm">
              {fechasColumnas.length > 0 ? `${fechasColumnas.length} fechas registradas` : "Plantilla de control físico"}
            </Badge>
          </div>

          <div className="coord-table-wrap" style={{ overflowX: "auto" }}>
            <table className="coord-table" style={{ tableLayout: "auto" }}>
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>N°</th>
                  <th style={{ minWidth: "220px" }}>Apellidos y Nombres</th>
                  {tallerId === "TODOS_TALLERES" && <th style={{ minWidth: "150px" }}>Taller</th>}
                  <th style={{ width: "120px" }}>Grado</th>
                  <th style={{ minWidth: "120px" }}>Teléfono</th>
                  {fechasColumnas.length > 0 ? (
                    fechasColumnas.map((fechaCol) => (
                      <th
                        key={fechaCol.clave}
                        style={{
                          width: "60px",
                          textAlign: "center",
                          padding: "6px",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fechaCol.labelDDMM}
                      </th>
                    ))
                  ) : (
                    [1, 2, 3, 4, 5].map((num) => (
                      <th
                        key={`blank-${num}`}
                        style={{
                          width: "70px",
                          textAlign: "center",
                          padding: "6px",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          color: "#94a3b8",
                        }}
                      >
                        Clase {num}
                      </th>
                    ))
                  )}
                  <th style={{ width: "80px", textAlign: "center" }}>Reporte</th>
                </tr>
              </thead>
              <tbody>
                {matriculadosFiltrados.length > 0 ? (
                  matriculadosFiltrados.map((alumno, index) => {
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
                      <tr key={alumno.dni || index}>
                        <td style={{ textAlign: "center" }}>{index + 1}</td>
                        <td><span style={{ fontWeight: 500 }}>{alumno.nombres || alumno.nombresEstudiante || "—"}</span></td>
                        {tallerId === "TODOS_TALLERES" && <td>{labelTaller || "—"}</td>}
                        <td>{labelGrado || "—"}</td>
                        <td>{alumno.telefono || alumno.telefonoApoderado || "—"}</td>
                        {fechasColumnas.length > 0 ? (
                          fechasColumnas.map((fechaCol) => {
                            const mapKey = `${String(alumno.dni || alumno.dniEstudiante || "").trim()}:${fechaCol.clave}`;
                            const hora = checkMap.get(mapKey);
                            const asistio = hora !== undefined;
                            return (
                              <td
                                key={fechaCol.clave}
                                style={{
                                  textAlign: "center",
                                  fontWeight: "bold",
                                  color: asistio ? "#12b886" : "#ced4da",
                                  fontSize: asistio ? "14px" : "16px",
                                  padding: "4px 2px",
                                  lineHeight: "1.2",
                                }}
                              >
                                {asistio ? (
                                  <>
                                    <div>✓</div>
                                    <div style={{ fontSize: "9px", fontWeight: 500, color: "#64748b" }}>{hora}</div>
                                  </>
                                ) : "—"}
                              </td>
                            );
                          })
                        ) : (
                          [1, 2, 3, 4, 5].map((num) => (
                            <td
                              key={`blank-${num}`}
                              style={{
                                textAlign: "center",
                                color: "#cbd5e1",
                              }}
                            >
                              —
                            </td>
                          ))
                        )}
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
                    <td colSpan={(tallerId === "TODOS_TALLERES" ? 6 : 5) + (fechasColumnas.length > 0 ? fechasColumnas.length : 5)} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                      No se encontraron estudiantes para la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AsistenciaMensualTable;
