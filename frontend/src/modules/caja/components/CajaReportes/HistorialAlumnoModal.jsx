import { Badge, Drawer, Table } from "@mantine/core";
import { 
  IconUser, 
  IconReceipt, 
  IconHistory, 
  IconInfoCircle 
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../../../services/dateService";
import { formatearSoles } from "../../utils/cajaFormatters";
import {
  esPagoWebPorVerificarCaja,
  obtenerMedioCanalWebCaja,
  obtenerTelefonoPagoWebCaja,
} from "../../utils/cajaReportUtils";

function obtenerEstadoVisual(fila = {}) {
  if (fila.formaPago === "Egreso") return { color: "red", texto: "Egreso" };
  if (fila.estadoPago === "pagado" || fila.estado === "completado" || fila.estado === "validado") {
    return { color: "green", texto: "Pagado" };
  }
  if (esPagoWebPorVerificarCaja(fila) || fila.estadoPago === "verificando") {
    return { color: "orange", texto: "Pago en Proceso" };
  }
  if (fila.estadoPago === "observado" || fila.estado === "observado") return { color: "red", texto: "Observado" };
  if (fila.estadoPago === "anulado" || fila.estado === "anulado") return { color: "red", texto: "Anulado" };
  return { color: "yellow", texto: "Pendiente" };
}

function CampoDetalle({ label, value, strong = false }) {
  return (
    <div className="caja-history-field">
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>{value || "-"}</strong>
    </div>
  );
}

export default function HistorialAlumnoModal({
  historial = [],
  loading = false,
  onClose,
  opened,
  registro,
}) {
  const estadoActual = obtenerEstadoVisual(registro || {});

  return (
    <Drawer
      classNames={{ body: "caja-history-modal-body", header: "caja-modal-header", title: "caja-modal-title" }}
      onClose={onClose}
      opened={opened}
      position="right"
      size="xl"
      title="Historial del alumno"
    >
      {registro ? (
        <div className="caja-history-panel">
          {/* Summary Banner */}
          <div className="caja-history-summary-banner">
            <div className="caja-summary-left">
              <div className="caja-summary-avatar">
                {(registro.estudiante || "S").trim().charAt(0).toUpperCase()}
              </div>
              <div className="caja-summary-info">
                <span className="caja-summary-label">Estudiante</span>
                <h3 className="caja-summary-name">{registro.estudiante || "Sin nombre"}</h3>
                <span className="caja-summary-sub">DNI: {registro.dniEstudiante || "Sin DNI"}</span>
              </div>
            </div>
            <div className="caja-summary-right">
              <Badge color={estadoActual.color} variant="light" size="lg" className="caja-status-badge">
                {estadoActual.texto}
              </Badge>
            </div>
          </div>

          {/* Cards for Details */}
          <div className="caja-history-cards">
            {/* Card 1: Alumno */}
            <div className="caja-history-card">
              <div className="caja-history-card-header">
                <IconUser size={16} className="caja-card-icon" />
                <span>Datos del Alumno</span>
              </div>
              <div className="caja-history-card-body">
                <CampoDetalle label="Grado / sección" value={[registro.grado, registro.seccion].filter(Boolean).join(" ")} />
                <CampoDetalle label="Apoderado" value={registro.apoderado || "-"} />
                <CampoDetalle label="Teléfono de contacto" value={obtenerTelefonoPagoWebCaja(registro)} />
              </div>
            </div>

            {/* Card 2: Pago */}
            <div className="caja-history-card">
              <div className="caja-history-card-header">
                <IconReceipt size={16} className="caja-card-icon" />
                <span>Detalles del Pago</span>
              </div>
              <div className="caja-history-card-body">
                <CampoDetalle label="Programa" value={registro.programa || "Sin programa"} strong />
                <CampoDetalle label="Periodo" value={registro.periodo || "-"} />
                <CampoDetalle label="Monto pagado" value={formatearSoles(registro.monto)} strong />
                <CampoDetalle label="Fecha de registro" value={formatearFechaPeru(registro.fecha || registro.fechaRegistro)} />
                <CampoDetalle label="N° de comprobante" value={registro.nroRecibo || "-"} />
                <CampoDetalle label="Cod. operación" value={registro.numeroOperacion || "-"} />
                <CampoDetalle label="Medio de pago" value={obtenerMedioCanalWebCaja(registro)} />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {(registro.observaciones || registro.descuentoJustificacion) ? (
            <div className="caja-history-note">
              <IconInfoCircle size={18} className="caja-history-note-icon" />
              <div className="caja-history-note-content">
                <span>Observación / Justificación</span>
                <p>{registro.observaciones || registro.descuentoJustificacion}</p>
              </div>
            </div>
          ) : null}

          {/* Payments History List */}
          <div className="caja-history-list-section">
            <div className="caja-history-list-header">
              <div className="caja-history-list-title">
                <IconHistory size={18} className="caja-card-icon" />
                <span>Historial de Pagos</span>
              </div>
              <Badge color="gray" variant="light">
                {loading ? "..." : `${historial.length} ${historial.length === 1 ? "registro" : "registros"}`}
              </Badge>
            </div>

            {loading ? (
              <div className="caja-history-empty">Cargando historial...</div>
            ) : historial.length ? (
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
                    {historial.map((item, index) => {
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
  );
}

