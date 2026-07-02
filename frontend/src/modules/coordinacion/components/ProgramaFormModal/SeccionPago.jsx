import { IconCurrencyDollar as DollarSign, IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

function SeccionPago({
  form,
  esFormularioVerano,
  esDeportivoForm,
  mostrarIndumentariaDeportiva,
  actualizarCosto,
  formatearCostoFormulario,
  actualizarForm,
  actualizarInvitacionMasiva,
}) {
  const esCambridge = String(form.tipoComunicado || "").toLowerCase().includes("cambridge");

  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <DollarSign size={18} />
        <div>
          <h3>{esCambridge ? "Cobro Cambridge" : esFormularioVerano ? "Pago de verano" : esDeportivoForm ? "Cobro e Indumentaria" : "Cobro"}</h3>
        </div>
      </div>
      <div className="coord-section-grid coord-payment-grid">
        <div className="coord-field">
          <label>
            {(form.tipoComunicado === "Cambridge" || form.tipoComunicado === "Certificación Cambridge")
              ? "Costo total del ciclo (S/)"
              : esFormularioVerano
                ? "Costo de verano (S/)"
                : "Costo (S/)"}
          </label>
          <input
            inputMode="decimal"
            value={form.costo}
            onChange={e => actualizarCosto(e.target.value)}
            onBlur={formatearCostoFormulario}
            placeholder="70.00"
          />
        </div>
        <div className="coord-field">
          <label>Modalidad de cobro</label>
          <select
            value={form.modalidadCobro}
            onChange={e => actualizarForm("modalidadCobro", e.target.value)}
            disabled={esFormularioVerano}
          >
            <option value="Mensual">Cuota mensual</option>
            <option value="Unico">Pago único</option>
          </select>
        </div>
        {!esFormularioVerano ? (
          <div className="coord-field coord-payment-invite-field">
            <label className="coord-spacer-label">&nbsp;</label>
            <label className="coord-check-label coord-check-label-stacked">
              <span>
                <input
                  type="checkbox"
                  checked={form.invitacionMasiva}
                  onChange={e => {
                    actualizarInvitacionMasiva(e.target.checked);
                  }}
                />
                Invitación masiva en Padres
              </span>
            </label>
          </div>
        ) : null}
        {!esFormularioVerano && form.invitacionMasiva ? (
          <div className="coord-field">
            <label>Alcance de la invitación masiva</label>
            <select
              value={form.alcanceInvitacionMasiva || "colegio"}
              onChange={e => actualizarForm("alcanceInvitacionMasiva", e.target.value)}
            >
              <option value="colegio">Todo el colegio</option>
              <option value="inicial">Solo nivel Inicial</option>
              <option value="primaria">Solo nivel Primaria</option>
              <option value="secundaria">Solo nivel Secundaria</option>
            </select>
            <p className="coord-field-hint" style={{ fontSize: "11px", marginTop: "2px" }}></p>
          </div>
        ) : null}
        {mostrarIndumentariaDeportiva ? (
          <div className="coord-field coord-payment-invite-field">
            <label className="coord-spacer-label">&nbsp;</label>
            <label className="coord-check-label coord-check-label-stacked">
              <span>
                <input
                  type="checkbox"
                  checked={Boolean(form.requiereIndumentaria)}
                  onChange={e => actualizarForm("requiereIndumentaria", e.target.checked)}
                />
                Registrar tallas para kit deportivo (Polo y Short)
              </span>
            </label>
          </div>
        ) : null}
      </div>

      {esFormularioVerano ? (
        <div className="coord-summer-payment-note coord-field-full" style={{ marginTop: "12px" }}>
          <CheckCircle2 size={16} />
          <span>Asistente verá este programa como opción de ciclo verano y registrará el tipo de alumno al momento de la inscripción.</span>
        </div>
      ) : null}
    </section>
  );
}

export default SeccionPago;
