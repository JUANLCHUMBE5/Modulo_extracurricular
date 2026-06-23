import {
  IconEye as Eye,
  IconReceipt as Receipt,
  IconX as X,
} from "@tabler/icons-react";

function normalizarEstadoPagoPadres(pago = {}) {
  const texto = String(pago.estado || pago.estadoPago || pago.estadoVerificacion || "").toLowerCase();
  if (texto.includes("verif") || texto.includes("pend")) return { texto: "Pendiente", clase: "is-pending" };
  if (texto.includes("pag") || texto.includes("valid") || texto.includes("complet")) return { texto: "Pagado", clase: "is-paid" };
  if (texto.includes("anul") || texto.includes("rech")) return { texto: "Rechazado", clase: "is-rejected" };
  return { texto: "Pendiente", clase: "is-pending" };
}

function formatearMontoPadres(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function formatearPenPadres(valor) {
  return `PEN ${Number(valor || 0).toFixed(2)}`;
}

function formatearFechaPagoPadres(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

function obtenerImportesPagoPadres(pago = {}) {
  const monto = Number(pago.monto || 0);
  const estado = normalizarEstadoPagoPadres(pago);
  const pagado = estado.clase === "is-paid" ? monto : 0;
  return {
    subtotal: monto,
    pagado,
    restante: Math.max(0, monto - pagado),
  };
}

export default function HistorialPagosModal({
  estudiante,
  nombreCorto,
  pagosOrdenados,
  pagoDetalle,
  setHistorialPagosAbierto,
  setPagoDetalle,
}) {
  return (
    <div className="padres-modal-backdrop" role="presentation">
      <section className="padres-history-modal" role="dialog" aria-modal="true" aria-labelledby="padres-history-title">
        {pagoDetalle ? (
          <section className="padres-invoice-detail" aria-label="Detalle de la factura">
            <button className="padres-invoice-close" type="button" onClick={() => setPagoDetalle(null)}>
              <X size={15} />
              Cerrar detalles de la factura
            </button>
            {(() => {
              const fecha = formatearFechaPagoPadres(pagoDetalle.fechaPago || pagoDetalle.fecha || pagoDetalle.createdAt);
              const estado = normalizarEstadoPagoPadres(pagoDetalle);
              const importes = obtenerImportesPagoPadres(pagoDetalle);
              const pagado = estado.clase === "is-paid";
              const programaPago = pagoDetalle.programa || pagoDetalle.programaNombre || "Programa extracurricular";

              return (
                <>
                  <h2>{pagado ? `Se pago el ${fecha}` : `Pago enviado el ${fecha}`}</h2>

                  <section className="padres-invoice-section">
                    <h3>Resumen</h3>
                    <dl className="padres-invoice-summary">
                      <div>
                        <dt>Para</dt>
                        <dd>{estudiante?.nombres || nombreCorto}</dd>
                      </div>
                      <div>
                        <dt>De</dt>
                        <dd>Colegio San Rafael</dd>
                      </div>
                      <div>
                        <dt>Factura</dt>
                        <dd>{pagoDetalle.id || "Sin codigo"}</dd>
                      </div>
                      {pagoDetalle.nroRecibo && (
                        <div>
                          <dt>N° de comprobante</dt>
                          <dd>{pagoDetalle.nroRecibo}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Operacion</dt>
                        <dd>{pagoDetalle.numeroOperacion || pagoDetalle.referenciaPago || "Sin numero"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="padres-invoice-section">
                    <h3>Items</h3>
                    <div className="padres-invoice-item">
                      <span>{fecha.toUpperCase()}</span>
                      <strong>{programaPago}</strong>
                      <small>Cantidad 1</small>
                      <b>{formatearPenPadres(pagoDetalle.monto)}</b>
                    </div>

                    <div className="padres-invoice-line">
                      <strong>Subtotal</strong>
                      <b>{formatearPenPadres(importes.subtotal)}</b>
                    </div>
                    <div className="padres-invoice-line">
                      <strong>Estado</strong>
                      <b>{estado.texto}</b>
                    </div>
                    <div className="padres-invoice-line is-total">
                      <strong>Importe adeudado</strong>
                      <b>{formatearPenPadres(importes.subtotal)}</b>
                    </div>
                    <div className="padres-invoice-line">
                      <strong>Importe pagado</strong>
                      <b>{formatearPenPadres(importes.pagado)}</b>
                    </div>
                    <div className="padres-invoice-line">
                      <strong>Importe restante</strong>
                      <b>{formatearPenPadres(importes.restante)}</b>
                    </div>
                  </section>
                </>
              );
            })()}
          </section>
        ) : (
          <>
            <header className="padres-history-head">
              <div>
                <span>Perfil del padre</span>
                <h2 id="padres-history-title">Historial de pagos</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistorialPagosAbierto(false);
                  setPagoDetalle(null);
                }}
                aria-label="Cerrar historial de pagos"
              >
                <X size={18} />
              </button>
            </header>

            {pagosOrdenados.length ? (
              <div className="padres-history-table" role="table" aria-label="Historial de pagos">
                {pagosOrdenados.map((pago) => {
                  const estado = normalizarEstadoPagoPadres(pago);
                  const fecha = formatearFechaPagoPadres(pago.fechaPago || pago.fecha || pago.createdAt);
                  const nombreProgramaPago = pago.programa || pago.programaNombre || "Programa";
                  return (
                    <div className="padres-history-row" role="row" key={pago.id || `${fecha}-${pago.monto}`}>
                      <span>{fecha}</span>
                      <span>
                        <strong>{nombreProgramaPago}</strong>
                        <small>{formatearMontoPadres(pago.monto)}</small>
                      </span>
                      <strong className={`padres-history-status ${estado.clase}`}>{estado.texto}</strong>
                      <button type="button" onClick={() => setPagoDetalle(pago)}>
                        <Eye size={14} />
                        Ver
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="padres-history-empty">
                <Receipt size={28} />
                <strong>Sin pagos registrados</strong>
                <span>Cuando envie o Cajera confirme un pago, aparecera aqui.</span>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
