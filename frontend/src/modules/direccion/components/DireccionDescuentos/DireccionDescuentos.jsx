import { TextInput, Button, Table, Badge, Modal, Select, Textarea, Divider } from "@mantine/core";
import {
  IconSearch as Search,
  IconRosetteDiscount as RosetteDiscount,
  IconEdit as Edit,
  IconAlertCircle as AlertCircle,
  IconTrash as Trash,
} from "@tabler/icons-react";
import { formatearSoles } from "../../utils/direccionFormatters";
import "./DireccionDescuentos.css";

export default function DireccionDescuentos({
  busquedaDescuento,
  setBusquedaDescuento,
  resultadosDescuento,
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
  const obtenerIniciales = (nombre) => {
    const clean = String(nombre || "").trim().toUpperCase();
    if (!clean) return "?";
    const partes = clean.split(/\s+/);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`;
    }
    return clean.slice(0, 2);
  };

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
                    <Table.Th style={{ width: "32%" }}>Estudiante</Table.Th>
                    <Table.Th style={{ width: "12%" }}>DNI</Table.Th>
                    <Table.Th style={{ width: "24%" }}>Taller / Programa</Table.Th>
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
                        <Table.Td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>{ins.programa}</span>
                            <span style={{ fontSize: "11px", color: "#000000", marginTop: "2px", fontWeight: 500 }}>{ins.categoria || "Extracurricular"}</span>
                          </div>
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
                        <Table.Td style={{ textAlign: "center" }}>
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
                                  backgroundColor: tieneDescuento ? "#f1f5f9" : "transparent"
                                }
                              }}
                            >
                              {tieneDescuento ? "Editar" : "Aplicar"}
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </div>
        ) : null}
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
              min="1"
              required
              size="xs"
              styles={{
                label: { fontSize: "11px", fontWeight: 700, color: "#000000", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.03em" },
                input: { borderRadius: "6px", borderColor: "#cbd5e1", height: "28px" }
              }}
            />
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
                size="xs"
                styles={{
                  root: {
                    borderRadius: "6px",
                    fontWeight: 600,
                    background: "#000000",
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
    </section>
  );
}
