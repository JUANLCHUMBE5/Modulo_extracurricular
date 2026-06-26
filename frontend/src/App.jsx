import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Login/Login";
import { apiDb, syncApiDb } from "./services/dbApi";
import { isApiMode, apiClient } from "./services/apiClient";
import { startSyncEventsClient } from "./services/syncEventsClient";
import { normalizeUser } from "./modules/administrador/models/usuarioModel";
import ModuleLayout, { moduleLabels } from "./components/Layout/ModuleLayout";

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



export default App;
