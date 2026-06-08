import { useEffect, useMemo, useState } from "react";
import { Button, Group, Modal, Select } from "@mantine/core";
import { toast } from "sonner";
import {
  IconChartBar as ChartBar,
  IconCheck as Check,
  IconDownload as Download,
  IconLogout as LogOut,
  IconReceipt2 as Receipt,
  IconX as X,
} from "@tabler/icons-react";
import CajaFields from "./components/CajaFields";
import CajaPagoWebModals from "./components/CajaPagoWebModals";
import ReporteFiltros from "./components/ReporteFiltros";
import ReporteResumenCards from "./components/ReporteResumenCards";
import ReporteTabla from "./components/ReporteTabla";
import {
  LOGO_COLEGIO_SRC,
  alertClass,
  formularioInicial,
} from "./constants/cajaConstants";
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
  obtenerPagoPorId,
} from "./cajaService";
import { fechaActualInput } from "../../services/dateService";
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
  const [vista, setVista] = useState(initialView || "pagos");
  const [periodo, setPeriodo] = useState("escolar");
  const [formulario, setFormulario] = useState(formularioInicial);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
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
  });

  // Estados de verificacion de pagos web Yape
  const [modalVerificacionAbierto, setModalVerificacionAbierto] = useState(false);
  const [modalObservarAbierto, setModalObservarAbierto] = useState(false);
  const [pagoVerificar, setPagoVerificar] = useState(null);
  const [observacionTexto, setObservacionTexto] = useState("");
  const [guardandoVerificacion, setGuardandoVerificacion] = useState(false);

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

    window.addEventListener("api-db-updated", refrescarCaja);
    window.addEventListener("mock-db-updated", refrescarCaja);
    window.addEventListener("storage", refrescarPorStorage);
    window.addEventListener("focus", refrescarCaja);
    const intervalo = window.setInterval(refrescarCaja, 30000);

    return () => {
      window.removeEventListener("api-db-updated", refrescarCaja);
      window.removeEventListener("mock-db-updated", refrescarCaja);
      window.removeEventListener("storage", refrescarPorStorage);
      window.removeEventListener("focus", refrescarCaja);
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

  const reporte = useMemo(() => {
    const totalVisible = reporteCaja.reduce((sum, fila) => sum + Number(fila.monto || 0), 0);
    const pagados = reporteCaja.filter((fila) => fila.estadoPago === "pagado");
    const pendientes = reporteCaja.filter((fila) => fila.estadoPago === "pendiente");
    return {
      totalVisible,
      totalPagado: pagados.reduce((sum, pago) => sum + Number(pago.monto || 0), 0),
      totalPendiente: pendientes.reduce((sum, pago) => sum + Number(pago.monto || 0), 0),
      cantidadPagada: pagados.length,
      cantidadPendiente: pendientes.length,
    };
  }, [reporteCaja]);

  useEffect(() => {
    if (!embedded || !initialView) return;
    setVista(initialView);
  }, [embedded, initialView]);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [datosPagos, datosResumen] = await Promise.all([
        listarPagos(periodo),
        obtenerResumenCaja(periodo),
      ]);
      setPagos(datosPagos);
      setResumen(datosResumen);
    } catch (error) {
      toast.error("Caja", { description: error.message || "No se pudo cargar la informacion." });
    } finally {
      setCargando(false);
    }
  }

  async function cargarReporteCaja() {
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

  async function buscarEstudiante(event) {
    event?.preventDefault();
    setMensaje("");
    setPagoConfirmado(null);
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
      if (encontrado.sinInscripcionCaja) {
        setEstudiante(null);
        setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
        setMensaje(
          encontrado.requiereDerivacionCaja
            ? "El estudiante tiene inscripcion, pero Secretaria aun no la derivo a Caja."
            : "El estudiante aun no paso por Secretaria. Primero debe existir una inscripcion registrada."
        );
        return;
      }
      const inscripcion = encontrado.inscripcionCaja;

      const estadoPagoNormalizado = String(inscripcion?.estadoPago || "").toLowerCase().trim();
      const estaPagado = estadoPagoNormalizado === "pagado" || estadoPagoNormalizado === "pago validado" || estadoPagoNormalizado === "completado";
      if (estaPagado) {
        setEstudiante(null);
        setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
        setMensaje(`El estudiante ya cuenta con un pago registrado y aprobado para el programa "${inscripcion.programa}". No se puede registrar el pago nuevamente a menos que se genere una nueva derivacion.`);
        return;
      }

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
        setEstudiante(null);
        setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
        setMensaje(`El estudiante ya cuenta con un pago registrado y aprobado para el programa "${inscripcion.programa}". No se puede registrar el pago nuevamente.`);
        return;
      }
      if (estadoPagoSistema === "verificando") {
        setMensaje(`El padre ya envio un pago web para "${inscripcion.programa}". Caja debe aprobarlo u observarlo, no cobrarlo nuevamente.`);
      }

      const nombre = `${encontrado.nombres || ""} ${encontrado.apellidos || ""}`.trim();
      setEstudiante(encontrado);
      setFormulario((actual) => ({
        ...actual,
        inscripcionId: inscripcion?.id || "",
        estudianteDni: dni,
        estudianteNombre: inscripcion?.nombresEstudiante || nombre,
        programaId: inscripcion?.programaId || encontrado.programaAsignado || actual.programaId || "",
        programaNombre: inscripcion?.programa || encontrado.programaNombre || actual.programaNombre || "",
        periodo: inscripcion?.periodo || encontrado.periodo || actual.periodo || "",
        tipoAlumno: inscripcion?.tipoAlumno || encontrado.tipoAlumno || (inscripcion?.esExterno ? "Alumno externo" : "Alumno interno"),
        monto: inscripcion?.costo ? String(inscripcion.costo) : encontrado.programaCosto ? String(encontrado.programaCosto) : actual.monto,
        pagoId: pagoAsociado?.id || "",
        estadoPago: estadoPagoSistema === "verificando" ? "verificando" : pagoAsociado?.estado || inscripcion?.estadoPago || "pendiente",
        numeroOperacion: pagoAsociado?.numeroOperacion || "",
        telefonoOperacion: pagoAsociado?.telefonoOperacion || "",
        capturaPagoBase64: pagoAsociado?.capturaPagoBase64 || "",
        formaPago: pagoAsociado?.formaPago || "Efectivo",
      }));
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
        const pago = await registrarPago(payload);
        setPagoConfirmado(pago);
        toast.success("Pago aprobado", { description: "El pago quedo confirmado y guardado en Caja." });
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
    if (!modoEdicion && !formulario.inscripcionId) return "Primero busque un estudiante con inscripcion registrada por Secretaria.";
    if (!validarDni(formulario.estudianteDni)) return "Seleccione o ingrese un DNI valido.";
    if (!formulario.estudianteNombre.trim()) return "Ingrese el nombre del estudiante.";
    if (!Number.isFinite(Number(formulario.monto)) || Number(formulario.monto) <= 0) return "Ingrese un monto mayor a cero.";
    if (!formulario.fechaPago) return "Seleccione la fecha de pago.";
    return "";
  }

  function abrirModalNuevo() {
    limpiarPagoActual();
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
      monto: String(fila.monto || ""),
      formaPago: "Efectivo",
      fechaPago: fechaActualInput(),
    });
    setDni(fila.dniEstudiante || "");
    setEstudiante(null);
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
    const nombreEstudiante = fila.estudiante || fila.estudianteNombre || "el estudiante";
    if (!window.confirm(`¿Esta seguro de aprobar el pago de Yape para ${nombreEstudiante}?`)) return;
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

  function abrirObservarModal(fila) {
    setPagoVerificar(fila);
    setObservacionTexto("");
    setModalObservarAbierto(true);
  }

  async function rechazarPagoWeb() {
    if (!pagoVerificar) return;
    if (!observacionTexto.trim()) {
      toast.error("Rechazar pago", { description: "Debe ingresar una observacion para rechazar el pago." });
      return;
    }
    try {
      setGuardandoVerificacion(true);
      const pagoId = pagoVerificar.pagoId || pagoVerificar.id;
      await observarPagoWeb(pagoId, observacionTexto);
      toast.success("Pago rechazado", { description: "El pago ha sido marcado como observado." });
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
      toast.error("Error", { description: error.message || "No se pudo rechazar el pago." });
    } finally {
      setGuardandoVerificacion(false);
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
      const csv = generarCSVReporteCaja(datos);
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
    <main className={embedded ? "caja-page caja-page-embedded" : "caja-page"}>
      {!embedded ? (
      <aside className="caja-sidebar">
        <div className="caja-brand" aria-label="Colegio San Rafael">
          <img className="caja-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="caja-module-label">Modulo Caja</p>
        <nav className="caja-nav" aria-label="Modulo de caja">
          <button className={!delegatedContent && vista === "pagos" ? "is-active" : ""} onClick={() => { onClearDelegatedModule?.(); setVista("pagos"); }} type="button">
            <Receipt size={17} /> Registrar Cobro
          </button>
          <button className={!delegatedContent && vista === "reportes" ? "is-active" : ""} onClick={() => { onClearDelegatedModule?.(); setVista("reportes"); }} type="button">
            <ChartBar size={17} /> Control y Exportacion
          </button>
        </nav>
        {moduleSwitcher ? (
          <div className="pt-3">
            {moduleSwitcher}
          </div>
        ) : null}
        <button className="caja-logout" onClick={onLogout} type="button">
          <LogOut size={17} /> Cerrar sesion
        </button>
      </aside>
      ) : null}

      <section className={embedded ? "caja-main caja-main-embedded" : "caja-main"}>
        {delegatedContent ? (
          delegatedContent
        ) : (
          <>
        {vista === "reportes" ? (
        <header className="caja-header">
          <div>
            <span>Control y exportacion</span>
            <h1>Consulta de Transacciones</h1>
            <p>Visualice el estado de los cobros, gestione pendientes y descargue reportes en CSV.</p>
          </div>
          <div className="caja-header-actions">
            <Select
              aria-label="Periodo"
              className="caja-period"
              data={[
                { value: "escolar", label: "Año escolar" },
                { value: "verano", label: "Ciclo verano" },
              ]}
              onChange={(valor) => setPeriodo(valor || "escolar")}
              value={periodo}
            />
            <Button leftSection={<Download size={17} />} onClick={descargarReporte}>
              Descargar CSV
            </Button>
          </div>
        </header>
        ) : null}

        {vista === "pagos" ? (
          <>
            <section className="caja-payment-workspace">
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
                estudiante={estudiante}
                formulario={formulario}
                modoEdicion={false}
                onBuscar={buscarEstudiante}
                setDni={setDni}
                setFormulario={setFormulario}
                mensaje={mensaje}
              />
              {formulario.inscripcionId ? (
                formulario.estadoPago === "verificando" || formulario.estadoPago === "Por Verificar" ? (
                  <Group className="caja-payment-actions" justify="flex-end">
                    <Button onClick={limpiarPagoActual} variant="default">
                      Limpiar
                    </Button>
                    <Button
                      color="red"
                      leftSection={<X size={15} />}
                      onClick={() => abrirObservarModal(formulario)}
                    >
                      Observar / Rechazar
                    </Button>
                    <Button
                      color="green"
                      leftSection={<Check size={15} />}
                      onClick={() => aprobarPagoWebDirecto(formulario)}
                    >
                      Aprobar Pago
                    </Button>
                  </Group>
                ) : (
                  <Group className="caja-payment-actions" justify="flex-end">
                    <Button onClick={limpiarPagoActual} variant="default">
                      Limpiar
                    </Button>
                    <Button leftSection={<Check size={17} />} loading={guardando} onClick={guardarPago}>
                      Registrar pago
                    </Button>
                  </Group>
                )
              ) : null}
            </section>
          </>
        ) : (
          <section className="caja-report-layout">
            <ReporteResumenCards reporte={reporte} totalRegistros={reporteCaja.length} />
            <ReporteFiltros
              filtros={filtrosReporte}
              mediosPago={opcionesReporte.mediosPago}
              onChange={actualizarFiltroReporte}
              programas={opcionesReporte.programas}
            />
            <section className="caja-panel">
              <div className="caja-panel-header">
                <div>
                  <h2>Resultado del reporte</h2>
                  <p>{reporteCaja.length} registros encontrados</p>
                </div>
              </div>
              <ReporteTabla
                filas={reporteCaja}
                onPagar={abrirPagoDesdeReporte}
                onValidarWebPago={aprobarPagoWebDirecto}
                onObservarWebPago={abrirObservarModal}
                onVerCapturaWebPago={verificarPagoWeb}
              />
            </section>
          </section>
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
          estudiante={estudiante}
          formulario={formulario}
          modoEdicion={modoEdicion}
          onBuscar={buscarEstudiante}
          setDni={setDni}
          setFormulario={setFormulario}
          mensaje={mensaje}
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
            {modoEdicion ? "Actualizar" : "Registrar"}
          </Button>
        </Group>
      </Modal>

      <CajaPagoWebModals
        guardandoVerificacion={guardandoVerificacion}
        modalObservarAbierto={modalObservarAbierto}
        modalVerificacionAbierto={modalVerificacionAbierto}
        observacionTexto={observacionTexto}
        onAprobarPagoWeb={aprobarPagoWebDesdeModal}
        onCerrarObservacion={() => setModalObservarAbierto(false)}
        onCerrarVerificacion={() => { setModalVerificacionAbierto(false); setPagoVerificar(null); }}
        onRechazarPagoWeb={rechazarPagoWeb}
        onSetObservacionTexto={setObservacionTexto}
        onSolicitarObservacion={() => {
          setObservacionTexto("");
          setModalObservarAbierto(true);
        }}
        pagoVerificar={pagoVerificar}
      />
    </main>
  );
}
