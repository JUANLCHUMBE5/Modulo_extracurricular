import { IconCurrencyDollar as DollarSign, IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

function SeccionPago({
  form,
  esFormularioVerano,
  esDeportivoForm,
  mostrarIndumentariaDeportiva,
  actualizarCosto,
  formatearCostoFormulario,
  actualizarForm,
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
            style={{
              width: "100%",
              height: "38px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              padding: "0 8px",
              background: "#ffffff"
            }}
          >
            <option value="Unico">Pago único</option>
            <option value="Mensual">Cuota mensual</option>
          </select>
          {form.modalidadCobro === "Mensual" && (
            <p style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: "600", marginTop: "4px", margin: "4px 0 0" }}>
              ⚠️ Esta función no está disponible todavía
            </p>
          )}
        </div>

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
