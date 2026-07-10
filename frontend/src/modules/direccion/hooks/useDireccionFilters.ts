import { useState } from "react";

export function useDireccionFilters() {
  const [customFiltroOrigen, setCustomFiltroOrigen] = useState("todos");
  const [customFiltroPago, setCustomFiltroPago] = useState("todos");
  const [customFiltroCategoria, setCustomFiltroCategoria] = useState("todos");
  const [customFiltroPrograma, setCustomFiltroPrograma] = useState("todos");
  const [customFiltroGrados, setCustomFiltroGrados] = useState<string[]>([]);
  const [customColumnas, setCustomColumnas] = useState<string[]>([]);
  const [exportandoCustom, setExportandoCustom] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [consolidacionAsistencia, setConsolidacionAsistencia] = useState("dia");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [rangoRapido, setRangoRapido] = useState("todos");
  const [customTipo, setCustomTipo] = useState("inscripciones");

  const handleGradosChange = (val: string[]) => {
    if (val.includes("todos")) {
      if (!customFiltroGrados.includes("todos")) {
        setCustomFiltroGrados(["todos"]);
      } else {
        const filtered = val.filter((v) => v !== "todos");
        setCustomFiltroGrados(filtered);
      }
    } else {
      setCustomFiltroGrados(val);
    }
  };

  const cambiarRangoRapido = (val: string) => {
    setRangoRapido(val);
    const d = new Date();

    const formatearFechaLocal = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (val === "todos") {
      setFechaInicio("");
      setFechaFin("");
    } else if (val === "hoy") {
      const hoyStr = formatearFechaLocal(d);
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
    } else if (val === "esta_semana") {
      const day = d.getDay();
      const diffLunes = d.getDate() - day + (day === 0 ? -6 : 1);
      const lunes = new Date(d.setDate(diffLunes));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      setFechaInicio(formatearFechaLocal(lunes));
      setFechaFin(formatearFechaLocal(domingo));
    } else if (val === "este_mes") {
      const primero = new Date(d.getFullYear(), d.getMonth(), 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setFechaInicio(formatearFechaLocal(primero));
      setFechaFin(formatearFechaLocal(ultimo));
    } else if (val === "mes_anterior") {
      const primero = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth(), 0);
      setFechaInicio(formatearFechaLocal(primero));
      setFechaFin(formatearFechaLocal(ultimo));
    }
  };

  const handleFechaInicioChange = (e: any) => {
    setFechaInicio(e.target.value);
    setRangoRapido("personalizado");
  };

  const handleFechaFinChange = (e: any) => {
    setFechaFin(e.target.value);
    setRangoRapido("personalizado");
  };

  return {
    customFiltroOrigen,
    setCustomFiltroOrigen,
    customFiltroPago,
    setCustomFiltroPago,
    customFiltroCategoria,
    setCustomFiltroCategoria,
    customFiltroPrograma,
    setCustomFiltroPrograma,
    customFiltroGrados,
    setCustomFiltroGrados,
    handleGradosChange,
    customColumnas,
    setCustomColumnas,
    exportandoCustom,
    setExportandoCustom,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    consolidacionAsistencia,
    setConsolidacionAsistencia,
    incluirInactivos,
    setIncluirInactivos,
    rangoRapido,
    setRangoRapido,
    cambiarRangoRapido,
    handleFechaInicioChange,
    handleFechaFinChange,
    customTipo,
    setCustomTipo,
  };
}
