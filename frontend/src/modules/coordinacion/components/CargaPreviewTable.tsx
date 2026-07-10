import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";

interface RegistroCarga {
  fila: number | string;
  dniOriginalExcel?: string;
  dni?: string;
  codigoEstudianteOriginalExcel?: string;
  codigoEstudiante?: string;
  nombres: string;
  apellidos: string;
  grado?: string;
  programaNombre?: string;
  estado: string;
  errores?: string[];
}

interface PreviewCargaType {
  resumen: {
    total: number;
    validos: number;
    errores: number;
    duplicados: number;
  };
  registros: RegistroCarga[];
}

interface CargaPreviewTableProps {
  previewCarga: PreviewCargaType;
}

export default function CargaPreviewTable({ previewCarga }: CargaPreviewTableProps) {
  return (
    <>
      <div className="coord-load-summary">
        <SummaryBox label="Leídos" value={previewCarga.resumen.total} />
        <SummaryBox label="Válidos" value={previewCarga.resumen.validos} tone="success" />
        <SummaryBox label="Errores" value={previewCarga.resumen.errores} tone="error" />
        <SummaryBox label="Duplicados" value={previewCarga.resumen.duplicados} tone="warning" />
      </div>
      <div className="coord-table-wrap">
        <table className="coord-table">
          <thead>
            <tr>
              <th>DNI</th>
              <th>Código</th>
              <th>Alumno</th>
              <th>Grado</th>
              <th>Programa</th>
              <th>Estado</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {previewCarga.registros.map((reg) => (
              <tr key={reg.fila}>
                <td>{reg.dniOriginalExcel || reg.dni || "-"}</td>
                <td>{reg.codigoEstudianteOriginalExcel || reg.codigoEstudiante || "-"}</td>
                <td>{`${reg.nombres} ${reg.apellidos}`.trim() || "-"}</td>
                <td>{reg.grado || "-"}</td>
                <td>{reg.programaNombre || "-"}</td>
                <td>
                  <span
                    className={`coord-pill ${
                      reg.estado === "Valido"
                        ? "coord-pill-success"
                        : reg.estado === "Duplicado"
                        ? "coord-pill-warning"
                        : "coord-pill-error"
                    }`}
                  >
                    {textoEstadoCarga(reg.estado)}
                  </span>
                </td>
                <td>{reg.errores?.length ? reg.errores.join(" ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
