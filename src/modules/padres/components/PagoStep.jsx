import { useState } from "react";
import {
  IconClockHour4 as ClockHour4,
  IconCreditCard as CreditCard,
  IconLoader2 as Loader2,
  IconPhotoUp as PhotoUp,
} from "@tabler/icons-react";
import { formatearSoles } from "../hooks/usePadres";
import PortalBadge from "./PortalBadge";

const PAGO_QR_SRC = "/PAGO_QR.jpg";

function esPagoEnVerificacion(inscripcion, pagoConfirmado) {
  const estadoInscripcion = normalizarTexto(inscripcion?.estadoInscripcion);
  const estadoPago = normalizarTexto(pagoConfirmado?.estado || inscripcion?.estadoPago);
  return estadoInscripcion.includes("verificacion") || estadoPago.includes("verificando");
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la captura del pago."));
    reader.readAsDataURL(file);
  });
}

export default function PagoStep({
  datosConfirmados,
  guardando,
  infoProgramaAceptada,
  inscripcion,
  manejarAccionPago,
  pagoConfirmado,
  programa,
  requiereCaja,
}) {
  const [referencia, setReferencia] = useState("");
  const [telefonoPago, setTelefonoPago] = useState("");
  const [captura, setCaptura] = useState(null);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");

  const monto = programa && (inscripcion || infoProgramaAceptada) ? formatearSoles(programa.costo) : "S/ 0.00";
  const pagoListo = Boolean(programa && infoProgramaAceptada && datosConfirmados);
  const pagoVerificando = esPagoEnVerificacion(inscripcion, pagoConfirmado);
  const puedeEnviarVerificacion = Boolean(inscripcion && pagoListo && !pagoVerificando && !requiereCaja);
  const textoBoton = pagoVerificando
    ? "Pago pendiente de verificacion"
    : "Guardar pago";

  async function manejarArchivo(event) {
    const file = event.target.files?.[0];
    setErrorFormulario("");

    if (!file) {
      setCaptura(null);
      setArchivoNombre("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorFormulario("Adjunte una imagen de la captura del pago.");
      setCaptura(null);
      setArchivoNombre("");
      return;
    }

    const base64 = await leerArchivoComoBase64(file);
    setCaptura({
      nombre: file.name,
      tipo: file.type,
      base64,
    });
    setArchivoNombre(file.name);
  }

  async function enviarPago(event) {
    event.preventDefault();
    setErrorFormulario("");

    if (!puedeEnviarVerificacion) return;
    if (!referencia.trim()) {
      setErrorFormulario("Ingrese el numero de operacion de Yape.");
      return;
    }
    if (!captura?.base64) {
      setErrorFormulario("Adjunte la captura de pantalla del pago.");
      return;
    }

    await manejarAccionPago({
      referencia: referencia.trim(),
      telefono: telefonoPago.trim(),
      captura,
    });
  }

  return (
    <article className="padres-flow-panel padres-flow-payment-step">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone={pagoVerificando ? "blue" : "orange"}>Pago por Yape</PortalBadge>
          <h2>{pagoVerificando ? "Pago pendiente de verificacion" : "Registrar pago"}</h2>
          <p>
            {pagoVerificando
              ? "El comprobante fue recibido. Caja validara la operacion y actualizara el estado cuando corresponda."
              : "Por ahora solo se acepta pago por Yape. Ingrese el numero de operacion y adjunte la captura."}
          </p>
        </div>
      </div>

      <div className="padres-flow-payment-layout">
        <section className="padres-flow-yape-card" aria-label="QR de pago Yape">
          <span>Metodo aceptado</span>
          <strong>Yape</strong>
          <img src={PAGO_QR_SRC} alt="QR de pago Yape del colegio" />
          <p>Monto a pagar: <b>{monto}</b></p>
        </section>

        <form className="padres-flow-payment-form" onSubmit={enviarPago}>
          <div className="padres-flow-payment-box">
            <span>{pagoVerificando ? "Estado" : "Monto"}</span>
            <strong>{pagoVerificando ? "Pendiente" : monto}</strong>
            <p>
              {pagoVerificando
                ? "El pago queda pendiente hasta que el colegio valide la operacion."
                : "Despues de pagar, suba la captura y registre el numero de operacion de Yape."}
            </p>
          </div>

          {!pagoVerificando ? (
            <div className="padres-flow-payment-fields">
              <label>
                <span>Numero de operacion Yape</span>
                <input
                  value={referencia}
                  onChange={(event) => setReferencia(event.target.value)}
                  placeholder="Ej: 123456789"
                  required
                />
              </label>

              <label>
                <span>Telefono usado en Yape</span>
                <input
                  inputMode="numeric"
                  value={telefonoPago}
                  onChange={(event) => setTelefonoPago(event.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="Opcional"
                />
              </label>

              <label className="padres-flow-upload-box">
                <PhotoUp size={19} />
                <span>{archivoNombre || "Subir captura del pago"}</span>
                <input type="file" accept="image/*" onChange={manejarArchivo} />
              </label>
            </div>
          ) : null}

          {errorFormulario ? <p className="padres-flow-payment-error">{errorFormulario}</p> : null}

          {pagoVerificando ? (
            <section className="padres-flow-pay-pending">
              <ClockHour4 size={18} />
              <div>
                <strong>Pago pendiente de verificacion</strong>
                <span>La captura y el numero de operacion ya fueron enviados. Caja confirmara el pago.</span>
              </div>
            </section>
          ) : null}

          <div className="padres-flow-actions">
            <button
              className="padres-flow-primary-button"
              type="submit"
              disabled={guardando || !puedeEnviarVerificacion}
            >
              {guardando ? <Loader2 className="padres-spin" size={16} /> : pagoVerificando ? <ClockHour4 size={16} /> : <CreditCard size={16} />}
              {textoBoton}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
