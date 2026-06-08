import { Button, Group, Modal, Text, Textarea } from "@mantine/core";
import {
  IconCheck as Check,
  IconX as X,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/cajaFormatters";

export default function CajaPagoWebModals({
  guardandoVerificacion,
  modalObservarAbierto,
  modalVerificacionAbierto,
  observacionTexto,
  onAprobarPagoWeb,
  onCerrarObservacion,
  onCerrarVerificacion,
  onRechazarPagoWeb,
  onSetObservacionTexto,
  onSolicitarObservacion,
  pagoVerificar,
}) {
  return (
    <>
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
                <strong>Celular de Operacion:</strong>
                <Text size="sm">{pagoVerificar.telefonoOperacion || "No ingresado"}</Text>
              </div>
              <div>
                <strong>Codigo de Operacion:</strong>
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
                <Text color="dimmed" size="sm">No se adjunto captura de pantalla de Yape.</Text>
              </div>
            )}

            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={onCerrarVerificacion}>
                Cerrar
              </Button>
              <Button
                color="red"
                leftSection={<X size={15} />}
                onClick={onSolicitarObservacion}
              >
                Observar / Rechazar
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

      <Modal
        centered
        opened={modalObservarAbierto}
        onClose={onCerrarObservacion}
        title="Observar / Rechazar Pago Web"
        size="md"
      >
        <div style={{ padding: 4 }}>
          <Text size="sm" mb={10} color="dimmed">
            Ingrese el motivo por el cual se esta rechazando u observando este pago. El apoderado podra ver este mensaje desde su portal para corregir el registro.
          </Text>
          <Textarea
            label="Motivo del rechazo"
            placeholder="Ej: El numero de operacion no coincide con el Yape recibido."
            required
            rows={4}
            value={observacionTexto}
            onChange={(event) => onSetObservacionTexto(event.currentTarget.value)}
          />
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={onCerrarObservacion}>
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
      </Modal>
    </>
  );
}
