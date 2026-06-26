import { Button, Group, Modal, Text, Textarea } from "@mantine/core";
import {
  IconCheck as Check,
  IconX as X,
  IconAlertTriangle as AlertTriangle,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/cajaFormatters";

function DetallePagoYape({ pago, formatearSoles }) {
  if (!pago) return null;
  return (
    <div style={{ background: "#fafafa", padding: 14, borderRadius: 8, border: "1px solid #eaeaea" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <Text size="xs" color="dimmed">Código de operación:</Text>
          <Text size="sm" fw="bold">{pago.numeroOperacion || pago.referenciaPago || "-"}</Text>
        </div>
        <div>
          <Text size="xs" color="dimmed">Teléfono Yape:</Text>
          <Text size="sm" fw="bold">{pago.telefonoOperacion || "-"}</Text>
        </div>
        <div>
          <Text size="xs" color="dimmed">Estudiante:</Text>
          <Text size="sm">{pago.estudiante || pago.estudianteNombre || "-"}</Text>
        </div>
        <div>
          <Text size="xs" color="dimmed">Programa / Monto:</Text>
          <Text size="sm">{pago.programa || pago.programaNombre || "-"} ({formatearSoles(pago.monto)})</Text>
        </div>
      </div>
      {pago.capturaPagoBase64 && (
        <div style={{ textAlign: "center", borderTop: "1px dashed #e0e0e0", paddingTop: 10 }}>
          <Text size="xs" color="dimmed" mb={4}>Captura de pantalla Yape:</Text>
          <img
            src={pago.capturaPagoBase64}
            alt="Captura Yape"
            style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4 }}
          />
        </div>
      )}
    </div>
  );
}

export default function CajaPagoWebModals({
  guardandoVerificacion,
  modalObservarAbierto,
  modalRechazarAbierto,
  modalVerificacionAbierto,
  observacionTexto,
  rechazoTexto,
  onAprobarPagoWeb,
  onCerrarObservacion,
  onCerrarRechazo,
  onCerrarVerificacion,
  onRechazarPagoWeb,
  onObservarPagoWeb,
  onSetObservacionTexto,
  onSetRechazoTexto,
  onSolicitarObservacion,
  onSolicitarRechazo,
  pagoVerificar,
}) {
  return (
    <>
      {/* 1. Modal de Verificación General */}
      <Modal
        centered
        opened={modalVerificacionAbierto}
        onClose={onCerrarVerificacion}
        title="Verificar Pago Web (Yape)"
        size="lg"
      >
        {pagoVerificar ? (
          <div className="caja-verification-details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 15 }}>
              <div>
                <strong>Estudiante:</strong>
                <Text size="sm">{pagoVerificar.estudiante || pagoVerificar.estudianteNombre}</Text>
              </div>
              <div>
                <strong>DNI:</strong>
                <Text size="sm">{pagoVerificar.dniEstudiante || pagoVerificar.estudianteDni}</Text>
              </div>
              <div>
                <strong>Programa:</strong>
                <Text size="sm">{pagoVerificar.programa || pagoVerificar.programaNombre}</Text>
              </div>
              <div>
                <strong>Monto del Programa:</strong>
                <Text size="sm" fw="bold" color="green">{formatearSoles(pagoVerificar.monto)}</Text>
              </div>
              <div>
                <strong>Celular de Operación:</strong>
                <Text size="sm">{pagoVerificar.telefonoOperacion || "No ingresado"}</Text>
              </div>
              <div>
                <strong>Código de Operación:</strong>
                <Text size="sm" fw="bold">{pagoVerificar.numeroOperacion || pagoVerificar.referenciaPago}</Text>
              </div>
            </div>

            {pagoVerificar.capturaPagoBase64 ? (
              <div style={{ marginTop: 15, border: "1px solid #eaeaea", borderRadius: 8, padding: 8, textAlign: "center" }}>
                <Text size="xs" color="dimmed" mb={4}>Captura de pantalla Yape:</Text>
                <img
                  src={pagoVerificar.capturaPagoBase64}
                  alt="Captura Yape"
                  style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 4 }}
                />
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", background: "#f9f9f9", borderRadius: 8 }}>
                <Text color="dimmed" size="sm">No se adjuntó captura de pantalla de Yape.</Text>
              </div>
            )}

            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={onCerrarVerificacion}>
                Cerrar
              </Button>
              <Button
                color="red"
                leftSection={<X size={15} />}
                onClick={onSolicitarRechazo}
              >
                Rechazar
              </Button>
              <Button
                color="orange"
                leftSection={<AlertTriangle size={15} />}
                onClick={onSolicitarObservacion}
              >
                Observar
              </Button>
              <Button
                color="green"
                leftSection={<Check size={15} />}
                loading={guardandoVerificacion}
                onClick={onAprobarPagoWeb}
              >
                Aprobar Pago
              </Button>
            </Group>
          </div>
        ) : null}
      </Modal>

      {/* 2. Modal de Observación con Detalles de Yape */}
      <Modal
        centered
        opened={modalObservarAbierto}
        onClose={onCerrarObservacion}
        title="Observar Pago Web (Yape)"
        size="lg"
      >
        {pagoVerificar ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 15 }}>
            <DetallePagoYape pago={pagoVerificar} formatearSoles={formatearSoles} />

            <div>
              <Text size="sm" mb={10} color="dimmed">
                Ingrese el motivo de la observación. El apoderado podrá ver este mensaje desde su portal para corregir el comprobante.
              </Text>
              <Textarea
                label="Observaciones"
                placeholder="Ej: El número de operación no coincide con el Yape recibido."
                required
                rows={3}
                value={observacionTexto}
                onChange={(event) => onSetObservacionTexto(event.currentTarget.value)}
              />
            </div>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onCerrarObservacion}>
                Cancelar
              </Button>
              <Button
                color="orange"
                loading={guardandoVerificacion}
                onClick={onObservarPagoWeb}
              >
                Observar y notificar
              </Button>
            </Group>
          </div>
        ) : null}
      </Modal>

      {/* 3. Modal de Rechazo Completo con Detalles de Yape */}
      <Modal
        centered
        opened={modalRechazarAbierto}
        onClose={onCerrarRechazo}
        title="Rechazar Pago Web (Yape)"
        size="lg"
      >
        {pagoVerificar ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 15 }}>
            <DetallePagoYape pago={pagoVerificar} formatearSoles={formatearSoles} />

            <div>
              <Text size="sm" mb={10} color="dimmed">
                Ingrese el motivo por el cual está rechazando este pago. Se anulará este registro y el estudiante volverá al estado "Pendiente de pago" para realizar el cobro de nuevo.
              </Text>
              <Textarea
                label="Motivo del rechazo"
                placeholder="Ej: El comprobante adjunto corresponde a otra institución."
                required
                rows={4}
                value={rechazoTexto}
                onChange={(event) => onSetRechazoTexto(event.currentTarget.value)}
              />
            </div>

            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={onCerrarRechazo}>
                Cancelar
              </Button>
              <Button
                color="red"
                loading={guardandoVerificacion}
                onClick={onRechazarPagoWeb}
              >
                Rechazar y notificar
              </Button>
            </Group>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
