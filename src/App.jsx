import React, { Suspense, useEffect, useMemo, useState } from "react";
import Login from "./components/Login/Login";
import Coordinacion from "./modules/coordinacion/Coordinacion";
import Secretaria from "./modules/secretaria/Secretaria";
import Administrador from "./modules/administrador/Administrador";
import Padres from "./modules/padres";
import Auxiliar from "./modules/auxiliar/Auxiliar";
import Caja from "./modules/caja/Caja";
import { apiDb, syncApiDb } from "./services/dbApi";
import { isApiMode, apiClient } from "./services/apiClient";
import { normalizeUser } from "./modules/administrador/models/usuarioModel";
import {
  IconBook as BookOpen,
  IconChartBar as ChartBar,
  IconChevronRight as ChevronRight,
  IconFileText as FileText,
  IconUpload as Upload,
} from "@tabler/icons-react";

const Direccion = React.lazy(() => import("./modules/direccion/Direccion"));

const moduleLabels = {
  administrador: "Administrador",
  coordinacion: "Coordinación",
  secretaria: "Secretaría",
  caja: "Caja",
  auxiliar: "Auxiliar",
  padres: "Padres",
  direccion: "Dirección",
};

const APP_TITLE = "Módulo Extracurricular";

const moduleAccessRules = {
  direccion: [
    "direccion.resumen.ver",
    "reportes.ver",
    "reportes.exportar",
  ],
  coordinacion: [
    "programas.crear",
    "programas.editar",
    "grupos.crear",
    "grupos.editar",
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

const rolesSistema = {
  Administrador: "administrador",
  Secretaria: "secretaria",
  Caja: "caja",
  Coordinacion: "coordinacion",
  Auxiliar: "auxiliar",
  Direccion: "direccion",
};

const rolesApiASistema = Object.fromEntries(
  Object.entries(rolesSistema).map(([rol, role]) => [role, rol])
);

const SESSION_STORAGE_KEY = "modulo_extracurricular_session";
const MODULE_STORAGE_KEY = "modulo_extracurricular_active_module";
const DELEGATED_STORAGE_KEY = "modulo_extracurricular_delegated_module";

function readStorageJson(key, fallback = null) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readStorageValue(key, fallback = "") {
  try {
    return window.sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // La sesion sigue viva en memoria aunque el navegador bloquee sessionStorage.
  }
}

function writeStorageValue(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // La sesion sigue viva en memoria aunque el navegador bloquee sessionStorage.
  }
}

function removeStoredSession() {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(MODULE_STORAGE_KEY);
    window.sessionStorage.removeItem(DELEGATED_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(MODULE_STORAGE_KEY);
    window.localStorage.removeItem(DELEGATED_STORAGE_KEY);
    window.localStorage.removeItem("san_rafael_token");
    window.localStorage.removeItem("san_rafael_user");
  } catch {
    // No hay nada mas que limpiar si el navegador bloquea storage.
  }
}

function userHasAssignedPermission(user, permission) {
  if (!user) return false;
  if (user.estado && user.estado !== "Activo") return false;
  if (user.role === "administrador") return true;
  const permisos = Array.isArray(user.permisos)
    ? user.permisos
    : Array.isArray(user.permissions)
      ? user.permissions
      : [];
  return permisos.includes(permission);
}

function samePermissions(a = [], b = []) {
  if (a.length !== b.length) return false;
  const permisos = new Set(a);
  return b.every((permission) => permisos.has(permission));
}

function getAvailableModules(user) {
  if (!user) return [];

  const modules = new Set([user.role]);
  Object.entries(moduleAccessRules).forEach(([moduleId, permissions]) => {
    if (permissions.some((permission) => userHasAssignedPermission(user, permission))) {
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
        !item.permissions?.length || item.permissions.some((permission) => userHasAssignedPermission(user, permission))
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
  const [user, setUser] = useState(() => readStorageJson(SESSION_STORAGE_KEY, null));
  const [activeModule, setActiveModule] = useState(() => readStorageValue(MODULE_STORAGE_KEY, ""));
  const [delegatedModule, setDelegatedModule] = useState(() => readStorageJson(DELEGATED_STORAGE_KEY, null));

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveModule(userData.role);
    setDelegatedModule(null);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveModule("");
    setDelegatedModule(null);
    removeStoredSession();
  };

  const availableModules = useMemo(() => getAvailableModules(user), [user]);

  useEffect(() => {
    if (!user) return;
    writeStorageJson(SESSION_STORAGE_KEY, user);
  }, [user]);

  useEffect(() => {
    if (!user || !activeModule) return;
    writeStorageValue(MODULE_STORAGE_KEY, activeModule);
  }, [activeModule, user]);

  useEffect(() => {
    if (!user) return;
    if (delegatedModule) {
      writeStorageJson(DELEGATED_STORAGE_KEY, {
        id: delegatedModule.id,
        label: delegatedModule.label,
        module: delegatedModule.module,
        view: delegatedModule.view,
      });
      return;
    }

    try {
      window.sessionStorage.removeItem(DELEGATED_STORAGE_KEY);
      window.localStorage.removeItem(DELEGATED_STORAGE_KEY);
    } catch {
      // Sin storage, basta con limpiar el estado en memoria.
    }
  }, [delegatedModule, user]);

  useEffect(() => {
    if (!user) return;
    if (!activeModule || !availableModules.includes(activeModule)) {
      setActiveModule(user.role);
    }
    if (delegatedModule && !availableModules.includes(delegatedModule.module)) {
      setDelegatedModule(null);
    }
  }, [activeModule, availableModules, delegatedModule, user]);

  useEffect(() => {
    const visibleModule = delegatedModule?.module || activeModule || user?.role;
    const moduleLabel = moduleLabels[visibleModule];
    document.title = moduleLabel ? `${moduleLabel} - ${APP_TITLE}` : APP_TITLE;
  }, [activeModule, delegatedModule, user?.role]);

  useEffect(() => {
    if (!user?.username || user.role === "padres") return;

    const actualizarUsuarioActivo = async () => {
      try {
        if (isApiMode()) {
          const res = await apiClient.get("/api/v1/auth/me");
          if (res.success && res.data && res.data.user) {
            setUser((actual) => {
              if (!actual) return actual;
              const apiUser = res.data.user;
              const role = apiUser.role;
              const rol = apiUser.rol || rolesApiASistema[role] || "Secretaria";
              const normalizado = normalizeUser({
                usuario: apiUser.username || actual.username,
                nombre: apiUser.name,
                rol,
                estado: apiUser.estado || actual.estado,
                permisos: apiUser.permissions || apiUser.permisos,
              });
              const permisos = normalizado.permisos;
              if (
                actual.role === role &&
                actual.name === apiUser.name &&
                samePermissions(actual.permisos || actual.permissions || [], permisos)
              ) {
                return actual;
              }
              const updatedUser = {
                ...actual,
                role,
                name: apiUser.name,
                permisos,
                permissions: permisos
              };
              localStorage.setItem("san_rafael_user", JSON.stringify(updatedUser));
              return updatedUser;
            });
          }
          return;
        }

        await syncApiDb();
        const usuario = (apiDb.usuarios || []).find((item) =>
          String(item.usuario || "").trim().toLowerCase() === String(user.username || "").trim().toLowerCase()
        );
        if (!usuario) return;

        const normalizado = normalizeUser(usuario);
        setUser((actual) => {
          if (!actual) return actual;
          const role = rolesSistema[normalizado.rol] || String(normalizado.rol || "").toLowerCase();
          if (
            actual.role === role &&
            actual.name === normalizado.nombre &&
            actual.estado === normalizado.estado &&
            samePermissions(actual.permisos || actual.permissions || [], normalizado.permisos)
          ) {
            return actual;
          }
          return {
            ...actual,
            role,
            name: normalizado.nombre,
            estado: normalizado.estado,
            permisos: normalizado.permisos,
            permissions: normalizado.permisos,
          };
        });
      } catch {
        // Si la API no responde, se conserva la sesion actual.
      }
    };

    actualizarUsuarioActivo();
    const intervaloPermisos = window.setInterval(actualizarUsuarioActivo, 8000);
    window.addEventListener("api-db-updated", actualizarUsuarioActivo);
    window.addEventListener("mock-db-updated", actualizarUsuarioActivo);
    window.addEventListener("storage", actualizarUsuarioActivo);
    window.addEventListener("focus", actualizarUsuarioActivo);
    document.addEventListener("visibilitychange", actualizarUsuarioActivo);
    return () => {
      window.clearInterval(intervaloPermisos);
      window.removeEventListener("api-db-updated", actualizarUsuarioActivo);
      window.removeEventListener("mock-db-updated", actualizarUsuarioActivo);
      window.removeEventListener("storage", actualizarUsuarioActivo);
      window.removeEventListener("focus", actualizarUsuarioActivo);
      document.removeEventListener("visibilitychange", actualizarUsuarioActivo);
    };
  }, [user?.role, user?.username]);

  useEffect(() => {
    const actualizarSesionEntrePestanas = (event) => {
      if (event.key !== SESSION_STORAGE_KEY || event.newValue) return;
      setUser(null);
      setActiveModule("");
      setDelegatedModule(null);
    };

    window.addEventListener("storage", actualizarSesionEntrePestanas);
    return () => window.removeEventListener("storage", actualizarSesionEntrePestanas);
  }, []);

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

    const moduleSwitcher = availableModules.length > 1 ? (
      <ModuleSwitcher
        activeShortcutId={delegatedModule?.id || ""}
        availableModules={availableModules}
        currentRole={user.role}
        onSelectShortcut={setDelegatedModule}
        user={user}
      />
    ) : null;

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
      case "direccion":
        return (
          <Suspense fallback={<div className="module-placeholder">Cargando Direccion...</div>}>
            <Direccion onLogout={handleLogout} user={user} />
          </Suspense>
        );
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
