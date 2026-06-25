import { formatearSoles } from "../utils/cajaFormatters";

export default function ReporteResumenCards({ reporte, totalRegistros }) {
  const tieneEgresos = (reporte.totalEgreso && reporte.totalEgreso > 0) || (reporte.cantidadEgreso && reporte.cantidadEgreso > 0);

  return (
    <div 
      className="caja-report-cards-grid" 
      style={tieneEgresos ? { gridTemplateColumns: "repeat(4, 1fr)" } : undefined}
    >
      {tieneEgresos ? (
        <>
          <article className="caja-report-card pagado">
            <span className="caja-report-card-label">Total Ingresos</span>
            <strong className="caja-report-card-value">{formatearSoles(reporte.totalPagado)}</strong>
            <small className="caja-report-card-subtext">{reporte.cantidadPagada} ingresos validados</small>
          </article>
          <article className="caja-report-card" style={{ borderLeft: "4px solid #ef4444" }}>
            <span className="caja-report-card-label" style={{ color: "#ef4444" }}>Total Egresos</span>
            <strong className="caja-report-card-value" style={{ color: "#ef4444" }}>{formatearSoles(reporte.totalEgreso)}</strong>
            <small className="caja-report-card-subtext" style={{ color: "#f87171" }}>{reporte.cantidadEgreso} egresos registrados</small>
          </article>
          <article className="caja-report-card total">
            <span className="caja-report-card-label">Saldo Neto</span>
            <strong className="caja-report-card-value">{formatearSoles(reporte.totalVisible)}</strong>
            <small className="caja-report-card-subtext">{totalRegistros} registros totales</small>
          </article>
        </>
      ) : (
        <>
          <article className="caja-report-card total">
            <span className="caja-report-card-label">Total filtrado</span>
            <strong className="caja-report-card-value">{formatearSoles(reporte.totalVisible)}</strong>
            <small className="caja-report-card-subtext">{totalRegistros} registros</small>
          </article>
          <article className="caja-report-card pagado">
            <span className="caja-report-card-label">Pagado</span>
            <strong className="caja-report-card-value">{formatearSoles(reporte.totalPagado)}</strong>
            <small className="caja-report-card-subtext">{reporte.cantidadPagada} pagos validados</small>
          </article>
        </>
      )}
      <article className="caja-report-card pendiente">
        <span className="caja-report-card-label">Pendiente</span>
        <strong className="caja-report-card-value">{formatearSoles(reporte.totalPendiente)}</strong>
        <small className="caja-report-card-subtext">{reporte.cantidadPendiente} pagos por cobrar</small>
      </article>
    </div>
  );
}
