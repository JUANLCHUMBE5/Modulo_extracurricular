import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconUpload as Upload,
  IconUserCheck as UserCheck,
  IconChevronRight as ChevronRight,
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
  return (
    <aside className="coord-sidebar">
      <div className="coord-sidebar-brand-row">
        <button
          className="coord-menu-toggle-btn"
          type="button"
          onClick={() => setSidebarAbierta(false)}
          aria-label="Cerrar barra lateral"
          title="Cerrar barra lateral"
        >
          <Menu size={20} />
        </button>
        {sidebarAbierta && (
          <div className="coord-brand" aria-label="Colegio San Rafael">
            <img className="coord-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
          </div>
        )}
      </div>
      {sidebarAbierta && <p className="coord-module-label">{esProfesor ? "Modulo Profesores" : "Módulo Coordinación Académica"}</p>}
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
              {sidebarAbierta && <span>{label}</span>}
              {sidebarAbierta && <ChevronRight className="coord-nav-arrow" size={16} />}
            </button>
          );
        })}
      </nav>
      {moduleSwitcher && sidebarAbierta ? (
        <div className="pt-3">
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
