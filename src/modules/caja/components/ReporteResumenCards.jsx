import { formatearSoles } from "../utils/cajaFormatters";

export default function ReporteResumenCards({ reporte, totalRegistros }) {
  return (
    <div className="caja-report-cards-grid">
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
      <article className="caja-report-card pendiente">
        <span className="caja-report-card-label">Pendiente</span>
        <strong className="caja-report-card-value">{formatearSoles(reporte.totalPendiente)}</strong>
        <small className="caja-report-card-subtext">{reporte.cantidadPendiente} pagos por cobrar</small>
      </article>
    </div>
  );
}
