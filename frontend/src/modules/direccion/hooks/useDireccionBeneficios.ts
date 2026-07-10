import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  buscarInscripcionesParaDescuento,
  aplicarDescuentoInscripcion,
  removerDescuentoInscripcion,
  obtenerCorrelativos,
  guardarCorrelativos,
} from "../direccionService";
import { obtenerMetodosPago, guardarMetodosPago, buscarEstudiantesCajaQuery, obtenerEstudiantePorDni } from "../../caja/cajaService";

export function useDireccionBeneficios({ initialView }: { initialView: string }) {
  const [busquedaDescuento, setBusquedaDescuento] = useState("");
  const [resultadosDescuento, setResultadosDescuento] = useState<any[]>([]);
  const [infoPadron, setInfoPadron] = useState<any[] | null>(null);
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
  const [metodosPago, setMetodosPago] = useState<string[]>([]);

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

      const cargarMetodos = async () => {
        try {
          const metodos = await obtenerMetodosPago();
          setMetodosPago(metodos || []);
        } catch {
          // Fallback silencioso si no carga
        }
      };

      cargarCorrelativos();
      cargarMetodos();
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

  const handleActualizarMetodosPago = async (nuevosMetodos: string[]) => {
    try {
      const res = await guardarMetodosPago(nuevosMetodos);
      setMetodosPago(res);
      toast.success("Éxito", { description: "Los métodos de pago se han guardado correctamente." });
      return true;
    } catch (err: any) {
      toast.error("Error", { description: err.message || "No se pudieron guardar los métodos de pago." });
      return false;
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
    setInfoPadron(null);
    try {
      const res = await buscarInscripcionesParaDescuento(term);
      setResultadosDescuento(res);
      if (res.length === 0) {
        // Verificar si el estudiante existe en el padrón/lista principal de la institución
        const mainStudents = await buscarEstudiantesCajaQuery(term);
        if (mainStudents && mainStudents.length > 0) {
          // Cargar detalles completos de los estudiantes encontrados
          const fullDetails = await Promise.all(
            mainStudents.slice(0, 3).map((s: any) => obtenerEstudiantePorDni(s.dni))
          );
          const validDetails = fullDetails.filter(Boolean);
          setInfoPadron(validDetails);
        } else {
          setInfoPadron(null);
          toast.info("Sin resultados", {
            description: "No se encontró ningún alumno con ese DNI o nombre en el padrón principal ni en inscripciones activas.",
            duration: 5000
          });
        }
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
    infoPadron,
    setInfoPadron,
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
    metodosPago,
    handleActualizarMetodosPago,
  };
}
