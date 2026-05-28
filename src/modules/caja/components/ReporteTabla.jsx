import { Badge, Button, Table } from "@mantine/core";
import {
  IconChartBar as ChartBar,
  IconReceipt2 as Receipt,
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../../services/dateService";
import { formatearSoles } from "../utils/cajaFormatters";

export default function ReporteTabla({ filas, onPagar }) {
  if (filas.length === 0) {
    return (
      <div className="caja-empty">
        <ChartBar size={28} />
        <strong>No hay datos para este reporte</strong>
        <span>Ajuste los filtros o revise si existen matriculas en Secretaria/Padres.</span>
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
            <Table.Th>Medio</Table.Th>
            <Table.Th>Origen</Table.Th>
            <Table.Th>Fecha</Table.Th>
            {onPagar ? <Table.Th>Accion</Table.Th> : null}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filas.map((fila) => {
            const puedePagar = fila.estadoPago === "pendiente" && fila.inscripcionId;
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
                  <Badge color={fila.estadoPago === "pagado" ? "green" : fila.estadoPago === "anulado" ? "red" : "yellow"} variant="light">
                    {fila.estadoPago === "pagado" ? "Pagado" : fila.estadoPago === "anulado" ? "Anulado" : "Pendiente"}
                  </Badge>
                </Table.Td>
                <Table.Td>{fila.formaPago || "Sin pago"}</Table.Td>
                <Table.Td>{fila.origen || "Sin origen"}</Table.Td>
                <Table.Td>{formatearFechaPeru(fila.fecha || fila.fechaRegistro)}</Table.Td>
                {onPagar ? (
                  <Table.Td>
                    {puedePagar ? (
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
                      <span className="caja-row-muted">Listo</span>
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
