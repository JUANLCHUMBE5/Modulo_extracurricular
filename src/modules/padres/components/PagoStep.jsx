import { useState } from "react";
import {
  IconClockHour4 as ClockHour4,
  IconCreditCard as CreditCard,
  IconLoader2 as Loader2,
  IconPhotoUp as PhotoUp,
  IconCircleCheck as CheckCircle2,
  IconRefresh as Refresh,
} from "@tabler/icons-react";
import { formatearSoles } from "../hooks/usePadres";
import PortalBadge from "./PortalBadge";

const PAGO_QR_SRC = "/PAGO_QR.jpg";

function esPagoEnVerificacion(inscripcion, pagoConfirmado) {
  const estadoInscripcion = normalizarTexto(inscripcion?.estadoInscripcion);
  const pagoCorresponde = Boolean(
    pagoConfirmado?.inscripcionId &&
    inscripcion?.id &&
    pagoConfirmado.inscripcionId === inscripcion.id
  );
  const tienePagoRegistrado = Boolean(inscripcion?.pagoId || pagoCorresponde);
  const estadoPago = normalizarTexto([
    pagoCorresponde ? pagoConfirmado?.estado : "",
    pagoCorresponde ? pagoConfirmado?.estadoPago : "",
    pagoCorresponde ? pagoConfirmado?.estadoVerificacion : "",
    inscripcion?.estadoPago,
    inscripcion?.estadoInscripcion,
  ].filter(Boolean).join(" "));
  if (["observado", "observada", "rechazado", "rechazada", "no coincide"].some((item) => estadoPago.includes(item))) return false;
  return tienePagoRegistrado && (estadoInscripcion.includes("verificacion") ||
    estadoInscripcion.includes("validacion") ||
    estadoPago.includes("verificando") ||
    estadoPago.includes("por verificar") ||
    estadoPago.includes("validacion"));
}

function esPagoObservado(inscripcion, pagoConfirmado) {
  const pagoCorresponde = Boolean(
    pagoConfirmado?.inscripcionId &&
    inscripcion?.id &&
    pagoConfirmado.inscripcionId === inscripcion.id
  );
  const texto = normalizarTexto([
    pagoCorresponde ? pagoConfirmado?.estado : "",
    pagoCorresponde ? pagoConfirmado?.estadoPago : "",
    pagoCorresponde ? pagoConfirmado?.estadoVerificacion : "",
    pagoCorresponde ? pagoConfirmado?.observaciones : "",
    inscripcion?.estadoPago,
    inscripcion?.estadoInscripcion,
    inscripcion?.pagoObservacionCaja,
  ].filter(Boolean).join(" "));

  return ["observado", "observada", "rechazado", "rechazada", "no coincide"].some((item) => texto.includes(item));
}

function obtenerMotivoPagoObservado(inscripcion, pagoConfirmado) {
  return (
    inscripcion?.pagoObservacionCaja ||
    pagoConfirmado?.observaciones ||
    pagoConfirmado?.observacion ||
    "El pago fue observado por Cajera. Revise el numero de operacion, telefono y captura antes de volver a enviarlo."
  );
}

function esPagoAprobado(inscripcion, pagoConfirmado) {
  const pagoCorresponde = Boolean(
    pagoConfirmado?.inscripcionId &&
    inscripcion?.id &&
    pagoConfirmado.inscripcionId === inscripcion.id
  );
  const texto = normalizarTexto([
    pagoCorresponde ? pagoConfirmado?.estado : "",
    pagoCorresponde ? pagoConfirmado?.estadoVerificacion : "",
    inscripcion?.estadoPago,
    inscripcion?.estadoInscripcion,
  ].filter(Boolean).join(" "));

  return ["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item));
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
  const [reintentandoPago, setReintentandoPago] = useState(false);

  const montoBase = Number(inscripcion?.costo ?? programa?.costo ?? 0);
  const monto = programa && (inscripcion || infoProgramaAceptada) ? formatearSoles(montoBase) : "S/ 0.00";
  const pagoListo = Boolean(programa && (infoProgramaAceptada || inscripcion) && datosConfirmados);
  const pagoVerificando = esPagoEnVerificacion(inscripcion, pagoConfirmado);
  const pagoObservado = esPagoObservado(inscripcion, pagoConfirmado);
  const mostrarFormularioPago = !pagoVerificando && (!pagoObservado || reintentandoPago);
  const motivoPagoObservado = obtenerMotivoPagoObservado(inscripcion, pagoConfirmado);
  const formularioPagoCompleto = Boolean(
    referencia.trim() &&
    /^\d{9}$/.test(telefonoPago.trim()) &&
    captura?.base64
  );
  const puedeEnviarVerificacion = Boolean(inscripcion && pagoListo && mostrarFormularioPago && !requiereCaja && formularioPagoCompleto);
  const textoBoton = pagoVerificando
    ? "Pago pendiente de verificacion"
    : "Guardar pago";

  const esPagado = esPagoAprobado(inscripcion, pagoConfirmado);

  if (esPagado) {
    return (
      <article className="padres-flow-panel padres-flow-payment-step">
        <div className="padres-flow-section-title">
          <div>
            <PortalBadge tone="green">Inscripción Completada</PortalBadge>
            <h2>Pago registrado y aprobado</h2>
            <p>
              Tu pago ha sido validado correctamente por la institución.
            </p>
          </div>
        </div>

        <div className="padres-flow-payment-layout" style={{ display: "block" }}>
          <section className="padres-flow-pay-success" style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "24px",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            background: "#f0fdf4",
            color: "#166534",
            flexDirection: "column",
            textAlign: "center"
          }}>
            <CheckCircle2 size={40} style={{ color: "#15803d" }} />
            <div style={{ marginTop: "8px" }}>
              <strong style={{ fontSize: "17px", display: "block", fontWeight: 800 }}>¡Inscripción y Pago Confirmados!</strong>
              <span style={{ fontSize: "14px", display: "block", color: "#14532d", marginTop: "6px", lineHeight: "1.5" }}>
                El pago para el programa <b>{programa?.programa || programa?.nombre}</b> por el monto de <b>{monto}</b> ha sido validado y aprobado exitosamente por el área de Cajera. 
                El estudiante se encuentra debidamente inscrito.
              </span>
            </div>
          </section>
        </div>
      </article>
    );
  }

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

    if (!inscripcion) {
      setErrorFormulario("Primero debe quedar registrada la inscripcion de este taller.");
      return;
    }
    if (!datosConfirmados) {
      setErrorFormulario("Confirme los datos del apoderado antes de enviar el pago.");
      return;
    }
    if (requiereCaja) {
      setErrorFormulario("Este registro debe revisarse directamente en Cajera.");
      return;
    }
    if (!puedeEnviarVerificacion) return;
    if (!referencia.trim()) {
      setErrorFormulario("Ingrese el numero de operacion de Yape.");
      return;
    }
    if (!/^\d{9}$/.test(telefonoPago.trim())) {
      setErrorFormulario("Ingrese el telefono usado en Yape con 9 digitos.");
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
    setReintentandoPago(false);
  }

  function volverAIntentarPago() {
    setReferencia("");
    setTelefonoPago("");
    setCaptura(null);
    setArchivoNombre("");
    setErrorFormulario("");
    setReintentandoPago(true);
  }

  return (
    <article className="padres-flow-panel padres-flow-payment-step">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone={pagoVerificando ? "blue" : "orange"}>Pago por Yape</PortalBadge>
          <h2>{pagoVerificando ? "Pago pendiente de verificacion" : "Registrar pago"}</h2>
          <p>
            {pagoVerificando
              ? "El comprobante fue recibido. Cajera validara la operacion y actualizara el estado cuando corresponda."
              : pagoObservado
                ? "El pago fue observado por Cajera. Corrija la informacion y vuelva a enviar el comprobante."
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
            <span>{pagoVerificando || pagoObservado ? "Estado" : "Monto"}</span>
            <strong>{pagoVerificando ? "Pendiente" : pagoObservado ? "Observado" : monto}</strong>
            <p>
              {pagoVerificando
                ? "El pago queda pendiente hasta que el colegio valide la operacion."
                : pagoObservado
                  ? "Vuelva a ingresar el numero de operacion, telefono y captura correcta."
                : "Despues de pagar, suba la captura y registre el numero de operacion de Yape."}
            </p>
          </div>

          {pagoObservado && !reintentandoPago ? (
            <section className="padres-flow-payment-error" role="alert">
              <strong>Pago observado por Cajera.</strong>{" "}
              <span>{motivoPagoObservado}</span>
            </section>
          ) : null}

          {pagoObservado && !reintentandoPago ? (
            <section className="padres-flow-pay-pending">
              <Refresh size={18} />
              <div>
                <strong>Vuelva a intentarlo</strong>
                <span>Ingrese nuevamente el numero de operacion, telefono usado en Yape y la captura correcta.</span>
              </div>
            </section>
          ) : null}

          {mostrarFormularioPago ? (
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
                  placeholder="Ej: 987654321"
                  required
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
                <span>La captura y el numero de operacion ya fueron enviados. Cajera confirmara el pago.</span>
              </div>
            </section>
          ) : null}

          <div className="padres-flow-actions">
            {pagoObservado && !reintentandoPago ? (
              <button
                className="padres-flow-primary-button"
                onClick={volverAIntentarPago}
                type="button"
              >
                <Refresh size={16} />
                Volver a intentarlo
              </button>
            ) : (
              <button
                className="padres-flow-primary-button"
                type="submit"
                disabled={guardando || !puedeEnviarVerificacion}
              >
                {guardando ? <Loader2 className="padres-spin" size={16} /> : pagoVerificando ? <ClockHour4 size={16} /> : <CreditCard size={16} />}
                {textoBoton}
              </button>
            )}
          </div>
        </form>
      </div>
    </article>
  );
}
