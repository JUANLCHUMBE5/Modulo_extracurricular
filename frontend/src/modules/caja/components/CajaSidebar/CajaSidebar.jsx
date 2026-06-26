import React, { useState } from "react";
import {
  IconChartBar as ChartBar,
  IconLogout as LogOut,
  IconReceipt2 as Receipt,
  IconMenu2 as Menu,
  IconReceiptOff as ReceiptOff,
  IconFileMinus as FileMinus,
  IconChevronRight as ChevronRight,
  IconChevronDown as ChevronDown,
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
  const [menuAbierto, setMenuAbierto] = useState(true);

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

      {sidebarExpanded ? (
        <div className="module-switcher-group caja-sidebar-menu-card">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="module-switcher-header"
            type="button"
          >
            <span className="module-switcher-header-title">Módulo Cajera</span>
            <span className="module-switcher-header-icon">
              {menuAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          </button>
          {menuAbierto && (
            <nav className="module-switcher-content coord-nav">
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "pagos" ? "coord-nav-item-active" : ""}`}
                onClick={() => {
                  onClearDelegatedModule?.();
                  setVista("pagos");
                }}
                type="button"
                title="Registrar Cobro"
              >
                <Receipt size={17} />
                <span>Registrar Cobro</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "reportes" ? "coord-nav-item-active" : ""}`}
                onClick={() => {
                  onClearDelegatedModule?.();
                  setVista("reportes");
                }}
                type="button"
                title="Control y Exportacion"
              >
                <ChartBar size={17} />
                <span>Control y Exportacion</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "cancelar_correlativo" ? "coord-nav-item-active" : ""}`}
                onClick={() => {
                  onClearDelegatedModule?.();
                  setVista("cancelar_correlativo");
                }}
                type="button"
                title="Anulación de Correlativo"
              >
                <ReceiptOff size={17} />
                <span>Anulación de Correlativo</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
            </nav>
          )}
        </div>
      ) : (
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
            <Receipt size={17} />
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
            <ChartBar size={17} />
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
            <ReceiptOff size={17} />
          </button>
        </nav>
      )}

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
