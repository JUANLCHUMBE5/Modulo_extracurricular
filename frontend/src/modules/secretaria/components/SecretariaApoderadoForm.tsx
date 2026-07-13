import React from "react";
import { IconBook as BookOpen } from "@tabler/icons-react";

interface SecretariaApoderadoFormProps {
  formulario: {
    apoderado: string;
    telefono: string;
    observacion: string;
  };
  actualizarFormulario: (campo: string, valor: any) => void;
}

export default function SecretariaApoderadoForm({
  formulario,
  actualizarFormulario,
}: SecretariaApoderadoFormProps) {
  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1e293b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
        <BookOpen size={16} style={{ color: "#64748b" }} />
        Padre / Apoderado
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", margin: "4px 0 6px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Nombre del padre / apoderado</label>
          <input
            className="secretaria-input-fused"
            type="text"
            value={formulario.apoderado}
            onChange={(event) => actualizarFormulario("apoderado", event.target.value)}
            placeholder="Nombre completo del apoderado"
          />
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Teléfono del padre</label>
          <input
            className="secretaria-input-fused"
            type="text"
            value={formulario.telefono}
            onChange={(event) => actualizarFormulario("telefono", event.target.value.replace(/\D/g, ""))}
            placeholder="987654321"
            maxLength={9}
          />
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Observación (opcional)</label>
          <input
            className="secretaria-input-fused"
            type="text"
            value={formulario.observacion}
            onChange={(event) => actualizarFormulario("observacion", event.target.value)}
            placeholder="Observación opcional para el registro"
          />
        </div>
      </div>
    </div>
  );
}
