import { useState } from "react";
import {
  IconMenu2 as Menu,
  IconChartBar as ChartBar,
  IconDownload as Download,
  IconLogout as LogOut,
  IconAdjustments as Adjustments,
  IconRosetteDiscount as RosetteDiscount,
  IconChevronRight as ChevronRight,
  IconChevronDown as ChevronDown,
  IconBuilding as Building,
  IconFileText as FileText,
} from "@tabler/icons-react";
import "./DireccionSidebar.css";

export default function DireccionSidebar({
  sidebarExpanded,
  toggleSidebar,
  vista,
  setVista,
  onLogout,
  moduleSwitcher,
  delegatedContent = null,
}) {
  const [menuAbierto, setMenuAbierto] = useState(true);

  return (
    <aside className="dir-sidebar">
      <div className="dir-sidebar-brand-row">
        <button
          className="dir-menu-toggle-btn"
          type="button"
          onClick={toggleSidebar}
          aria-label="Alternar barra lateral"
        >
          <Menu size={20} />
        </button>
        {sidebarExpanded && (
          <div className="dir-brand" aria-label="Colegio San Rafael">
            <img
              className="dir-brand-logo"
              src="/assets/padres/logo.png.jpg"
              alt="Colegio San Rafael"
            />
          </div>
        )}
      </div>

      {sidebarExpanded ? (
        <div className="module-switcher-group dir-sidebar-menu-card">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="module-switcher-header"
            type="button"
          >
            <div className="module-switcher-header-left">
              <Building className="module-switcher-header-main-icon" size={18} />
              <span className="module-switcher-header-title">Módulo Dirección</span>
            </div>
            <div className="module-switcher-header-right">
              <span className="module-switcher-header-icon">
                {menuAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
            </div>
          </button>
          {menuAbierto && (
            <nav className="module-switcher-content coord-nav">
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "resumen" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("resumen")}
                title="Resumen general"
              >
                <span>Resumen general</span>
              </button>
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "reportes" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("reportes")}
                title="Reportes"
              >
                <span>Reportes</span>
              </button>
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "descuentos" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("descuentos")}
                title="Descuentos y Becas"
              >
                <span>Descuentos y Becas</span>
              </button>
              <button
                className={`coord-nav-item ${!delegatedContent && vista === "correlativos" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("correlativos")}
                title="Correlativos"
              >
                <span>Correlativos</span>
              </button>
            </nav>
          )}
        </div>
      ) : (
        <nav className="dir-nav" aria-label="Navegacion de direccion">
          <button
            className={!delegatedContent && vista === "resumen" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("resumen")}
            title="Resumen general"
          >
            <ChartBar size={18} />
          </button>
          <button
            className={!delegatedContent && vista === "reportes" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("reportes")}
            title="Reportes"
          >
            <Download size={18} />
          </button>
          <button
            className={!delegatedContent && vista === "descuentos" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("descuentos")}
            title="Descuentos y Becas"
          >
            <RosetteDiscount size={18} />
          </button>
          <button
            className={!delegatedContent && vista === "correlativos" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("correlativos")}
            title="Correlativos"
          >
            <Adjustments size={18} />
          </button>
        </nav>
      )}

      {moduleSwitcher && sidebarExpanded ? (
        <div>
          {moduleSwitcher}
        </div>
      ) : null}

      <button className="dir-logout" type="button" onClick={onLogout} title="Cerrar sesion">
        <LogOut size={18} />
        {sidebarExpanded && <span className="dir-nav-text">Cerrar sesion</span>}
      </button>
    </aside>
  );
}
