import {
  cambiarEstadoUsuario,
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
  listarUsuarios,
  resetearContrasenaUsuario,
} from "../administradorService";
import { buildUserPayload, normalizeUser } from "../models/usuarioModel";

export async function listarUsuariosController() {
  const usuarios = await listarUsuarios();
  return usuarios.map(normalizeUser);
}

export async function crearUsuarioController(datos) {
  return normalizeUser(await crearUsuario(buildUserPayload(datos)));
}

export async function editarUsuarioController(id, datos) {
  return normalizeUser(await editarUsuario(id, buildUserPayload(datos)));
}

export async function cambiarEstadoUsuarioController(id, nuevoEstado) {
  return normalizeUser(await cambiarEstadoUsuario(id, nuevoEstado));
}

export async function resetearContrasenaUsuarioController(id) {
  return normalizeUser(await resetearContrasenaUsuario(id));
}

export async function eliminarUsuarioController(id) {
  return normalizeUser(await eliminarUsuario(id));
}
