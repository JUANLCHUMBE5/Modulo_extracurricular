import React, { useEffect, useMemo, useState } from "react";
import Login from "./components/Login/Login";
import Coordinacion from "./modules/coordinacion/Coordinacion";
import Secretaria from "./modules/secretaria/Secretaria";
import Administrador from "./modules/administrador/Administrador";
import Padres from "./modules/padres";
import Auxiliar from "./modules/auxiliar/Auxiliar";
import Caja from "./modules/caja/Caja";
import { hasPermission } from "./modules/administrador/models/usuarioModel";
import {
  IconBook as BookOpen,
  IconChartBar as ChartBar,
  IconChevronRight as ChevronRight,
  IconFileText as FileText,
  IconUpload as Upload,
} from "@tabler/icons-react";

const moduleLabels = {
  administrador: "Administrador",
  coordinacion: "Coordinacion",
  secretaria: "Secretaria",
  caja: "Caja",
  auxiliar: "Auxiliar",
  padres: "Padres",
  direccion: "Direccion",
};

const moduleAccessRules = {
  coordinacion: [
    "programas.crear",
    "programas.editar",
    "grupos.crear",
    "grupos.editar",
    "alumnos.historial.ver",
  ],
  caja: [
    "pagos.ver",
    "pagos.registrar",
    "pagos.editar",
  ],
};

const moduleShortcutGroups = [
  {
    id: "coordinacion",
    title: "Modulo Coordinacion",
    items: [
      { id: "coordinacion-programas", label: "Gestion de Programas", module: "coordinacion", view: "programas", permissions: ["programas.crear", "programas.editar"], icon: BookOpen },
      { id: "coordinacion-carga", label: "Carga Excel", module: "coordinacion", view: "carga", permissions: ["grupos.crear", "grupos.editar"], icon: Upload },
      { id: "coordinacion-documentos", label: "Plantillas / Documentos", module: "coordinacion", view: "documentos", permissions: ["programas.crear", "programas.editar"], icon: FileText },
    ],
  },
  {
    id: "caja",
    title: "Modulo Caja",
    items: [
      { id: "caja-pagos", label: "Pagos", module: "caja", view: "pagos", permissions: ["pagos.ver", "pagos.registrar", "pagos.editar"], icon: ChartBar },
    ],
  },
];

function getAvailableModules(user) {
  if (!user) return [];

  const modules = new Set([user.role]);
  Object.entries(moduleAccessRules).forEach(([moduleId, permissions]) => {
    if (permissions.some((permission) => hasPermission(user, permission))) {
      modules.add(moduleId);
    }
  });

  return Array.from(modules).filter((moduleId) => moduleLabels[moduleId]);
}

function ModuleSwitcher({ activeShortcutId, availableModules, currentRole, onSelectShortcut, user }) {
  if (availableModules.length <= 1) return null;
  const extraModules = availableModules.filter((moduleId) => moduleId !== currentRole);
  const groups = moduleShortcutGroups
    .filter((group) => extraModules.includes(group.id))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        !item.permissions?.length || item.permissions.some((permission) => hasPermission(user, permission))
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="grid gap-2">
      {groups.map((group) => (
        <section className="grid gap-2" key={group.id}>
          <h3 className="coord-module-label !m-0 !text-center !text-[#176c60]">
            {group.title}
          </h3>
          <div className="coord-nav">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeShortcutId === item.id;
              return (
                <button
                  className={`coord-nav-item ${active ? "coord-nav-item-active" : ""}`}
                  key={item.id}
                  onClick={() => onSelectShortcut(item)}
                  title={item.label}
                  type="button"
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <ChevronRight className="coord-nav-arrow" size={16} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState("");
  const [delegatedModule, setDelegatedModule] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveModule(userData.role);
    setDelegatedModule(null);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveModule("");
    setDelegatedModule(null);
  };

  const availableModules = useMemo(() => getAvailableModules(user), [user]);

  useEffect(() => {
    if (!user) return;
    if (!activeModule || !availableModules.includes(activeModule)) {
      setActiveModule(user.role);
    }
    if (delegatedModule && !availableModules.includes(delegatedModule.module)) {
      setDelegatedModule(null);
    }
  }, [activeModule, availableModules, delegatedModule, user]);

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderModule = () => {
    const delegatedContent = delegatedModule ? (() => {
      switch (delegatedModule.module) {
        case "coordinacion":
          return (
            <Coordinacion
              embedded
              initialView={delegatedModule.view}
              onLogout={handleLogout}
              user={user}
            />
          );
        case "caja":
          return (
            <Caja
              embedded
              initialView={delegatedModule.view}
              onLogout={handleLogout}
              user={user}
            />
          );
        default:
          return null;
      }
    })() : null;

    const moduleSwitcher = (
      <ModuleSwitcher
        activeShortcutId={delegatedModule?.id || ""}
        availableModules={availableModules}
        currentRole={user.role}
        onSelectShortcut={setDelegatedModule}
        user={user}
      />
    );

    switch (activeModule || user.role) {
      case "administrador":
        return <Administrador onLogout={handleLogout} />;
      case "coordinacion":
        return (
          <Coordinacion
            delegatedContent={delegatedContent}
            moduleSwitcher={moduleSwitcher}
            onClearDelegatedModule={() => setDelegatedModule(null)}
            onLogout={handleLogout}
            user={user}
          />
        );
      case "secretaria":
        return (
          <Secretaria
            delegatedContent={delegatedContent}
            moduleSwitcher={moduleSwitcher}
            onClearDelegatedModule={() => setDelegatedModule(null)}
            onLogout={handleLogout}
            user={user}
          />
        );
      case "caja":
        return (
          <Caja
            delegatedContent={delegatedContent}
            moduleSwitcher={moduleSwitcher}
            onClearDelegatedModule={() => setDelegatedModule(null)}
            onLogout={handleLogout}
            user={user}
          />
        );
      case "padres":
        return <Padres user={user} onLogout={handleLogout} />;
      case "auxiliar":
        return <Auxiliar onLogout={handleLogout} />;
      default:
        return (
          <div className="module-placeholder">
            <section className="module-placeholder-card">
              <span>SR</span>
              <h2>Módulo {user.name} en construcción</h2>
              <p>Este módulo aún no tiene su interfaz implementada.</p>
            </section>
            <button onClick={handleLogout} className="module-placeholder-button">
              Cerrar sesión
            </button>
          </div>
        );
    }
  };

  return (
    <>
      {renderModule()}
    </>
  );
}

export default App;
