import React from "react";
import useSidebar from "../../hooks/useSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Loader } from "@mantine/core";
import { IconAlertCircle as AlertCircle, IconMenu2 as Menu } from "@tabler/icons-react";

import { formatearSoles } from "./utils/direccionFormatters";
import "./Direccion.css";

import DireccionSidebar from "./components/DireccionSidebar/DireccionSidebar";
import DireccionDashboard from "./components/DireccionDashboard/DireccionDashboard";
import DireccionReportes from "./components/DireccionReportes/DireccionReportes";
import DireccionDescuentos from "./components/DireccionDescuentos/DireccionDescuentos";
import DireccionCorrelativos from "./components/DireccionCorrelativos/DireccionCorrelativos";

import useDireccion from "./hooks/useDireccion";

export default function Direccion({
  embedded = false,
  initialView = "resumen",
  moduleSwitcher,
  onLogout,
  user,
  delegatedContent = null,
}: any) {
  const { module, subview } = useParams();
  const navigate = useNavigate();
  const vista = embedded ? (initialView || "resumen") : (subview || "resumen");

  const setVista = (newView: string) => {
    if (embedded) {
      navigate(`/${module}/delegated/direccion/${newView}`);
    } else {
      navigate(`/direccion/${newView}`);
    }
  };

  const [sidebarExpanded, toggleSidebar] = useSidebar("dir");

  const d = useDireccion({
    embedded,
    initialView,
    user,
  });

  return (
    <main className={embedded ? "dir-page dir-page-embedded" : `dir-page ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {!embedded && sidebarExpanded && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar as any}
          aria-hidden="true"
        />
      )}
      {!embedded ? (
        <DireccionSidebar
          sidebarExpanded={sidebarExpanded}
          toggleSidebar={toggleSidebar}
          vista={vista}
          setVista={setVista}
          onLogout={onLogout}
          moduleSwitcher={moduleSwitcher}
          delegatedContent={delegatedContent}
        />
      ) : null}

      <section className={embedded ? "dir-main dir-main-embedded" : "dir-main"}>
        {!sidebarExpanded && !embedded && (
          <button
            className="sidebar-floating-toggle"
            type="button"
            onClick={toggleSidebar as any}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={20} />
          </button>
        )}

        {d.error ? (
          <Alert color="orange" icon={<AlertCircle size={18} />} radius="md">
            {d.error}
          </Alert>
        ) : null}

        {delegatedContent ? (
          delegatedContent
        ) : d.cargando ? (
          <section className="dir-loading">
            <Loader color="teal" />
            <p>Cargando información de Dirección...</p>
          </section>
        ) : vista === "resumen" ? (
          <DireccionDashboard
            dashboardTab={d.dashboardTab}
            setDashboardTab={d.setDashboardTab}
            resumen={d.resumen}
            ocupacion={d.ocupacion}
            filasProgramas={d.filasProgramas}
            chartIngresos={d.chartIngresos}
            chartEstadoPago={d.chartEstadoPago}
            chartInscripciones={d.chartInscripciones}
            chartOrigen={d.chartOrigen}
            metricasAnalisis={d.metricasAnalisis}
            panel={d.panel}
            formatearSoles={formatearSoles}
          />
        ) : vista === "reportes" ? (
          <DireccionReportes
            reporteSeleccionado={d.reporteSeleccionado}
            setReporteSeleccionado={d.setReporteSeleccionado}
            anio={d.anio}
            setAnio={d.setAnio}
            periodo={d.periodo}
            setPeriodo={d.setPeriodo}
            customFiltroCategoria={d.customFiltroCategoria}
            setCustomFiltroCategoria={d.setCustomFiltroCategoria}
            customFiltroPrograma={d.customFiltroPrograma}
            setCustomFiltroPrograma={d.setCustomFiltroPrograma}
            customFiltroGrados={d.customFiltroGrados}
            handleGradosChange={d.handleGradosChange}
            customFiltroOrigen={d.customFiltroOrigen}
            setCustomFiltroOrigen={d.setCustomFiltroOrigen}
            customFiltroPago={d.customFiltroPago}
            setCustomFiltroPago={d.setCustomFiltroPago}
            rangoRapido={d.rangoRapido}
            cambiarRangoRapido={d.cambiarRangoRapido}
            fechaInicio={d.fechaInicio}
            handleFechaInicioChange={d.handleFechaInicioChange}
            fechaFin={d.fechaFin}
            handleFechaFinChange={d.handleFechaFinChange}
            consolidacionAsistencia={d.consolidacionAsistencia}
            setConsolidacionAsistencia={d.setConsolidacionAsistencia}
            incluirInactivos={d.incluirInactivos}
            setIncluirInactivos={d.setIncluirInactivos}
            customTipo={d.customTipo}
            customColumnas={d.customColumnas}
            setCustomColumnas={d.setCustomColumnas}
            registrosFiltrados={d.registrosFiltrados}
            ejecutarDescargaCustom={d.ejecutarDescargaCustom}
            exportandoCustom={d.exportandoCustom}
            exportarHabilitado={d.exportarHabilitado}
            aniosOptions={d.aniosOptions}
            categoriasOptions={d.categoriasOptions}
            programasOptions={d.programasOptions}
            gradosOptions={d.gradosOptions}
          />
        ) : vista === "correlativos" ? (
          <DireccionCorrelativos
            correlativosForm={d.correlativosForm}
            setCorrelativosForm={d.setCorrelativosForm}
            handleGuardarCorrelativos={d.handleGuardarCorrelativos}
            guardandoCorrelativos={d.guardandoCorrelativos}
          />
        ) : (
          <DireccionDescuentos
            busquedaDescuento={d.busquedaDescuento}
            setBusquedaDescuento={d.setBusquedaDescuento}
            resultadosDescuento={d.resultadosDescuento}
            buscandoDescuento={d.buscandoDescuento}
            buscarEstudiantesDescuento={d.buscarEstudiantesDescuento}
            modalDescuentoAbierto={d.modalDescuentoAbierto}
            cerrarModalBeneficio={d.cerrarModalBeneficio}
            inscripcionSeleccionada={d.inscripcionSeleccionada}
            datosBeneficio={d.datosBeneficio}
            setDatosBeneficio={d.setDatosBeneficio}
            abrirModalBeneficio={d.abrirModalBeneficio}
            guardarBeneficio={d.guardarBeneficio}
            removerBeneficio={d.removerBeneficio}
          />
        )}
      </section>
    </main>
  );
}
