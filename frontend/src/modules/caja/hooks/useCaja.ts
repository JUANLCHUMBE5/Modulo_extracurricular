import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { formularioInicial } from "../constants/cajaConstants";
import {
  actualizarPago,
  generarReporteCaja,
  listarPagos,
  obtenerEstudiantePorDni,
  obtenerOpcionesReporteCaja,
  obtenerResumenCaja,
  obtenerHistorialAlumnoCaja,
  registrarPago,
  buscarEstudiantesCajaQuery,
} from "../cajaService";
import { obtenerCorrelativos } from "../../direccion/direccionService";
import { fechaActualInput } from "../../../services/dateService";
import { validarDni } from "../../../services/validators";
import {
  descargarArchivoCsv,
  generarCSVReporteCaja,
  normalizarEstadoPagoVista,
} from "../utils/cajaReportUtils";
import { obtenerPagoPorId } from "../cajaService";
import useCajaVerificacion from "./useCajaVerificacion";

/* ──────────────────────────────────────────── */
/*  Hook principal de Caja                      */
/* ──────────────────────────────────────────── */

export default function useCaja({
  embedded = false,
  initialView = "pagos",
}: {
  embedded?: boolean;
  initialView?: string;
}) {
  const { subview } = useParams();
  const navigate = useNavigate();
  const lastFetchTimeRef = useRef(0);
  const vista = embedded ? (initialView || "pagos") : (subview || "pagos");

  const setVista = (newView: string) => {
    if (!embedded) navigate(`/caja/${newView}`);
  };

  /* ── Estado ── */
  const [periodo, setPeriodo] = useState("todos");
  const [formulario, setFormulario] = useState<any>(formularioInicial);
  const [pagos, setPagos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estudiante, setEstudiante] = useState<any>(null);
  const [inscripcionesCaja, setInscripcionesCaja] = useState<any[]>([]);
  const [dni, setDni] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<any>(null);
  const [pagoConfirmado, setPagoConfirmado] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [reporteCaja, setReporteCaja] = useState<any[]>([]);
  const [opcionesReporte, setOpcionesReporte] = useState<any>({ programas: [], mediosPago: [] });
  const [historialAlumnoAbierto, setHistorialAlumnoAbierto] = useState(false);
  const [historialAlumnoCargando, setHistorialAlumnoCargando] = useState(false);
  const [historialAlumnoRegistro, setHistorialAlumnoRegistro] = useState<any>(null);
  const [historialAlumno, setHistorialAlumno] = useState<any[]>([]);
  const [filtrosReporte, setFiltrosReporte] = useState<any>({
    tipoReporte: "todos", rango: "todo", desde: "", hasta: "",
    programa: "todos", medioPago: "todos", estadoPago: "todos",
    grado: "todos", seccion: "todos", mes: "todos", anio: "todos",
  });
  const [correlativos, setCorrelativos] = useState({ recibo: "", egreso: "" });

  /* ── Carga de datos ── */

  async function cargarCorrelativos() {
    try {
      const res = await obtenerCorrelativos();
      if (res) setCorrelativos(res);
    } catch (err) { console.error("Error al cargar correlativos:", err); }
  }

  async function cargarDatos() {
    lastFetchTimeRef.current = Date.now();
    setCargando(true);
    try {
      const [datosPagos, datosResumen] = await Promise.all([
        listarPagos(periodo), obtenerResumenCaja(periodo), cargarCorrelativos(),
      ]);
      setPagos(datosPagos);
      setResumen(datosResumen);
    } catch (error: any) {
      toast.error("Cajera", { description: error.message || "No se pudo cargar la informacion." });
    } finally { setCargando(false); }
  }

  async function cargarReporteCaja() {
    lastFetchTimeRef.current = Date.now();
    try {
      const [opciones, filas] = await Promise.all([
        obtenerOpcionesReporteCaja(periodo),
        generarReporteCaja({
          periodo, tipoReporte: filtrosReporte.tipoReporte,
          desde: filtrosReporte.rango === "todo" ? "" : filtrosReporte.desde,
          hasta: filtrosReporte.rango === "todo" ? "" : filtrosReporte.hasta,
          programa: filtrosReporte.programa, medioPago: filtrosReporte.medioPago,
          estadoPago: filtrosReporte.estadoPago, mes: filtrosReporte.mes, anio: filtrosReporte.anio,
        }),
      ]);
      setOpcionesReporte(opciones);
      setReporteCaja(filas);
    } catch (error: any) {
      toast.error("Reporte de caja", { description: error.message || "No se pudo generar el reporte." });
    }
  }

  function limpiarPagoActual() {
    setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
    setEstudiante(null); setInscripcionesCaja([]); setDni("");
    setMensaje(""); setModoEdicion(false); setPagoSeleccionado(null); setPagoConfirmado(null);
  }

  /* ── Hook de verificación y anulación ── */
  const verificacion = useCajaVerificacion({
    formulario, limpiarPagoActual, cargarDatos, cargarReporteCaja,
    setCargando, setGuardando,
  });

  /* ── Effects ── */
  useEffect(() => { cargarCorrelativos(); }, [periodo]);
  useEffect(() => { cargarDatos(); }, [periodo]);
  useEffect(() => { cargarReporteCaja(); }, [periodo, filtrosReporte]);

  useEffect(() => {
    const refrescarCaja = () => { cargarDatos(); cargarReporteCaja(); };
    const refrescarPorStorage = (event: any) => {
      if (!event?.key || event.key === "san_rafael_db_updated_at") refrescarCaja();
    };
    const handleMockDbUpdated = (e: any) => {
      const mod = e.detail?.modulo;
      if (!mod || mod === "caja" || mod === "padres" || mod === "global") refrescarCaja();
    };
    const handleFocusUpdate = () => {
      if (Date.now() - lastFetchTimeRef.current > 30000) refrescarCaja();
    };

    window.addEventListener("api-db-updated", refrescarCaja);
    window.addEventListener("mock-db-updated", handleMockDbUpdated);
    window.addEventListener("storage", refrescarPorStorage);
    window.addEventListener("focus", handleFocusUpdate);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") refrescarCaja();
    }, 60000);
    return () => {
      window.removeEventListener("api-db-updated", refrescarCaja);
      window.removeEventListener("mock-db-updated", handleMockDbUpdated);
      window.removeEventListener("storage", refrescarPorStorage);
      window.removeEventListener("focus", handleFocusUpdate);
      window.clearInterval(intervalo);
    };
  }, [periodo, filtrosReporte]);

  /* ── Memos ── */

  const pagosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pagos.filter((pago) => {
      const coincideEstado = filtroEstado === "todos" || pago.estado === filtroEstado;
      const coincideTexto = !texto || [
        pago.estudianteDni, pago.dniEstudiante, pago.estudianteNombre,
        pago.nombresEstudiante, pago.programaNombre, pago.programa, pago.concepto,
      ].some((valor) => String(valor || "").toLowerCase().includes(texto));
      return coincideEstado && coincideTexto;
    });
  }, [busqueda, filtroEstado, pagos]);

  const gradosDisponibles = useMemo(
    () => Array.from(new Set(reporteCaja.map(f => f.grado).filter(Boolean))).sort(), [reporteCaja],
  );
  const seccionesDisponibles = useMemo(
    () => Array.from(new Set(reporteCaja.map(f => f.seccion).filter(Boolean))).sort(), [reporteCaja],
  );

  const reporteCajaFiltrado = useMemo(() => {
    return reporteCaja.filter(fila => {
      if (filtrosReporte.grado && filtrosReporte.grado !== "todos" && fila.grado !== filtrosReporte.grado) return false;
      if (filtrosReporte.seccion && filtrosReporte.seccion !== "todos" && fila.seccion !== filtrosReporte.seccion) return false;
      if (filtrosReporte.anio && filtrosReporte.anio !== "todos") {
        const fecha = String(fila.fecha || "").slice(0, 10);
        if (!fecha || fecha.split("-")[0] !== String(filtrosReporte.anio)) return false;
      }
      if (filtrosReporte.mes && filtrosReporte.mes !== "todos") {
        const fecha = String(fila.fecha || "").slice(0, 10);
        if (!fecha || fecha.split("-")[1] !== String(filtrosReporte.mes).padStart(2, "0")) return false;
      }
      return true;
    });
  }, [reporteCaja, filtrosReporte.grado, filtrosReporte.seccion, filtrosReporte.anio, filtrosReporte.mes]);

  const reporte = useMemo(() => {
    const pagadosIngresos = reporteCajaFiltrado.filter((f) => f.estadoPago === "pagado" && f.formaPago !== "Egreso");
    const egresos = reporteCajaFiltrado.filter((f) => f.formaPago === "Egreso");
    const pendientes = reporteCajaFiltrado.filter(
      (f) => (f.estadoPago === "pendiente" || f.estadoPago === "verificando" || f.estadoPago === "observado") && f.formaPago !== "Egreso"
    );
    const totalIngreso = pagadosIngresos.reduce((s, p) => s + Number(p.monto || 0), 0);
    const totalEgreso = egresos.reduce((s, e) => s + Number(e.monto || 0), 0);
    const totalPendiente = pendientes.reduce((s, p) => s + Number(p.monto || 0), 0);
    return {
      totalVisible: totalIngreso - totalEgreso, totalPagado: totalIngreso, totalEgreso, totalPendiente,
      cantidadPagada: pagadosIngresos.length, cantidadEgreso: egresos.length, cantidadPendiente: pendientes.length,
    };
  }, [reporteCajaFiltrado]);

  /* ── Funciones de negocio ── */

  function pagoEstaCerrado(inscripcion: any) {
    const estado = String(`${inscripcion?.estadoPago || ""} ${inscripcion?.estadoInscripcion || ""}`).toLowerCase();
    return ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some((i) => estado.includes(i));
  }

  async function seleccionarInscripcionCaja(inscripcion: any, estudianteBase = estudiante) {
    if (!inscripcion) return;
    let pagoAsociado: any = null;
    if (inscripcion?.pagoId) {
      try { const p = await obtenerPagoPorId(inscripcion.pagoId); if (p && p.estado !== "anulado") pagoAsociado = p; }
      catch (e) { console.error("Error al cargar pago asociado:", e); }
    }
    const estadoPagoSistema = normalizarEstadoPagoVista(inscripcion?.estadoPago, inscripcion?.estadoInscripcion, pagoAsociado?.estado, pagoAsociado?.estadoVerificacion);
    if (estadoPagoSistema === "pagado") { setMensaje(`El taller "${inscripcion.programa}" ya cuenta con pago aprobado.`); return; }
    const nombre = `${estudianteBase?.nombres || ""} ${estudianteBase?.apellidos || ""}`.trim();
    const defaultFormaPago = pagoAsociado?.formaPago || (inscripcion?.descuentoAprobado ? (String(inscripcion.descuentoTipo).toLowerCase() === "beca" ? "Beca" : "Descuento") : "Efectivo");
    setPagoConfirmado(null);
    setMensaje(estadoPagoSistema === "verificando" ? `El padre ya envio un pago web para "${inscripcion.programa}". Cajera debe aprobarlo u observarlo, no cobrarlo nuevamente.` : "");
    setFormulario((actual: any) => ({
      ...actual,
      inscripcionId: inscripcion?.id || "", estudianteDni: inscripcion?.dniEstudiante || dni,
      estudianteNombre: inscripcion?.nombresEstudiante || nombre,
      programaId: inscripcion?.programaId || estudianteBase?.programaAsignado || actual.programaId || "",
      programaNombre: inscripcion?.programa || estudianteBase?.programaNombre || actual.programaNombre || "",
      periodo: inscripcion?.periodo || estudianteBase?.periodo || actual.periodo || "",
      tipoAlumno: inscripcion?.tipoAlumno || estudianteBase?.tipoAlumno || (inscripcion?.esExterno ? "Alumno externo" : "Alumno interno"),
      monto: inscripcion?.costo ? String(inscripcion.costo) : estudianteBase?.programaCosto ? String(estudianteBase.programaCosto) : actual.monto,
      pagoId: pagoAsociado?.id || "",
      estadoPago: estadoPagoSistema === "verificando" ? "verificando" : pagoAsociado?.estado || inscripcion?.estadoPago || "pendiente",
      numeroOperacion: pagoAsociado?.numeroOperacion || "", telefonoOperacion: pagoAsociado?.telefonoOperacion || "",
      capturaPagoBase64: pagoAsociado?.capturaPagoBase64 || "", formaPago: defaultFormaPago,
      nroRecibo: pagoAsociado?.nroRecibo || pagoAsociado?.nro_recibo || "",
      descuentoMonto: inscripcion?.descuentoMonto ? String(inscripcion.descuentoMonto) : "",
      descuentoTipo: inscripcion?.descuentoTipo || "", descuentoJustificacion: inscripcion?.descuentoJustificacion || "",
      costoOriginal: inscripcion?.costoOriginal ? String(inscripcion.costoOriginal) : "",
      descuentoAprobado: inscripcion?.descuentoAprobado || false,
      origenRegistro: inscripcion?.origenRegistro || pagoAsociado?.origenRegistro || "Caja",
    }));
  }

  async function buscarEstudiante(event?: any) {
    event?.preventDefault();
    setMensaje(""); setPagoConfirmado(null); setInscripcionesCaja([]); setResultadosBusqueda([]);
    setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
    const consulta = dni.trim();
    if (!consulta) { setMensaje("Ingrese un DNI o nombre del estudiante."); return; }
    const esDni = /^\d{8}$/.test(consulta);
    setBuscando(true);
    try {
      if (esDni) { await buscarPorDni(consulta); }
      else {
        const resultados = await buscarEstudiantesCajaQuery(consulta);
        if (!resultados || resultados.length === 0) { setEstudiante(null); setMensaje("No se encontraron estudiantes con ese nombre."); return; }
        if (resultados.length === 1) { setDni(resultados[0].dni); await buscarPorDni(resultados[0].dni); }
        else { setResultadosBusqueda(resultados); setMensaje(`Se encontraron ${resultados.length} estudiantes. Seleccione uno.`); }
      }
    } catch (error: any) { setMensaje(error.message || "No se pudo buscar el estudiante."); }
    finally { setBuscando(false); }
  }

  async function buscarPorDni(dniEstudiante: string) {
    const encontrado = await obtenerEstudiantePorDni(dniEstudiante);
    if (!encontrado) { setEstudiante(null); setMensaje("No se encontro un estudiante con ese DNI."); return; }
    const listaCaja: any[] = Array.isArray(encontrado.inscripcionesCaja) ? encontrado.inscripcionesCaja : encontrado.inscripcionCaja ? [encontrado.inscripcionCaja] : [];
    const pendientesCaja = listaCaja.filter((item) => !pagoEstaCerrado(item));
    if (!pendientesCaja.length) {
      setEstudiante(null);
      setMensaje(encontrado.requiereDerivacionCaja ? "El estudiante tiene inscripciones, pero Asistente aun no derivo ningun taller pendiente a Cajera." : "El estudiante no tiene talleres pendientes derivados a Cajera.");
      return;
    }
    setEstudiante(encontrado); setInscripcionesCaja(pendientesCaja);
    if (pendientesCaja.length === 1) seleccionarInscripcionCaja(pendientesCaja[0], encontrado);
    else setMensaje("Seleccione el taller derivado para continuar con el pago.");
  }

  async function seleccionarEstudianteDesdeBusqueda(est: any) {
    setResultadosBusqueda([]); setDni(est.nombres); setBuscando(true); setMensaje("");
    try { await buscarPorDni(est.dni); }
    catch (error: any) { setMensaje(error.message || "No se pudo buscar el estudiante."); }
    finally { setBuscando(false); }
  }

  function validarPago() {
    if (!modoEdicion && !formulario.inscripcionId) return "Primero busque un estudiante con inscripcion registrada por Asistente.";
    if (!validarDni(formulario.estudianteDni)) return "Seleccione o ingrese un DNI valido.";
    if (!formulario.estudianteNombre.trim()) return "Ingrese el nombre del estudiante.";
    const montoNum = Number(formulario.monto || 0);
    const permiteCero = formulario.descuentoAprobado || formulario.descuentoTipo === "beca";
    if (!Number.isFinite(montoNum) || montoNum < 0 || (!permiteCero && montoNum <= 0)) return "Ingrese un monto mayor a cero.";
    if (!formulario.fechaPago) return "Seleccione la fecha de pago.";
    return "";
  }

  async function guardarPago() {
    const error = validarPago();
    if (error) { setMensaje(error); return; }
    setGuardando(true); setMensaje("");
    const payload = {
      ...formulario, periodo: formulario.periodo || (periodo === "todos" ? "escolar" : periodo), concepto: "Inscripcion", estado: "completado",
      observaciones: "", inscripcionId: formulario.inscripcionId, monto: Number(formulario.monto),
      dniEstudiante: formulario.estudianteDni, nombresEstudiante: formulario.estudianteNombre,
      programa: formulario.programaNombre, fecha: formulario.fechaPago, origenRegistro: "Caja",
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
          setPagoConfirmado(null); setInscripcionesCaja(pendientesRestantes);
          setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
          setMensaje("Pago registrado. Seleccione el siguiente taller pendiente para continuar.");
        } else {
          setPagoConfirmado(pago); setInscripcionesCaja([]); setEstudiante(null); setDni("");
          setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
        }
      }
      await cargarDatos(); await cargarReporteCaja();
    } catch (err: any) { toast.error("No se pudo guardar", { description: err.message || "Revise los datos del pago." }); }
    finally { setGuardando(false); }
  }

  function abrirPagoDesdeReporte(fila: any) {
    setPagoSeleccionado(null); setPagoConfirmado(null);
    setFormulario({
      ...formularioInicial, inscripcionId: fila.inscripcionId || "", estudianteDni: fila.dniEstudiante || "",
      estudianteNombre: fila.estudiante || "", programaId: fila.programaId || "", programaNombre: fila.programa || "",
      periodo: fila.periodo || periodo, tipoAlumno: fila.tipoAlumno || "",
      monto: String(fila.monto !== undefined ? fila.monto : ""),
      formaPago: fila.descuentoAprobado ? (String(fila.descuentoTipo).toLowerCase() === "beca" ? "Beca" : "Descuento") : "Efectivo",
      fechaPago: fechaActualInput(), descuentoMonto: fila.descuentoMonto ? String(fila.descuentoMonto) : "",
      descuentoTipo: fila.descuentoTipo || "", descuentoJustificacion: fila.descuentoJustificacion || "",
      costoOriginal: fila.costoOriginal ? String(fila.costoOriginal) : "", descuentoAprobado: fila.descuentoAprobado || false,
    });
    setDni(fila.dniEstudiante || ""); setEstudiante(null); setInscripcionesCaja([]);
    setMensaje(""); setModoEdicion(false); setModalAbierto(true);
  }

  function abrirModalEdicion(pago: any) {
    setPagoSeleccionado(pago); setPagoConfirmado(null);
    setFormulario({
      ...formularioInicial, ...pago,
      estudianteDni: pago.estudianteDni || pago.dniEstudiante || "",
      estudianteNombre: pago.estudianteNombre || pago.nombresEstudiante || "",
      programaNombre: pago.programaNombre || pago.programa || "",
      fechaPago: String(pago.fechaPago || pago.fecha || fechaActualInput()).slice(0, 10),
      monto: String(pago.monto || ""),
    });
    setDni(pago.estudianteDni || pago.dniEstudiante || ""); setEstudiante(null);
    setMensaje(""); setModoEdicion(true); setModalAbierto(true);
  }

  function cerrarModal() { setModalAbierto(false); setModoEdicion(false); setPagoSeleccionado(null); setPagoConfirmado(null); }

  /* ── Reportes y historial ── */

  async function descargarReporte() {
    try {
      const datos = await generarReporteCaja({
        periodo, tipoReporte: filtrosReporte.tipoReporte,
        desde: filtrosReporte.rango === "todo" ? "" : filtrosReporte.desde,
        hasta: filtrosReporte.rango === "todo" ? "" : filtrosReporte.hasta,
        programa: filtrosReporte.programa, medioPago: filtrosReporte.medioPago,
        estadoPago: filtrosReporte.estadoPago, mes: filtrosReporte.mes, anio: filtrosReporte.anio,
      });
      const datosFiltrados = datos.filter((fila: any) => {
        if (filtrosReporte.grado && filtrosReporte.grado !== "todos" && fila.grado !== filtrosReporte.grado) return false;
        if (filtrosReporte.seccion && filtrosReporte.seccion !== "todos" && fila.seccion !== filtrosReporte.seccion) return false;
        if (filtrosReporte.anio && filtrosReporte.anio !== "todos") {
          const fecha = String(fila.fecha || "").slice(0, 10);
          if (!fecha || fecha.split("-")[0] !== String(filtrosReporte.anio)) return false;
        }
        if (filtrosReporte.mes && filtrosReporte.mes !== "todos") {
          const fecha = String(fila.fecha || "").slice(0, 10);
          if (!fecha || fecha.split("-")[1] !== String(filtrosReporte.mes).padStart(2, "0")) return false;
        }
        return true;
      });
      const csv = generarCSVReporteCaja(datosFiltrados);
      descargarArchivoCsv(csv, `reporte-caja-${periodo}-${fechaActualInput()}.csv`);
      toast.success("Reporte descargado", { description: "El archivo CSV se genero correctamente." });
    } catch (error: any) {
      toast.error("No se pudo descargar", { description: error.message || "Intente nuevamente." });
    }
  }

  async function abrirHistorialAlumno(fila: any) {
    if (!fila?.dniEstudiante) { toast.error("Historial del alumno", { description: "No se encontro el DNI del estudiante." }); return; }
    setHistorialAlumnoRegistro(fila); setHistorialAlumno([]); setHistorialAlumnoAbierto(true); setHistorialAlumnoCargando(true);
    try {
      const pagosHistoricos = await obtenerHistorialAlumnoCaja(fila.dniEstudiante);
      const filasReporteAlumno = reporteCaja.filter((i) => i.dniEstudiante === fila.dniEstudiante).map((i) => ({ ...i, origenHistorial: "reporte" }));
      const vistos = new Set();
      const historialCombinado = [...filasReporteAlumno, ...pagosHistoricos]
        .filter((i) => { const key = i.pagoId || i.id || i.inscripcionId || `${i.periodo || ""}-${i.programaId || i.programa || ""}-${i.fecha || i.fechaPago || i.fechaRegistro || ""}`; if (vistos.has(key)) return false; vistos.add(key); return true; })
        .sort((a: any, b: any) => new Date(b.fecha || b.fechaPago || b.fechaRegistro || 0).getTime() - new Date(a.fecha || a.fechaPago || a.fechaRegistro || 0).getTime());
      
      const infoAdicional = historialCombinado.find(h => h.grado || h.apoderado) || {};
      setHistorialAlumnoRegistro({
        ...fila,
        grado: fila.grado || infoAdicional.grado,
        seccion: fila.seccion || infoAdicional.seccion,
        apoderado: fila.apoderado || infoAdicional.apoderado,
        telefono: fila.telefono || infoAdicional.telefono || infoAdicional.telefonoPago,
        programa: fila.programa || infoAdicional.programa,
        periodo: fila.periodo || infoAdicional.periodo,
        nroRecibo: fila.nroRecibo || infoAdicional.nroRecibo || infoAdicional.nroComprobante,
        monto: fila.monto || infoAdicional.monto || infoAdicional.montoPagado,
        numeroOperacion: fila.numeroOperacion || infoAdicional.numeroOperacion || infoAdicional.codOperacion,
        fecha: fila.fecha || infoAdicional.fecha || infoAdicional.fechaPago || infoAdicional.fechaRegistro,
        medioPago: fila.medioPago || infoAdicional.medioPago,
        estadoPago: fila.estadoPago || infoAdicional.estadoPago || infoAdicional.estado,
      });
      setHistorialAlumno(historialCombinado);
    } catch (error: any) { toast.error("Historial del alumno", { description: error.message || "No se pudo cargar el historial." }); }
    finally { setHistorialAlumnoCargando(false); }
  }

  function cerrarHistorialAlumno() { setHistorialAlumnoAbierto(false); setHistorialAlumnoRegistro(null); setHistorialAlumno([]); setHistorialAlumnoCargando(false); }
  function actualizarFiltroReporte(campo: string, valor: string) { setFiltrosReporte((actual: any) => ({ ...actual, [campo]: valor || "" })); }

  /* ── Retorno ── */
  return {
    vista, setVista,
    periodo, setPeriodo, formulario, setFormulario,
    pagos, pagosFiltrados, resumen,
    buscando, cargando, guardando,
    estudiante, inscripcionesCaja, dni, setDni, resultadosBusqueda,
    modalAbierto, pagoSeleccionado, pagoConfirmado, modoEdicion, mensaje,
    filtroEstado, setFiltroEstado, busqueda, setBusqueda, correlativos,
    reporteCajaFiltrado, reporte, filtrosReporte, opcionesReporte,
    gradosDisponibles, seccionesDisponibles,
    actualizarFiltroReporte, descargarReporte,
    historialAlumno, historialAlumnoAbierto, historialAlumnoCargando, historialAlumnoRegistro,
    abrirHistorialAlumno, cerrarHistorialAlumno,
    buscarEstudiante, seleccionarInscripcionCaja, seleccionarEstudianteDesdeBusqueda,
    guardarPago, limpiarPagoActual, abrirPagoDesdeReporte, abrirModalEdicion, cerrarModal,
    cargarDatos, cargarReporteCaja, cargarCorrelativos,
    // Delegados de verificación y anulación
    ...verificacion,
  };
}
