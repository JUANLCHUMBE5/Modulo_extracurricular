import React from "react";

interface SecretariaUniformeSelectorProps {
  requiereUniforme: boolean;
  requiereIndumentaria: boolean;
  formulario: {
    tallaUniforme: string;
    tallaPolo: string;
    tallaShort: string;
  };
  actualizarFormulario: (campo: string, valor: any) => void;
}

export default function SecretariaUniformeSelector({
  requiereUniforme,
  requiereIndumentaria,
  formulario,
  actualizarFormulario,
}: SecretariaUniformeSelectorProps) {
  if (!requiereUniforme && !requiereIndumentaria) return null;

  return (
    <>
      {requiereUniforme ? (
        <div className="secretaria-field" style={{ marginBottom: "16px" }}>
          <label htmlFor="talla" style={{ fontSize: "11px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Talla de uniforme</label>
          <select
            id="talla"
            className="secretaria-input-fused"
            value={formulario.tallaUniforme}
            onChange={(event) => actualizarFormulario("tallaUniforme", event.target.value)}
          >
            <option value="">Seleccione talla</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
          </select>
        </div>
      ) : null}

      {requiereIndumentaria ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px", marginBottom: "16px" }}>
          <div>
            <label htmlFor="tallaPolo" style={{ fontSize: "11px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Talla de polo</label>
            <select
              id="tallaPolo"
              className="secretaria-input-fused"
              value={formulario.tallaPolo}
              onChange={(event) => actualizarFormulario("tallaPolo", event.target.value)}
            >
              <option value="">Seleccione talla</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </select>
          </div>
          <div>
            <label htmlFor="tallaShort" style={{ fontSize: "11px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Talla de short</label>
            <select
              id="tallaShort"
              className="secretaria-input-fused"
              value={formulario.tallaShort}
              onChange={(event) => actualizarFormulario("tallaShort", event.target.value)}
            >
              <option value="">Seleccione talla</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </select>
          </div>
        </div>
      ) : null}
    </>
  );
}
