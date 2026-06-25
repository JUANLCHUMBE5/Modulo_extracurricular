import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import Login from "./components/Login/Login";
import { apiDb, syncApiDb } from "./services/dbApi";
import { isApiMode, apiClient } from "./services/apiClient";
import { startSyncEventsClient } from "./services/syncEventsClient";
import { normalizeUser } from "./modules/administrador/models/usuarioModel";
import {
  IconBook as BookOpen,
  IconChartBar as ChartBar,
  IconChevronRight as ChevronRight,
  IconChevronDown as ChevronDown,
  IconFileText as FileText,
  IconUpload as Upload,
  IconUserCheck as UserCheck,
  IconArchive as Archive,
  IconReceipt as Receipt,
  IconReceiptOff as ReceiptOff,
} from "@tabler/icons-react";

const Administrador = React.lazy(() => import("./modules/administrador/Administrador"));
const Auxiliar = React.lazy(() => import("./modules/auxiliar/Auxiliar"));
const Caja = React.lazy(() => import("./modules/caja/Caja"));
const Coordinacion = React.lazy(() => import("./modules/coordinacion/Coordinacion"));
const Direccion = React.lazy(() => import("./modules/direccion/Direccion"));
const Padres = React.lazy(() => import("./modules/padres"));
const Secretaria = React.lazy(() => import("./modules/secretaria/Secretaria"));

const moduleLabels = {
  administrador: "Administrador",
  coordinacion: "Coordinación Académica",
  secretaria: "Asistente",
  caja: "Cajera",
  auxiliar: "Auxiliar",
  padres: "Padres",
  direccion: "Dirección",
};

const APP_TITLE = "Módulo Extracurricular";

const moduleAccessRules = {
  direccion: [
    "direccion.resumen",
    "direccion.reportes",
    "direccion.descuentos",
    "direccion.correlativos",
  ],
  coordinacion: [
    "coordinacion.programas",
    "coordinacion.carga",
    "coordinacion.documentos",
    "coordinacion.asistencia",
    "coordinacion.historial",
  ],
  caja: [
    "caja.cobro",
    "caja.control",
    "caja.correlativo",
  ],
  secretaria: [
    "secretaria.inscripcion",
    "secretaria.asistencias",
  ],
  auxiliar: [
    "auxiliar.asistencia",
  ],
};

const moduleShortcutGroups = [
  {
    id: "coordinacion",
    title: "Módulo Coordinación Académica",
    items: [
      { id: "coordinacion-programas", label: "Gestion de Programas", module: "coordinacion", view: "programas", permissions: ["coordinacion.programas"], icon: BookOpen },
      { id: "coordinacion-carga", label: "Cargar Invitados", module: "coordinacion", view: "carga", permissions: ["coordinacion.carga"], icon: Upload },
      { id: "coordinacion-documentos", label: "Plantillas y Documentos", module: "coordinacion", view: "documentos", permissions: ["coordinacion.documentos"], icon: FileText },
      { id: "coordinacion-asistencia", label: "Asistencia y Control", module: "coordinacion", view: "asistencias", permissions: ["coordinacion.asistencia"], icon: UserCheck },
      { id: "coordinacion-historial", label: "Historial / Archivo", module: "coordinacion", view: "historial", permissions: ["coordinacion.historial"], icon: Archive },
    ],
  },
  {
    id: "caja",
    title: "Módulo Cajera",
    items: [
      { id: "caja-pagos", label: "Registrar Cobro", module: "caja", view: "pagos", permissions: ["caja.cobro"], icon: Receipt },
      { id: "caja-reportes", label: "Control y Exportacion", module: "caja", view: "reportes", permissions: ["caja.control"], icon: ChartBar },
      { id: "caja-correlativo", label: "Anulación de Correlativo", module: "caja", view: "cancelar_correlativo", permissions: ["caja.correlativo"], icon: ReceiptOff },
    ],
  },
];

const rolesSistema = {
  Administrador: "administrador",
  Secretaria: "secretaria",
  Asistente: "secretaria",
  Caja: "caja",
  Cajera: "caja",
  Coordinacion: "coordinacion",
  "Coordinación Académica": "coordinacion",
  "Coordinacion Academica": "coordinacion",
  Auxiliar: "auxiliar",
  Direccion: "direccion",
  Dirección: "direccion",
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

  // Track which groups are expanded.
  // By default, if a group contains the currently active view, it should be expanded.
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    groups.forEach((group) => {
      const hasActive = group.items.some((item) => item.id === activeShortcutId);
      initial[group.id] = hasActive;
    });
    return initial;
  });

  // Auto-expand group if a nested item is activated
  useEffect(() => {
    groups.forEach((group) => {
      const hasActive = group.items.some((item) => item.id === activeShortcutId);
      if (hasActive) {
        setExpanded((prev) => {
          if (prev[group.id]) return prev;
          return { ...prev, [group.id]: true };
        });
      }
    });
  }, [activeShortcutId]);

  const toggleGroup = (groupId) => {
    setExpanded((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <div className="grid gap-2">
      {groups.map((group) => {
        const isGroupOpen = !!expanded[group.id];
        return (
          <section className="module-switcher-group" key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className="module-switcher-header"
              type="button"
            >
              <span className="module-switcher-header-title">{group.title}</span>
              <span className="module-switcher-header-icon">
                {isGroupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
            </button>

            {isGroupOpen && (
              <div className="module-switcher-content coord-nav">
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
            )}
          </section>
        );
      })}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => readStorageJson(SESSION_STORAGE_KEY, null));
  const navigate = useNavigate();
  const lastActiveUserCheckRef = useRef(0);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    navigate("/", { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    removeStoredSession();
    navigate("/login", { replace: true });
  };

  const availableModules = useMemo(() => getAvailableModules(user), [user]);

  useEffect(() => {
    if (!user) return;
    writeStorageJson(SESSION_STORAGE_KEY, user);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return startSyncEventsClient({
      getToken: () => window.sessionStorage.getItem("san_rafael_token") || "",
    });
  }, [user?.username, user?.role]);

  useEffect(() => {
    if (!user?.username || user.role === "padres") return;

    const actualizarUsuarioActivo = async () => {
      lastActiveUserCheckRef.current = Date.now();
      try {
        if (isApiMode()) {
          const res = await apiClient.get("/api/v1/auth/me");
          if (res.success && res.data && res.data.user) {
            setUser((actual) => {
              if (!actual) return actual;
              const apiUser = res.data.user;
              const rol = apiUser.rol || rolesApiASistema[apiUser.role] || "Secretaria";
              const normalizado = normalizeUser({
                usuario: apiUser.username || actual.username,
                nombre: apiUser.name,
                rol,
                estado: apiUser.estado || actual.estado,
                permisos: apiUser.permissions || apiUser.permisos,
              });
              const role = apiUser.role || rolesSistema[normalizado.rol] || "secretaria";
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
              sessionStorage.setItem("san_rafael_user", JSON.stringify(updatedUser));
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

    const handleMockDbUpdated = () => actualizarUsuarioActivo();

    const handleFocusCheck = () => {
      const now = Date.now();
      if (now - lastActiveUserCheckRef.current > 30000) {
        actualizarUsuarioActivo();
      }
    };

    actualizarUsuarioActivo();
    const intervaloPermisos = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        actualizarUsuarioActivo();
      }
    }, 180000);
    window.addEventListener("api-db-updated", actualizarUsuarioActivo);
    window.addEventListener("mock-db-updated", handleMockDbUpdated);
    window.addEventListener("storage", actualizarUsuarioActivo);
    window.addEventListener("focus", handleFocusCheck);
    document.addEventListener("visibilitychange", handleFocusCheck);
    return () => {
      window.clearInterval(intervaloPermisos);
      window.removeEventListener("api-db-updated", actualizarUsuarioActivo);
      window.removeEventListener("mock-db-updated", handleMockDbUpdated);
      window.removeEventListener("storage", actualizarUsuarioActivo);
      window.removeEventListener("focus", handleFocusCheck);
      document.removeEventListener("visibilitychange", handleFocusCheck);
    };
  }, [user?.role, user?.username]);

  useEffect(() => {
    const actualizarSesionEntrePestanas = (event) => {
      if (event.key !== SESSION_STORAGE_KEY || event.newValue) return;
      setUser(null);
    };

    window.addEventListener("storage", actualizarSesionEntrePestanas);
    return () => window.removeEventListener("storage", actualizarSesionEntrePestanas);
  }, []);

  return (
    <Suspense fallback={<div className="module-placeholder">Cargando modulo...</div>}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={`/${user.role}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/:module"
          element={
            <ModuleLayout
              user={user}
              onLogout={handleLogout}
              availableModules={availableModules}
            />
          }
        />
        <Route
          path="/:module/:subview"
          element={
            <ModuleLayout
              user={user}
              onLogout={handleLogout}
              availableModules={availableModules}
            />
          }
        />
        <Route
          path="/:module/delegated/:delegatedModule/:delegatedView"
          element={
            <ModuleLayout
              user={user}
              onLogout={handleLogout}
              availableModules={availableModules}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function ModuleLayout({ user, onLogout, availableModules }) {
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
      return <Direccion onLogout={onLogout} user={user} />;
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

export default App;
