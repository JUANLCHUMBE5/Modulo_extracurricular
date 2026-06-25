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
} from "@tabler/icons-react";
import "./DireccionSidebar.css";

export default function DireccionSidebar({
  sidebarExpanded,
  toggleSidebar,
  vista,
  setVista,
  onLogout,
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
            <span className="module-switcher-header-title">Módulo Dirección</span>
            <span className="module-switcher-header-icon">
              {menuAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          </button>
          {menuAbierto && (
            <nav className="module-switcher-content coord-nav">
              <button
                className={`coord-nav-item ${vista === "resumen" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("resumen")}
                title="Resumen general"
              >
                <ChartBar size={18} />
                <span>Resumen general</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
              <button
                className={`coord-nav-item ${vista === "reportes" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("reportes")}
                title="Reportes"
              >
                <Download size={18} />
                <span>Reportes</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
              <button
                className={`coord-nav-item ${vista === "descuentos" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("descuentos")}
                title="Descuentos y Becas"
              >
                <RosetteDiscount size={18} />
                <span>Descuentos y Becas</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
              <button
                className={`coord-nav-item ${vista === "correlativos" ? "coord-nav-item-active" : ""}`}
                type="button"
                onClick={() => setVista("correlativos")}
                title="Correlativos"
              >
                <Adjustments size={18} />
                <span>Correlativos</span>
                <ChevronRight className="coord-nav-arrow" size={16} />
              </button>
            </nav>
          )}
        </div>
      ) : (
        <nav className="dir-nav" aria-label="Navegacion de direccion">
          <button
            className={vista === "resumen" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("resumen")}
            title="Resumen general"
          >
            <ChartBar size={18} />
          </button>
          <button
            className={vista === "reportes" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("reportes")}
            title="Reportes"
          >
            <Download size={18} />
          </button>
          <button
            className={vista === "descuentos" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("descuentos")}
            title="Descuentos y Becas"
          >
            <RosetteDiscount size={18} />
          </button>
          <button
            className={vista === "correlativos" ? "is-active" : ""}
            type="button"
            onClick={() => setVista("correlativos")}
            title="Correlativos"
          >
            <Adjustments size={18} />
          </button>
        </nav>
      )}

      <button className="dir-logout" type="button" onClick={onLogout} title="Cerrar sesion">
        <LogOut size={18} />
        {sidebarExpanded && <span className="dir-nav-text">Cerrar sesion</span>}
      </button>
    </aside>
  );
}
