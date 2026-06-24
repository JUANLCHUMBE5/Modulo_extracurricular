import { useState } from "react";
import { Button, TextInput } from "@mantine/core";
import { IconEdit as Edit, IconCheck as Check, IconX as Cancel } from "@tabler/icons-react";

export default function DireccionCorrelativos({
  correlativosForm,
  setCorrelativosForm,
  handleGuardarCorrelativos,
  guardandoCorrelativos,
}) {
  const [editando, setEditando] = useState(false);
  const [backupForm, setBackupForm] = useState(null);

  const incrementarCorrelativo = (value) => {
    if (!value) return "";
    const match = String(value).match(/^(.*?)(\d+)$/);
    if (!match) return value;
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = Number(numStr) + 1;
    return prefix + String(nextNum).padStart(numStr.length, "0");
  };

  const handleIniciarEdicion = () => {
    setBackupForm({ ...correlativosForm });
    setEditando(true);
  };

  const handleCancelarEdicion = () => {
    if (backupForm) {
      setCorrelativosForm(backupForm);
    }
    setEditando(false);
  };

  const handleSave = async () => {
    const success = await handleGuardarCorrelativos();
    if (success) {
      setEditando(false);
    }
  };

  const handleInicioChange = (type, val) => {
    const inicioKey = `${type}Inicio`;
    const actualKey = `${type}Actual`;
    const inicioAnterior = correlativosForm[inicioKey] || "";
    const actualAnterior = correlativosForm[actualKey] || "";
    const updated = { ...correlativosForm };
    updated[inicioKey] = val;
    if (!actualAnterior || actualAnterior === inicioAnterior) {
      updated[actualKey] = val;
    }
    setCorrelativosForm(updated);
  };

  const inputStyles = {
    label: { fontSize: "13px", fontWeight: 500, color: "#000000", marginBottom: "4px" },
    input: {
      borderRadius: "8px",
      borderColor: "#cbd5e1",
      height: "36px",
      backgroundColor: !editando ? "#f8fafc" : "#ffffff",
      color: "#000000",
      opacity: 1,
      "&:disabled": {
        color: "#000000",
        backgroundColor: "#f8fafc",
        cursor: "not-allowed"
      }
    }
  };

  return (
    <section className="dir-correlativos-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <article className="dir-correlativos-container" style={{ borderRadius: "12px", overflow: "hidden", padding: "12px 0" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ margin: 0, color: "#000000", fontSize: "20px", fontWeight: 800 }}>Correlativos del Sistema</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px" }}>
          {/* Recibo Físico */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0c8569" }}>Recibo Físico</span>
            <div style={{ display: "flex", gap: "16px" }}>
              <TextInput
                label="Inicio (Valor Inicial)"
                placeholder="Ej. REC-0500"
                value={correlativosForm.reciboInicio || ""}
                onChange={(e) => handleInicioChange("recibo", e.target.value)}
                disabled={!editando}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Actual (Siguiente a Generar)"
                placeholder="Ej. REC-0500"
                value={correlativosForm.reciboActual || ""}
                disabled={true}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Recibo Virtual */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0c8569" }}>Recibo Virtual (Yape, Transferencias, etc.)</span>
            <div style={{ display: "flex", gap: "16px" }}>
              <TextInput
                label="Inicio (Valor Inicial)"
                placeholder="Ej. V-1000"
                value={correlativosForm.reciboVirtualInicio || ""}
                onChange={(e) => handleInicioChange("reciboVirtual", e.target.value)}
                disabled={!editando}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Actual (Siguiente a Generar)"
                placeholder="Ej. V-1000"
                value={correlativosForm.reciboVirtualActual || ""}
                disabled={true}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Egreso */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0c8569" }}>Comprobante de Egreso</span>
            <div style={{ display: "flex", gap: "16px" }}>
              <TextInput
                label="Inicio (Valor Inicial)"
                placeholder="Ej. EGR-0200"
                value={correlativosForm.egresoInicio || ""}
                onChange={(e) => handleInicioChange("egreso", e.target.value)}
                disabled={!editando}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Actual (Siguiente a Generar)"
                placeholder="Ej. EGR-0200"
                value={correlativosForm.egresoActual || ""}
                disabled={true}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
            {!editando ? (
              <Button
                onClick={handleIniciarEdicion}
                leftSection={<Edit size={16} />}
                styles={{
                  root: {
                    height: "38px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    padding: "0 24px",
                    background: "#e6fcf5",
                    color: "#0c8569",
                    border: "1px solid #c3fae8",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "#c3fae8",
                      color: "#09634e",
                      borderColor: "#a3f5d8"
                    }
                  }
                }}
              >
                Editar
              </Button>
            ) : (
              <>
                <Button
                  loading={guardandoCorrelativos}
                  onClick={handleSave}
                  leftSection={<Check size={16} />}
                  styles={{
                    root: {
                      height: "38px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      padding: "0 24px",
                      background: "#e6fcf5",
                      color: "#0c8569",
                      border: "1px solid #c3fae8",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: "#c3fae8",
                        color: "#09634e",
                        borderColor: "#a3f5d8"
                      }
                    }
                  }}
                >
                  Guardar Cambios
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={handleCancelarEdicion}
                  leftSection={<Cancel size={16} />}
                  styles={{
                    root: {
                      height: "38px",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }
                  }}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
