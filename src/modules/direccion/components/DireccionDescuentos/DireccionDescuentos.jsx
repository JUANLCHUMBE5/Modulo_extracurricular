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
    <section className="dir-descuentos-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <article className="dir-search-container" style={{ borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ marginBottom: "20px" }}>
          <span className="dir-tag" style={{ background: "#e0f2fe", color: "#0369a1", marginBottom: "4px" }}>Finanzas</span>
          <h2 style={{ margin: 0, color: "#0c1a30", fontSize: "20px", fontWeight: 800 }}>Autorización de Descuentos y Becas</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>Consulte las pre-inscripciones activas por estudiante y asigne becas de estudio o descuentos especiales.</p>
        </div>

        <form onSubmit={buscarEstudiantesDescuento} className="dir-search-form">
          <TextInput
            placeholder="Ingrese DNI o nombre completo del estudiante..."
            value={busquedaDescuento}
            onChange={(e) => setBusquedaDescuento(e.target.value)}
            style={{ flex: 1 }}
            size="md"
            leftSection={<Search size={18} />}
            styles={{
              input: {
                borderRadius: "8px",
                borderColor: "#cbd5e1",
                fontSize: "14px",
                height: "46px"
              }
            }}
          />
          <Button
            color="teal"
            type="submit"
            loading={buscandoDescuento}
            size="md"
            styles={{
              root: {
                height: "46px",
                borderRadius: "8px",
                fontWeight: 700,
                padding: "0 24px",
                background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
              }
            }}
          >
            Buscar Alumno
          </Button>
        </form>

        {resultadosDescuento.length > 0 ? (
          <div style={{ marginTop: "20px", borderTop: "1px solid #f1f5f9" }}>
            <div className="dir-table-wrap">
              <Table striped highlightOnHover verticalSpacing="md">
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
                              <strong>{ins.estudiante || ins.nombresEstudiante}</strong>
                              <span>Pre-inscrito</span>
                            </div>
                          </div>
                        </Table.Td>
                        <Table.Td style={{ fontWeight: 650, color: "#475569" }}>
                          {ins.dni || ins.dniEstudiante}
                        </Table.Td>
                        <Table.Td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ fontSize: "13px", color: "#0c1a30" }}>{ins.programa}</strong>
                            <span className="dir-muted" style={{ fontSize: "11px", marginTop: "2px" }}>{ins.categoria || "Extracurricular"}</span>
                          </div>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }} className={tieneDescuento ? "dir-cost-original-td" : ""}>
                          {formatearSoles(ins.costoOriginal || ins.costo)}
                        </Table.Td>
                        <Table.Td>
                          {tieneDescuento ? (
                            <Badge
                              color={ins.descuentoTipo === "beca" ? "teal" : "blue"}
                              variant="filled"
                              className="dir-badge-discount"
                              style={{
                                background: ins.descuentoTipo === "beca"
                                  ? "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)"
                                  : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                              }}
                            >
                              {ins.descuentoTipo === "beca"
                                ? "Beca 100%"
                                : ins.descuentoTipo === "porcentaje"
                                  ? `-${ins.descuentoValor}%`
                                  : `-S/. ${ins.descuentoMonto}`}
                            </Badge>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 500 }}>Ninguno</span>
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }} className={`dir-cost-final-td ${tieneDescuento ? "has-discount" : ""}`}>
                          {formatearSoles(ins.costo)}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={esPagoCompletado ? "teal" : "orange"}
                            variant="light"
                            styles={{
                              root: {
                                fontWeight: 700,
                                fontSize: "11px",
                                height: "22px"
                              }
                            }}
                          >
                            {esPagoCompletado ? "Pagado" : "Pendiente"}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center" }}>
                          {esPagoCompletado ? (
                            <Button size="xs" variant="subtle" color="gray" disabled styles={{ root: { fontWeight: 600 } }}>
                              Ya pagado
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant={tieneDescuento ? "light" : "outline"}
                              color="teal"
                              className="dir-action-btn-descuento"
                              leftSection={tieneDescuento ? <Edit size={13} /> : <RosetteDiscount size={13} />}
                              onClick={() => abrirModalBeneficio(ins)}
                              styles={{
                                root: {
                                  borderColor: tieneDescuento ? "transparent" : "#0c8569",
                                  color: tieneDescuento ? "#0c8569" : "#0c8569",
                                  backgroundColor: tieneDescuento ? "#e6fcf5" : "transparent"
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
        ) : (
          <div className="dir-empty-state-card">
            <div className="dir-empty-state-icon-container" style={{
              background: busquedaDescuento ? "#fef2f2" : "#e6fcf5",
              color: busquedaDescuento ? "#ef4444" : "#0c8569",
              borderColor: busquedaDescuento ? "#fee2e2" : "#c3fae8"
            }}>
              {busquedaDescuento ? <AlertCircle size={36} /> : <RosetteDiscount size={36} />}
            </div>
            <h3>{busquedaDescuento ? "Sin resultados" : "Buscador de Alumnos"}</h3>
            <p>
              {busquedaDescuento
                ? `No se encontraron pre-inscripciones activas que coincidan con "${busquedaDescuento}". Asegúrese de escribir correctamente el DNI o nombres del alumno.`
                : "Ingrese el DNI o el nombre completo del estudiante en el cuadro de búsqueda para consultar las pre-inscripciones y aplicar becas o descuentos especiales."}
            </p>
            {!busquedaDescuento && (
              <div className="dir-empty-state-steps">
                <div className="dir-empty-state-step">
                  <span className="dir-empty-state-step-num">Paso 1</span>
                  <span className="dir-empty-state-step-text">Buscar estudiante</span>
                </div>
                <div className="dir-empty-state-step">
                  <span className="dir-empty-state-step-num">Paso 2</span>
                  <span className="dir-empty-state-step-text">Definir beneficio</span>
                </div>
                <div className="dir-empty-state-step">
                  <span className="dir-empty-state-step-num">Paso 3</span>
                  <span className="dir-empty-state-step-text">Enviar a Caja</span>
                </div>
              </div>
            )}
          </div>
        )}
      </article>

      {/* Modal para aplicar beneficio */}
      <Modal
        opened={modalDescuentoAbierto}
        onClose={cerrarModalBeneficio}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <RosetteDiscount size={22} color="#0c8569" />
            <strong style={{ fontSize: "16px", color: "#0c1a30" }}>
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
            paddingBottom: "12px",
            marginBottom: "16px"
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
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {inscripcionSeleccionada && (
            <div className="dir-modal-student-card">
              <div className="dir-modal-student-avatar">
                {obtenerIniciales(inscripcionSeleccionada.estudiante || inscripcionSeleccionada.nombresEstudiante)}
              </div>
              <div className="dir-modal-student-details">
                <span className="label">Estudiante</span>
                <span className="name">{inscripcionSeleccionada.estudiante || inscripcionSeleccionada.nombresEstudiante}</span>
                <span className="sub">DNI: {inscripcionSeleccionada.dni || inscripcionSeleccionada.dniEstudiante}</span>
                <span className="sub" style={{ fontWeight: 700, color: "#0c8569", marginTop: "2px" }}>
                  Taller: {inscripcionSeleccionada.programa}
                </span>
                <span className="sub" style={{ fontWeight: 800, color: "#0c1a30", display: "flex", gap: "6px" }}>
                  Costo Original: <span style={{ color: "#0c8569" }}>{formatearSoles(inscripcionSeleccionada.costoOriginal || inscripcionSeleccionada.costo)}</span>
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
            styles={{
              label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
              input: { borderRadius: "8px", borderColor: "#cbd5e1" }
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
              styles={{
                label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
                input: { borderRadius: "8px", borderColor: "#cbd5e1" }
              }}
            />
          )}

          <Textarea
            label="Justificación / Motivo de Aprobación"
            placeholder="Ej. Convenio institucional, familiar directo de docente, beca socioeconómica..."
            value={datosBeneficio.justificacion}
            onChange={(e) => setDatosBeneficio({ ...datosBeneficio, justificacion: e.target.value })}
            rows={3}
            required
            styles={{
              label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
              input: { borderRadius: "8px", borderColor: "#cbd5e1" }
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
                    fontWeight: 750,
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
              <Button variant="subtle" color="gray" onClick={cerrarModalBeneficio} styles={{ root: { fontWeight: 600 } }}>
                Cancelar
              </Button>
              <Button
                color="teal"
                onClick={guardarBeneficio}
                loading={buscandoDescuento}
                styles={{
                  root: {
                    borderRadius: "8px",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
                    padding: "0 16px"
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
