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

export default function PagoStep({
  datosConfirmados,
  guardando,
  infoProgramaAceptada,
  inscripcion,
  invitacionPendiente,
  manejarAccionPago,
  pasoVisible,
  programa,
  requiereCaja,
  setPasoActivo,
}) {
  const monto = programa && (inscripcion || infoProgramaAceptada) ? formatearSoles(programa.costo) : "S/ 0.00";
  const pagoListo = Boolean(programa && infoProgramaAceptada && datosConfirmados);
  const textoBoton = !programa
    ? "Consultar disponibilidad"
    : !infoProgramaAceptada
      ? "Revisar comunicado"
      : !datosConfirmados
        ? "Confirmar datos"
        : requiereCaja
          ? "Ver indicaciones de Caja"
          : invitacionPendiente
            ? "Registrar inscripcion"
            : "Ver indicaciones de pago";

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
          {pagoListo
            ? "Ya puede continuar con el registro o revisar las indicaciones de Caja."
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
        <button className="padres-flow-primary-button" type="button" disabled={guardando} onClick={manejarAccionPago}>
          {guardando ? <Loader2 className="padres-spin" size={16} /> : <CreditCard size={16} />}
          {textoBoton}
        </button>
      </div>
    </article>
  );
}
