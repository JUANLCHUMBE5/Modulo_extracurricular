import {
  IconMenu2 as Menu,
  IconChartBar as ChartBar,
  IconDownload as Download,
  IconLogout as LogOut,
  IconAdjustments as Adjustments,
  IconRosetteDiscount as RosetteDiscount,
} from "@tabler/icons-react";
import "./DireccionSidebar.css";

export default function DireccionSidebar({
  sidebarExpanded,
  toggleSidebar,
  vista,
  setVista,
  onLogout,
}) {
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
      {sidebarExpanded && <p className="dir-module-label">Módulo Dirección</p>}
      <nav className="dir-nav" aria-label="Navegacion de direccion">
        <button
          className={vista === "resumen" ? "is-active" : ""}
          type="button"
          onClick={() => setVista("resumen")}
          title="Resumen general"
        >
          <ChartBar size={18} />
          <span className="dir-nav-text">Resumen general</span>
        </button>
        <button
          className={vista === "reportes" ? "is-active" : ""}
          type="button"
          onClick={() => setVista("reportes")}
          title="Reportes"
        >
          <Download size={18} />
          <span className="dir-nav-text">Reportes</span>
        </button>
        <button
          className={vista === "descuentos" ? "is-active" : ""}
          type="button"
          onClick={() => setVista("descuentos")}
          title="Descuentos y Becas"
        >
          <RosetteDiscount size={18} />
          <span className="dir-nav-text">Descuentos y Becas</span>
        </button>
        <button
          className={vista === "correlativos" ? "is-active" : ""}
          type="button"
          onClick={() => setVista("correlativos")}
          title="Correlativos"
        >
          <Adjustments size={18} />
          <span className="dir-nav-text">Correlativos</span>
        </button>
      </nav>
      <button className="dir-logout" type="button" onClick={onLogout} title="Cerrar sesion">
        <LogOut size={18} />
        <span className="dir-nav-text">Cerrar sesion</span>
      </button>
    </aside>
  );
}
