import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  buscarEstudiantesCajaQuery,
  listarPagos,
  anularPago,
  registrarEgresoCaja,
} from "../cajaService";
import { obtenerCorrelativos } from "../../direccion/direccionService";

interface UseCajaCancelarCorrelativoProps {
  periodo: string;
  onCorrelativoCancelado?: () => void;
}

export default function useCajaCancelarCorrelativo({
  periodo,
  onCorrelativoCancelado,
}: UseCajaCancelarCorrelativoProps) {
  const [correlativos, setCorrelativos] = useState<any>(null);
  const [motivo, setMotivo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscandoEstudiante, setBuscandoEstudiante] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);

  // Estados para selección de pago de estudiante
  const [pagosEstudiante, setPagosEstudiante] = useState<any[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [pagoSeleccionadoId, setPagoSeleccionadoId] = useState<string | null>(null);
  const pagoPreseleccionadoRef = useRef<string | null>(null);

  const [cargando, setCargando] = useState(false);
  const [cargandoCorr, setCargandoCorr] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("anular"); // "anular" | "egreso"

  // Form states for Egreso
  const [beneficiario, setBeneficiario] = useState("");
  const [dniEgreso, setDniEgreso] = useState("");
  const [montoEgreso, setMontoEgreso] = useState("");
  const [conceptoEgreso, setConceptoEgreso] = useState("");
  const [guardandoEgreso, setGuardandoEgreso] = useState(false);

  // States for student-based Egreso
  const [tipoEgreso, setTipoEgreso] = useState("estudiante"); // "estudiante" | "general"
  const [busquedaEgreso, setBusquedaEgreso] = useState("");
  const [resultadosEgreso, setResultadosEgreso] = useState<any[]>([]);
  const [buscandoEstudianteEgreso, setBuscandoEstudianteEgreso] = useState(false);
  const [estudianteEgreso, setEstudianteEgreso] = useState<any>(null);
  const [pagosEgreso, setPagosEgreso] = useState<any[]>([]);
  const [cargandoPagosEgreso, setCargandoPagosEgreso] = useState(false);
  const [pagoEgresoSeleccionadoId, setPagoEgresoSeleccionadoId] = useState<string | null>(null);

  const handleBuscarEstudianteEgreso = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = String(busquedaEgreso || "").trim();
    if (!query) {
      toast.error("Búsqueda vacía", { description: "Ingrese el DNI o nombres para buscar." });
      return;
    }
    if (query.length < 3) {
      toast.error("Búsqueda corta", { description: "Ingrese al menos 3 caracteres." });
      return;
    }
    setBuscandoEstudianteEgreso(true);
    setResultadosEgreso([]);
    try {
      const res = await buscarEstudiantesCajaQuery(query);
      if (res && res.length === 1) {
        seleccionarEstudianteEgreso(res[0]);
      } else if (res && res.length > 1) {
        setResultadosEgreso(res);
      } else {
        toast.error("No encontrado", { description: "No se encontró ningún estudiante con ese DNI o nombre." });
      }
    } catch (err: any) {
      toast.error("Error al buscar", { description: err.message || "Intente nuevamente." });
    } finally {
      setBuscandoEstudianteEgreso(false);
    }
  };

  const seleccionarEstudianteEgreso = async (est: any) => {
    setEstudianteEgreso(est);
    setResultadosEgreso([]);
    setBeneficiario(est.nombres);
    setDniEgreso(est.dni);

    // Cargar sus pagos pagados
    setCargandoPagosEgreso(true);
    setPagosEgreso([]);
    setPagoEgresoSeleccionadoId(null);
    try {
      const res = await listarPagos(periodo || "escolar", { estudianteDni: est.dni });
      const pagados = (res || []).filter(p => {
        const estado = String(`${p.estado || ""} ${p.estadoPago || ""} ${p.estadoVerificacion || ""}`).toLowerCase();
        return ["validado", "completado", "pagado", "aprobado"].some((item) => estado.includes(item));
      });
      setPagosEgreso(pagados);
      if (pagados.length > 0) {
        setPagoEgresoSeleccionadoId(pagados[0].id);
        actualizarCamposConPagoEgreso(pagados[0], est);
      } else {
        toast.warning("Sin pagos", { description: "El estudiante no tiene pagos aprobados para devolver." });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoPagosEgreso(false);
    }
  };

  const actualizarCamposConPagoEgreso = (pago: any, est: any) => {
    if (!pago) return;
    setMontoEgreso(String(pago.monto || 0));
    setConceptoEgreso(
      `Devolución por concepto de taller de ${pago.programa || "Extracurricular"}. Referencia: Recibo N° ${pago.nroRecibo || "S/N"}.`
    );
  };

  const handlePagoEgresoChange = (val: string) => {
    setPagoEgresoSeleccionadoId(val);
    const pago = pagosEgreso.find(p => p.id === val);
    if (pago && estudianteEgreso) {
      actualizarCamposConPagoEgreso(pago, estudianteEgreso);
    }
  };

  const handleQuitarEstudianteEgreso = () => {
    setEstudianteEgreso(null);
    setResultadosEgreso([]);
    setBusquedaEgreso("");
    setPagosEgreso([]);
    setPagoEgresoSeleccionadoId(null);
    setBeneficiario("");
    setDniEgreso("");
    setMontoEgreso("");
    setConceptoEgreso("");
  };

  const handleTipoEgresoChange = (newTipo: string) => {
    setTipoEgreso(newTipo);
    handleQuitarEstudianteEgreso();
  };

  const handleRegistrarEgreso = async (e: React.FormEvent) => {
    e.preventDefault();

    if (correlativos?.egresoActive === false) {
      toast.error("Serie Inactiva", { description: "La serie de recibos de egreso está inactiva. Actívela en Dirección." });
      return;
    }

    const limpioBeneficiario = String(beneficiario || "").trim();
    const limpioConcepto = String(conceptoEgreso || "").trim();
    const numMonto = Number(montoEgreso);

    if (!limpioBeneficiario) {
      toast.error("Campo requerido", { description: "Debe ingresar el nombre del beneficiario." });
      return;
    }

    if (isNaN(numMonto) || numMonto <= 0) {
      toast.error("Monto inválido", { description: "El monto debe ser un número mayor a 0." });
      return;
    }

    if (!limpioConcepto) {
      toast.error("Campo requerido", { description: "Debe ingresar el concepto o justificación." });
      return;
    }

    setGuardandoEgreso(true);
    try {
      const datos = {
        beneficiario: limpioBeneficiario,
        dni: dniEgreso.trim(),
        monto: numMonto,
        concepto: limpioConcepto,
        periodo: periodo || "escolar",
      };

      const resEgreso = await registrarEgresoCaja(datos);

      toast.success("Egreso registrado", {
        description: `Se registró el egreso ${resEgreso.nroRecibo} por S/ ${numMonto.toFixed(2)} correctamente.`,
      });

      // Clear form
      setBeneficiario("");
      setDniEgreso("");
      setMontoEgreso("");
      setConceptoEgreso("");

      await cargarCorrelativos();

      if (onCorrelativoCancelado) {
        onCorrelativoCancelado();
      }
    } catch (err: any) {
      toast.error("Error al registrar", { description: err.message || "Intente nuevamente." });
    } finally {
      setGuardandoEgreso(false);
    }
  };

  async function cargarCorrelativos() {
    setCargandoCorr(true);
    try {
      const res = await obtenerCorrelativos();
      if (res) {
        setCorrelativos(res);
      }
    } catch (err) {
      toast.error("Error", { description: "No se pudieron cargar los correlativos actuales." });
    } finally {
      setCargandoCorr(false);
    }
  }

  useEffect(() => {
    cargarCorrelativos();
  }, []);

  const obtenerFechaHoy = () => {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const esTallerVigenteParaAnulacion = (pago: any = {}) => {
    return true;
  };

  const esPagoAnulable = (pago: any = {}) => {
    const estado = String(`${pago.estado || ""} ${pago.estadoPago || ""} ${pago.estadoVerificacion || ""}`).toLowerCase();
    const tieneRecibo = Boolean(pago.nroRecibo || pago.nro_recibo);
    const estaAnulado = ["anulado", "cancelado"].some((item) => estado.includes(item));
    return tieneRecibo && !estaAnulado && esTallerVigenteParaAnulacion(pago);
  };

  const getPagoSeleccionado = () => {
    if (estudianteSeleccionado) {
      return pagosEstudiante.find((p) => p.id === pagoSeleccionadoId) || null;
    }
    return null;
  };

  const getComprobanteFinal = () => {
    const pago = getPagoSeleccionado();
    if (pago) return pago.nroRecibo || pago.nro_recibo || "S/N";
    return "";
  };

  // Cargar pagos del estudiante cuando es seleccionado
  const cargarPagosEstudiante = async (dni: string) => {
    if (!dni) return;
    setCargandoPagos(true);
    setPagosEstudiante([]);
    setPagoSeleccionadoId(null);
    try {
      const res = await listarPagos(periodo || "escolar", { estudianteDni: dni });
      const activos = (res || []).filter(esPagoAnulable);
      setPagosEstudiante(activos);
      if (activos.length > 0) {
        const pagoPreseleccionado = pagoPreseleccionadoRef.current;
        const existePreseleccion = pagoPreseleccionado && activos.some((pago) => pago.id === pagoPreseleccionado);
        setPagoSeleccionadoId(existePreseleccion ? pagoPreseleccionado : activos[0].id);
        pagoPreseleccionadoRef.current = null;
      }
    } catch (err) {
      toast.error("Error al cargar pagos", { description: "No se pudieron obtener los pagos del estudiante." });
    } finally {
      setCargandoPagos(false);
    }
  };

  useEffect(() => {
    if (estudianteSeleccionado) {
      cargarPagosEstudiante(estudianteSeleccionado.dni);
    } else {
      setPagosEstudiante([]);
      setPagoSeleccionadoId(null);
    }
  }, [estudianteSeleccionado, periodo]);

  const handleBuscarEstudiante = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = String(busqueda || "").trim();
    if (!query) {
      toast.error("Búsqueda vacía", { description: "Ingrese el DNI, nombre o apellido del estudiante." });
      return;
    }
    if (query.length < 3) {
      toast.error("Búsqueda corta", { description: "Ingrese al menos 3 caracteres." });
      return;
    }
    setBuscandoEstudiante(true);
    setResultados([]);
    try {
      const res = await buscarEstudiantesCajaQuery(query);
      if (res && res.length === 1) {
        setEstudianteSeleccionado(res[0]);
        setResultados([]);
        toast.success("Estudiante seleccionado", { description: res[0].nombres });
      } else if (res && res.length > 1) {
        setResultados(res);
      } else {
        toast.error("No encontrado", { description: "No se encontro ningun estudiante con ese DNI, nombre o apellido." });
      }
    } catch (err: any) {
      toast.error("Error al buscar", { description: err.message || "Intente nuevamente." });
    } finally {
      setBuscandoEstudiante(false);
    }
  };

  const handleSeleccionarEstudiante = (est: any) => {
    setEstudianteSeleccionado(est);
    setResultados([]);
  };

  const handleQuitarEstudiante = () => {
    setEstudianteSeleccionado(null);
    setResultados([]);
    setBusqueda("");
  };

  const handleCancelar = async () => {
    if (!motivo.trim()) {
      toast.error("Campo requerido", { description: "Debe ingresar el motivo de la cancelación." });
      return;
    }

    const comprobanteFinal = getComprobanteFinal();
    if (!estudianteSeleccionado) {
      toast.error("Seleccione estudiante", { description: "Primero busque y seleccione un estudiante." });
      return;
    }
    if (!comprobanteFinal) {
      toast.error("Seleccione recibo", { description: "Seleccione uno de los recibos disponibles para anular." });
      return;
    }

    setCargando(true);
    try {
      if (!pagoSeleccionadoId) {
        toast.error("Seleccione pago", { description: "El estudiante no tiene pagos seleccionables." });
        setCargando(false);
        return;
      }

      await anularPago(pagoSeleccionadoId, motivo);

      toast.success("Pago anulado", {
        description: `El recibo ${comprobanteFinal} de ${estudianteSeleccionado.nombres} fue anulado correctamente.`,
      });

      setMotivo("");
      setEstudianteSeleccionado(null);
      setPagosEstudiante([]);
      setPagoSeleccionadoId(null);
      setBusqueda("");

      await cargarCorrelativos();
      if (onCorrelativoCancelado) {
        onCorrelativoCancelado();
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message || "No se pudo procesar la anulación." });
    } finally {
      setCargando(false);
    }
  };

  return {
    correlativos,
    motivo,
    setMotivo,
    busqueda,
    setBusqueda,
    resultados,
    buscandoEstudiante,
    estudianteSeleccionado,
    pagosEstudiante,
    cargandoPagos,
    pagoSeleccionadoId,
    setPagoSeleccionadoId,
    cargando,
    cargandoCorr,
    activeTab,
    setActiveTab,
    beneficiario,
    setBeneficiario,
    dniEgreso,
    setDniEgreso,
    montoEgreso,
    setMontoEgreso,
    conceptoEgreso,
    setConceptoEgreso,
    guardandoEgreso,
    tipoEgreso,
    busquedaEgreso,
    setBusquedaEgreso,
    resultadosEgreso,
    buscandoEstudianteEgreso,
    estudianteEgreso,
    pagosEgreso,
    cargandoPagosEgreso,
    pagoEgresoSeleccionadoId,
    handleBuscarEstudianteEgreso,
    seleccionarEstudianteEgreso,
    handlePagoEgresoChange,
    handleQuitarEstudianteEgreso,
    handleTipoEgresoChange,
    handleRegistrarEgreso,
    cargarCorrelativos,
    getPagoSeleccionado,
    getComprobanteFinal,
    handleBuscarEstudiante,
    handleSeleccionarEstudiante,
    handleQuitarEstudiante,
    handleCancelar,
  };
}
