import { IconBook2 as BookOpen } from "@tabler/icons-react";

interface SeccionRequisitosMaterialesProps {
  form: any;
  actualizarForm: (key: string | Record<string, any>, value?: any) => void;
}

function SeccionRequisitosMateriales({ form, actualizarForm }: SeccionRequisitosMaterialesProps) {
  return (
    <section className="coord-form-section" style={{ borderLeft: "4px solid #0d9488", paddingLeft: "12px" }}>
      <div className="coord-section-heading" style={{ marginBottom: "16px" }}>
        <BookOpen size={18} style={{ color: "#0d9488" }} />
        <div>
          <h3 style={{ color: "#0f766e" }}>Indicaciones para la familia</h3>
        </div>
      </div>

      <div className="coord-section-grid">
        <div className="coord-field coord-field-full">
          <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>
            Escriba las indicaciones, útiles o notas importantes (editable)
          </label>
          <textarea
            value={form.requisitos || ""}
            onChange={e => actualizarForm("requisitos", e.target.value)}
            placeholder="Escriba aquí las indicaciones para la familia, materiales requeridos, útiles o notas..."
            rows={5}
            style={{
              width: "100%",
              padding: "10px 12px",
              resize: "vertical",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13.5px",
              outline: "none",
              fontFamily: "inherit"
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default SeccionRequisitosMateriales;
