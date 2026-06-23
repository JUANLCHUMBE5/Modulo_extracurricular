import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Group, Modal, Text, Textarea } from "@mantine/core";
import { toast } from "sonner";
import { IconCheck as Check, IconX as X } from "@tabler/icons-react";

import CajaFields from "./components/CajaFields";
import CajaPagoWebModals from "./components/CajaPagoWebModals";
import CajaSidebar from "./components/CajaSidebar/CajaSidebar";
import CajaCobros from "./components/CajaCobros/CajaCobros";
import CajaReportes from "./components/CajaReportes/CajaReportes";

import { formularioInicial } from "./constants/cajaConstants";
import {
  actualizarPago,
  generarReporteCaja,
  listarPagos,
  obtenerEstudiantePorDni,
  obtenerOpcionesReporteCaja,
  obtenerResumenCaja,
  registrarPago,
  validarPagoWeb,
  observarPagoWeb,
  rechazarPagoWeb,
  obtenerPagoPorId,
  anularPago,
} from "./cajaService";
import { obtenerCorrelativos } from "../direccion/direccionService";
import { fechaActualInput, fechaActualIso } from "../../services/dateService";
import { validarDni } from "../../services/validators";
import { formatearSoles } from "./utils/cajaFormatters";
import {
  descargarArchivoCsv,
  generarCSVReporteCaja,
  normalizarEstadoPagoVista,
} from "./utils/cajaReportUtils";
import "./Caja.css";

export default function Caja({
  delegatedContent,
  embedded = false,
  initialView = "pagos",
  moduleSwitcher,
  onClearDelegatedModule,
  onLogout,
}) {
  const { subview } = useParams();
  const navigate = useNavigate();
  const lastFetchTimeRef = useRef(0);
  const vista = embedded ? (initialView || "pagos") : (subview || "pagos");

  const setVista = (newView) => {
    if (!embedded) {
      navigate(`/caja/${newView}`);
    }
  };

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem("caja_sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const newVal = !prev;
      localStorage.setItem("caja_sidebar_expanded", JSON.stringify(newVal));
      return newVal;
    });
  };

  const [periodo, setPeriodo] = useState("escolar");
  const [formulario, setFormulario] = useState(formularioInicial);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [inscripcionesCaja, setInscripcionesCaja] = useState([]);
  const [dni, setDni] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [pagoConfirmado, setPagoConfirmado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [reporteCaja, setReporteCaja] = useState([]);
  const [opcionesReporte, setOpcionesReporte] = useState({ programas: [], mediosPago: [] });
  const [filtrosReporte, setFiltrosReporte] = useState({
    tipoReporte: "todos",
    rango: "todo",
    desde: "",
    hasta: "",
    programa: "todos",
    medioPago: "todos",
    estadoPago: "todos",
    grado: "todos",
    seccion: "todos",
  });

  // Estados de verificacion de pagos web Yape
  const [modalVerificacionAbierto, setModalVerificacionAbierto] = useState(false);
  const [modalObservarAbierto, setModalObservarAbierto] = useState(false);
  const [modalRechazarAbierto, setModalRechazarAbierto] = useState(false);
  const [pagoVerificar, setPagoVerificar] = useState(null);
  const [observacionTexto, setObservacionTexto] = useState("");
  const [rechazoTexto, setRechazoTexto] = useState("");
  const [guardandoVerificacion, setGuardandoVerificacion] = useState(false);

  // Estados para correlativos y anulación de pagos
  const [correlativos, setCorrelativos] = useState({ recibo: "", egreso: "" });
  const [modalAnularAbierto, setModalAnularAbierto] = useState(false);
  const [anulacionTexto, setAnulacionTexto] = useState("");
  const [pagoAnular, setPagoAnular] = useState(null);

  async function cargarCorrelativos() {
    try {
      const res = await obtenerCorrelativos();
      if (res) {
        setCorrelativos(res);
      }
    } catch (err) {
      console.error("Error al cargar correlativos:", err);
    }
  }

  useEffect(() => {
    cargarCorrelativos();
  }, [periodo]);

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  useEffect(() => {
    cargarReporteCaja();
  }, [periodo, filtrosReporte]);

  useEffect(() => {
    const refrescarCaja = () => {
      cargarDatos();
      cargarReporteCaja();
    };
    const refrescarPorStorage = (event) => {
      if (!event?.key || event.key === "san_rafael_db_updated_at") refrescarCaja();
    };

    const handleMockDbUpdated = (e) => {
      const mod = e.detail?.modulo;
      if (!mod || mod === "caja" || mod === "padres" || mod === "global") refrescarCaja();
    };

    const handleFocusUpdate = () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 30000) {
        refrescarCaja();
      }
    };

    window.addEventListener("api-db-updated", refrescarCaja);
    window.addEventListener("mock-db-updated", handleMockDbUpdated);
    window.addEventListener("storage", refrescarPorStorage);
    window.addEventListener("focus", handleFocusUpdate);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refrescarCaja();
      }
    }, 60000);

    return () => {
      window.removeEventListener("api-db-updated", refrescarCaja);
      window.removeEventListener("mock-db-updated", handleMockDbUpdated);
      window.removeEventListener("storage", refrescarPorStorage);
      window.removeEventListener("focus", handleFocusUpdate);
      window.clearInterval(intervalo);
    };
  }, [periodo, filtrosReporte]);

  const pagosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pagos.filter((pago) => {
      const coincideEstado = filtroEstado === "todos" || pago.estado === filtroEstado;
      const coincideTexto = !texto || [
        pago.estudianteDni,
        pago.dniEstudiante,
        pago.estudianteNombre,
        pago.nombresEstudiante,
        pago.programaNombre,
        pago.programa,
        pago.concepto,
      ].some((valor) => String(valor || "").toLowerCase().includes(texto));
      return coincideEstado && coincideTexto;
    });
  }, [busqueda, filtroEstado, pagos]);

  const gradosDisponibles = useMemo(() => {
    return Array.from(new Set(reporteCaja.map(f => f.grado).filter(Boolean))).sort();
  }, [reporteCaja]);

  const seccionesDisponibles = useMemo(() => {
    return Array.from(new Set(reporteCaja.map(f => f.seccion).filter(Boolean))).sort();
  }, [reporteCaja]);

  const reporteCajaFiltrado = useMemo(() => {
    return reporteCaja.filter(fila => {
      if (filtrosReporte.grado && filtrosReporte.grado !== "todos" && fila.grado !== filtrosReporte.grado) return false;
      if (filtrosReporte.seccion && filtrosReporte.seccion !== "todos" && fila.seccion !== filtrosReporte.seccion) return false;
      return true;
    });
  }, [reporteCaja, filtrosReporte.grado, filtrosReporte.seccion]);

  const reporte = useMemo(() => {
    const totalVisible = reporteCajaFiltrado.reduce((sum, fila) => sum + Number(fila.monto || 0), 0);
    const pagados = reporteCajaFiltrado.filter((fila) => fila.estadoPago === "pagado");
    const pendientes = reporteCajaFiltrado.filter(
      (fila) => fila.estadoPago === "pendiente" || fila.estadoPago === "verificando" || fila.estadoPago === "observado"
    );
    return {
      totalVisible,
      totalPagado: pagados.reduce((sum, pago) => sum + Number(pago.monto || 0), 0),
      totalPendiente: pendientes.reduce((sum, pago) => sum + Number(pago.monto || 0), 0),
      cantidadPagada: pagados.length,
      cantidadPendiente: pendientes.length,
    };
  }, [reporteCajaFiltrado]);

  async function cargarDatos() {
    lastFetchTimeRef.current = Date.now();
    setCargando(true);
    try {
      const [datosPagos, datosResumen] = await Promise.all([
        listarPagos(periodo),
        obtenerResumenCaja(periodo),
        cargarCorrelativos(),
      ]);
      setPagos(datosPagos);
      setResumen(datosResumen);
    } catch (error) {
      toast.error("Cajera", { description: error.message || "No se pudo cargar la informacion." });
    } finally {
      setCargando(false);
    }
  }

  async function cargarReporteCaja() {
    lastFetchTimeRef.current = Date.now();
    try {
      const [opciones, filas] = await Promise.all([
        obtenerOpcionesReporteCaja(periodo),
        generarReporteCaja({
          periodo,
          tipoReporte: filtrosReporte.tipoReporte,
          desde: filtrosReporte.rango === "todo" ? "" : filtrosReporte.desde,
          hasta: filtrosReporte.rango === "todo" ? "" : filtrosReporte.hasta,
          programa: filtrosReporte.programa,
          medioPago: filtrosReporte.medioPago,
          estadoPago: filtrosReporte.estadoPago,
        }),
      ]);
      setOpcionesReporte(opciones);
      setReporteCaja(filas);
    } catch (error) {
      toast.error("Reporte de caja", { description: error.message || "No se pudo generar el reporte." });
    }
  }

  function pagoEstaCerrado(inscripcion) {
    const estado = String(`${inscripcion?.estadoPago || ""} ${inscripcion?.estadoInscripcion || ""}`).toLowerCase();
    return ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some((item) => estado.includes(item));
  }

  async function seleccionarInscripcionCaja(inscripcion, estudianteBase = estudiante) {
    if (!inscripcion) return;

    let pagoAsociado = null;
    if (inscripcion?.pagoId) {
      try {
        pagoAsociado = await obtenerPagoPorId(inscripcion.pagoId);
      } catch (e) {
        console.error("Error al cargar pago asociado:", e);
      }
    }

    const estadoPagoSistema = normalizarEstadoPagoVista(
      inscripcion?.estadoPago,
      inscripcion?.estadoInscripcion,
      pagoAsociado?.estado,
      pagoAsociado?.estadoVerificacion
    );

    if (estadoPagoSistema === "pagado") {
      setMensaje(`El taller "${inscripcion.programa}" ya cuenta con pago aprobado.`);
      return;
    }

    const nombre = `${estudianteBase?.nombres || ""} ${estudianteBase?.apellidos || ""}`.trim();
    const defaultFormaPago = pagoAsociado?.formaPago || (inscripcion?.descuentoAprobado ? (String(inscripcion.descuentoTipo).toLowerCase() === "beca" ? "Beca" : "Descuento") : "Efectivo");
    const defaultFormaPagoStr = String(defaultFormaPago).toLowerCase().trim();
    const esVirtualDefault = ["yape", "plin", "transferencia", "tarjeta"].includes(defaultFormaPagoStr);
    const defaultNroRecibo = esVirtualDefault ? (correlativos.reciboVirtual || "") : (correlativos.recibo || "");

    setPagoConfirmado(null);
    setMensaje(
      estadoPagoSistema === "verificando"
        ? `El padre ya envio un pago web para "${inscripcion.programa}". Cajera debe aprobarlo u observarlo, no cobrarlo nuevamente.`
        : ""
    );
    setFormulario((actual) => ({
      ...actual,
      inscripcionId: inscripcion?.id || "",
      estudianteDni: inscripcion?.dniEstudiante || dni,
      estudianteNombre: inscripcion?.nombresEstudiante || nombre,
      programaId: inscripcion?.programaId || estudianteBase?.programaAsignado || actual.programaId || "",
      programaNombre: inscripcion?.programa || estudianteBase?.programaNombre || actual.programaNombre || "",
      periodo: inscripcion?.periodo || estudianteBase?.periodo || actual.periodo || "",
      tipoAlumno: inscripcion?.tipoAlumno || estudianteBase?.tipoAlumno || (inscripcion?.esExterno ? "Alumno externo" : "Alumno interno"),
      monto: inscripcion?.costo ? String(inscripcion.costo) : estudianteBase?.programaCosto ? String(estudianteBase.programaCosto) : actual.monto,
      pagoId: pagoAsociado?.id || "",
      estadoPago: estadoPagoSistema === "verificando" ? "verificando" : pagoAsociado?.estado || inscripcion?.estadoPago || "pendiente",
      numeroOperacion: pagoAsociado?.numeroOperacion || "",
      telefonoOperacion: pagoAsociado?.telefonoOperacion || "",
      capturaPagoBase64: pagoAsociado?.capturaPagoBase64 || "",
      formaPago: defaultFormaPago,
      nroRecibo: pagoAsociado?.nroRecibo || pagoAsociado?.nro_recibo || defaultNroRecibo || "",
      descuentoMonto: inscripcion?.descuentoMonto ? String(inscripcion.descuentoMonto) : "",
      descuentoTipo: inscripcion?.descuentoTipo || "",
      descuentoJustificacion: inscripcion?.descuentoJustificacion || "",
      costoOriginal: inscripcion?.costoOriginal ? String(inscripcion.costoOriginal) : "",
      descuentoAprobado: inscripcion?.descuentoAprobado || false,
    }));
  }

  async function buscarEstudiante(event) {
    event?.preventDefault();
    setMensaje("");
    setPagoConfirmado(null);
    setInscripcionesCaja([]);
    setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
    if (!validarDni(dni)) {
      setMensaje("Ingrese un DNI valido de 8 digitos.");
      return;
    }

    setBuscando(true);
    try {
      const encontrado = await obtenerEstudiantePorDni(dni);
      if (!encontrado) {
        setEstudiante(null);
        setMensaje("No se encontro un estudiante con ese DNI.");
        return;
      }

      const listaCaja = Array.isArray(encontrado.inscripcionesCaja)
        ? encontrado.inscripcionesCaja
        : encontrado.inscripcionCaja
          ? [encontrado.inscripcionCaja]
          : [];
      const pendientesCaja = listaCaja.filter((item) => item?.derivadoCaja && !pagoEstaCerrado(item));

      if (!pendientesCaja.length) {
        setEstudiante(null);
        setMensaje(
          encontrado.requiereDerivacionCaja
            ? "El estudiante tiene inscripciones, pero Asistente aun no derivo ningun taller pendiente a Cajera."
            : "El estudiante no tiene talleres pendientes derivados a Cajera."
        );
        return;
      }

      setEstudiante(encontrado);
      setInscripcionesCaja(pendientesCaja);
      if (pendientesCaja.length === 1) {
        seleccionarInscripcionCaja(pendientesCaja[0], encontrado);
      } else {
        setMensaje("Seleccione el taller derivado para continuar con el pago.");
      }
    } catch (error) {
      setMensaje(error.message || "No se pudo buscar el estudiante.");
    } finally {
      setBuscando(false);
    }
  }

  async function guardarPago() {
    const error = validarPago();
    if (error) {
      setMensaje(error);
      return;
    }

    setGuardando(true);
    setMensaje("");
    const payload = {
      ...formulario,
      periodo: formulario.periodo || periodo,
      concepto: "Inscripcion",
      estado: "completado",
      observaciones: "",
      inscripcionId: formulario.inscripcionId,
      monto: Number(formulario.monto),
      dniEstudiante: formulario.estudianteDni,
      nombresEstudiante: formulario.estudianteNombre,
      programa: formulario.programaNombre,
      fecha: formulario.fechaPago,
      origenRegistro: "Caja",
    };

    try {
      if (modoEdicion) {
        await actualizarPago(pagoSeleccionado.id, payload);
        toast.success("Pago actualizado", { description: "El registro quedo actualizado correctamente." });
        cerrarModal();
      } else {
        const inscripcionPagadaId = formulario.inscripcionId;
        const pago = await registrarPago(payload);
        toast.success("Pago aprobado", { description: "El pago quedo confirmado y guardado en Cajera." });
        const pendientesRestantes = inscripcionesCaja.filter((item) => item.id !== inscripcionPagadaId);
        if (pendientesRestantes.length) {
          setPagoConfirmado(null);
          setInscripcionesCaja(pendientesRestantes);
          setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
          setMensaje("Pago registrado. Seleccione el siguiente taller pendiente para continuar.");
        } else {
          setPagoConfirmado(pago);
          setInscripcionesCaja([]);
          setEstudiante(null);
          setDni("");
          setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
        }
      }
      await cargarDatos();
      await cargarReporteCaja();
    } catch (err) {
      toast.error("No se pudo guardar", { description: err.message || "Revise los datos del pago." });
    } finally {
      setGuardando(false);
    }
  }

  function validarPago() {
    if (!modoEdicion && !formulario.inscripcionId) return "Primero busque un estudiante con inscripcion registrada por Asistente.";
    if (!validarDni(formulario.estudianteDni)) return "Seleccione o ingrese un DNI valido.";
    if (!formulario.estudianteNombre.trim()) return "Ingrese el nombre del estudiante.";

    const montoNum = Number(formulario.monto || 0);
    const permiteCero = formulario.descuentoAprobado || formulario.descuentoTipo === "beca";
    if (!Number.isFinite(montoNum) || montoNum < 0 || (!permiteCero && montoNum <= 0)) {
      return "Ingrese un monto mayor a cero.";
    }
    if (!formulario.fechaPago) return "Seleccione la fecha de pago.";
    return "";
  }

  function abrirPagoDesdeReporte(fila) {
    setPagoSeleccionado(null);
    setPagoConfirmado(null);
    setFormulario({
      ...formularioInicial,
      inscripcionId: fila.inscripcionId || "",
      estudianteDni: fila.dniEstudiante || "",
      estudianteNombre: fila.estudiante || "",
      programaId: fila.programaId || "",
      programaNombre: fila.programa || "",
      periodo: fila.periodo || periodo,
      tipoAlumno: fila.tipoAlumno || "",
      monto: String(fila.monto !== undefined ? fila.monto : ""),
      formaPago: fila.descuentoAprobado ? (String(fila.descuentoTipo).toLowerCase() === "beca" ? "Beca" : "Descuento") : "Efectivo",
      fechaPago: fechaActualInput(),
      descuentoMonto: fila.descuentoMonto ? String(fila.descuentoMonto) : "",
      descuentoTipo: fila.descuentoTipo || "",
      descuentoJustificacion: fila.descuentoJustificacion || "",
      costoOriginal: fila.costoOriginal ? String(fila.costoOriginal) : "",
      descuentoAprobado: fila.descuentoAprobado || false,
    });
    setDni(fila.dniEstudiante || "");
    setEstudiante(null);
    setInscripcionesCaja([]);
    setMensaje("");
    setModoEdicion(false);
    setModalAbierto(true);
  }

  function abrirModalEdicion(pago) {
    setPagoSeleccionado(pago);
    setPagoConfirmado(null);
    setFormulario({
      ...formularioInicial,
      ...pago,
      estudianteDni: pago.estudianteDni || pago.dniEstudiante || "",
      estudianteNombre: pago.estudianteNombre || pago.nombresEstudiante || "",
      programaNombre: pago.programaNombre || pago.programa || "",
      fechaPago: String(pago.fechaPago || pago.fecha || fechaActualInput()).slice(0, 10),
      monto: String(pago.monto || ""),
    });
    setDni(pago.estudianteDni || pago.dniEstudiante || "");
    setEstudiante(null);
    setMensaje("");
    setModoEdicion(true);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setModoEdicion(false);
    setPagoSeleccionado(null);
    setPagoConfirmado(null);
  }

  function limpiarPagoActual() {
    setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
    setEstudiante(null);
    setInscripcionesCaja([]);
    setDni("");
    setMensaje("");
    setModoEdicion(false);
    setPagoSeleccionado(null);
    setPagoConfirmado(null);
  }

  async function verificarPagoWeb(fila) {
    try {
      setCargando(true);
      const pago = await obtenerPagoPorId(fila.pagoId);
      if (!pago) {
        toast.error("Error", { description: "No se pudo recuperar los detalles del pago." });
        return;
      }
      setPagoVerificar({
        ...pago,
        estudiante: fila.estudiante,
        dniEstudiante: fila.dniEstudiante,
        programa: fila.programa,
      });
      setModalVerificacionAbierto(true);
    } catch (error) {
      toast.error("Error", { description: error.message || "Error al cargar detalles de verificacion." });
    } finally {
      setCargando(false);
    }
  }

  async function aprobarPagoWebDirecto(fila) {
    try {
      setCargando(true);
      await validarPagoWeb(fila.pagoId);
      toast.success("Pago aprobado", { description: "El pago web ha sido validado correctamente." });

      if (formulario.pagoId === fila.pagoId) {
        limpiarPagoActual();
      }

      await cargarDatos();
      await cargarReporteCaja();
    } catch (error) {
      toast.error("Error al aprobar", { description: error.message || "No se pudo aprobar el pago." });
    } finally {
      setCargando(false);
    }
  }

  async function aprobarPagoWebDesdeModal() {
    if (!pagoVerificar) return;
    try {
      setGuardandoVerificacion(true);
      await validarPagoWeb(pagoVerificar.id);
      toast.success("Pago aprobado", { description: "El pago web ha sido validado correctamente." });
      setModalVerificacionAbierto(false);
      setPagoVerificar(null);
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error) {
      toast.error("Error al aprobar", { description: error.message || "No se pudo aprobar el pago." });
    } finally {
      setGuardandoVerificacion(false);
    }
  }

  async function abrirObservarModal(fila) {
    if (!fila) return;
    try {
      setCargando(true);
      const pagoId = fila.pagoId || fila.id;
      let pago = null;
      if (pagoId) {
        pago = await obtenerPagoPorId(pagoId);
      }
      setPagoVerificar({
        ...fila,
        ...(pago || {}),
        estudiante: fila.estudiante || fila.estudianteNombre,
        dniEstudiante: fila.dniEstudiante || fila.estudianteDni,
        programa: fila.programa || fila.programaNombre,
      });
      setObservacionTexto("");
      setModalObservarAbierto(true);
    } catch (error) {
      toast.error("Error", { description: "No se pudo cargar la captura del pago." });
    } finally {
      setCargando(false);
    }
  }

  async function abrirRechazarModal(fila) {
    if (!fila) return;
    try {
      setCargando(true);
      const pagoId = fila.pagoId || fila.id;
      let pago = null;
      if (pagoId) {
        pago = await obtenerPagoPorId(pagoId);
      }
      setPagoVerificar({
        ...fila,
        ...(pago || {}),
        estudiante: fila.estudiante || fila.estudianteNombre,
        dniEstudiante: fila.dniEstudiante || fila.estudianteDni,
        programa: fila.programa || fila.programaNombre,
      });
      setRechazoTexto("");
      setModalRechazarAbierto(true);
    } catch (error) {
      toast.error("Error", { description: "No se pudo cargar la captura del pago." });
    } finally {
      setCargando(false);
    }
  }

  async function observarPagoWebDesdeModal() {
    if (!pagoVerificar) return;
    if (!observacionTexto.trim()) {
      toast.error("Observar pago", { description: "Debe ingresar una observacion para observar el pago." });
      return;
    }
    try {
      setGuardandoVerificacion(true);
      const pagoId = pagoVerificar.pagoId || pagoVerificar.id;
      await observarPagoWeb(pagoId, observacionTexto);
      toast.success("Pago observado", { description: "El pago ha sido marcado como observado." });
      setModalObservarAbierto(false);
      setModalVerificacionAbierto(false);

      if (formulario.pagoId === pagoId) {
        limpiarPagoActual();
      } else {
        setPagoVerificar(null);
      }

      await cargarDatos();
      await cargarReporteCaja();
    } catch (error) {
      toast.error("Error", { description: error.message || "No se pudo observar el pago." });
    } finally {
      setGuardandoVerificacion(false);
    }
  }

  async function confirmarRechazoPagoWeb() {
    if (!pagoVerificar) return;
    if (!rechazoTexto.trim()) {
      toast.error("Rechazar pago", { description: "Debe ingresar una observacion para rechazar el pago." });
      return;
    }
    try {
      setGuardandoVerificacion(true);
      const pagoId = pagoVerificar.pagoId || pagoVerificar.id;
      await rechazarPagoWeb(pagoId, rechazoTexto);
      toast.success("Pago rechazado", { description: "El pago ha sido rechazado correctamente." });
      setModalRechazarAbierto(false);
      setModalVerificacionAbierto(false);

      if (formulario.pagoId === pagoId) {
        limpiarPagoActual();
      } else {
        setPagoVerificar(null);
      }

      await cargarDatos();
      await cargarReporteCaja();
    } catch (error) {
      toast.error("Error", { description: error.message || "No se pudo rechazar el pago." });
    } finally {
      setGuardandoVerificacion(false);
    }
  }

  function abrirAnularModal(fila) {
    if (!fila) return;
    setPagoAnular(fila);
    setAnulacionTexto("");
    setModalAnularAbierto(true);
  }

  function cerrarAnularModal() {
    setModalAnularAbierto(false);
    setPagoAnular(null);
    setAnulacionTexto("");
  }

  async function confirmarAnularPago() {
    if (!pagoAnular) return;
    if (!anulacionTexto.trim()) {
      toast.error("Anular pago", { description: "Debe ingresar una justificación para anular el pago." });
      return;
    }
    try {
      setGuardando(true);
      const pagoId = pagoAnular.pagoId || pagoAnular.id;
      await anularPago(pagoId, anulacionTexto);
      toast.success("Recibo/Pago anulado", { description: "El registro ha sido anulado correctamente." });
      cerrarAnularModal();
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error) {
      toast.error("Error al anular", { description: error.message || "No se pudo anular el pago." });
    } finally {
      setGuardando(false);
    }
  }

  async function descargarReporte() {
    try {
      const datos = await generarReporteCaja({
        periodo,
        tipoReporte: filtrosReporte.tipoReporte,
        desde: filtrosReporte.rango === "todo" ? "" : filtrosReporte.desde,
        hasta: filtrosReporte.rango === "todo" ? "" : filtrosReporte.hasta,
        programa: filtrosReporte.programa,
        medioPago: filtrosReporte.medioPago,
        estadoPago: filtrosReporte.estadoPago,
      });
      const datosFiltrados = datos.filter(fila => {
        if (filtrosReporte.grado && filtrosReporte.grado !== "todos" && fila.grado !== filtrosReporte.grado) return false;
        if (filtrosReporte.seccion && filtrosReporte.seccion !== "todos" && fila.seccion !== filtrosReporte.seccion) return false;
        return true;
      });
      const csv = generarCSVReporteCaja(datosFiltrados);
      const nombre = `reporte-caja-${periodo}-${fechaActualInput()}.csv`;
      descargarArchivoCsv(csv, nombre);
      toast.success("Reporte descargado", { description: "El archivo CSV se genero correctamente." });
    } catch (error) {
      toast.error("No se pudo descargar", { description: error.message || "Intente nuevamente." });
    }
  }

  function actualizarFiltroReporte(campo, valor) {
    setFiltrosReporte((actual) => ({ ...actual, [campo]: valor || "" }));
  }

  return (
    <main className={embedded ? "caja-page caja-page-embedded" : `caja-page ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {!embedded ? (
        <CajaSidebar
          sidebarExpanded={sidebarExpanded}
          toggleSidebar={toggleSidebar}
          vista={vista}
          setVista={setVista}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={onClearDelegatedModule}
          onLogout={onLogout}
          delegatedContent={delegatedContent}
        />
      ) : null}

      <section className={embedded ? "caja-main caja-main-embedded" : "caja-main"}>
        {delegatedContent ? (
          delegatedContent
        ) : (
          <>
            {vista === "reportes" ? (
              <CajaReportes
                sidebarExpanded={sidebarExpanded}
                toggleSidebar={toggleSidebar}
                periodo={periodo}
                setPeriodo={setPeriodo}
                descargarReporte={descargarReporte}
                reporte={reporte}
                reporteCaja={reporteCajaFiltrado}
                filtrosReporte={filtrosReporte}
                opcionesReporte={{
                  ...opcionesReporte,
                  grados: gradosDisponibles,
                  secciones: seccionesDisponibles,
                }}
                actualizarFiltroReporte={actualizarFiltroReporte}
                abrirPagoDesdeReporte={abrirPagoDesdeReporte}
                aprobarPagoWebDirecto={aprobarPagoWebDirecto}
                abrirObservarModal={abrirObservarModal}
                abrirRechazarModal={abrirRechazarModal}
                verificarPagoWeb={verificarPagoWeb}
                abrirAnularModal={abrirAnularModal}
              />
            ) : (
              <CajaCobros
                pagoConfirmado={pagoConfirmado}
                formulario={formulario}
                buscando={buscando}
                dni={dni}
                buscarEstudiante={buscarEstudiante}
                setDni={setDni}
                setFormulario={setFormulario}
                mensaje={mensaje}
                correlativos={correlativos}
                inscripcionesCaja={inscripcionesCaja}
                seleccionarInscripcionCaja={seleccionarInscripcionCaja}
                limpiarPagoActual={limpiarPagoActual}
                abrirRechazarModal={abrirRechazarModal}
                abrirObservarModal={abrirObservarModal}
                aprobarPagoWebDirecto={aprobarPagoWebDirecto}
                guardando={guardando}
                guardarPago={guardarPago}
                sidebarExpanded={sidebarExpanded}
                toggleSidebar={toggleSidebar}
              />
            )}
          </>
        )}
      </section>

      <Modal
        centered
        classNames={{ body: "caja-modal-body", header: "caja-modal-header", title: "caja-modal-title" }}
        onClose={cerrarModal}
        opened={modalAbierto}
        size="xl"
        title={modoEdicion ? "Editar pago" : "Registrar pago"}
      >
        {pagoConfirmado ? (
          <div className="caja-payment-approved" role="status">
            <Check size={20} />
            <div>
              <strong>Pago aprobado</strong>
              <span>
                {formulario.estudianteNombre} quedo como pagado por {formatearSoles(formulario.monto)}.
              </span>
            </div>
          </div>
        ) : null}
        <CajaFields
          buscando={buscando}
          dni={dni}
          formulario={formulario}
          modoEdicion={modoEdicion}
          onBuscar={buscarEstudiante}
          setDni={setDni}
          setFormulario={setFormulario}
          mensaje={mensaje}
          siguienteRecibo={correlativos.recibo}
        />
        <Group justify="flex-end" mt="lg">
          <Button onClick={cerrarModal} variant="default">
            Cancelar
          </Button>
          {pagoConfirmado ? (
            <Button onClick={limpiarPagoActual} variant="default">
              Nuevo pago
            </Button>
          ) : null}
          <Button leftSection={<Check size={17} />} loading={guardando} onClick={guardarPago} disabled={Boolean(pagoConfirmado)}>
            {modoEdicion ? "Actualizar" : (formulario.descuentoAprobado ? "Aprobar" : "Registrar")}
          </Button>
        </Group>
      </Modal>

      <CajaPagoWebModals
        guardandoVerificacion={guardandoVerificacion}
        modalObservarAbierto={modalObservarAbierto}
        modalRechazarAbierto={modalRechazarAbierto}
        modalVerificacionAbierto={modalVerificacionAbierto}
        observacionTexto={observacionTexto}
        rechazoTexto={rechazoTexto}
        onAprobarPagoWeb={aprobarPagoWebDesdeModal}
        onCerrarObservacion={() => setModalObservarAbierto(false)}
        onCerrarRechazo={() => setModalRechazarAbierto(false)}
        onCerrarVerificacion={() => { setModalVerificacionAbierto(false); setPagoVerificar(null); }}
        onRechazarPagoWeb={confirmarRechazoPagoWeb}
        onObservarPagoWeb={observarPagoWebDesdeModal}
        onSetObservacionTexto={setObservacionTexto}
        onSetRechazoTexto={setRechazoTexto}
        onSolicitarObservacion={() => {
          setObservacionTexto("");
          setModalObservarAbierto(true);
        }}
        onSolicitarRechazo={() => {
          setRechazoTexto("");
          setModalRechazarAbierto(true);
        }}
        pagoVerificar={pagoVerificar}
      />

      <Modal
        centered
        opened={modalAnularAbierto}
        onClose={cerrarAnularModal}
        title="Anular Recibo / Pago"
        size="md"
      >
        {pagoAnular ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Text size="xs" color="dimmed">Estudiante:</Text>
              <Text size="sm" fw={700} mb="xs">{pagoAnular.estudiante || pagoAnular.nombresEstudiante || "-"}</Text>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <Text size="xs" color="dimmed">N° de comprobante:</Text>
                  <Text size="sm" fw={700}>{pagoAnular.nroRecibo || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" color="dimmed">Monto:</Text>
                  <Text size="sm" fw={700} color="red">{formatearSoles(pagoAnular.monto)}</Text>
                </div>
              </div>
            </div>

            <Text size="sm" color="dimmed">
              Ingrese el motivo por el cual desea anular este recibo/pago. El recibo quedará registrado como ANULADO en Dirección y el estudiante volverá al estado "Pendiente de pago".
            </Text>

            <Textarea
              label="Motivo de la anulación"
              placeholder="Ej. El padre ya no inscribirá al alumno en este taller y solicitó la cancelación."
              required
              rows={4}
              value={anulacionTexto}
              onChange={(e) => setAnulacionTexto(e.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={cerrarAnularModal}>
                Cancelar
              </Button>
              <Button
                color="red"
                loading={guardando}
                onClick={confirmarAnularPago}
              >
                Confirmar Anulación
              </Button>
            </Group>
          </div>
        ) : null}
      </Modal>
    </main>
  );
}
