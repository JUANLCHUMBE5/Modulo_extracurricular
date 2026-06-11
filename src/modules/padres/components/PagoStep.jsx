import { useEffect, useState } from "react";
import {
  IconClockHour4 as ClockHour4,
  IconCreditCard as CreditCard,
  IconLoader2 as Loader2,
  IconPhotoUp as PhotoUp,
  IconCircleCheck as CheckCircle2,
  IconRefresh as Refresh,
  IconBuildingBank as BuildingBank,
  IconDeviceMobile as DeviceMobile,
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
  onFinalizarPago,
  onReservarCupoCaja,
}) {
  const [referencia, setReferencia] = useState("");
  const [telefonoPago, setTelefonoPago] = useState("");
  const [captura, setCaptura] = useState(null);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [reintentandoPago, setReintentandoPago] = useState(false);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("web");
  const [segundos, setSegundos] = useState(5);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);

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
  const esReservadoCaja = Boolean(
    inscripcion?.derivadoCaja ||
    inscripcion?.estadoCaja === "reservado_caja" ||
    inscripcion?.estadoInscripcion === "Reserva pendiente" ||
    reservaConfirmada
  );

  const mostrarExito = esPagado || reservaConfirmada;

  useEffect(() => {
    if (!mostrarExito) return;
    const timer = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onFinalizarPago?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mostrarExito, onFinalizarPago]);

  async function realizarReservaCaja() {
    if (guardando) return;
    const exito = await onReservarCupoCaja?.();
    if (exito) {
      setReservaConfirmada(true);
      setSegundos(5);
    }
  }

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
            <div style={{ marginTop: "24px" }}>
              <button
                type="button"
                className="padres-flow-primary-button"
                onClick={onFinalizarPago}
                style={{
                  padding: "10px 24px",
                  background: "#166534",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "6px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                Volver al Panel Principal ({segundos}s)
              </button>
            </div>
          </section>
        </div>
      </article>
    );
  }

  if (esReservadoCaja) {
    return (
      <article className="padres-flow-panel padres-flow-payment-step">
        <div className="padres-flow-section-title">
          <div>
            <PortalBadge tone="orange">Cupo Reservado</PortalBadge>
            <h2>Pago Presencial en Caja Pendiente</h2>
            <p>
              Tu cupo ha sido reservado. Para confirmar la vacante, debes realizar el pago en la oficina de Caja del colegio.
            </p>
          </div>
        </div>

        <div className="padres-flow-payment-layout" style={{ display: "block" }}>
          <section className="padres-flow-pay-success" style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "24px",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            background: "#fffbeb",
            color: "#92400e",
            flexDirection: "column",
            textAlign: "center"
          }}>
            <BuildingBank size={40} style={{ color: "#d97706" }} />
            <div style={{ marginTop: "8px" }}>
              <strong style={{ fontSize: "17px", display: "block", fontWeight: 800 }}>
                {reservaConfirmada ? "¡Reserva de Vacante Registrada!" : "¡Reserva de Vacante Pendiente de Pago!"}
              </strong>
              <span style={{ fontSize: "14px", display: "block", color: "#78350f", marginTop: "6px", lineHeight: "1.5" }}>
                El cupo para el programa <b>{programa?.programa || programa?.nombre}</b> por el monto de <b>{monto}</b> ha sido reservado con estado <b>Pendiente de Pago</b>.
                <br />
                <br />
                <b>Indicaciones:</b> Acérquese a la oficina de Caja de la institución educativa para realizar el pago correspondiente y completar de manera definitiva su inscripción.
              </span>
            </div>
            <div style={{ marginTop: "24px" }}>
              <button
                type="button"
                className="padres-flow-primary-button"
                onClick={onFinalizarPago}
                style={{
                  padding: "10px 24px",
                  background: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "6px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                {reservaConfirmada ? `Volver al Panel Principal (${segundos}s)` : "Volver al Panel Principal"}
              </button>
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
      setErrorFormulario("Primero debe quedar registrada la inscripción de este taller.");
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

    if (!referencia.trim()) {
      setErrorFormulario("Por favor, ingrese el número de operación Yape.");
      return;
    }
    if (!telefonoPago.trim()) {
      setErrorFormulario("Por favor, ingrese el número de teléfono celular usado en Yape.");
      return;
    }
    if (!/^\d{9}$/.test(telefonoPago.trim())) {
      setErrorFormulario("El número de teléfono de Yape debe tener exactamente 9 dígitos.");
      return;
    }
    if (!captura?.base64) {
      setErrorFormulario("Por favor, adjunte la captura de pantalla del pago Yape.");
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

  /* Selector de método de pago */
  const tabsCaja = metodoSeleccionado === "caja";
  const tabsWeb = metodoSeleccionado === "web";

  /* Si el pago ya fue enviado (verificando/observado) forzamos la vista web */
  const forzarVistaWeb = pagoVerificando || pagoObservado;

  return (
    <article className="padres-flow-panel padres-flow-payment-step">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone={pagoVerificando ? "blue" : "orange"}>
            {pagoVerificando ? "Pago en proceso" : "Seleccione método de pago"}
          </PortalBadge>
          <h2>{pagoVerificando ? "Pago en proceso" : "Registrar pago"}</h2>
          <p>
            {pagoVerificando
              ? "El comprobante fue recibido. Caja validará la operación y el estado cambiará a pago exitoso una vez aprobado."
              : pagoObservado
                ? "El pago fue observado por Caja. Corrija la información y vuelva a enviar el comprobante."
                : "Escoja si desea pagar directamente en Caja o realizar el pago virtual por Yape."}
          </p>
        </div>
      </div>

      {/* Selector de método */}
      {!forzarVistaWeb && (
        <div className="padres-flow-payment-tabs" style={{
          display: "flex",
          gap: "0",
          marginBottom: "20px",
          borderRadius: "10px",
          overflow: "hidden",
          border: "2px solid #e2e8f0",
          background: "#f8fafc",
        }}>
          <button
            type="button"
            onClick={() => setMetodoSeleccionado("caja")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "14px 16px",
              border: "none",
              cursor: "pointer",
              fontWeight: tabsCaja ? 700 : 500,
              fontSize: "15px",
              background: tabsCaja
                ? "linear-gradient(135deg, #1e40af, #3b82f6)"
                : "transparent",
              color: tabsCaja ? "#fff" : "#64748b",
              transition: "all 0.25s ease",
              borderRight: "1px solid #e2e8f0",
            }}
          >
            <BuildingBank size={20} />
            Pagar en Caja
          </button>
          <button
            type="button"
            onClick={() => setMetodoSeleccionado("web")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "14px 16px",
              border: "none",
              cursor: "pointer",
              fontWeight: tabsWeb ? 700 : 500,
              fontSize: "15px",
              background: tabsWeb
                ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                : "transparent",
              color: tabsWeb ? "#fff" : "#64748b",
              transition: "all 0.25s ease",
            }}
          >
            <DeviceMobile size={20} />
            Pagar por Web (Virtual)
          </button>
        </div>
      )}

      {/* Vista: Pagar en Caja */}
      {tabsCaja && !forzarVistaWeb && (
        <div className="padres-flow-payment-layout" style={{ display: "block" }}>
          <section style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            padding: "32px 24px",
            border: "2px solid #bfdbfe",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            textAlign: "center",
          }}>
            <BuildingBank size={48} style={{ color: "#1d4ed8" }} />
            <div>
              <strong style={{ fontSize: "18px", display: "block", color: "#1e3a8a", fontWeight: 800 }}>
                Pago Presencial en Caja
              </strong>
              <p style={{ fontSize: "14px", color: "#1e40af", marginTop: "8px", lineHeight: 1.6 }}>
                Al seleccionar esta opción, su cupo quedará <b>reservado</b> con estado{" "}
                <span style={{
                  display: "inline-block",
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "2px 10px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "13px",
                }}>Pendiente de Pago</span>.
              </p>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#fff",
              padding: "14px 20px",
              borderRadius: "8px",
              border: "1px solid #93c5fd",
              width: "100%",
              maxWidth: "340px",
              justifyContent: "space-between",
            }}>
              <span style={{ color: "#475569", fontSize: "14px" }}>Monto a pagar:</span>
              <strong style={{ color: "#1e40af", fontSize: "20px" }}>{monto}</strong>
            </div>

            <button
              type="button"
              className="padres-flow-primary-button"
              onClick={realizarReservaCaja}
              disabled={guardando}
              style={{
                marginTop: "8px",
                padding: "12px 32px",
                background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "8px",
                fontSize: "15px",
                boxShadow: "0 4px 12px rgba(30,64,175,0.3)",
              }}
            >
              {guardando ? <Loader2 className="padres-spin" size={18} /> : <BuildingBank size={18} />}
              Reservar cupo — Pagar en Caja
            </button>
          </section>
        </div>
      )}

      {/* Vista: Pagar por Web (Yape) */}
      {(tabsWeb || forzarVistaWeb) && (
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
                  disabled={guardando}
                >
                  {guardando ? <Loader2 className="padres-spin" size={16} /> : pagoVerificando ? <ClockHour4 size={16} /> : <CreditCard size={16} />}
                  {textoBoton}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
