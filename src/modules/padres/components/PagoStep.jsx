import {
  IconCircleCheck as CheckCircle2,
  IconCreditCard as CreditCard,
  IconLoader2 as Loader2,
} from "@tabler/icons-react";
import { formatearSoles } from "../hooks/usePadres";
import PortalBadge from "./PortalBadge";

function cn(...items) {
  return items.filter(Boolean).join(" ");
}

function esPagoRegistrado(valor) {
  const texto = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (texto.includes("pendiente")) return false;
  return ["pagado", "validado", "completado"].some((estado) => texto.includes(estado));
}

export default function PagoStep({
  datosConfirmados,
  guardando,
  infoProgramaAceptada,
  inscripcion,
  invitacionPendiente,
  manejarAccionPago,
  pagarSimuladoPadres,
  pagoConfirmado,
  pasoVisible,
  programa,
  requiereCaja,
  setPasoActivo,
}) {
  const monto = programa && (inscripcion || infoProgramaAceptada) ? formatearSoles(programa.costo) : "S/ 0.00";
  const pagoListo = Boolean(programa && infoProgramaAceptada && datosConfirmados);
  const pagoPagado = esPagoRegistrado(inscripcion?.estadoPago);
  const puedeSimularPago = Boolean(inscripcion && pagoListo && !pagoPagado && !requiereCaja);
  const textoBoton = !programa
    ? "Consultar disponibilidad"
    : !infoProgramaAceptada
      ? "Revisar comunicado"
      : !datosConfirmados
        ? "Confirmar datos"
        : pagoPagado
          ? "Pago registrado"
        : requiereCaja
          ? "Ver indicaciones de Caja"
          : invitacionPendiente
            ? "Registrar inscripcion"
            : "Pagar ahora";

  return (
    <article className="padres-flow-panel padres-flow-payment-step">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="orange">Pago y constancia</PortalBadge>
          <h2>{pasoVisible.titulo}</h2>
          <p>{pasoVisible.detalle}</p>
        </div>
      </div>

      <div className="padres-flow-payment-box">
        <span>Monto referencial</span>
        <strong>{monto}</strong>
        <p>
          {pagoPagado
            ? "El pago ya figura registrado para este programa."
            : pagoListo
              ? "Ya puede continuar con el registro o pagar con la pasarela simulada."
            : "Complete los pasos anteriores para habilitar esta accion."}
        </p>
      </div>

      <div className="padres-flow-payment-checks">
        <div className={cn("padres-flow-mini-check", infoProgramaAceptada && "is-ok")}>
          <CheckCircle2 size={17} />
          Comunicado aceptado
        </div>
        <div className={cn("padres-flow-mini-check", datosConfirmados && "is-ok")}>
          <CheckCircle2 size={17} />
          Datos confirmados
        </div>
        <div className={cn("padres-flow-mini-check", inscripcion && "is-ok")}>
          <CheckCircle2 size={17} />
          {inscripcion ? "Inscripcion registrada" : "Pendiente de registro"}
        </div>
      </div>

      {puedeSimularPago ? (
        <section className="padres-flow-pay-simulator" aria-label="Pago simulado">
          <div>
            <span>Pasarela simulada</span>
            <strong>{monto}</strong>
            <p>Seleccione un medio para registrar el pago como si fuera una operacion real.</p>
          </div>
          <div className="padres-flow-pay-methods">
            {["Tarjeta simulada", "Yape simulado", "Transferencia simulada"].map((medio) => (
              <button
                key={medio}
                type="button"
                disabled={guardando}
                onClick={() => pagarSimuladoPadres?.(medio)}
              >
                <CreditCard size={15} />
                {medio.replace(" simulada", "").replace(" simulado", "")}
              </button>
            ))}
          </div>
        </section>
      ) : pagoPagado ? (
        <section className="padres-flow-pay-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>{pagoConfirmado ? "Pago aprobado" : "Pago validado"}</strong>
            <span>
              {pagoConfirmado?.codigoOperacion
                ? `Operacion ${pagoConfirmado.codigoOperacion}. La inscripcion quedo lista y tambien aparecera como pagada en Caja.`
                : "La inscripcion quedo lista y tambien aparecera como pagada en Caja."}
            </span>
          </div>
        </section>
      ) : null}

      <div className="padres-flow-actions">
        {!infoProgramaAceptada ? (
          <button className="padres-flow-secondary-button" type="button" onClick={() => setPasoActivo(1)}>
            Revisar comunicado
          </button>
        ) : null}
        {!datosConfirmados ? (
          <button className="padres-flow-secondary-button" type="button" onClick={() => setPasoActivo(2)}>
            Confirmar datos
          </button>
        ) : null}
        <button className="padres-flow-primary-button" type="button" disabled={guardando || pagoPagado} onClick={manejarAccionPago}>
          {guardando ? <Loader2 className="padres-spin" size={16} /> : pagoPagado ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}
          {textoBoton}
        </button>
      </div>
    </article>
  );
}
