import React, { useState, useEffect, useRef } from "react";
import { Button, Select, Textarea, TextInput, Paper, Text, Group } from "@mantine/core";
import { IconReceiptOff as ReceiptOff, IconAlertTriangle as AlertTriangle, IconMenu2 as Menu, IconSearch as Search, IconLoader2 as Loader } from "@tabler/icons-react";
import { toast } from "sonner";
import { cancelarCorrelativoCaja, buscarEstudiantesCajaQuery, listarPagos, anularPago } from "../../cajaService";
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

  const getComprobanteActual = (tipoComp) => {
    if (!correlativos) return "";
    if (tipoComp === "recibo") return correlativos.reciboActual || "";
    if (tipoComp === "reciboVirtual") return correlativos.reciboVirtualActual || "";
    if (tipoComp === "egreso") return correlativos.egresoActual || "";
    return "";
  };

  const detectarTipoComprobante = (codigo) => {
    const cod = String(codigo || "").toLowerCase().trim();
    if (cod.startsWith("v-")) return "reciboVirtual";
    if (cod.startsWith("egr-")) return "egreso";
    return "recibo";
  };

  const esPagoAnulable = (pago = {}) => {
    const estado = String(`${pago.estado || ""} ${pago.estadoPago || ""} ${pago.estadoVerificacion || ""}`).toLowerCase();
    const tieneRecibo = Boolean(pago.nroRecibo || pago.nro_recibo);
    const estaPagado = ["validado", "completado", "pagado", "aprobado"].some((item) => estado.includes(item));
    const estaAnulado = ["anulado", "cancelado"].some((item) => estado.includes(item));
    return tieneRecibo && estaPagado && !estaAnulado;
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
    return busqueda.trim();
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
      toast.error("Búsqueda vacía", { description: "Ingrese el DNI o nombres para buscar." });
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
        const queryNormalizada = query.toLowerCase();
        const pagosPeriodo = await listarPagos(periodo || "escolar");
        const pagosCoincidentes = (pagosPeriodo || []).filter((pago) => {
          if (!esPagoAnulable(pago)) return false;
          const campos = [
            pago.nroRecibo,
            pago.nro_recibo,
            pago.dniEstudiante,
            pago.estudianteDni,
            pago.nombresEstudiante,
            pago.estudianteNombre,
          ];
          return campos.some((campo) => String(campo || "").trim().toLowerCase().includes(queryNormalizada));
        });

        if (pagosCoincidentes.length > 0) {
          const pagoPorRecibo = pagosCoincidentes[0];
          const estudiante = {
            dni: pagoPorRecibo.dniEstudiante || pagoPorRecibo.estudianteDni || "",
            nombres: pagoPorRecibo.nombresEstudiante || pagoPorRecibo.estudianteNombre || "Estudiante sin nombre",
          };
          setEstudianteSeleccionado(estudiante);
          pagoPreseleccionadoRef.current = pagoPorRecibo.id;
          setPagosEstudiante(pagosCoincidentes);
          setPagoSeleccionadoId(pagoPorRecibo.id);
          setResultados([]);
          toast.success("Pago encontrado", { description: `${pagoPorRecibo.nroRecibo || pagoPorRecibo.nro_recibo} - ${estudiante.nombres}` });
        } else {
          toast.error("No encontrado", { description: "No se encontró ningún pago realizado con ese DNI, nombre o recibo." });
        }
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
    if (!comprobanteFinal) {
      toast.error("Falta comprobante", { description: "No se determinó ningún comprobante a anular." });
      return;
    }

    setCargando(true);
    try {
      if (!estudianteSeleccionado) {
        // Cancelación manual directa
        const tipoComp = detectarTipoComprobante(comprobanteFinal);
        await cancelarCorrelativoCaja(
          tipoComp,
          motivo,
          "",
          "",
          comprobanteFinal
        );

        toast.success("Correlativo cancelado", {
          description: `El comprobante ${comprobanteFinal} fue marcado como ANULADO en el sistema.`,
        });

        setMotivo("");
        setBusqueda("");
      } else {
        // Cancelación de pago de estudiante
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
      }

      await cargarCorrelativos();
      if (onCorrelativoCancelado) {
        onCorrelativoCancelado();
      }
    } catch (err) {
      toast.error("Error", { description: err.message || "No se pudo procesar la cancelación." });
    } finally {
      setCargando(false);
    }
  };

  const pagoResumen = getPagoSeleccionado();

  return (
    <section className="caja-payment-workspace" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {!sidebarExpanded && (
        <div style={{ marginBottom: "6px" }}>
          <button
            className="caja-menu-toggle-btn-header"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={22} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <ReceiptOff size={24} style={{ color: "#b45309" }} />
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1f2937" }}>
          Cancelar Correlativo / Recibo del Sistema
        </h2>
      </div>

      <Paper withBorder p="md" radius="md" style={{ background: "#fffbeb", borderColor: "#fef3c7" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <AlertTriangle size={20} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <Text fw={700} color="#b45309" size="sm">¡Importante!</Text>
            <Text size="xs" color="#78350f" style={{ marginTop: "4px", lineHeight: "1.4" }}>
              Esta función registra el comprobante seleccionado como <strong>ANULADO</strong> en el sistema con un monto de S/ 0.00 y, de ser necesario, avanza el contador actual. Úselo únicamente por daños físicos de hojas, errores de impresión o cancelaciones directas.
            </Text>
          </div>
        </div>
      </Paper>

      <Paper withBorder p="lg" radius="md" shadow="sm" style={{ width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* BUSCADOR DE ESTUDIANTE (OPCIONAL) */}
        {!estudianteSeleccionado ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <form className="caja-search-form-responsive" onSubmit={handleBuscarEstudiante} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <TextInput
                label="Buscar por Estudiante (DNI o Nombre)"
                placeholder="Ej. 12345678 o Pérez García (o código de recibo manual)"
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
                  El estudiante no tiene pagos activos en el periodo actual.
                </Text>
              </Paper>
            ) : (
              <Select
                label="Seleccione el recibo / taller a cancelar"
                placeholder="Seleccione un pago"
                data={pagosEstudiante.map((p) => ({
                  value: p.id,
                  label: `${p.programa || "Pago sin programa"} - Recibo: ${p.nroRecibo || p.nro_recibo || "S/N"} - S/ ${Number(p.monto || 0).toFixed(2)}`
                }))}
                value={pagoSeleccionadoId}
                onChange={setPagoSeleccionadoId}
                required
                styles={{
                  label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                  input: { borderRadius: "8px", height: "38px" }
                }}
              />
            )}
          </div>
        )}

        {/* VISTA RESUMEN DEL COMPROBANTE A ANULAR */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: "8px" }}>
          <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>
            Comprobante a anular:
          </span>
          <strong style={{ fontSize: "18px", color: getComprobanteFinal() ? "#b45309" : "#94a3b8", fontFamily: "monospace" }}>
            {getComprobanteFinal() || "Sin comprobante seleccionado"}
          </strong>
          {pagoResumen ? (
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e2e8f0", display: "grid", gap: "6px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>
                  Taller asignado:
                </span>
                <strong style={{ fontSize: "14px", color: "#111827" }}>
                  {pagoResumen.programa || pagoResumen.programaNombre || "Taller sin nombre"}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>
                  Monto pagado:
                </span>
                <strong style={{ fontSize: "14px", color: "#0c8569" }}>
                  S/ {Number(pagoResumen.monto || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          ) : null}
          {!estudianteSeleccionado && getComprobanteFinal() ? (
            <Text size="xs" color="dimmed" style={{ marginTop: "4px" }}>
              (Tipo detectado: {detectarTipoComprobante(getComprobanteFinal()) === "reciboVirtual" ? "Recibo Virtual" : (detectarTipoComprobante(getComprobanteFinal()) === "egreso" ? "Comprobante de Egreso" : "Recibo Físico")})
            </Text>
          ) : null}
        </div>

        {/* MOTIVO DE CANCELACIÓN (SIEMPRE OBLIGATORIO) */}
        <Textarea
          label="Justificación / Motivo de la cancelación"
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
            Confirmar Cancelación
          </Button>
        </Group>
      </Paper>
    </section>
  );
}
