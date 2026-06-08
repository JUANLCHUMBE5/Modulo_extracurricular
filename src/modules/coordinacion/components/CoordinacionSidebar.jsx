import {
  IconChevronRight as ChevronRight,
  IconLogout as LogOut,
} from "@tabler/icons-react";
import { LOGO_COLEGIO_SRC } from "../constants/coordinacionConstants";

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
      <button
        className="coord-sidebar-toggle"
        type="button"
        onClick={() => setSidebarAbierta((abierta) => !abierta)}
        aria-label={sidebarAbierta ? "Cerrar menu lateral" : "Abrir menu lateral"}
        title={sidebarAbierta ? "Cerrar menu" : "Abrir menu"}
      >
        <ChevronRight size={18} />
      </button>
      <div className="coord-brand" aria-label="Colegio San Rafael">
        <img className="coord-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
      </div>
      <p className="coord-module-label">{esProfesor ? "Modulo Profesores" : "Modulo Coordinacion"}</p>
      <nav className="coord-nav">
        {vistasDisponibles.map(({ id, label, icon: Icon }) => (
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
            <span>{label}</span>
            <ChevronRight className="coord-nav-arrow" size={16} />
          </button>
        ))}
      </nav>
      {moduleSwitcher ? (
        <div className="pt-3">
          {moduleSwitcher}
        </div>
      ) : null}
      <button className="coord-logout" type="button" onClick={onLogout} title="Cerrar sesion">
        <LogOut size={18} />
        <span>Cerrar sesion</span>
      </button>
    </aside>
  );
}
