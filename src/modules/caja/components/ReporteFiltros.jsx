import { tiposReporte } from "../constants/cajaConstants";

export default function ReporteFiltros({ filtros, mediosPago, onChange, programas }) {
  return (
    <section className="caja-report-filters">
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
    </section>
  );
}
