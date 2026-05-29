import {
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
} from "@tabler/icons-react";
import Campo from "./Campo";
import PortalBadge from "./PortalBadge";

export default function DatosApoderadoStep({
  actualizar,
  apoderadoBloqueado,
  form,
  guardando,
  guardarDatos,
  pasoDespuesDeGuardar = 3,
  setPasoActivo,
}) {
  async function manejarGuardarDatos(event) {
    event.preventDefault();
    const resultado = await guardarDatos();
    if (!resultado) return;
    const pasoDestino = typeof resultado === "object" && resultado.pasoDestino != null
      ? resultado.pasoDestino
      : pasoDespuesDeGuardar;
    setPasoActivo(pasoDestino);
  }

  return (
    <form className="padres-flow-panel padres-flow-step-panel" onSubmit={manejarGuardarDatos}>
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="blue">Datos del apoderado</PortalBadge>
          <h2>Confirme sus datos</h2>
          <p>Estos datos se usaran para la ficha, comunicacion y validacion del registro.</p>
        </div>
      </div>

      <div className="padres-flow-form-grid">
        <Campo
          label="Padre o apoderado"
          value={form.apoderado}
          onChange={(value) => actualizar("apoderado", value)}
          placeholder="Nombre completo"
          disabled={apoderadoBloqueado}
        />
        <Campo
          label="Teléfono de contacto"
          value={form.telefono}
          onChange={(value) => actualizar("telefono", value.replace(/\D/g, "").slice(0, 9))}
          placeholder="987654321"
          inputMode="numeric"
        />
        <Campo
          label="Correo para recibir el PDF (opcional)"
          value={form.correo}
          onChange={(value) => actualizar("correo", value)}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <label className="padres-flow-check">
        <input
          type="checkbox"
          checked={form.acepta}
          onChange={(event) => actualizar("acepta", event.target.checked)}
        />
        <span>Confirmo que los datos son correctos.</span>
      </label>

      <label className="padres-flow-check is-muted">
        <input
          type="checkbox"
          checked={Boolean(form.correo.trim()) && form.enviarPdfCorreo}
          disabled={!form.correo.trim()}
          onChange={(event) => actualizar("enviarPdfCorreo", event.target.checked)}
        />
        <span>
          {form.correo.trim()
            ? "Enviar al correo cuando el pago sea confirmado."
            : "Sin correo registrado: podra descargar el PDF despues del pago."}
        </span>
      </label>

      <div className="padres-flow-actions">
        <button className="padres-flow-secondary-button" type="button" onClick={() => setPasoActivo(1)}>
          Volver al comunicado
        </button>
        <button className="padres-flow-primary-button" type="submit" disabled={guardando}>
          {guardando ? <Loader2 className="padres-spin" size={16} /> : <ClipboardCheck size={16} />}
          Continuar al pago
        </button>
      </div>
    </form>
  );
}
