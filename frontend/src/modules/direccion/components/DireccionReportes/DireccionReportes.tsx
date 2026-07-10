import { Button, Select, MultiSelect, Checkbox, Group, Table } from "@mantine/core";
import {
  IconDownload as Download,
  IconFilter as Filter,
  IconAdjustments as Adjustments,
} from "@tabler/icons-react";
import { columnasDisponiblesMap, opcionesReportesSimplificados } from "../../constants/direccionReports";
import { formatearSoles } from "../../utils/direccionFormatters";
import { formatearFechaPeru } from "../../../../services/dateService";
import "./DireccionReportes.css";

export default function DireccionReportes({
  reporteSeleccionado,
  setReporteSeleccionado,
  anio,
  setAnio,
  periodo,
  setPeriodo,
  customFiltroCategoria,
  setCustomFiltroCategoria,
  customFiltroPrograma,
  setCustomFiltroPrograma,
  customFiltroGrados,
  handleGradosChange,
  customFiltroOrigen,
  setCustomFiltroOrigen,
  customFiltroPago,
  setCustomFiltroPago,
  rangoRapido,
  cambiarRangoRapido,
  fechaInicio,
  handleFechaInicioChange,
  fechaFin,
  handleFechaFinChange,
  consolidacionAsistencia,
  setConsolidacionAsistencia,
  incluirInactivos,
  setIncluirInactivos,
  customTipo,
  customColumnas,
  setCustomColumnas,
  registrosFiltrados,
  ejecutarDescargaCustom,
  exportandoCustom,
  exportarHabilitado,
  aniosOptions,
  categoriasOptions,
  programasOptions,
  gradosOptions,
}) {
  const columnasDisponibles = columnasDisponiblesMap[customTipo] || [];
  const columnasOptions = columnasDisponibles.map((col) => ({ value: col.key, label: col.label }));
  const reporteActual = opcionesReportesSimplificados.find((item) => item.value === reporteSeleccionado);

  const selectStyles = {
    label: { fontSize: "10px", fontWeight: 700, color: "#475569", marginBottom: "2px", textTransform: "uppercase" as const, letterSpacing: "0.03em" },
    input: { borderRadius: "6px", borderColor: "#e2e8f0", height: "30px", fontSize: "12px", minHeight: "30px" }
  };

  const multiSelectStyles = {
    label: { fontSize: "10px", fontWeight: 700, color: "#475569", marginBottom: "2px", textTransform: "uppercase" as const, letterSpacing: "0.03em" },
    input: { borderRadius: "6px", borderColor: "#e2e8f0", minHeight: "30px", fontSize: "12px" },
    pill: { fontSize: "10px", fontWeight: 600, height: "22px" }
  };

  return (
    <section className="dir-reports-view">
      {/* ── GENERADOR DE REPORTES A LA MEDIDA (PERSONALIZADO POR MÓDULO) ── */}
      <article className="dir-custom-report-builder">
        <header className="dir-builder-header">
          <div>

            <h2>Generador de Reportes</h2>
            <p className="dir-builder-subtitle">
              {reporteActual?.label || "Seleccione el reporte que desea preparar"}
            </p>
          </div>
          <div className="dir-builder-header-actions">
            <Button
              color="teal"
              leftSection={<Download size={14} />}
              loading={exportandoCustom}
              disabled={!exportarHabilitado || registrosFiltrados.length === 0 || customColumnas.length === 0}
              onClick={ejecutarDescargaCustom}
              size="xs"
              className="dir-download-custom-btn"
            >
              Descargar Excel
            </Button>
          </div>
        </header>

        <div className="dir-builder-content">
          <div className="dir-builder-sidebar">
            <div className="dir-builder-form-group">
              <label className="dir-builder-label"><Filter size={12} /> Configuración del reporte</label>
              <div className="dir-builder-filters">
                <Select
                  label="Tipo de reporte"
                  data={opcionesReportesSimplificados}
                  value={reporteSeleccionado}
                  onChange={(val) => setReporteSeleccionado(val || "direccion_alumnos_pagos")}
                  allowDeselect={false}
                  size="xs"
                  className="dir-report-type-select"
                  styles={selectStyles}
                />
                <Select
                  label="Año"
                  data={aniosOptions}
                  value={anio}
                  onChange={(val) => setAnio(val || "todos")}
                  allowDeselect={false}
                  size="xs"
                  styles={selectStyles}
                />
                <Select
                  label="Periodo"
                  data={[
                    { value: "todos", label: "Todos los periodos" },
                    { value: "escolar", label: "Año Escolar" },
                    { value: "verano", label: "Ciclo Verano" },
                  ]}
                  value={periodo}
                  onChange={(val) => setPeriodo(val || "todos")}
                  allowDeselect={false}
                  size="xs"
                  styles={selectStyles}
                />
                <Select
                  label="Categoría de Taller"
                  data={categoriasOptions}
                  value={customFiltroCategoria}
                  onChange={(val) => setCustomFiltroCategoria(val || "todos")}
                  allowDeselect={false}
                  size="xs"
                  styles={selectStyles}
                />
                {(customTipo === "inscripciones" ||
                  customTipo === "pagos" ||
                  customTipo === "direccion_alumnos_pagos" ||
                  customTipo === "direccion_alumnos_asistencias") && (
                    <Select
                      label="Programa / Taller"
                      data={programasOptions}
                      value={customFiltroPrograma}
                      onChange={(val) => setCustomFiltroPrograma(val || "todos")}
                      allowDeselect={false}
                      size="xs"
                      styles={selectStyles}
                    />
                  )}
                {(customTipo === "inscripciones" ||
                  customTipo === "direccion_alumnos_pagos" ||
                  customTipo === "direccion_alumnos_asistencias") && (gradosOptions || []).length > 0 && (
                    <MultiSelect
                      label="Grado(s)"
                      placeholder={customFiltroGrados.length === 0 ? "Todos los grados" : ""}
                      data={gradosOptions}
                      value={customFiltroGrados}
                      onChange={handleGradosChange}
                      clearable
                      searchable
                      size="xs"
                      styles={multiSelectStyles}
                    />
                  )}
                {customTipo === "inscripciones" && (
                  <Select
                    label="Canal / Origen"
                    data={[
                      { value: "todos", label: "Todos los canales" },
                      { value: "web", label: "Solo vía Web / Padres" },
                      { value: "secretaria", label: "Solo vía Asistente" },
                    ]}
                    value={customFiltroOrigen}
                    onChange={(val) => setCustomFiltroOrigen(val || "todos")}
                    allowDeselect={false}
                    size="xs"
                    styles={selectStyles}
                  />
                )}
                {(customTipo === "inscripciones" ||
                  customTipo === "pagos" ||
                  customTipo === "direccion_alumnos_pagos") && (
                    <Select
                      label="Estado de Pago"
                      data={[
                        { value: "todos", label: "Todos los estados" },
                        { value: "Pagado", label: "Solo Pagados" },
                        { value: "Pendiente", label: "Solo Pendientes" },
                      ]}
                      value={customFiltroPago}
                      onChange={(val) => setCustomFiltroPago(val || "todos")}
                      allowDeselect={false}
                      size="xs"
                      styles={selectStyles}
                    />
                  )}

                {(customTipo === "inscripciones" ||
                  customTipo === "pagos" ||
                  customTipo === "direccion_alumnos_pagos" ||
                  customTipo === "direccion_alumnos_asistencias") && (
                    <Select
                      label="Rango de Tiempo"
                      data={[
                        { value: "todos", label: "Todo el periodo" },
                        { value: "hoy", label: "Hoy" },
                        { value: "esta_semana", label: "Esta semana" },
                        { value: "este_mes", label: "Este mes" },
                        { value: "mes_anterior", label: "Mes anterior" },
                        { value: "personalizado", label: "Rango personalizado" },
                      ]}
                      value={rangoRapido}
                      onChange={(val) => cambiarRangoRapido(val || "todos")}
                      allowDeselect={false}
                      size="xs"
                      styles={selectStyles}
                    />
                  )}

                {/* Rango de Fechas */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span className="dir-builder-input-label">Fecha Inicio</span>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={handleFechaInicioChange}
                    className="dir-builder-date-input"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span className="dir-builder-input-label">Fecha Fin</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={handleFechaFinChange}
                    className="dir-builder-date-input"
                  />
                </div>

                {/* Agrupación de Asistencias */}
                {customTipo === "direccion_alumnos_asistencias" && (
                  <Select
                    label="Consolidación Asistencia"
                    data={[
                      { value: "dia", label: "Por Día (Detallado)" },
                      { value: "semana", label: "Por Semana" },
                      { value: "mes", label: "Por Mes" },
                    ]}
                    value={consolidacionAsistencia}
                    onChange={(val) => setConsolidacionAsistencia(val || "dia")}
                    allowDeselect={false}
                    size="xs"
                    styles={selectStyles}
                  />
                )}

                <Checkbox
                  label="Incluir talleres finalizados/inactivos"
                  checked={incluirInactivos}
                  onChange={(e) => setIncluirInactivos(e.currentTarget.checked)}
                  size="xs"
                  styles={{
                    label: { fontSize: "11px", color: "#000000", fontWeight: 700 },
                    root: { marginTop: "0px" }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="dir-builder-columns-selector">
            <div className="dir-columns-header">
              <label className="dir-builder-label"><Adjustments size={12} /> Columnas a exportar</label>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  color="teal"
                  size="xs"
                  onClick={() => setCustomColumnas(columnasDisponibles.map((c) => c.key))}
                >
                  Seleccionar todo
                </Button>
                <Button
                  variant="subtle"
                  color="orange"
                  size="xs"
                  onClick={() => setCustomColumnas([])}
                >
                  Limpiar selección
                </Button>
              </Group>
            </div>

            <div className="dir-columns-select-container">
              <MultiSelect
                data={columnasOptions}
                value={customColumnas}
                onChange={setCustomColumnas}
                placeholder="Seleccione las columnas del Excel"
                searchable
                clearable
                hidePickedOptions
                maxDropdownHeight={260}
                nothingFoundMessage="Sin columnas"
                size="xs"
                styles={multiSelectStyles}
              />
            </div>
          </div>
        </div>

        {/* Sección de Vista Previa */}
        <div className="dir-builder-preview-section" style={{ marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
          <div className="dir-preview-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#000000" }}>Vista Previa del Reporte</h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#000000" }}>
                Mostrando los primeros 10 de {registrosFiltrados.length} registros filtrados
              </p>
            </div>
          </div>

          {registrosFiltrados.length > 0 && customColumnas.length > 0 ? (
            <div className="dir-table-wrap dir-preview-table">
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    {customColumnas.map((colKey) => {
                      const colInfo = columnasDisponiblesMap[customTipo]?.find(c => c.key === colKey);
                      return (
                        <Table.Th key={colKey}>
                          {colInfo?.label || colKey}
                        </Table.Th>
                      );
                    })}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {registrosFiltrados.slice(0, 10).map((row, idx) => (
                    <Table.Tr key={idx}>
                      {customColumnas.map((colKey) => {
                        let value = row[colKey];
                        // Formatear si es soles
                        if (["costo", "costoOriginal", "descuentoMonto", "montoPagado", "montoAnulado", "pendiente", "proyectado", "recaudado", "porCobrar", "monto"].includes(colKey)) {
                          value = formatearSoles(value);
                        }
                        // Formatear fechas
                        if (["fechaPago", "fecha", "fechaRegistro"].includes(colKey)) {
                          value = formatearFechaPeru(value, value);
                        }
                        // Formatear booleanos
                        if (typeof value === "boolean") {
                          value = value ? "Sí" : "No";
                        }
                        // Formatear nulos/vacíos
                        if (value === null || value === undefined || value === "") {
                          value = "—";
                        }
                        return (
                          <Table.Td key={colKey}>
                            {value}
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          ) : (
            <div className="dir-empty-preview" style={{ minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
              {customColumnas.length === 0
                ? "Seleccione al menos una columna para ver la vista previa."
                : "No hay registros que coincidan con los filtros seleccionados."}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
