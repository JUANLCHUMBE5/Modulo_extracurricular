import { ActionIcon, Badge, Button, Group, Table, Tooltip } from "@mantine/core";
import {
  IconChartBar as ChartBar,
  IconReceipt2 as Receipt,
  IconEye,
  IconCheck,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../../services/dateService";
import { formatearSoles } from "../utils/cajaFormatters";
import {
  esPagoWebPadresCaja,
  esPagoWebPorVerificarCaja,
  obtenerMedioCanalWebCaja,
  obtenerTelefonoPagoWebCaja,
} from "../utils/cajaReportUtils";

export default function ReporteTabla({
  filas,
  onPagar,
  onValidarWebPago,
  onObservarWebPago,
  onRechazarWebPago,
  onVerCapturaWebPago,
}) {
  if (filas.length === 0) {
    return (
      <div className="caja-empty">
        <ChartBar size={28} />
        <strong>No hay datos para este reporte</strong>
        <span>Ajuste los filtros o revise si existen matriculas en Asistente/Padres.</span>
      </div>
    );
  }

  return (
    <div className="caja-table-wrap">
      <Table className="caja-table caja-report-table" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Estudiante</Table.Th>
            <Table.Th>Programa</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Pago</Table.Th>
            <Table.Th>Cod. operacion</Table.Th>
            <Table.Th>Telefono</Table.Th>
            <Table.Th>Medio / canal</Table.Th>
            <Table.Th>Fecha</Table.Th>
            {onPagar ? <Table.Th>Accion</Table.Th> : null}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filas.map((fila) => {
            const puedePagar = fila.estadoPago === "pendiente" && fila.inscripcionId && fila.puedePagarCaja;
            const esPagoWebVerificar = esPagoWebPorVerificarCaja(fila);
            const esObservado = fila.estadoPago === "observado";
            const esAnulado = fila.estadoPago === "anulado";

            let badgeColor = "yellow";
            let badgeText = "Pendiente";

            if (fila.estadoPago === "pagado") {
              badgeColor = "green";
              badgeText = "Pagado";
            } else if (esPagoWebVerificar) {
              badgeColor = "orange";
              badgeText = "Pago en Proceso";
            } else if (esObservado) {
              badgeColor = "red";
              badgeText = "Observado";
            } else if (esAnulado) {
              badgeColor = "red";
              badgeText = "Anulado";
            }

            return (
              <Table.Tr key={`${fila.id || fila.inscripcionId || fila.pagoId}-${fila.dniEstudiante}`}>
                <Table.Td>
                  <div className="caja-student-cell">
                    <strong>{fila.estudiante || "Sin nombre"}</strong>
                    <span>DNI {fila.dniEstudiante || "Sin DNI"}</span>
                  </div>
                </Table.Td>
                <Table.Td>{fila.programa || "Sin programa"}</Table.Td>
                <Table.Td className="caja-amount">{formatearSoles(fila.monto)}</Table.Td>
                <Table.Td>
                  <Badge color={badgeColor} variant="light">
                    {badgeText}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <span className={fila.numeroOperacion ? "caja-operation-code" : "caja-row-muted"}>
                    {fila.numeroOperacion || "-"}
                  </span>
                </Table.Td>
                <Table.Td>
                  <span className={esPagoWebPadresCaja(fila) || (["caja", "cajera"].includes(String(fila.origen || fila.origenRegistro || "").toLowerCase()) && fila.estadoPago === "pagado") ? "caja-phone-channel" : "caja-row-muted"}>
                    {obtenerTelefonoPagoWebCaja(fila)}
                  </span>
                </Table.Td>
                <Table.Td>
                  <span className={esPagoWebPadresCaja(fila) || (["caja", "cajera"].includes(String(fila.origen || fila.origenRegistro || "").toLowerCase()) && fila.estadoPago === "pagado") ? "caja-phone-channel" : "caja-row-muted"}>
                    {obtenerMedioCanalWebCaja(fila)}
                  </span>
                </Table.Td>
                <Table.Td>{formatearFechaPeru(fila.fecha || fila.fechaRegistro)}</Table.Td>
                {onPagar ? (
                  <Table.Td>
                    {esPagoWebVerificar ? (
                      <Group gap={6} wrap="nowrap">
                        <Tooltip label="Aprobar pago">
                          <ActionIcon
                            color="green"
                            onClick={() => onValidarWebPago?.(fila)}
                            size="sm"
                            variant="light"
                          >
                            <IconCheck size={15} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Observar pago">
                          <ActionIcon
                            color="orange"
                            onClick={() => onObservarWebPago?.(fila)}
                            size="sm"
                            variant="light"
                          >
                            <IconAlertTriangle size={15} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Rechazar pago">
                          <ActionIcon
                            color="red"
                            onClick={() => onRechazarWebPago?.(fila)}
                            size="sm"
                            variant="light"
                          >
                            <IconX size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    ) : puedePagar ? (
                      <Button
                        className="caja-pay-row-button"
                        leftSection={<Receipt size={15} />}
                        onClick={() => onPagar(fila)}
                        size="xs"
                        variant="light"
                      >
                        Pagar
                      </Button>
                    ) : (
                      <span className="caja-row-muted">
                        {fila.estadoPago === "pagado"
                          ? "Aprobado"
                          : fila.estadoPago === "observado"
                          ? "Observado"
                          : fila.estadoPago === "anulado"
                          ? "Anulado"
                          : "Listo"}
                      </span>
                    )}
                  </Table.Td>
                ) : null}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </div>
  );
}
