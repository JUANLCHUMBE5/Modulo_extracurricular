import { Button, Divider, TextInput } from "@mantine/core";

export default function DireccionCorrelativos({
  correlativosForm,
  setCorrelativosForm,
  handleGuardarCorrelativos,
  guardandoCorrelativos,
}) {
  return (
    <section className="dir-correlativos-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <article className="dir-panel" style={{ borderRadius: "12px", overflow: "hidden", padding: "24px" }}>
        <div style={{ marginBottom: "20px" }}>
          <span className="dir-tag" style={{ background: "#e0f2fe", color: "#0369a1", marginBottom: "4px" }}>Configuración</span>
          <h2 style={{ margin: 0, color: "#0c1a30", fontSize: "20px", fontWeight: 800 }}>Correlativos del Sistema</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>Configure los números correlativos iniciales o siguientes para los comprobantes de recibos de ingresos y egresos de caja.</p>
        </div>

        <Divider style={{ marginBottom: "20px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "400px" }}>
          <TextInput
            label="Próximo Correlativo de Recibo"
            placeholder="Ej. REC-00001 o 000125"
            value={correlativosForm.recibo}
            onChange={(e) => setCorrelativosForm({ ...correlativosForm, recibo: e.target.value })}
            styles={{
              label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
              input: { borderRadius: "8px", borderColor: "#cbd5e1", height: "40px" }
            }}
          />

          <TextInput
            label="Próximo Correlativo de Egreso"
            placeholder="Ej. EGR-00001 o 000045"
            value={correlativosForm.egreso}
            onChange={(e) => setCorrelativosForm({ ...correlativosForm, egreso: e.target.value })}
            styles={{
              label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
              input: { borderRadius: "8px", borderColor: "#cbd5e1", height: "40px" }
            }}
          />

          <div style={{ marginTop: "10px", display: "flex", gap: "12px" }}>
            <Button
              color="teal"
              loading={guardandoCorrelativos}
              onClick={handleGuardarCorrelativos}
              styles={{
                root: {
                  height: "42px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  padding: "0 24px",
                  background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
                }
              }}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}
