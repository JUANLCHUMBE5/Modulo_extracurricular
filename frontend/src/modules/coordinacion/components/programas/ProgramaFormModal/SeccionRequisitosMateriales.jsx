import { IconBook as BookOpen } from "@tabler/icons-react";

function SeccionRequisitosMateriales({ form, actualizarForm }) {
  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <BookOpen size={18} />
        <div>
          <h3>Requisitos y materiales</h3>
        </div>
      </div>
      <div className="coord-section-grid">
        <div className="coord-field coord-field-full">
          <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>
            Lista de útiles / requisitos (editable)
          </label>
          <textarea
            value={form.requisitos || ""}
            onChange={e => actualizarForm("requisitos", e.target.value)}
            placeholder="Escriba los materiales, útiles o requisitos necesarios para el programa..."
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              resize: "vertical"
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default SeccionRequisitosMateriales;
