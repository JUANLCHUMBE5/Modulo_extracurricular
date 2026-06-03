import { apiDb, syncApiDb } from "./dbApi";
import { isApiMode, apiClient } from "./apiClient";
import { adaptarEstudiante } from "./adapters";
import { normalizeUser } from "../modules/administrador/models/usuarioModel";

const delay = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms));

const aliasesUsuario = {
  secre: "secretaria",
  coord: "coordinacion",
};

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

function normalizarUsuarioApi(usuario = {}) {
  const role = usuario.role || String(usuario.rol || "").toLowerCase();
  const rol = usuario.rol || rolesApiASistema[role] || "Secretaria";
  const usuarioConPermisos = normalizeUser({
    usuario: usuario.username || usuario.usuario,
    nombre: usuario.name || usuario.nombre,
    rol,
    estado: usuario.estado,
    permisos: usuario.permisos || usuario.permissions,
  });

  return {
    username: usuario.username || usuario.usuario,
    role: rolesSistema[usuarioConPermisos.rol] || role,
    name: usuario.name || usuario.nombre,
    estado: usuario.estado,
    permisos: usuarioConPermisos.permisos,
    permissions: usuarioConPermisos.permisos,
  };
}

export const loginPersonal = async (username, password) => {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/auth/login", { username, password });
    if (!res.success) return { success: false, message: res.message || "Usuario o contraseña incorrectos." };
    
    const user = normalizarUsuarioApi(res.data.user || {});

    if (res.data.token) {
      localStorage.setItem("san_rafael_token", res.data.token);
      localStorage.setItem("san_rafael_user", JSON.stringify(user));
    }

    return {
      success: true,
      user
    };
  }

  await delay();
  await syncApiDb();

  const usuarioLimpio = String(username || "").trim().toLowerCase();
  const usuarioBuscado = aliasesUsuario[usuarioLimpio] || usuarioLimpio;
  const usuarios = Array.isArray(apiDb.usuarios) ? apiDb.usuarios : [];
  const usuario = usuarios.find((item) =>
    String(item.usuario || "").trim().toLowerCase() === usuarioBuscado
  );

  const contrasenaGuardada = String(usuario?.contrasena || "1234");

  if (usuario && usuario.estado !== "Inactivo" && String(password) === contrasenaGuardada) {
    const usuarioConPermisos = normalizeUser(usuario);
    return {
      success: true,
      user: {
        username: usuario.usuario,
        role: rolesSistema[usuario.rol] || String(usuario.rol || "").toLowerCase(),
        name: usuario.nombre,
        estado: usuario.estado,
        permisos: usuarioConPermisos.permisos,
        permissions: usuarioConPermisos.permisos,
      },
    };
  }

  return { success: false, message: "Usuario o contraseña incorrectos." };
};

export const loginPadre = async (dni, fechaNacimiento) => {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/extracurricular/padres/validar", { dni, fecha_nacimiento: fechaNacimiento });
    if (!res.success || !res.data) return { success: false, message: res.message || "DNI o fecha de nacimiento incorrectos." };
    
    const estudiante = adaptarEstudiante(res.data.estudiante || res.data);
    const user = {
      username: estudiante.dni,
      role: "padres",
      name: "Padre de familia",
      dni: estudiante.dni,
      estudiante: estudiante.nombres,
    };

    if (res.data.token) {
      localStorage.setItem("san_rafael_token", res.data.token);
      localStorage.setItem("san_rafael_user", JSON.stringify(user));
    }

    return {
      success: true,
      user
    };
  }

  await delay();
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(dniLimpio)) {
    return { success: false, message: "El DNI debe tener 8 numeros." };
  }

  const estudiante = apiDb.estudiantes[dniLimpio];
  if (!estudiante || estudiante.fechaNacimiento !== fechaNacimiento) {
    return { success: false, message: "DNI o fecha de nacimiento incorrectos." };
  }

  return {
    success: true,
    user: {
      username: dniLimpio,
      role: "padres",
      name: "Padre de familia",
      dni: dniLimpio,
      estudiante: estudiante.nombres,
    },
  };
};
