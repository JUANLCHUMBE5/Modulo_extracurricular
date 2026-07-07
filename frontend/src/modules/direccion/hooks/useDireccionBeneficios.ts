import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  buscarInscripcionesParaDescuento,
  aplicarDescuentoInscripcion,
  removerDescuentoInscripcion,
  obtenerCorrelativos,
  guardarCorrelativos,
} from "../direccionService";

export function useDireccionBeneficios({ initialView }: { initialView: string }) {
  const [busquedaDescuento, setBusquedaDescuento] = useState("");
  const [resultadosDescuento, setResultadosDescuento] = useState<any[]>([]);
  const [buscandoDescuento, setBuscandoDescuento] = useState(false);
  const [modalDescuentoAbierto, setModalDescuentoAbierto] = useState(false);
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState<any>(null);
  const [datosBeneficio, setDatosBeneficio] = useState({
    tipo: "beca",
    valor: "",
    justificacion: "",
  });

  const [correlativosForm, setCorrelativosForm] = useState({
    reciboInicio: "",
    reciboActual: "",
    reciboVirtualInicio: "",
    reciboVirtualActual: "",
    egresoInicio: "",
    egresoActual: ""
  });
  const [guardandoCorrelativos, setGuardandoCorrelativos] = useState(false);

  useEffect(() => {
    if (initialView === "correlativos") {
      const cargarCorrelativos = async () => {
        try {
          const res = await obtenerCorrelativos();
          setCorrelativosForm(res || {
            reciboInicio: "",
            reciboActual: "",
            reciboVirtualInicio: "",
            reciboVirtualActual: "",
            egresoInicio: "",
            egresoActual: ""
          });
        } catch (err) {
          toast.error("Error", { description: "No se pudieron cargar los correlativos." });
        }
      };
      cargarCorrelativos();
    }
  }, [initialView]);

  const handleGuardarCorrelativos = async (formToSave = correlativosForm) => {
    setGuardandoCorrelativos(true);
    try {
      await guardarCorrelativos(formToSave);
      toast.success("Éxito", { description: "Los correlativos se han guardado correctamente." });
      return true;
    } catch (err: any) {
      toast.error("Error", { description: err.message || "No se pudieron guardar los correlativos." });
      return false;
    } finally {
      setGuardandoCorrelativos(false);
    }
  };

  const refrescarBusquedaDescuento = useCallback(async () => {
    const term = String(busquedaDescuento || "").trim();
    if (!term) return;
    try {
      const res = await buscarInscripcionesParaDescuento(term);
      setResultadosDescuento(res);
    } catch (err) {
      console.error("Error al refrescar búsqueda:", err);
    }
  }, [busquedaDescuento]);

  const buscarEstudiantesDescuento = async (e: any) => {
    if (e) e.preventDefault();
    const term = String(busquedaDescuento || "").trim();
    if (!term) {
      toast.error("Búsqueda vacía", { description: "Por favor ingrese un DNI o Nombre." });
      return;
    }
    setBuscandoDescuento(true);
    try {
      const res = await buscarInscripcionesParaDescuento(term);
      setResultadosDescuento(res);
      if (res.length === 0) {
        toast.info("Sin resultados", { description: "No se encontraron estudiantes para esa búsqueda." });
      }
    } catch (err: any) {
      toast.error("Error en búsqueda", { description: err.message || "No se pudo completar la búsqueda." });
    } finally {
      setBuscandoDescuento(false);
    }
  };

  const abrirModalBeneficio = (ins: any) => {
    setInscripcionSeleccionada(ins);
    setDatosBeneficio({
      tipo: ins.descuentoTipo || "beca",
      valor: ins.descuentoValor ? String(ins.descuentoValor) : "",
      justificacion: ins.descuentoJustificacion || "",
    });
    setModalDescuentoAbierto(true);
  };

  const cerrarModalBeneficio = () => {
    setModalDescuentoAbierto(false);
    setInscripcionSeleccionada(null);
    setDatosBeneficio({
      tipo: "beca",
      valor: "",
      justificacion: "",
    });
  };

  const guardarBeneficio = async () => {
    if (!inscripcionSeleccionada) return;
    if (!datosBeneficio.justificacion.trim()) {
      toast.error("Validación", { description: "Debe ingresar una justificación o motivo para el descuento." });
      return;
    }
    if (datosBeneficio.tipo !== "beca" && (!datosBeneficio.valor || Number(datosBeneficio.valor) <= 0)) {
      toast.error("Validación", { description: "Debe ingresar un valor numérico mayor a cero para el descuento." });
      return;
    }

    setBuscandoDescuento(true);
    try {
      await aplicarDescuentoInscripcion(inscripcionSeleccionada.id, {
        tipo: datosBeneficio.tipo,
        valor: Number(datosBeneficio.valor || 0),
        justificacion: datosBeneficio.justificacion.trim(),
      });
      toast.success("Beneficio registrado", { description: "El descuento/beca ha sido aprobado y enviado a Caja." });
      await refrescarBusquedaDescuento();
      cerrarModalBeneficio();
    } catch (err: any) {
      toast.error("Error", { description: err.message || "No se pudo aplicar el beneficio." });
    } finally {
      setBuscandoDescuento(false);
    }
  };

  const removerBeneficio = async () => {
    if (!inscripcionSeleccionada) return;
    setBuscandoDescuento(true);
    try {
      await removerDescuentoInscripcion(inscripcionSeleccionada.id);
      toast.success("Beneficio removido", { description: "Se ha retirado el descuento y restaurado el costo original." });
      await refrescarBusquedaDescuento();
      cerrarModalBeneficio();
    } catch (err: any) {
      toast.error("Error", { description: err.message || "No se pudo remover el beneficio." });
    } finally {
      setBuscandoDescuento(false);
    }
  };

  return {
    busquedaDescuento,
    setBusquedaDescuento,
    resultadosDescuento,
    buscandoDescuento,
    modalDescuentoAbierto,
    inscripcionSeleccionada,
    datosBeneficio,
    setDatosBeneficio,
    correlativosForm,
    setCorrelativosForm,
    guardandoCorrelativos,
    handleGuardarCorrelativos,
    refrescarBusquedaDescuento,
    buscarEstudiantesDescuento,
    abrirModalBeneficio,
    cerrarModalBeneficio,
    guardarBeneficio,
    removerBeneficio,
  };
}
