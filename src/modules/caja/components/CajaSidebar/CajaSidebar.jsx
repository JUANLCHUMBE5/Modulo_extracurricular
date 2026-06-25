import React from "react";
import {
  IconChartBar as ChartBar,
  IconLogout as LogOut,
  IconReceipt2 as Receipt,
  IconMenu2 as Menu,
  IconReceiptOff as ReceiptOff,
  IconFileMinus as FileMinus,
} from "@tabler/icons-react";
import { LOGO_COLEGIO_SRC } from "../../constants/cajaConstants";
import "./CajaSidebar.css";

export default function CajaSidebar({
  sidebarExpanded,
  toggleSidebar,
  vista,
  setVista,
  moduleSwitcher,
  onClearDelegatedModule,
  onLogout,
  delegatedContent,
}) {
  return (
    <aside className={`caja-sidebar ${sidebarExpanded ? "expanded" : "collapsed"}`}>
      <div className="caja-sidebar-brand-row">
        <button
          className="caja-menu-toggle-btn"
          type="button"
          onClick={toggleSidebar}
          aria-label="Alternar barra lateral"
        >
          <Menu size={20} />
        </button>
        {sidebarExpanded && (
          <div className="caja-brand" aria-label="Colegio San Rafael">
            <img className="caja-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
          </div>
        )}
      </div>
      {sidebarExpanded && <p className="caja-module-label">Módulo Cajera</p>}
      <nav className="caja-nav" aria-label="Modulo de cajera">
        <button
          className={!delegatedContent && vista === "pagos" ? "is-active" : ""}
          onClick={() => {
            onClearDelegatedModule?.();
            setVista("pagos");
          }}
          type="button"
          title="Registrar Cobro"
        >
          <Receipt size={17} /> {sidebarExpanded && <span>Registrar Cobro</span>}
        </button>
        <button
          className={!delegatedContent && vista === "reportes" ? "is-active" : ""}
          onClick={() => {
            onClearDelegatedModule?.();
            setVista("reportes");
          }}
          type="button"
          title="Control y Exportacion"
        >
          <ChartBar size={17} /> {sidebarExpanded && <span>Control y Exportacion</span>}
        </button>
        <button
          className={!delegatedContent && vista === "cancelar_correlativo" ? "is-active" : ""}
          onClick={() => {
            onClearDelegatedModule?.();
            setVista("cancelar_correlativo");
          }}
          type="button"
          title="Anulación de Correlativo"
        >
          <ReceiptOff size={17} /> {sidebarExpanded && <span>Anulación de Correlativo</span>}
        </button>
      </nav>
      {moduleSwitcher && sidebarExpanded ? (
        <div className="pt-3">
          {moduleSwitcher}
        </div>
      ) : null}
      <button className="caja-logout" onClick={onLogout} type="button" title="Cerrar sesion">
        <LogOut size={17} /> {sidebarExpanded && <span>Cerrar sesion</span>}
      </button>
    </aside>
  );
}
