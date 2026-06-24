import React from "react";
import { Button, Select } from "@mantine/core";
import { IconDownload as Download, IconMenu2 as Menu } from "@tabler/icons-react";
import ReporteResumenCards from "../ReporteResumenCards";
import ReporteFiltros from "../ReporteFiltros";
import ReporteTabla from "../ReporteTabla";
import "./CajaReportes.css";

export default function CajaReportes({
  sidebarExpanded,
  toggleSidebar,
  periodo,
  setPeriodo,
  descargarReporte,
  reporte,
  reporteCaja,
  filtrosReporte,
  opcionesReporte,
  actualizarFiltroReporte,
  abrirPagoDesdeReporte,
  aprobarPagoWebDirecto,
  abrirObservarModal,
  abrirRechazarModal,
  verificarPagoWeb,
  abrirAnularModal,
}) {
  return (
    <>
      <header className="caja-report-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {!sidebarExpanded && (
            <button
              className="caja-menu-toggle-btn-header"
              type="button"
              onClick={toggleSidebar}
              aria-label="Mostrar barra lateral"
              title="Mostrar barra lateral"
            >
              <Menu size={22} />
            </button>
          )}
          <div>
            <span>Control y exportacion</span>
            <h1>Consulta de Transacciones</h1>
          </div>
        </div>
        <div className="caja-header-actions">
          <Select
            aria-label="Periodo"
            className="caja-period"
            data={[
              { value: "escolar", label: "Año escolar" },
              { value: "verano", label: "Ciclo verano" },
            ]}
            onChange={(valor) => setPeriodo(valor || "escolar")}
            value={periodo}
            size="sm"
          />
          <Button leftSection={<Download size={15} />} onClick={descargarReporte} size="sm" style={{ height: "34px" }}>
            Descargar CSV
          </Button>
        </div>
      </header>

      <section className="caja-report-layout">
        <ReporteResumenCards reporte={reporte} totalRegistros={reporteCaja.length} />
        <ReporteFiltros
          filtros={filtrosReporte}
          mediosPago={opcionesReporte.mediosPago}
          onChange={actualizarFiltroReporte}
          programas={opcionesReporte.programas}
          grados={opcionesReporte.grados}
          secciones={opcionesReporte.secciones}
        />
        <section className="caja-report-panel">
          <div className="caja-panel-header">
            <div>
              <h2>Resultado del reporte</h2>
              <p>{reporteCaja.length} registros encontrados</p>
            </div>
          </div>
          <ReporteTabla
            filas={reporteCaja}
            onPagar={abrirPagoDesdeReporte}
            onValidarWebPago={aprobarPagoWebDirecto}
            onObservarWebPago={abrirObservarModal}
            onRechazarWebPago={abrirRechazarModal}
            onVerCapturaWebPago={verificarPagoWeb}
            onAnularPago={abrirAnularModal}
          />
        </section>
      </section>
    </>
  );
}
