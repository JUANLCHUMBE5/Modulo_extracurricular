import { useState } from "react";
import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconUpload as Upload,
  IconUserCheck as UserCheck,
  IconChevronRight as ChevronRight,
  IconChevronDown as ChevronDown,
  IconLogout as LogOut,
  IconMenu2 as Menu,
  IconArchive as Archive,
} from "@tabler/icons-react";
import { LOGO_COLEGIO_SRC } from "../constants/coordinacionConstants";

const iconMap = {
  programas: BookOpen,
  carga: Upload,
  documentos: FileText,
  asistencias: UserCheck,
  historial: Archive,
};

export default function CoordinacionSidebar({
  delegatedContent,
  esProfesor,
  moduleSwitcher,
  onClearDelegatedModule,
  onLogout,
  setMensaje,
  setSidebarAbierta,
  setVista,
  sidebarAbierta,
  vista,
  vistasDisponibles,
}) {
  const [menuAbierto, setMenuAbierto] = useState(true);

  return (
    <aside className="coord-sidebar">
      <div className="coord-sidebar-brand-row">
        <button
          className="coord-menu-toggle-btn"
          type="button"
          onClick={() => setSidebarAbierta(!sidebarAbierta)}
          aria-label={sidebarAbierta ? "Cerrar barra lateral" : "Abrir barra lateral"}
          title={sidebarAbierta ? "Cerrar barra lateral" : "Abrir barra lateral"}
        >
          <Menu size={20} />
        </button>
        {sidebarAbierta && (
          <div className="coord-brand" aria-label="Colegio San Rafael">
            <img className="coord-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
          </div>
        )}
      </div>
      {sidebarAbierta ? (
        <div className="module-switcher-group coord-sidebar-menu-card">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="module-switcher-header"
            type="button"
          >
            <span className="module-switcher-header-title">
              {esProfesor ? "Modulo Profesores" : "Módulo Coordinación Académica"}
            </span>
            <span className="module-switcher-header-icon">
              {menuAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          </button>
          {menuAbierto && (
            <nav className="module-switcher-content coord-nav">
              {vistasDisponibles.map(({ id, label }) => {
                const Icon = iconMap[id] || BookOpen;
                const active = !delegatedContent && vista === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`coord-nav-item ${active ? "coord-nav-item-active" : ""}`}
                    onClick={() => {
                      onClearDelegatedModule?.();
                      setVista(id);
                      setMensaje("");
                    }}
                    title={label}
                  >
                    <span>{label}</span>
                    <ChevronRight className="coord-nav-arrow" size={16} />
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      ) : (
        <nav className="coord-nav">
          {vistasDisponibles.map(({ id, label }) => {
            const Icon = iconMap[id] || BookOpen;
            return (
              <button
                key={id}
                type="button"
                className={`coord-nav-item ${!delegatedContent && vista === id ? "coord-nav-item-active" : ""}`}
                onClick={() => {
                  onClearDelegatedModule?.();
                  setVista(id);
                  setMensaje("");
                }}
                title={label}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </nav>
      )}
      {moduleSwitcher && sidebarAbierta ? (
        <div>
          {moduleSwitcher}
        </div>
      ) : null}
      <button className="coord-logout" type="button" onClick={onLogout} title="Cerrar sesion">
        <LogOut size={18} />
        {sidebarAbierta && <span>Cerrar sesion</span>}
      </button>
    </aside>
  );
}
