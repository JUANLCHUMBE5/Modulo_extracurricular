import { tiposReporte } from "../constants/cajaConstants";

export default function ReporteFiltros({ filtros, mediosPago, onChange, programas, grados = [], secciones = [] }) {
  return (
    <section className="caja-report-filters-card">
      <label>
        Tipo de reporte
        <select value={filtros.tipoReporte} onChange={(event) => onChange("tipoReporte", event.currentTarget.value)}>
          {tiposReporte.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
          ))}
        </select>
      </label>
      <label>
        Programa
        <select value={filtros.programa} onChange={(event) => onChange("programa", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          {programas.map((programa) => (
            <option key={programa.value} value={programa.value}>{programa.label}</option>
          ))}
        </select>
      </label>
      <label>
        Grado
        <select value={filtros.grado || "todos"} onChange={(event) => onChange("grado", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          {grados.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Sección
        <select value={filtros.seccion || "todos"} onChange={(event) => onChange("seccion", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          {secciones.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Fechas
        <select value={filtros.rango} onChange={(event) => onChange("rango", event.currentTarget.value)}>
          <option value="personalizado">Rango personalizado</option>
          <option value="todo">Todo el periodo</option>
        </select>
      </label>
      <label>
        Desde
        <input
          disabled={filtros.rango === "todo"}
          onChange={(event) => onChange("desde", event.currentTarget.value)}
          type="date"
          value={filtros.desde}
        />
      </label>
      <label>
        Hasta
        <input
          disabled={filtros.rango === "todo"}
          onChange={(event) => onChange("hasta", event.currentTarget.value)}
          type="date"
          value={filtros.hasta}
        />
      </label>
      <label>
        Medio de pago
        <select value={filtros.medioPago} onChange={(event) => onChange("medioPago", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          {mediosPago.map((medio) => (
            <option key={medio.value} value={medio.value}>{medio.label}</option>
          ))}
        </select>
      </label>
      <label>
        Estado de pago
        <select value={filtros.estadoPago} onChange={(event) => onChange("estadoPago", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          <option value="pagado">Solo pagados</option>
          <option value="pendiente">Solo pendientes</option>
          <option value="verificando">Solo por verificar</option>
          <option value="observado">Solo observados</option>
          <option value="anulado">Solo anulados</option>
        </select>
      </label>
    </section>
  );
}
