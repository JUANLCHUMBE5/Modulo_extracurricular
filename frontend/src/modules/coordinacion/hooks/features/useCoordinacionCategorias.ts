import { useState } from "react";
import { crearCategoria, eliminarCategoria, listarCategorias } from "../../services/coordinacionService";

interface UseCoordinacionCategoriasProps {
  categorias: any[];
  setCategorias: React.Dispatch<React.SetStateAction<any[]>>;
  puedeEditarProgramas: boolean;
  mostrarMsg: (msg: string, tipo?: string) => void;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export default function useCoordinacionCategorias({
  categorias,
  setCategorias,
  puedeEditarProgramas,
  mostrarMsg,
  setForm,
}: UseCoordinacionCategoriasProps) {
  const [nuevaCat, setNuevaCat] = useState("");
  const [catAEliminar, setCatAEliminar] = useState("");

  async function agregarCategoria() {
    if (!nuevaCat.trim()) return;
    try {
      await crearCategoria(nuevaCat.trim());
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm((f: any) => ({ ...f, categoria: nuevaCat.trim() }));
      setNuevaCat("");
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo agregar la categoría.");
    }
  }

  async function quitarCategoria() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar categorías.");
    if (!catAEliminar) return mostrarMsg("Seleccione una categoría para quitar.");
    const confirmado = window.confirm(`¿Quitar la categoría "${catAEliminar}"?`);
    if (!confirmado) return;

    try {
      await eliminarCategoria(catAEliminar);
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm((f: any) => ({ ...f, categoria: f.categoria === catAEliminar ? "" : f.categoria }));
      setCatAEliminar("");
      mostrarMsg("Categoría quitada correctamente.", "success");
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo quitar la categoría.");
    }
  }

  return {
    nuevaCat,
    setNuevaCat,
    catAEliminar,
    setCatAEliminar,
    agregarCategoria,
    quitarCategoria,
  };
}
