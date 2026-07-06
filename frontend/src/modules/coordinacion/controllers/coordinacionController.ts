import {
  listarProgramas,
  crearPrograma,
  editarPrograma,
  cambiarEstadoPrograma,
  eliminarPrograma,
  listarCategorias,
  crearCategoria,
  eliminarCategoria,
} from "../services/coordinacionService";
import { normalizePrograma, buildProgramaPayload } from "../models/coordinacionModel";

export async function listarProgramasController() {
  const result = await listarProgramas();
  return result.map(normalizePrograma);
}

export async function crearProgramaController(datos) {
  const payload = buildProgramaPayload(datos);
  const result = await crearPrograma(payload);
  return normalizePrograma(result);
}

export async function editarProgramaController(id, datos) {
  const payload = buildProgramaPayload(datos);
  const result = await editarPrograma(id, payload);
  return normalizePrograma(result);
}

export async function cambiarEstadoProgramaController(id, nuevoEstado) {
  const result = await cambiarEstadoPrograma(id, nuevoEstado);
  return normalizePrograma(result);
}

export async function eliminarProgramaController(id) {
  return await eliminarPrograma(id);
}

export async function listarCategoriasController() {
  return await listarCategorias();
}

export async function crearCategoriaController(nombre) {
  return await crearCategoria(nombre);
}

export async function eliminarCategoriaController(nombre) {
  return await eliminarCategoria(nombre);
}
