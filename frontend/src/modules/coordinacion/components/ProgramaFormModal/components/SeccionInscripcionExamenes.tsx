import React, { useEffect } from "react";
import { IconCertificate as Certificate } from "@tabler/icons-react";

interface SeccionInscripcionExamenesProps {
  form: any;
  esExamenesForm: boolean;
  actualizarForm: (campo: string | object, valor?: any) => void;
}

export default function SeccionInscripcionExamenes({
  form,
  esExamenesForm,
  actualizarForm,
}: SeccionInscripcionExamenesProps) {
  if (!esExamenesForm) return null;

  const numCuotas = Number(form.numeroCuotas || 3);

  // Helper function to calculate installments matching the backend logic
  const obtenerCuotasCalculadas = (precio: string) => {
    const p = Math.round(Number(precio || 0) * 100) / 100;
    if (isNaN(p) || p <= 0) return ["0.00", "0.00", "0.00"];

    if (numCuotas === 3) {
      const c1 = Math.floor(p / 3);
      const c2 = Math.floor(p / 3);
      const c3 = Math.round((p - c1 - c2) * 100) / 100;
      return [c1.toFixed(2), c2.toFixed(2), c3.toFixed(2)];
    } else {
      const c1 = Math.floor((p / 2) * 100) / 100;
      const c2 = Math.round((p - c1) * 100) / 100;
      return [c1.toFixed(2), c2.toFixed(2), "0.00"];
    }
  };

  const startersCuotas = obtenerCuotasCalculadas(form.precioStarters);
  const moversCuotas = obtenerCuotasCalculadas(form.precioMovers);
  const flyersCuotas = obtenerCuotasCalculadas(form.precioFlyers);
  const ketCuotas = obtenerCuotasCalculadas(form.precioKet);
  const petCuotas = obtenerCuotasCalculadas(form.precioPet);

  return (
    <section className="coord-form-section" style={{ animation: "coord-fade-in 0.25s ease" }}>
      <div className="coord-section-heading">
        <Certificate size={18} />
        <div>
          <h3>Inscripción Exámenes Internacionales</h3>
        </div>
      </div>

      <div className="coord-section-grid">
        {/* Fecha y Lugar del Examen */}
        <div className="coord-field">
          <label>Fecha del examen</label>
          <input
            type="date"
            value={form.fechaExamen || ""}
            onChange={(e) => actualizarForm("fechaExamen", e.target.value)}
          />
        </div>

        <div className="coord-field">
          <label>Lugar del examen</label>
          <input
            value={form.lugarExamen || ""}
            onChange={(e) => actualizarForm("lugarExamen", e.target.value)}
            placeholder="Ej. Colegio Matemático San Rafael"
          />
        </div>

        <div className="coord-field">
          <label>Fecha Límite de Pago de Inscripción</label>
          <input
            type="date"
            value={form.fechaLimitePago || ""}
            onChange={(e) => actualizarForm("fechaLimitePago", e.target.value)}
          />
        </div>

        {/* Facilidades de Pago */}
        <div className="coord-field">
          <label>Facilidades de pago (Número de cuotas)</label>
          <select
            value={form.numeroCuotas || "3"}
            onChange={(e) => actualizarForm("numeroCuotas", e.target.value)}
            style={{
              width: "100%",
              height: "38px",
              padding: "0 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5df",
              fontSize: "14px",
              background: "#ffffff",
              outline: "none"
            }}
          >
            <option value="1">Pago único</option>
            <option value="2">2 Cuotas mensuales</option>
            <option value="3">3 Cuotas mensuales</option>
          </select>
        </div>

        {/* Fechas de Vencimiento de las Cuotas */}
        {numCuotas > 1 && (
          <div className="coord-field">
            <label>Vencimiento Cuota 1</label>
            <input
              type="date"
              value={form.fechaVencCuota1 || ""}
              onChange={(e) => actualizarForm("fechaVencCuota1", e.target.value)}
            />
          </div>
        )}

        {numCuotas > 1 && (
          <div className="coord-field">
            <label>Vencimiento Cuota 2</label>
            <input
              type="date"
              value={form.fechaVencCuota2 || ""}
              onChange={(e) => actualizarForm("fechaVencCuota2", e.target.value)}
            />
          </div>
        )}

        {numCuotas === 3 && (
          <div className="coord-field">
            <label>Vencimiento Cuota 3</label>
            <input
              type="date"
              value={form.fechaVencCuota3 || ""}
              onChange={(e) => actualizarForm("fechaVencCuota3", e.target.value)}
            />
          </div>
        )}

        {/* Tabla de precios corporativos */}
        <div className="coord-field coord-field-full" style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "14px", fontWeight: "bold", color: "#0f766e", marginBottom: "8px", display: "block" }}>
            Precios Corporativos y Cuotas Sugeridas
          </label>
          <div className="coord-table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", color: "#475569" }}>Nivel Cambridge</th>
                  <th style={{ padding: "10px 12px", color: "#475569", width: "140px" }}>Precio Total (S/.)</th>
                  {numCuotas > 1 && <th style={{ padding: "10px 12px", color: "#475569" }}>Cuota 1</th>}
                  {numCuotas > 1 && <th style={{ padding: "10px 12px", color: "#475569" }}>Cuota 2</th>}
                  {numCuotas === 3 && <th style={{ padding: "10px 12px", color: "#475569" }}>Cuota 3</th>}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>Starters</td>
                  <td style={{ padding: "6px 12px" }}>
                    <input
                      type="number"
                      value={form.precioStarters || ""}
                      onChange={(e) => actualizarForm("precioStarters", e.target.value)}
                      style={{ width: "100px", padding: "6px", border: "1px solid #cbd5df", borderRadius: "4px" }}
                    />
                  </td>
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {startersCuotas[0]}</td>}
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {startersCuotas[1]}</td>}
                  {numCuotas === 3 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {startersCuotas[2]}</td>}
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>Movers</td>
                  <td style={{ padding: "6px 12px" }}>
                    <input
                      type="number"
                      value={form.precioMovers || ""}
                      onChange={(e) => actualizarForm("precioMovers", e.target.value)}
                      style={{ width: "100px", padding: "6px", border: "1px solid #cbd5df", borderRadius: "4px" }}
                    />
                  </td>
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {moversCuotas[0]}</td>}
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {moversCuotas[1]}</td>}
                  {numCuotas === 3 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {moversCuotas[2]}</td>}
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>Flyers</td>
                  <td style={{ padding: "6px 12px" }}>
                    <input
                      type="number"
                      value={form.precioFlyers || ""}
                      onChange={(e) => actualizarForm("precioFlyers", e.target.value)}
                      style={{ width: "100px", padding: "6px", border: "1px solid #cbd5df", borderRadius: "4px" }}
                    />
                  </td>
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {flyersCuotas[0]}</td>}
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {flyersCuotas[1]}</td>}
                  {numCuotas === 3 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {flyersCuotas[2]}</td>}
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>A2 Key (KET)</td>
                  <td style={{ padding: "6px 12px" }}>
                    <input
                      type="number"
                      value={form.precioKet || ""}
                      onChange={(e) => actualizarForm("precioKet", e.target.value)}
                      style={{ width: "100px", padding: "6px", border: "1px solid #cbd5df", borderRadius: "4px" }}
                    />
                  </td>
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {ketCuotas[0]}</td>}
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {ketCuotas[1]}</td>}
                  {numCuotas === 3 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {ketCuotas[2]}</td>}
                </tr>
                <tr>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>B1 Preliminary (PET)</td>
                  <td style={{ padding: "6px 12px" }}>
                    <input
                      type="number"
                      value={form.precioPet || ""}
                      onChange={(e) => actualizarForm("precioPet", e.target.value)}
                      style={{ width: "100px", padding: "6px", border: "1px solid #cbd5df", borderRadius: "4px" }}
                    />
                  </td>
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {petCuotas[0]}</td>}
                  {numCuotas > 1 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {petCuotas[1]}</td>}
                  {numCuotas === 3 && <td style={{ padding: "10px 12px", color: "#64748b" }}>S/. {petCuotas[2]}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
