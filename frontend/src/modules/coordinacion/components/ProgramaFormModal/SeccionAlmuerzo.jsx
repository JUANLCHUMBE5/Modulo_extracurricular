import { IconToolsKitchen2 as Utensils } from "@tabler/icons-react";
import { formatearHora12 } from "../../utils/coordinacionFormatters";

function SeccionAlmuerzo({ form, esMostrarSeccionAlmuerzo, actualizarForm }) {
  if (!esMostrarSeccionAlmuerzo) return null;

  return (
    <section className="coord-form-section" style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }}>
      <div className="coord-section-heading">
        <Utensils size={18} style={{ color: "#f59e0b" }} />
        <div>
          <h3 style={{ color: "#78350f" }}>Configuración de Almuerzo</h3>
        </div>
      </div>
      <div className="coord-section-grid">
        <div className="coord-field coord-field-full" style={{ margin: 0 }}>
          <label
            className="coord-check-label"
            style={{ cursor: "pointer", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <input
              type="checkbox"
              checked={Boolean(form.incluyeAlmuerzo)}
              onChange={e => {
                const val = e.target.checked;
                actualizarForm("incluyeAlmuerzo", val);
                if (val) {
                  if (!form.detalleAlmuerzo) {
                    actualizarForm(
                      "detalleAlmuerzo",
                      "Contamos con un área para la recepción de los almuerzos, donde se deberá dejar bajo el siguiente horario: De 01:20 a 01:45 p.m.\nIndicando claramente una etiqueta grande en la lonchera, con NOMBRE DEL ALUMNO, GRADO Y SECCIÓN."
                    );
                  }
                  if (!form.concesionarios) {
                    actualizarForm(
                      "concesionarios",
                      "Si deseara coordinar el servicio de Delivery le indicamos los siguientes contactos de nuestros 2 concesionarios para desayunos, loncheras, almuerzos:\nCafetín Los Amigos del recreo (Sra. Rocío) - 976280197\nCafetín Edith (Sra. Deysli) - 960897529\nque son concesionarias autorizadas de nuestra Institución y que cumplen con todo el protocolo que corresponde de acuerdo a las disposiciones del MINSA."
                    );
                  }
                }
              }}
            />
            <span>Incluye recepción de almuerzo</span>
          </label>

          {form.incluyeAlmuerzo && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  color: "#78350f"
                }}
              >
                <strong style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "#b45309" }}>
                  ⏰ Horario de recepción de almuerzo (calculado automáticamente del horario de almuerzo de arriba):
                </strong>
                {form.horarioRecepcionAlmuerzo ? (
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>
                    {form.horarioRecepcionAlmuerzo
                      .split(", ")
                      .map(part => {
                        const match = part.match(/(Inicial|Primaria|Secundaria)\s*:\s*(\d{2}:\d{2})\s*a\s*(\d{2}:\d{2})/i);
                        if (match) {
                          const level = match[1];
                          const t1 = formatearHora12(match[2]);
                          const t2 = formatearHora12(match[3]);
                          return `${level}: de ${t1} a ${t2}`;
                        }
                        return part;
                      })
                      .join(" · ")}
                  </span>
                ) : (
                  <span style={{ fontSize: "13px", color: "#b45309", fontStyle: "italic" }}>
                    Configure al menos un bloque con horario de almuerzo arriba para calcular el horario de recepción.
                  </span>
                )}
              </div>

              <div style={{ marginTop: "12px" }}>
                <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Detalle / Indicaciones de almuerzo *
                </label>
                <textarea
                  value={form.detalleAlmuerzo || ""}
                  onChange={e => actualizarForm("detalleAlmuerzo", e.target.value)}
                  placeholder="Ej: Contamos con un área para la recepción de los almuerzos..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ marginTop: "12px" }}>
                <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Concesionarios autorizados *
                </label>
                <textarea
                  value={form.concesionarios || ""}
                  onChange={e => actualizarForm("concesionarios", e.target.value)}
                  placeholder="Ej: Cafetín Los Amigos del recreo (Sra. Rocío) - 976280197..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default SeccionAlmuerzo;
