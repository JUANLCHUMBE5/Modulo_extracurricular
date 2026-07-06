import React from "react";

interface SecretariaCambridgeIngresoProps {
  esCambridge: boolean;
  ingresoCambridge: string;
  nivelCambridge?: string;
}

export default function SecretariaCambridgeIngreso({
  esCambridge,
  ingresoCambridge,
  nivelCambridge = "",
}: SecretariaCambridgeIngresoProps) {
  if (!esCambridge || !ingresoCambridge) return null;

  return (
    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", marginTop: "10px" }}>
      <span style={{ fontSize: "11px", color: "#1e40af", display: "block", marginBottom: "2px" }}>Modalidad Cambridge</span>
      <strong style={{ fontSize: "13px", color: "#1e3a8a" }}>
        {ingresoCambridge} {nivelCambridge ? `(${nivelCambridge})` : ""}
      </strong>
    </div>
  );
}
