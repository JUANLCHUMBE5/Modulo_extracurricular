import React, { useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import ModuleSwitcher from "./ModuleSwitcher";

const Administrador = React.lazy(() => import("../../modules/administrador/Administrador"));
const Auxiliar = React.lazy(() => import("../../modules/auxiliar/Auxiliar"));
const Caja = React.lazy(() => import("../../modules/caja/Caja"));
const Coordinacion = React.lazy(() => import("../../modules/coordinacion/Coordinacion"));
const Direccion = React.lazy(() => import("../../modules/direccion/Direccion"));
const Padres = React.lazy(() => import("../../modules/padres"));
const Secretaria = React.lazy(() => import("../../modules/secretaria/Secretaria"));

export const moduleLabels = {
  administrador: "Administrador",
  coordinacion: "Coordinación Académica",
  secretaria: "Asistente",
  caja: "Cajera",
  auxiliar: "Auxiliar",
  padres: "Padres",
  direccion: "Dirección",
};

export const APP_TITLE = "Módulo Extracurricular";

export default function ModuleLayout({ user, onLogout, availableModules }) {
  const { module, subview, delegatedModule, delegatedView } = useParams();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!availableModules.includes(module)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  useEffect(() => {
    const visibleModule = delegatedModule || module || user?.role;
    const moduleLabel = moduleLabels[visibleModule];
    document.title = moduleLabel ? `${moduleLabel} - ${APP_TITLE}` : APP_TITLE;
  }, [module, delegatedModule, user?.role]);

  let delegatedContent = null;
  if (delegatedModule && delegatedView) {
    switch (delegatedModule) {
      case "coordinacion":
        delegatedContent = (
          <Coordinacion
            embedded
            initialView={delegatedView}
            onLogout={onLogout}
            user={user}
          />
        );
        break;
      case "caja":
        delegatedContent = (
          <Caja
            embedded
            initialView={delegatedView}
            onLogout={onLogout}
            user={user}
          />
        );
        break;
      default:
        break;
    }
  }

  const handleSelectShortcut = (item) => {
    navigate(`/${module}/delegated/${item.module}/${item.view}`);
  };

  const handleClearDelegatedModule = () => {
    navigate(`/${module}`);
  };

  const activeShortcutId = (delegatedModule && delegatedView)
    ? `${delegatedModule}-${delegatedView}`
    : "";

  const moduleSwitcher = availableModules.length > 1 ? (
    <ModuleSwitcher
      activeShortcutId={activeShortcutId}
      availableModules={availableModules}
      currentRole={user.role}
      onSelectShortcut={handleSelectShortcut}
      user={user}
    />
  ) : null;

  switch (module) {
    case "administrador":
      return <Administrador onLogout={onLogout} />;
    case "coordinacion":
      return (
        <Coordinacion
          delegatedContent={delegatedContent}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={handleClearDelegatedModule}
          onLogout={onLogout}
          user={user}
        />
      );
    case "secretaria":
      return (
        <Secretaria
          delegatedContent={delegatedContent}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={handleClearDelegatedModule}
          onLogout={onLogout}
          user={user}
        />
      );
    case "caja":
      return (
        <Caja
          delegatedContent={delegatedContent}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={handleClearDelegatedModule}
          onLogout={onLogout}
          user={user}
        />
      );
    case "padres":
      return <Padres user={user} onLogout={onLogout} />;
    case "auxiliar":
      return <Auxiliar onLogout={onLogout} />;
    case "direccion":
      return (
        <Direccion
          moduleSwitcher={moduleSwitcher}
          onLogout={onLogout}
          user={user}
        />
      );
    default:
      return (
        <div className="module-placeholder">
          <section className="module-placeholder-card">
            <span>SR</span>
            <h2>Módulo {user.name} en construcción</h2>
            <p>Este módulo aún no tiene su interfaz implementada.</p>
          </section>
          <button onClick={onLogout} className="module-placeholder-button">
            Cerrar sesión
          </button>
        </div>
      );
  }
}
