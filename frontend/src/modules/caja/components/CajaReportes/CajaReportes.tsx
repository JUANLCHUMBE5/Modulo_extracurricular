import React from "react";
import { Button, Select } from "@mantine/core";
import { IconDownload as Download, IconMenu2 as Menu } from "@tabler/icons-react";
import ReporteResumenCards from "../ReporteResumenCards";
import ReporteFiltros from "../ReporteFiltros";
import ReporteTabla from "../ReporteTabla";
import HistorialAlumnoModal from "./HistorialAlumnoModal";
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
  historialAlumno,
  historialAlumnoCargando,
  historialAlumnoRegistro,
  historialAlumnoAbierto,
  opcionesReporte,
  actualizarFiltroReporte,
  aprobarPagoWebDirecto,
  abrirHistorialAlumno,
  abrirObservarModal,
  abrirRechazarModal,
  cerrarHistorialAlumno,
}) {
  return (
    <>
      <header className="caja-report-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
          <Button
            className="caja-btn-descargar"
            leftSection={<Download size={15} color="#ffffff" />}
            onClick={descargarReporte}
            size="sm"
            style={{
              height: "34px",
              backgroundColor: "#23977f",
              color: "#ffffff",
            }}
            styles={{
              label: {
                color: "#ffffff",
                fontWeight: 700,
              }
            }}
          >
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
            aprobarPagoWebDirecto={aprobarPagoWebDirecto}
            abrirObservarModal={abrirObservarModal}
            abrirRechazarModal={abrirRechazarModal}
            filas={reporteCaja}
            onVerHistorialAlumno={abrirHistorialAlumno}
          />
        </section>
      </section>

      <HistorialAlumnoModal
        historial={historialAlumno}
        loading={historialAlumnoCargando}
        onClose={cerrarHistorialAlumno}
        opened={historialAlumnoAbierto}
        registro={historialAlumnoRegistro}
      />
    </>
  );
}
