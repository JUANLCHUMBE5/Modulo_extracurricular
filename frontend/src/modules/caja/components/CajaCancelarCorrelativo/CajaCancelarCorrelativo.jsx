import React, { useState, useEffect, useRef } from "react";
import { Button, Select, Textarea, TextInput, Paper, Text, Group } from "@mantine/core";
import {
  IconReceiptOff as ReceiptOff,
  IconAlertTriangle as AlertTriangle,
  IconMenu2 as Menu,
  IconSearch as Search,
  IconLoader2 as Loader,
  IconCoins as Coins,
  IconCheck as Check
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  buscarEstudiantesCajaQuery,
  listarPagos,
  anularPago,
  registrarEgresoCaja
} from "../../cajaService";
import { obtenerCorrelativos } from "../../../direccion/direccionService";

export default function CajaCancelarCorrelativo({ sidebarExpanded, toggleSidebar, periodo, onCorrelativoCancelado }) {
  const [correlativos, setCorrelativos] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscandoEstudiante, setBuscandoEstudiante] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);

  // Estados para selección de pago de estudiante
  const [pagosEstudiante, setPagosEstudiante] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [pagoSeleccionadoId, setPagoSeleccionadoId] = useState(null);
  const pagoPreseleccionadoRef = useRef(null);

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
  const [resultadosEgreso, setResultadosEgreso] = useState([]);
  const [buscandoEstudianteEgreso, setBuscandoEstudianteEgreso] = useState(false);
  const [estudianteEgreso, setEstudianteEgreso] = useState(null);
  const [pagosEgreso, setPagosEgreso] = useState([]);
  const [cargandoPagosEgreso, setCargandoPagosEgreso] = useState(false);
  const [pagoEgresoSeleccionadoId, setPagoEgresoSeleccionadoId] = useState(null);

  const handleBuscarEstudianteEgreso = async (e) => {
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
    } catch (err) {
      toast.error("Error al buscar", { description: err.message || "Intente nuevamente." });
    } finally {
      setBuscandoEstudianteEgreso(false);
    }
  };

  const seleccionarEstudianteEgreso = async (est) => {
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

  const actualizarCamposConPagoEgreso = (pago, est) => {
    if (!pago) return;
    setMontoEgreso(String(pago.monto || 0));
    setConceptoEgreso(
      `Devolución por concepto de taller de ${pago.programa || "Extracurricular"}. Referencia: Recibo N° ${pago.nroRecibo || "S/N"}.`
    );
  };

  const handlePagoEgresoChange = (val) => {
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

  const handleTipoEgresoChange = (newTipo) => {
    setTipoEgreso(newTipo);
    handleQuitarEstudianteEgreso();
  };

  const handleRegistrarEgreso = async (e) => {
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
    } catch (err) {
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

  const esTallerVigenteParaAnulacion = (pago = {}) => {
    const estadoPrograma = String(pago.estadoPrograma || pago.estado_programa || "").toLowerCase();
    if (["finalizado", "archivado", "deshabilitado", "inactivo"].some((estado) => estadoPrograma.includes(estado))) {
      return false;
    }

    const fechaFin = String(pago.programaFechaFin || pago.programa_fecha_fin || pago.fechaFin || "").slice(0, 10);
    if (fechaFin && fechaFin < obtenerFechaHoy()) return false;

    return true;
  };

  const esPagoAnulable = (pago = {}) => {
    const estado = String(`${pago.estado || ""} ${pago.estadoPago || ""} ${pago.estadoVerificacion || ""}`).toLowerCase();
    const tieneRecibo = Boolean(pago.nroRecibo || pago.nro_recibo);
    const estaPagado = ["validado", "completado", "pagado", "aprobado"].some((item) => estado.includes(item));
    const estaAnulado = ["anulado", "cancelado"].some((item) => estado.includes(item));
    return tieneRecibo && estaPagado && !estaAnulado && esTallerVigenteParaAnulacion(pago);
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
  const cargarPagosEstudiante = async (dni) => {
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

  const handleBuscarEstudiante = async (e) => {
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
    } catch (err) {
      toast.error("Error al buscar", { description: err.message || "Intente nuevamente." });
    } finally {
      setBuscandoEstudiante(false);
    }
  };

  const handleSeleccionarEstudiante = (est) => {
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
    } catch (err) {
      toast.error("Error", { description: err.message || "No se pudo procesar la anulación." });
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="caja-payment-workspace caja-correlativo-workspace" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>

      {/* TABS DE SELECCIÓN */}
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", paddingBottom: "0px", gap: "24px", marginBottom: "8px" }}>
        <button
          onClick={() => setActiveTab("anular")}
          type="button"
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "anular" ? "3px solid #b45309" : "3px solid transparent",
            color: activeTab === "anular" ? "#b45309" : "#64748b",
            fontSize: "16px",
            fontWeight: 700,
            padding: "8px 4px 12px 4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <ReceiptOff size={18} />
          Anulación de Correlativo
        </button>
        <button
          onClick={() => setActiveTab("egreso")}
          type="button"
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "egreso" ? "3px solid #0c8569" : "3px solid transparent",
            color: activeTab === "egreso" ? "#0c8569" : "#64748b",
            fontSize: "16px",
            fontWeight: 700,
            padding: "8px 4px 12px 4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <Coins size={18} />
          Registrar Egreso (Gasto)
        </button>
      </div>

      {activeTab === "anular" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <ReceiptOff size={24} style={{ color: "#b45309" }} />
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1f2937" }}>
              Anulación de Correlativo / Recibo del Sistema
            </h2>
          </div>

          <Paper withBorder p="md" radius="md" style={{ background: "#fffbeb", borderColor: "#fef3c7", width: "100%" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <AlertTriangle size={20} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <Text fw={700} color="#b45309" size="sm">¡Importante!</Text>
                <Text size="xs" color="#78350f" style={{ marginTop: "4px", lineHeight: "1.4" }}>
                  Esta función registra el comprobante seleccionado como <strong>ANULADO</strong> en el sistema con un monto de S/ 0.00 y, de ser necesario, avanza el contador actual. Úselo únicamente por daños físicos de hojas, errores de impresión o anulaciones directas.
                </Text>
              </div>
            </div>
          </Paper>

          <Paper withBorder p="lg" radius="md" shadow="sm" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* BUSCADOR DE ESTUDIANTE (OPCIONAL) */}
            {!estudianteSeleccionado ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <form className="caja-search-form-responsive" onSubmit={handleBuscarEstudiante} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <TextInput
                    label="Buscar por Estudiante (DNI, Nombre o Apellido)"
                    placeholder="Ej. 12345678 o Perez Garcia"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                    styles={{
                      label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                      input: { borderRadius: "8px", height: "38px" }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="submit"
                    loading={buscandoEstudiante}
                    leftSection={<Search size={16} />}
                    styles={{
                      root: {
                        height: "38px",
                        borderRadius: "8px",
                        fontWeight: 600,
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        "&:hover": {
                          background: "#e2e8f0"
                        }
                      }
                    }}
                  >
                    Buscar
                  </Button>
                </form>

                {resultados.length > 0 && (
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", display: "flex", flexDirection: "column", marginTop: "4px" }}>
                    {resultados.map((est) => (
                      <button
                        key={est.dni}
                        type="button"
                        onClick={() => handleSeleccionarEstudiante(est)}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <Text size="sm" fw={600} color="#1f2937">{est.nombres}</Text>
                        <Text size="xs" color="#6b7280">DNI: {est.dni}</Text>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#eefbf7", border: "1px solid #b9e6dc", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text size="xs" color="#087364" fw={700}>Estudiante asociado:</Text>
                  <Text size="sm" fw={700} color="#0c8569">{estudianteSeleccionado.nombres}</Text>
                  <Text size="xs" color="#087364" style={{ marginTop: "2px" }}>DNI: {estudianteSeleccionado.dni}</Text>
                </div>
                <Button size="xs" variant="subtle" color="red" onClick={handleQuitarEstudiante}>
                  Cambiar estudiante
                </Button>
              </div>
            )}

            {/* LISTADO DE PAGOS DEL ESTUDIANTE */}
            {estudianteSeleccionado && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {cargandoPagos ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", padding: "20px" }}>
                    <Loader size={20} style={{ animation: "spin 1s linear infinite" }} />
                    <Text size="sm" color="dimmed">Cargando pagos activos...</Text>
                  </div>
                ) : pagosEstudiante.length === 0 ? (
                  <Paper withBorder p="sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                    <Text size="sm" color="dimmed" style={{ textAlign: "center" }}>
                      El estudiante no tiene recibos anulables en talleres vigentes del periodo actual.
                    </Text>
                  </Paper>
                ) : (
                  <div className="caja-anulacion-selector">
                    <div className="caja-anulacion-selector-head">
                      <div>
                        <Text size="sm" fw={800} color="#111827">Recibos disponibles para anular</Text>
                        <Text size="xs" color="#64748b">Seleccione el comprobante correcto antes de confirmar.</Text>
                      </div>
                      <span className="caja-anulacion-count">
                        {pagosEstudiante.length} {pagosEstudiante.length === 1 ? "opción" : "opciones"}
                      </span>
                    </div>

                    <div className="caja-anulacion-options">
                      {pagosEstudiante.map((pago) => {
                        const seleccionado = pago.id === pagoSeleccionadoId;
                        const recibo = pago.nroRecibo || pago.nro_recibo || "S/N";
                        const programa = pago.programa || pago.programaNombre || "Taller no identificado";
                        const fecha = String(pago.fechaPago || pago.fecha || pago.fechaRegistro || "").slice(0, 10) || "-";
                        const medio = pago.formaPago || pago.medioPago || pago.metodo || "-";

                        return (
                          <button
                            key={pago.id}
                            type="button"
                            className={`caja-anulacion-option${seleccionado ? " is-selected" : ""}`}
                            onClick={() => setPagoSeleccionadoId(pago.id)}
                          >
                            <span className="caja-anulacion-option-check" aria-hidden="true">
                              {seleccionado ? <Check size={14} stroke={3} /> : null}
                            </span>
                            <span className="caja-anulacion-option-body">
                              <span className="caja-anulacion-option-top">
                                <span className="caja-anulacion-receipt">Recibo {recibo}</span>
                                <strong>S/ {Number(pago.monto || 0).toFixed(2)}</strong>
                              </span>
                              <span className="caja-anulacion-program">{programa}</span>
                              <span className="caja-anulacion-meta">
                                <span>Fecha: {fecha}</span>
                                <span>Medio: {medio}</span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MOTIVO DE CANCELACIÓN (SIEMPRE OBLIGATORIO) */}
            <Textarea
              label="Justificación / Motivo de la anulación"
              placeholder="Ej. Error de digitación en el monto o papel de recibo atascado."
              required
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.currentTarget.value)}
              styles={{
                label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                input: { borderRadius: "8px" }
              }}
            />

            <Group justify="flex-end" style={{ marginTop: "8px" }}>
              <Button
                color="orange"
                loading={cargando}
                onClick={handleCancelar}
                leftSection={<ReceiptOff size={16} />}
                disabled={!getComprobanteFinal()}
                styles={{
                  root: {
                    height: "38px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    background: "#f59e0b",
                    "&:hover": {
                      background: "#d97706"
                    }
                  }
                }}
              >
                Confirmar Anulación
              </Button>
            </Group>
          </Paper>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <Coins size={24} style={{ color: "#0c8569" }} />
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1f2937" }}>
              Registrar Egreso de Caja
            </h2>
          </div>

          <Paper withBorder p="lg" radius="md" shadow="sm" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* BÚSQUEDA DE ESTUDIANTE */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {!estudianteEgreso ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <form className="caja-search-form-responsive" onSubmit={handleBuscarEstudianteEgreso} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                    <TextInput
                      label="Buscar Estudiante para Devolución"
                      placeholder="Ej. 77889900 o Rojas García"
                      value={busquedaEgreso}
                      onChange={(e) => setBusquedaEgreso(e.currentTarget.value)}
                      styles={{
                        label: { fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" },
                        input: { borderRadius: "8px", height: "36px" }
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="submit"
                      loading={buscandoEstudianteEgreso}
                      leftSection={<Search size={15} />}
                      styles={{
                        root: {
                          height: "36px",
                          borderRadius: "8px",
                          fontWeight: 600,
                          background: "#0c8569",
                          "&:hover": {
                            background: "#0a6c55"
                          }
                        }
                      }}
                    >
                      Buscar
                    </Button>
                  </form>

                  {resultadosEgreso.length > 0 && (
                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", display: "flex", flexDirection: "column", marginTop: "4px" }}>
                      {resultadosEgreso.map((est) => (
                        <button
                          key={est.dni}
                          type="button"
                          onClick={() => seleccionarEstudianteEgreso(est)}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <Text size="sm" fw={600} color="#1f2937">{est.nombres}</Text>
                          <Text size="xs" color="#6b7280">DNI: {est.dni}</Text>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <Text size="xs" color="#087364" fw={700}>Estudiante para Devolución:</Text>
                    <Text size="sm" fw={700} color="#0c8569">{estudianteEgreso.nombres}</Text>
                    <Text size="xs" color="#087364">DNI: {estudianteEgreso.dni}</Text>
                  </div>
                  <Button size="xs" variant="subtle" color="red" onClick={handleQuitarEstudianteEgreso}>
                    Cambiar estudiante
                  </Button>
                </div>
              )}

              {/* DROPDOWN DE PAGOS DEL ESTUDIANTE A DEVOLVER */}
              {estudianteEgreso && (
                <div style={{ marginTop: "8px" }}>
                  {cargandoPagosEgreso ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0" }}>
                      <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <Text size="xs" color="dimmed">Buscando talleres pagados...</Text>
                    </div>
                  ) : pagosEgreso.length === 0 ? (
                    <Text size="xs" color="orange" fw={600}>
                      El estudiante no tiene pagos registrados en estado 'Pagado' en este período.
                    </Text>
                  ) : (
                    <Select
                      label="Seleccione el Pago / Taller a Devolver"
                      placeholder="Seleccione una transacción"
                      data={pagosEgreso.map((p) => ({
                        value: p.id,
                        label: `${p.programa || "Pago"} - Recibo: ${p.nroRecibo || "S/N"} - S/ ${Number(p.monto || 0).toFixed(2)}`
                      }))}
                      value={pagoEgresoSeleccionadoId}
                      onChange={handlePagoEgresoChange}
                      styles={{
                        label: { fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" },
                        input: { borderRadius: "8px", height: "36px" }
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* FORMULARIO DE REGISTRO SIMPLIFICADO */}
            {estudianteEgreso && pagoEgresoSeleccionadoId && (
              <form onSubmit={handleRegistrarEgreso} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                <Paper withBorder p="md" radius="md" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <Text size="xs" color="dimmed" fw={700}>Beneficiario (Estudiante):</Text>
                        <Text size="sm" fw={700} color="#1f2937">{beneficiario}</Text>
                      </div>
                      <div>
                        <Text size="xs" color="dimmed" fw={700}>DNI:</Text>
                        <Text size="sm" fw={700} color="#1f2937">{dniEgreso}</Text>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                      <div>
                        <Text size="xs" color="dimmed" fw={700}>Monto a Devolver:</Text>
                        <Text size="md" fw={800} color="#0c8569">S/ {Number(montoEgreso || 0).toFixed(2)}</Text>
                      </div>
                      <div>
                        <Text size="xs" color="dimmed" fw={700}>N° Recibo de Egreso:</Text>
                        <Group gap="xs" style={{ marginTop: "2px" }}>
                          <strong style={{ fontSize: "14px", color: correlativos?.egresoActive === false ? "#ef4444" : "#0c8569", fontFamily: "var(--font-body)" }}>
                            {correlativos?.egresoActive === false ? "Serie Inactiva" : (correlativos?.egresoActual || "EGR-0001")}
                          </strong>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: correlativos?.egresoActive === false ? "#ef4444" : "#0c8569",
                            background: correlativos?.egresoActive === false ? "#fee2e2" : "#e6f4ea",
                            padding: "1px 5px",
                            borderRadius: "4px"
                          }}>
                            {correlativos?.egresoActive === false ? "Inactivo" : "Activo"}
                          </span>
                        </Group>
                      </div>
                    </div>

                    <div style={{ paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                      <Text size="xs" color="dimmed" fw={700}>Concepto / Justificación del Egreso:</Text>
                      <Text size="xs" color="#374151" style={{ fontStyle: "italic", marginTop: "2px" }}>{conceptoEgreso}</Text>
                    </div>
                  </div>
                </Paper>

                <Group justify="flex-end" style={{ marginTop: "4px" }}>
                  <Button
                    type="submit"
                    loading={guardandoEgreso}
                    disabled={correlativos?.egresoActive === false}
                    leftSection={<Coins size={16} />}
                    styles={{
                      root: {
                        height: "38px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        background: "#0c8569",
                        "&:hover": {
                          background: "#0a6c55"
                        }
                      }
                    }}
                  >
                    Registrar Egreso
                  </Button>
                </Group>
              </form>
            )}
          </Paper>
        </>
      )}
    </section>
  );
}
