import {
  IconLoader2 as Loader2,
  IconTrash as Trash,
  IconDownload as Download,
  IconListCheck as ListCheck,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
} from "@tabler/icons-react";

/**
 * Tabla paginada que muestra el historial de cargas masivas Excel.
 */
export default function CargaHistorialTable({
  historialPaginado,
  historialFiltrado,
  paginaActual,
  setPaginaActual,
  totalPaginas,
  descargandoCargaId,
  eliminandoCargaId,
  descargarFichasLote,
  eliminarCargaExcel,
}: {
  historialPaginado: any[];
  historialFiltrado: any[];
  paginaActual: number;
  setPaginaActual: (n: number) => void;
  totalPaginas: number;
  descargandoCargaId: string;
  eliminandoCargaId: string;
  descargarFichasLote: (carga: any) => void;
  eliminarCargaExcel: (carga: any) => void;
}) {
  return (
    <article className="coord-card" style={{ marginTop: "24px", animation: "coord-fade-in 0.25s ease" }}>
      <div className="coord-export-box-header" style={{ marginBottom: "16px" }}>
        <ListCheck size={22} style={{ color: "#388e3c" }} />
        <span style={{ fontWeight: 700, fontSize: "16px", color: "#1b5e20" }}>Historial de Cargas Masivas</span>
      </div>

      <div className="coord-table-wrap">
        <table className="coord-table">
          <thead>
            <tr>
              <th>Fecha de Carga</th>
              <th>Archivo Excel</th>
              <th>Taller / Curso</th>
              <th>Alumnos Cargados</th>
              <th style={{ textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {historialPaginado.map((carga) => {
              const totalValidos = carga.resumen?.importados || 0;
              const programaNombre = carga.registros?.[0]?.programaNombre || "Varios";
              return (
                <tr key={carga.id}>
                  <td>
                    {new Date(carga.fecha).toLocaleString("es-PE", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td style={{ fontWeight: 600, color: "#2e7d32" }}>
                    {carga.archivoNombre || "Registro masivo"}
                  </td>
                  <td>{programaNombre}</td>
                  <td>
                    <span className="coord-pill coord-pill-success" style={{ fontWeight: 700 }}>
                      {totalValidos} Alumnos
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                      <button
                        type="button"
                        className="coord-primary-button"
                        style={{
                          padding: "4px 10px", fontSize: "12px", height: "30px",
                          backgroundColor: "#1e3a8a", borderColor: "#1e3a8a",
                          display: "inline-flex", alignItems: "center", gap: "4px", borderRadius: "6px",
                        }}
                        onClick={() => descargarFichasLote(carga)}
                        disabled={descargandoCargaId === carga.id}
                        title="Descargar PDF único con las fichas de bienvenida"
                      >
                        {descargandoCargaId === carga.id ? (
                          <Loader2 className="coord-spin" size={14} />
                        ) : (
                          <Download size={14} />
                        )}
                        <span>PDF Fichas</span>
                      </button>

                      <button
                        type="button"
                        className="coord-primary-button"
                        style={{
                          padding: "4px 10px", fontSize: "12px", height: "30px",
                          backgroundColor: "#dc2626", borderColor: "#dc2626",
                          display: "inline-flex", alignItems: "center", gap: "4px", borderRadius: "6px",
                        }}
                        onClick={() => eliminarCargaExcel(carga)}
                        disabled={eliminandoCargaId === carga.id}
                        title="Eliminar esta carga (los alumnos se retirarán si no tienen inscripción activa)"
                      >
                        {eliminandoCargaId === carga.id ? (
                          <Loader2 className="coord-spin" size={14} />
                        ) : (
                          <Trash size={14} />
                        )}
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="coord-pagination" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: "16px", padding: "8px 0",
        }}>
          <button
            className="coord-pagination-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", borderRadius: "8px",
              border: "1px solid #c8e6c9", background: "white", color: "#2e7d32",
              fontSize: "13px", fontWeight: 600,
              cursor: paginaActual === 1 ? "not-allowed" : "pointer",
              opacity: paginaActual === 1 ? 0.5 : 1,
            }}
            disabled={paginaActual === 1}
            onClick={() => setPaginaActual(paginaActual - 1)}
            type="button"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <span style={{ fontSize: "13px", color: "#2e7d32", fontWeight: 500 }}>
            Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
            <span style={{ marginLeft: "8px", opacity: 0.8 }}>({historialFiltrado.length} cargas registradas)</span>
          </span>
          <button
            className="coord-pagination-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", borderRadius: "8px",
              border: "1px solid #c8e6c9", background: "white", color: "#2e7d32",
              fontSize: "13px", fontWeight: 600,
              cursor: paginaActual >= totalPaginas ? "not-allowed" : "pointer",
              opacity: paginaActual >= totalPaginas ? 0.5 : 1,
            }}
            disabled={paginaActual >= totalPaginas}
            onClick={() => setPaginaActual(paginaActual + 1)}
            type="button"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </article>
  );
}
