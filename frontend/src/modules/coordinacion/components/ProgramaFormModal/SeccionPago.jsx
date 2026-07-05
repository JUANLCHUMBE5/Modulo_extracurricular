import { useState, useEffect, useRef } from "react";
import { IconCurrencyDollar as DollarSign } from "@tabler/icons-react";

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
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const timeoutRef = useRef(null);

  const activarAlerta = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMostrarAlerta(true);
    timeoutRef.current = setTimeout(() => {
      setMostrarAlerta(false);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <DollarSign size={18} />
        <div>
          <h3>{esCambridge ? "Cobro Cambridge" : esFormularioVerano ? "Pago de verano" : esDeportivoForm ? "Cobro e Indumentaria" : "Cobro"}</h3>
        </div>
      </div>
      <div className="coord-section-grid coord-payment-grid">
        <div className="coord-field" style={{ alignContent: "start" }}>
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
            style={{
              width: "100%",
              height: "38px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              padding: "0 10px",
              boxSizing: "border-box"
            }}
          />
        </div>
        <div className="coord-field" style={{ alignContent: "start", position: "relative" }}>
          <label>Modalidad de cobro</label>
          <div style={{ position: "relative" }}>
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
                background: "#ffffff",
                boxSizing: "border-box"
              }}
            >
              <option value="Unico">Pago único</option>
              <option value="Mensual">Cuota mensual</option>
            </select>
            {esFormularioVerano && (
              <div
                onClick={activarAlerta}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "not-allowed",
                  zIndex: 5
                }}
              />
            )}
            {mostrarAlerta && (
              <div
                style={{
                  position: "absolute",
                  top: "42px",
                  left: "0",
                  right: "0",
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  color: "#b45309",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  boxShadow: "0 4px 12px rgba(180, 83, 9, 0.15)",
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>⚠️ Para verano solo se admite Pago Único</span>
              </div>
            )}
          </div>
          {form.modalidadCobro === "Mensual" && (
            <p style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: "600", marginTop: "4px", margin: "4px 0 0" }}>
              ⚠️ Esta función no está disponible todavía
            </p>
          )}
        </div>

        {mostrarIndumentariaDeportiva ? (
          <div className="coord-field coord-payment-invite-field" style={{ alignContent: "start" }}>
            <label className="coord-spacer-label">&nbsp;</label>
            <label
              className="coord-check-label coord-check-label-stacked"
              style={{
                height: "38px",
                minHeight: "38px",
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box"
              }}
            >
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

    </section>
  );
}

export default SeccionPago;
