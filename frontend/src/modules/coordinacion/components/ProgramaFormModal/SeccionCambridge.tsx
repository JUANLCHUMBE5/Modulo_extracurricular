import { IconCertificate as Certificate } from "@tabler/icons-react";
import { diasSemana } from "../../constants/coordinacionConstants";

function SeccionCambridge({ form, esCambridgeForm, actualizarForm }) {
  if (!esCambridgeForm) return null;

  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <Certificate size={18} />
        <div>
          <h3>Datos Cambridge para la carta</h3>
        </div>
      </div>

      <div className="coord-section-grid">
        <div className="coord-field">
          <label>Docente / profesor responsable</label>
          <input
            value={form.responsable || ""}
            onChange={(event) => actualizarForm("responsable", event.target.value)}
            placeholder="Ej. Prof. Ana Torres"
          />
        </div>

        <div className="coord-field">
          <label>Cupos</label>
          <input
            type="number"
            min="1"
            value={form.cupos || ""}
            onChange={(event) => actualizarForm("cupos", event.target.value)}
            placeholder="Ej. 55"
          />
        </div>

        <div className="coord-field">
          <label>Nivel Cambridge</label>
          <input
            value={form.nivelCambridge || ""}
            onChange={(event) => actualizarForm("nivelCambridge", event.target.value)}
            placeholder="Ej. A2 Key, B1 Preliminary"
          />
        </div>

        <div className="coord-field">
          <label>Precio por ciclo (S/)</label>
          <input
            inputMode="decimal"
            value={form.costoCiclo || form.costo || ""}
            onChange={(event) => {
              actualizarForm("costoCiclo", event.target.value);
              actualizarForm("costo", event.target.value);
            }}
            placeholder="150"
          />
        </div>

        <div className="coord-field">
          <label>Primer pago solicitado (S/)</label>
          <input
            inputMode="decimal"
            value={form.montoPrimerPago || ""}
            onChange={(event) => actualizarForm("montoPrimerPago", event.target.value)}
            placeholder="150"
          />
        </div>

        <div className="coord-field">
          <label>Horario (Inicio / Fin)</label>
          <div className="coord-flex-range">
            <input
              type="time"
              value={form.horaInicio || ""}
              onChange={(e) => actualizarForm("horaInicio", e.target.value)}
            />
            <span className="coord-flex-range-separator">a</span>
            <input
              type="time"
              value={form.horaFin || ""}
              onChange={(e) => actualizarForm("horaFin", e.target.value)}
            />
          </div>
        </div>

        <div className="coord-field coord-field-full">
          <label>Días de clase</label>
          <div className="coord-day-list" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {diasSemana.map((dia) => {
              const diasSeleccionados = Array.isArray(form.dias) ? form.dias : [];
              const isSelected = diasSeleccionados.includes(dia);
              return (
                <label
                  className={`coord-day-chip ${isSelected ? "is-selected" : ""}`}
                  key={dia}
                  style={{ minWidth: "40px", textAlign: "center", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      const nuevosDias = isSelected
                        ? diasSeleccionados.filter((d) => d !== dia)
                        : [...diasSeleccionados, dia];
                      const diasOrdenados = diasSemana.filter(d => nuevosDias.includes(d));
                      actualizarForm("dias", diasOrdenados);
                    }}
                  />
                  <span title={dia}>{dia.substring(0, 2)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="coord-field coord-field-full" style={{ marginTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <label style={{ fontSize: "13.5px", color: "#0f766e" }}>
              <strong>📝 Indicaciones de inscripción y pago</strong>
            </label>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
              {(form.detalleCosto || "").length} caracteres
            </span>
          </div>
          <textarea
            rows={5}
            value={form.detalleCosto || ""}
            onChange={(event) => actualizarForm("detalleCosto", event.target.value)}
            placeholder="Ej. Opcion A: inscripcion presencial en Caja. Opcion B: inscripcion virtual por Yape al numero 970 836 322..."
            style={{
              width: "100%",
              padding: "12px 14px",
              resize: "vertical",
              borderRadius: "8px",
              border: "2px solid #ccfbf1",
              fontSize: "13px",
              lineHeight: "1.6",
              fontFamily: "inherit",
              background: "#f0fdfa",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
            }}
            onFocus={e => {
              e.target.style.borderColor = "#0d9488";
              e.target.style.boxShadow = "0 0 0 3px rgba(13, 148, 136, 0.1)";
              e.target.style.background = "#ffffff";
            }}
            onBlur={e => {
              e.target.style.borderColor = "#ccfbf1";
              e.target.style.boxShadow = "none";
              e.target.style.background = "#f0fdfa";
            }}
          />
          <p className="coord-field-hint" style={{ color: "#0d9488", fontWeight: "500", marginTop: "4px" }}>
            Este texto acompaña la información de pago que se muestra en la carta para los padres de familia.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SeccionCambridge;
