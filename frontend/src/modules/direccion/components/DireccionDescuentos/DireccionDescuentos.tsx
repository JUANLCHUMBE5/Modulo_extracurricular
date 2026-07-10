import { useState } from "react";
import { TextInput, Button, Table, Badge, Modal, Select, Textarea, Divider, Drawer, Text, Alert } from "@mantine/core";
import {
  IconSearch as Search,
  IconRosetteDiscount as RosetteDiscount,
  IconEdit as Edit,
  IconAlertCircle as AlertCircle,
  IconTrash as Trash,
  IconEye as Eye,
  IconReceipt as Receipt,
  IconHistory as History,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";
import { formatearSoles } from "../../utils/direccionFormatters";
import { obtenerHistorialAlumnoCaja } from "../../../caja/cajaService";
import { formatearFechaPeru } from "../../../../services/dateService";
import "./DireccionDescuentos.css";
import "../../../caja/components/CajaReportes/CajaReportes.css";

function obtenerEstadoVisual(fila: any = {}) {
  if (fila.formaPago === "Egreso") return { color: "red", texto: "Egreso" };
  if (fila.estadoPago === "pagado" || fila.estado === "completado" || fila.estado === "validado") {
    return { color: "green", texto: "Pagado" };
  }
  if (fila.estadoPago === "verificando") {
    return { color: "orange", texto: "Pago en Proceso" };
  }
  if (fila.estadoPago === "observado" || fila.estado === "observado") return { color: "red", texto: "Observado" };
  if (fila.estadoPago === "anulado" || fila.estado === "anulado") return { color: "red", texto: "Anulado" };
  return { color: "yellow", texto: "Pendiente" };
}

function CampoDetalle({ label, value, strong = false }: { label: string; value: any; strong?: boolean }) {
  return (
    <div className="caja-history-field">
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>{value || "-"}</strong>
    </div>
  );
}

const formatGradoSeccion = (grado: string, seccion: string, nivel: string) => {
  let cleanGrado = String(grado || "").trim();
  if (nivel) {
    cleanGrado = cleanGrado.replace(new RegExp(nivel, "gi"), "").trim();
  }
  cleanGrado = cleanGrado.replace(/inicial|primaria|secundaria/gi, "").trim();
  const displaySeccion = seccion ? ` "${seccion}"` : "";
  return `${cleanGrado}${displaySeccion}`;
};

export default function DireccionDescuentos({
  busquedaDescuento,
  setBusquedaDescuento,
  resultadosDescuento,
  infoPadron,
  buscandoDescuento,
  buscarEstudiantesDescuento,
  modalDescuentoAbierto,
  cerrarModalBeneficio,
  inscripcionSeleccionada,
  datosBeneficio,
  setDatosBeneficio,
  abrirModalBeneficio,
  guardarBeneficio,
  removerBeneficio,
}) {
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [historialRegistro, setHistorialRegistro] = useState<any>(null);
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);

  const handleAbrirHistorial = async (ins: any) => {
    const dni = ins.dni || ins.dniEstudiante;
    if (!dni) return;
    setHistorialRegistro(ins);
    setHistorialPagos([]);
    setHistorialAbierto(true);
    setHistorialCargando(true);
    try {
      const pagos = await obtenerHistorialAlumnoCaja(dni);
      setHistorialPagos(pagos);
    } catch (err) {
      console.error("Error al obtener historial:", err);
    } finally {
      setHistorialCargando(false);
    }
  };

  const handleCerrarHistorial = () => {
    setHistorialAbierto(false);
    setHistorialRegistro(null);
    setHistorialPagos([]);
    setHistorialCargando(false);
  };

  const checkEsPagoCompletado = (item: any) => {
    if (!item) return false;
    return ["pagado", "pago validado", "completado"].includes(String(item.estadoPago || "").toLowerCase().trim());
  };

  const obtenerIniciales = (nombre) => {
    const clean = String(nombre || "").trim().toUpperCase();
    if (!clean) return "?";
    const partes = clean.split(/\s+/);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`;
    }
    return clean.slice(0, 2);
  };

  // Validación y cálculo en tiempo real
  const costoOriginal = inscripcionSeleccionada
    ? Number(inscripcionSeleccionada.costoOriginal || inscripcionSeleccionada.costo || 0)
    : 0;
  const valorNum = Number(datosBeneficio.valor || 0);
  const esValorInvalido =
    datosBeneficio.tipo === "porcentaje"
      ? valorNum > 100 || (valorNum < 0 && datosBeneficio.valor !== "")
      : datosBeneficio.tipo === "monto"
        ? valorNum > costoOriginal || (valorNum < 0 && datosBeneficio.valor !== "")
        : false;

  const descuentoCalculado =
    datosBeneficio.tipo === "beca"
      ? costoOriginal
      : datosBeneficio.tipo === "porcentaje"
        ? (costoOriginal * Math.min(valorNum, 100)) / 100
        : datosBeneficio.tipo === "monto"
          ? Math.min(valorNum, costoOriginal)
          : 0;

  const costoFinalCalculado = Math.max(0, costoOriginal - descuentoCalculado);

  return (
    <section className="dir-descuentos-view" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <article className="dir-search-container" style={{ borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ marginBottom: "8px" }}>
          <h2 style={{ margin: 0, color: "#000000", fontSize: "16px", fontWeight: 800 }}>Autorización de Descuentos y Becas</h2>
        </div>

        <form onSubmit={buscarEstudiantesDescuento} className="dir-search-form">
          <TextInput
            placeholder="Ingrese DNI o nombre completo del estudiante..."
            value={busquedaDescuento}
            onChange={(e) => setBusquedaDescuento(e.target.value)}
            style={{ flex: 1 }}
            size="xs"
            leftSection={<Search size={14} />}
            styles={{
              input: {
                borderRadius: "6px",
                borderColor: "#cbd5e1",
                fontSize: "12px",
                height: "28px"
              }
            }}
          />
          <Button
            type="submit"
            loading={buscandoDescuento}
            size="xs"
            className="dir-search-btn"
          >
            Buscar Alumno
          </Button>
        </form>

        {resultadosDescuento.length > 0 ? (
          <div style={{ marginTop: "10px", borderTop: "1px solid #f1f5f9" }}>
            <div className="dir-table-wrap">
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr style={{ background: "#f8fafc" }}>
                    <Table.Th style={{ width: "24%" }}>Estudiante</Table.Th>
                    <Table.Th style={{ width: "12%" }}>DNI</Table.Th>
                    <Table.Th style={{ width: "14%" }}>Categoría</Table.Th>
                    <Table.Th style={{ width: "22%" }}>Taller / Programa</Table.Th>
                    <Table.Th style={{ textAlign: "right", width: "12%" }}>Costo Taller</Table.Th>
                    <Table.Th style={{ width: "14%" }}>Beneficio</Table.Th>
                    <Table.Th style={{ textAlign: "right", width: "12%" }}>Costo Final</Table.Th>
                    <Table.Th style={{ width: "10%" }}>Pago</Table.Th>
                    <Table.Th style={{ textAlign: "center", width: "12%" }}>Acción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {resultadosDescuento.map((ins) => {
                    const tieneDescuento = ins.descuentoAprobado;
                    const esPagoCompletado = ["pagado", "pago validado", "completado"].includes(String(ins.estadoPago || "").toLowerCase().trim());
                    const avatarClass = `alt-${(ins.estudiante || ins.nombresEstudiante || "").length % 5}`;

                    return (
                      <Table.Tr key={ins.id} className="dir-descuentos-row">
                        <Table.Td>
                          <div className="dir-student-avatar-cell">
                            <div className={`dir-student-avatar ${avatarClass}`}>
                              {obtenerIniciales(ins.estudiante || ins.nombresEstudiante)}
                            </div>
                            <div className="dir-student-name-container">
                              <span style={{ fontWeight: 500, color: "#000000", fontSize: "12px" }}>{ins.estudiante || ins.nombresEstudiante}</span>
                              <span style={{ fontSize: "10px" }}>Pre-inscrito</span>
                            </div>
                          </div>
                        </Table.Td>
                        <Table.Td style={{ fontWeight: 500, color: "#000000" }}>
                          {ins.dni || ins.dniEstudiante}
                        </Table.Td>
                        <Table.Td style={{ fontWeight: 500, color: "#000000", fontSize: "12px" }}>
                          {ins.categoria || "Extracurricular"}
                        </Table.Td>
                        <Table.Td>
                          <span style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>{ins.programa}</span>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }} className={tieneDescuento ? "dir-cost-original-td" : ""}>
                          {formatearSoles(ins.costoOriginal || ins.costo)}
                        </Table.Td>
                        <Table.Td>
                          {tieneDescuento ? (
                            <Badge
                              variant="filled"
                              className="dir-badge-discount"
                            >
                              {ins.descuentoTipo === "beca"
                                ? "Beca 100%"
                                : ins.descuentoTipo === "porcentaje"
                                  ? `-${ins.descuentoValor}%`
                                  : `-S/. ${ins.descuentoMonto}`}
                            </Badge>
                          ) : (
                            <span style={{ color: "#000000", fontSize: "13px", fontWeight: 500 }}>Ninguno</span>
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }} className={`dir-cost-final-td ${tieneDescuento ? "has-discount" : ""}`}>
                          {formatearSoles(ins.costo)}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="outline"
                            styles={{
                              root: {
                                fontWeight: 500,
                                fontSize: "11px",
                                height: "22px",
                                borderColor: esPagoCompletado ? "#000000" : "#cbd5e1",
                                color: esPagoCompletado ? "#000000" : "#475569",
                                backgroundColor: esPagoCompletado ? "#ffffff" : "#f1f5f9"
                              }
                            }}
                          >
                            {esPagoCompletado ? "Pagado" : "Pendiente"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <Button
                              size="xs"
                              variant="subtle"
                              color="teal"
                              onClick={() => handleAbrirHistorial(ins)}
                              title="Ver historial del alumno"
                              styles={{
                                root: {
                                  padding: "0 6px",
                                  height: "28px",
                                  minWidth: "auto",
                                  borderRadius: "4px"
                                }
                              }}
                            >
                              <Eye size={16} color="#0c8569" />
                            </Button>
                            
                            {esPagoCompletado ? (
                              <Button size="xs" variant="subtle" color="gray" disabled styles={{ root: { fontWeight: 500 } }}>
                                Ya pagado
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                variant={tieneDescuento ? "light" : "outline"}
                                className="dir-action-btn-descuento"
                                leftSection={tieneDescuento ? <Edit size={13} color="#000000" /> : <RosetteDiscount size={13} color="#000000" />}
                                onClick={() => abrirModalBeneficio(ins)}
                                styles={{
                                  root: {
                                    borderColor: "#000000",
                                    color: "#000000",
                                    backgroundColor: tieneDescuento ? "#f1f5f9" : "transparent",
                                    height: "28px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    borderRadius: "6px"
                                  }
                                }}
                              >
                                {tieneDescuento ? "Editar" : "Aplicar"}
                              </Button>
                            )}
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </div>
        ) : null}

        {infoPadron && infoPadron.length > 0 && (
          <div style={{ marginTop: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "15px" }}>
            <Alert
              icon={<InfoCircle size={18} />}
              title="Resultado del Padrón Institucional (Sin Taller Extracurricular)"
              color="orange"
              variant="light"
              styles={{
                title: { fontWeight: 700, fontSize: "13px", color: "#b45309" },
                message: { fontSize: "12px", color: "#78350f" },
                root: {
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fef3c7",
                  borderRadius: "8px",
                  padding: "16px"
                }
              }}
            >
              <Text size="xs" style={{ color: "#78350f", marginBottom: "12px", lineHeight: 1.4 }}>
                El estudiante está registrado oficialmente en el padrón del colegio, pero <strong>no tiene pre-inscripciones ni matrículas iniciadas</strong> en talleres extracurriculares durante este periodo.
              </Text>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {infoPadron.map((alumno: any) => (
                  <div 
                    key={alumno.dni} 
                    style={{ 
                      backgroundColor: "#ffffff", 
                      borderRadius: "6px", 
                      padding: "12px", 
                      border: "1px solid #fde68a",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <Text size="xs" style={{ color: "#6b7280", fontWeight: 600 }}>Nombres y Apellidos</Text>
                      <Text size="xs" style={{ fontWeight: 700, color: "#1f2937" }}>{alumno.nombres} {alumno.apellidos || ""}</Text>
                    </div>
                    <div>
                      <Text size="xs" style={{ color: "#6b7280", fontWeight: 600 }}>DNI / Código de Estudiante</Text>
                      <Text size="xs" style={{ fontWeight: 700, color: "#1f2937" }}>{alumno.dni} / {alumno.codigoEstudiante || "Sin Código"}</Text>
                    </div>
                    <div>
                      <Text size="xs" style={{ color: "#6b7280", fontWeight: 600 }}>Nivel de Educación</Text>
                      <Text size="xs" style={{ fontWeight: 700, color: "#1f2937" }}>{alumno.nivel || "No registrado"}</Text>
                    </div>
                    <div>
                      <Text size="xs" style={{ color: "#6b7280", fontWeight: 600 }}>Grado / Sección</Text>
                      <Text size="xs" style={{ fontWeight: 700, color: "#1f2937" }}>
                        {formatGradoSeccion(alumno.grado, alumno.seccion, alumno.nivel) || "No asignado"}
                      </Text>
                    </div>
                    {alumno.apoderado && (
                      <div style={{ gridColumn: "span 2" }}>
                        <Text size="xs" style={{ color: "#6b7280", fontWeight: 600 }}>Apoderado Registrado</Text>
                        <Text size="xs" style={{ color: "#1f2937", fontWeight: 650 }}>{alumno.apoderado} {alumno.telefonoApoderado ? `(Telf: ${alumno.telefonoApoderado})` : ""}</Text>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <Text size="xs" style={{ marginTop: "12px", fontStyle: "italic", color: "#b45309" }}>
                💡 Para poder aplicar un beneficio, primero debe registrar una pre-inscripción en el Módulo de Secretaría o Asistente.
              </Text>
            </Alert>
          </div>
        )}
      </article>

      {/* Modal para aplicar beneficio */}
      <Modal
        opened={modalDescuentoAbierto}
        onClose={cerrarModalBeneficio}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <RosetteDiscount size={16} color="#000000" />
            <strong style={{ fontSize: "14px", color: "#000000" }}>
              {datosBeneficio.tipo === "beca" ? "Aprobación de Beca Completa" : "Autorización de Descuento Especial"}
            </strong>
          </div>
        }
        size="md"
        centered
        radius="lg"
        styles={{
          header: {
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: "6px",
            marginBottom: "10px"
          },
          close: {
            color: "#94a3b8",
            "&:hover": {
              color: "#64748b",
              backgroundColor: "#f8fafc"
            }
          }
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {inscripcionSeleccionada && (
            <div className="dir-modal-student-card">
              <div className="dir-modal-student-avatar">
                {obtenerIniciales(inscripcionSeleccionada.estudiante || inscripcionSeleccionada.nombresEstudiante)}
              </div>
              <div className="dir-modal-student-details">
                <span className="label" style={{ color: "#000000" }}>Estudiante</span>
                <span className="name" style={{ color: "#000000" }}>{inscripcionSeleccionada.estudiante || inscripcionSeleccionada.nombresEstudiante}</span>
                <span className="sub" style={{ color: "#000000" }}>DNI: {inscripcionSeleccionada.dni || inscripcionSeleccionada.dniEstudiante}</span>
                <span className="sub" style={{ fontWeight: 500, color: "#000000", marginTop: "2px" }}>
                  Taller: {inscripcionSeleccionada.programa}
                </span>
                <span className="sub" style={{ fontWeight: 500, color: "#000000", display: "flex", gap: "6px" }}>
                  Costo Original: <span style={{ color: "#000000" }}>{formatearSoles(inscripcionSeleccionada.costoOriginal || inscripcionSeleccionada.costo)}</span>
                </span>
              </div>
            </div>
          )}

          <Select
            label="Tipo de Beneficio"
            data={[
              { value: "beca", label: "Beca Completa (100% descuento)" },
              { value: "monto", label: "Descuento de monto fijo (S/.)" },
              { value: "porcentaje", label: "Descuento porcentual (%)" },
            ]}
            value={datosBeneficio.tipo}
            onChange={(val) => setDatosBeneficio({ ...datosBeneficio, tipo: val || "beca", valor: "" })}
            allowDeselect={false}
            size="xs"
            styles={{
              label: { fontSize: "11px", fontWeight: 700, color: "#000000", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.03em" },
              input: { borderRadius: "6px", borderColor: "#cbd5e1", height: "28px" }
            }}
          />

          {datosBeneficio.tipo !== "beca" && (
            <TextInput
              label={datosBeneficio.tipo === "porcentaje" ? "Porcentaje de descuento (%)" : "Monto a descontar (S/.)"}
              placeholder={datosBeneficio.tipo === "porcentaje" ? "Ej. 50" : "Ej. 25"}
              value={datosBeneficio.valor}
              onChange={(e) => setDatosBeneficio({ ...datosBeneficio, valor: e.target.value })}
              type="number"
              min="0"
              required
              size="xs"
              styles={{
                label: { fontSize: "11px", fontWeight: 700, color: "#000000", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.03em" },
                input: { borderRadius: "6px", borderColor: "#cbd5e1", height: "28px" }
              }}
            />
          )}

          {/* Resumen de cálculo en tiempo real */}
          {inscripcionSeleccionada && (
            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginTop: "4px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                <span>Costo original:</span>
                <span style={{ fontWeight: 600, color: "#1f2937" }}>{formatearSoles(costoOriginal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                <span>Descuento aplicado:</span>
                <span style={{ fontWeight: 600, color: "#b91c1c" }}>
                  {descuentoCalculado > 0 ? `- ${formatearSoles(descuentoCalculado)}` : "S/ 0.00"}
                </span>
              </div>
              <Divider style={{ margin: "2px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                <span>Costo final a pagar:</span>
                <span style={{ color: "#166534" }}>{formatearSoles(costoFinalCalculado)}</span>
              </div>

              {esValorInvalido && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecdd3",
                  color: "#9f1239",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px"
                }}>
                  <AlertCircle size={14} />
                  <span>
                    {datosBeneficio.tipo === "porcentaje"
                      ? "El porcentaje de descuento no puede ser mayor al 100%."
                      : `El descuento no puede superar el costo original (${formatearSoles(costoOriginal)}).`}
                  </span>
                </div>
              )}
            </div>
          )}

          <Textarea
            label="Justificación / Motivo de Aprobación"
            placeholder="Ej. Convenio institucional, familiar directo de docente, beca socioeconómica..."
            value={datosBeneficio.justificacion}
            onChange={(e) => setDatosBeneficio({ ...datosBeneficio, justificacion: e.target.value })}
            rows={2}
            required
            size="xs"
            styles={{
              label: { fontSize: "11px", fontWeight: 700, color: "#000000", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.03em" },
              input: { borderRadius: "6px", borderColor: "#cbd5e1" }
            }}
          />

          <Divider style={{ margin: "6px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            {inscripcionSeleccionada?.descuentoAprobado ? (
              <Button
                variant="subtle"
                color="red"
                leftSection={<Trash size={14} />}
                onClick={removerBeneficio}
                loading={buscandoDescuento}
                styles={{
                  root: {
                    fontWeight: 600,
                    fontSize: "12.5px"
                  }
                }}
              >
                Retirar beneficio
              </Button>
            ) : (
              <div />
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="subtle" color="gray" onClick={cerrarModalBeneficio} styles={{ root: { fontWeight: 500 } }}>
                Cancelar
              </Button>
              <Button
                onClick={guardarBeneficio}
                loading={buscandoDescuento}
                disabled={esValorInvalido || !datosBeneficio.justificacion.trim() || (datosBeneficio.tipo !== "beca" && !datosBeneficio.valor)}
                size="xs"
                styles={{
                  root: {
                    borderRadius: "6px",
                    fontWeight: 600,
                    background: esValorInvalido ? "#94a3b8" : "#000000",
                    color: "#ffffff",
                    padding: "0 12px",
                    height: "28px"
                  }
                }}
              >
                Aprobar y Mandar a Caja
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Drawer para ver el Historial del Alumno */}
      <Drawer
        classNames={{ body: "caja-history-modal-body", header: "caja-modal-header", title: "caja-modal-title" }}
        onClose={handleCerrarHistorial}
        opened={historialAbierto}
        position="right"
        size="xl"
        title="Historial del alumno"
      >
        {historialRegistro ? (
          <div className="caja-history-panel">
            {/* Card 1: Datos del Alumno */}
            <div className="caja-history-card">
              <div className="caja-history-summary-banner-inner">
                <div className="caja-summary-left">
                  <div className="caja-summary-avatar">
                    {(historialRegistro.estudiante || historialRegistro.nombresEstudiante || "S").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="caja-summary-info">
                    <span className="caja-summary-label">Estudiante</span>
                    <h3 className="caja-summary-name">{historialRegistro.estudiante || historialRegistro.nombresEstudiante || "Sin nombre"}</h3>
                    <span className="caja-summary-sub">DNI: {historialRegistro.dni || historialRegistro.dniEstudiante || "Sin DNI"}</span>
                  </div>
                </div>
              </div>
              <div className="caja-history-card-body caja-details-grid">
                <CampoDetalle label="Grado / sección" value={[historialRegistro.grado || historialRegistro.gradoEstudiante, historialRegistro.seccion].filter(Boolean).join(" ")} />
                <CampoDetalle label="Apoderado" value={historialRegistro.apoderado || "-"} />
                <div className="caja-details-grid-span-2">
                  <CampoDetalle label="Teléfono de contacto" value={historialRegistro.telefono || "-"} />
                </div>
              </div>
            </div>

            {/* Card 2: Taller Disponible para el Alumno */}
            <div className="caja-history-card">
              <div className="caja-history-card-header">
                <Receipt size={16} className="caja-card-icon" />
                <span>Taller Disponible para el Alumno</span>
              </div>
              <div className="caja-history-card-body caja-details-grid">
                <div className="caja-details-grid-span-2">
                  <CampoDetalle label="Programa" value={historialRegistro.programa || "Sin programa"} strong />
                </div>
                <CampoDetalle label="Categoría" value={historialRegistro.categoria || "Extracurricular"} />
                <CampoDetalle label="Costo del Taller" value={formatearSoles(historialRegistro.costoOriginal || historialRegistro.costo)} strong />
                
                <CampoDetalle label="Estado de Pago" value={checkEsPagoCompletado(historialRegistro) ? "Pagado" : "Pendiente"} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gridColumn: "span 2", marginTop: "12px" }}>
                  {checkEsPagoCompletado(historialRegistro) ? (
                    <Button size="xs" variant="subtle" color="gray" disabled styles={{ root: { fontWeight: 500 } }}>
                      Ya pagado
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={historialRegistro.descuentoAprobado ? "light" : "outline"}
                      className="dir-action-btn-descuento"
                      leftSection={historialRegistro.descuentoAprobado ? <Edit size={14} color="#000000" /> : <RosetteDiscount size={14} color="#000000" />}
                      onClick={() => {
                        handleCerrarHistorial();
                        abrirModalBeneficio(historialRegistro);
                      }}
                      styles={{
                        root: {
                          borderColor: "#000000",
                          color: "#000000",
                          backgroundColor: historialRegistro.descuentoAprobado ? "#f1f5f9" : "transparent",
                          height: "36px",
                          borderRadius: "6px"
                        }
                      }}
                    >
                      {historialRegistro.descuentoAprobado ? "Editar Descuento" : "Aplicar Descuento / Beca"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Payments History List */}
            <div className="caja-history-list-section">
              <div className="caja-history-list-header">
                <div className="caja-history-list-title">
                  <History size={18} className="caja-card-icon" />
                  <span>Historial de Pagos</span>
                </div>
                <Badge color="gray" variant="light">
                  {historialCargando ? "..." : `${historialPagos.length} ${historialPagos.length === 1 ? "registro" : "registros"}`}
                </Badge>
              </div>

              {historialCargando ? (
                <div className="caja-history-empty">Cargando historial...</div>
              ) : historialPagos.length ? (
                <div className="caja-history-table-wrap">
                  <Table className="caja-history-table" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fecha</Table.Th>
                        <Table.Th>Programa</Table.Th>
                        <Table.Th className="text-right">Monto</Table.Th>
                        <Table.Th>Comprobante</Table.Th>
                        <Table.Th>Medio</Table.Th>
                        <Table.Th>Estado</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {historialPagos.map((item, index) => {
                        const estado = obtenerEstadoVisual(item);
                        return (
                          <Table.Tr key={item.id || item.pagoId || `${item.dniEstudiante}-${index}`}>
                            <Table.Td>{formatearFechaPeru(item.fecha || item.fechaPago || item.fechaRegistro)}</Table.Td>
                            <Table.Td>{item.programa || item.programaNombre || "Sin programa"}</Table.Td>
                            <Table.Td className="caja-amount text-right">{formatearSoles(item.monto)}</Table.Td>
                            <Table.Td>{item.nroRecibo || item.nro_recibo || "-"}</Table.Td>
                            <Table.Td>{item.formaPago || item.metodo || item.medioPago || "-"}</Table.Td>
                            <Table.Td>
                              <Badge color={estado.color} variant="light">{estado.texto}</Badge>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </div>
              ) : (
                <div className="caja-history-empty">No se encontraron pagos previos para este alumno.</div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
