import React from "react";
import { Select, TextInput } from "@mantine/core";
import { tiposReporte } from "../constants/cajaConstants";

export default function ReporteFiltros({
  filtros,
  mediosPago,
  onChange,
  programas,
  grados = [],
  secciones = []
}) {
  const anioActual = Math.max(2026, new Date().getFullYear());
  const anioInicio = 2026;
  const opcionesAnio = [];
  for (let a = anioInicio; a <= anioActual; a++) {
    opcionesAnio.push(String(a));
  }

  const programasData = [
    { value: "todos", label: "Todos los programas" },
    ...programas.map((p) => ({ value: String(p.value || p.id), label: String(p.label || p.nombre) }))
  ];

  const gradosData = [
    { value: "todos", label: "Todos los grados" },
    ...grados.map((g) => ({ value: String(g), label: String(g) }))
  ];

  const seccionesData = [
    { value: "todos", label: "Todas las secciones" },
    ...secciones.map((s) => ({ value: String(s), label: String(s) }))
  ];

  const aniosData = [
    { value: "todos", label: "Todos los años" },
    ...opcionesAnio.map((a) => ({ value: String(a), label: String(a) }))
  ];

  const mesesData = [
    { value: "todos", label: "Todos los meses" },
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  const mediosPagoData = [
    { value: "todos", label: "Todos los medios" },
    ...mediosPago.map((m) => ({ value: String(m.value), label: String(m.label) }))
  ];

  const estadosPagoData = [
    { value: "todos", label: "Todos los estados" },
    { value: "pagado", label: "Solo pagados" },
    { value: "pendiente", label: "Solo pendientes" },
    { value: "verificando", label: "Solo por verificar" },
    { value: "observado", label: "Solo observados" },
    { value: "anulado", label: "Solo anulados" }
  ];

  const rangosData = [
    { value: "todo", label: "Todo el periodo" },
    { value: "personalizado", label: "Rango personalizado" }
  ];

  const selectStyles = {
    label: { fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase" as const, letterSpacing: "0.03em" },
    input: { borderRadius: "6px", borderColor: "#e2e8f0", height: "36px", fontSize: "13px" }
  };

  return (
    <section className="caja-report-filters-card">
      <Select
        label="Tipo de reporte"
        value={filtros.tipoReporte}
        onChange={(val) => onChange("tipoReporte", val || "todos")}
        data={tiposReporte}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Programa"
        value={filtros.programa}
        onChange={(val) => onChange("programa", val || "todos")}
        data={programasData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Grado"
        value={filtros.grado || "todos"}
        onChange={(val) => onChange("grado", val || "todos")}
        data={gradosData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Sección"
        value={filtros.seccion || "todos"}
        onChange={(val) => onChange("seccion", val || "todos")}
        data={seccionesData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Fechas"
        value={filtros.rango || "todo"}
        onChange={(val) => onChange("rango", val || "todo")}
        data={rangosData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <TextInput
        label="Desde"
        type="date"
        disabled={filtros.rango === "todo"}
        value={filtros.desde || ""}
        onChange={(e) => onChange("desde", e.target.value)}
        styles={selectStyles}
      />

      <TextInput
        label="Hasta"
        type="date"
        disabled={filtros.rango === "todo"}
        value={filtros.hasta || ""}
        onChange={(e) => onChange("hasta", e.target.value)}
        styles={selectStyles}
      />

      <Select
        label="Año"
        value={filtros.anio || "todos"}
        onChange={(val) => onChange("anio", val || "todos")}
        data={aniosData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Mes"
        value={filtros.mes || "todos"}
        onChange={(val) => onChange("mes", val || "todos")}
        data={mesesData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Medio de pago"
        value={filtros.medioPago}
        onChange={(val) => onChange("medioPago", val || "todos")}
        data={mediosPagoData}
        allowDeselect={false}
        styles={selectStyles}
      />

      <Select
        label="Estado de pago"
        value={filtros.estadoPago}
        onChange={(val) => onChange("estadoPago", val || "todos")}
        data={estadosPagoData}
        allowDeselect={false}
        styles={selectStyles}
      />
    </section>
  );
}
