import { useState } from "react";
import { crearCategoria, eliminarCategoria, listarCategorias } from "../../services/coordinacionService";

/**
 * Hook personalizado para la gestión y CRUD de categorías de talleres.
 * 
 * @param {Object} params Parámetros de inicialización.
 * @param {Function} params.mostrarMsg Función para mostrar mensajes toast/alerta.
 * @param {Function} [params.onCategoriaAgregada] Callback disparado cuando una categoría se crea con éxito.
 * @param {Function} [params.onCategoriaEliminada] Callback disparado cuando una categoría se elimina con éxito.
 */
export default function useCoordinacionCategorias({ mostrarMsg, onCategoriaAgregada, onCategoriaEliminada }) {
  const [categorias, setCategorias] = useState([]);
  const [nuevaCat, setNuevaCat] = useState("");
  const [catAEliminar, setCatAEliminar] = useState("");
  const [mostrarGestorCategorias, setMostrarGestorCategorias] = useState(false);

  /**
   * Crea una nueva categoría de taller en la base de datos y actualiza la lista.
   */
  async function agregarCategoria() {
    if (!nuevaCat.trim()) return mostrarMsg("Ingrese el nombre de la nueva categoría.");
    try {
      await crearCategoria(nuevaCat.trim());
      const cats = await listarCategorias();
      setCategorias(cats);
      
      if (typeof onCategoriaAgregada === "function") {
        onCategoriaAgregada(nuevaCat.trim());
      }
      
      setNuevaCat("");
      mostrarMsg("Categoría agregada con éxito.", "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo agregar la categoría.");
    }
  }

  /**
   * Elimina la categoría seleccionada previa confirmación del usuario y actualiza la lista.
   */
  async function quitarCategoria() {
    if (!catAEliminar) return mostrarMsg("Seleccione una categoría para eliminar.");
    const confirmado = window.confirm(
      `¿Está seguro de eliminar la categoría "${catAEliminar}"?\n\nLos programas existentes con esta categoría quedarán sin categoría asignada.`
    );
    if (!confirmado) return;

    try {
      await eliminarCategoria(catAEliminar);
      const cats = await listarCategorias();
      setCategorias(cats);
      
      if (typeof onCategoriaEliminada === "function") {
        onCategoriaEliminada(catAEliminar);
      }
      
      setCatAEliminar("");
      mostrarMsg("Categoría eliminada con éxito.", "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo eliminar la categoría.");
    }
  }

  return {
    categorias,
    setCategorias,
    nuevaCat,
    setNuevaCat,
    catAEliminar,
    setCatAEliminar,
    mostrarGestorCategorias,
    setMostrarGestorCategorias,
    agregarCategoria,
    quitarCategoria,
  };
}
