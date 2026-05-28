import {
  reportCardClass,
  reportLabelClass,
  reportValueClass,
} from "../constants/cajaConstants";
import { formatearSoles } from "../utils/cajaFormatters";

export default function ReporteResumenCards({ reporte, totalRegistros }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <article className={reportCardClass}>
        <span className={reportLabelClass}>Total filtrado</span>
        <strong className={reportValueClass}>{formatearSoles(reporte.totalVisible)}</strong>
        <small className={reportLabelClass}>{totalRegistros} registros</small>
      </article>
      <article className={reportCardClass}>
        <span className={reportLabelClass}>Pagado</span>
        <strong className={reportValueClass}>{formatearSoles(reporte.totalPagado)}</strong>
        <small className={reportLabelClass}>{reporte.cantidadPagada} pagos validados</small>
      </article>
      <article className={reportCardClass}>
        <span className={reportLabelClass}>Pendiente</span>
        <strong className={reportValueClass}>{formatearSoles(reporte.totalPendiente)}</strong>
        <small className={reportLabelClass}>{reporte.cantidadPendiente} pagos por cobrar</small>
      </article>
    </div>
  );
}
