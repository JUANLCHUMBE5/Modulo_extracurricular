import { useState } from "react";
import { Button, TextInput, Switch, Loader } from "@mantine/core";
import { IconEdit as Edit, IconCheck as Check, IconX as Cancel } from "@tabler/icons-react";

export default function DireccionCorrelativos({
  correlativosForm,
  setCorrelativosForm,
  handleGuardarCorrelativos,
  guardandoCorrelativos,
}) {
  const [editando, setEditando] = useState(false);
  const [backupForm, setBackupForm] = useState(null);

  if (!correlativosForm) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <Loader size="md" color="teal" />
      </div>
    );
  }

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

  const handleActualChange = (type, val) => {
    const actualKey = `${type}Actual`;
    const updated = { ...correlativosForm };
    updated[actualKey] = val;
    setCorrelativosForm(updated);
  };

  const handleToggleActive = async (type, checked) => {
    const activeKey = `${type}Active`;
    const updated = {
      ...correlativosForm,
      [activeKey]: checked
    };
    setCorrelativosForm(updated);

    if (!editando) {
      await handleGuardarCorrelativos(updated);
    }
  };

  const inputStyles = {
    label: { fontSize: "11px", fontWeight: 700, color: "#000000", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.03em" },
    input: {
      borderRadius: "6px",
      borderColor: "#cbd5e1",
      height: "28px",
      fontSize: "12px",
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
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h2 style={{ margin: 0, color: "#111827", fontSize: "20px", fontWeight: 800 }}>
          Correlativos del Sistema
        </h2>
      </header>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px" }}>
          {/* Recibo Físico */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0c8569" }}>N° de Recibo de Ingreso</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Switch
                  checked={correlativosForm.reciboActive !== false}
                  disabled={guardandoCorrelativos}
                  onChange={(event) => handleToggleActive("recibo", event.currentTarget.checked)}
                  color="teal"
                  size="xs"
                  styles={{
                    track: {
                      cursor: "pointer",
                      backgroundColor: correlativosForm.reciboActive === false ? "#dc2626" : undefined,
                      borderColor: correlativosForm.reciboActive === false ? "#dc2626" : undefined
                    }
                  }}
                />
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: correlativosForm.reciboActive !== false ? "#0c8569" : "#dc2626",
                  backgroundColor: correlativosForm.reciboActive !== false ? "#ecfdf5" : "#fef2f2",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  transition: "all 0.2s ease"
                }}>
                  {correlativosForm.reciboActive !== false ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <TextInput
                label="Inicio (Valor Inicial)"
                placeholder="Ej. REC-0500"
                value={correlativosForm.reciboInicio || ""}
                onChange={(e) => handleInicioChange("recibo", e.target.value)}
                disabled={!editando || correlativosForm.reciboActive === false}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Actual (Siguiente a Generar)"
                placeholder="Ej. REC-0500"
                value={correlativosForm.reciboActual || ""}
                onChange={(e) => handleActualChange("recibo", e.target.value)}
                disabled={!editando || correlativosForm.reciboActive === false}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Egreso */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0c8569" }}>N° de Recibo de Egreso</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Switch
                  checked={correlativosForm.egresoActive !== false}
                  disabled={guardandoCorrelativos}
                  onChange={(event) => handleToggleActive("egreso", event.currentTarget.checked)}
                  color="teal"
                  size="xs"
                  styles={{
                    track: {
                      cursor: "pointer",
                      backgroundColor: correlativosForm.egresoActive === false ? "#dc2626" : undefined,
                      borderColor: correlativosForm.egresoActive === false ? "#dc2626" : undefined
                    }
                  }}
                />
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: correlativosForm.egresoActive !== false ? "#0c8569" : "#dc2626",
                  backgroundColor: correlativosForm.egresoActive !== false ? "#ecfdf5" : "#fef2f2",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  transition: "all 0.2s ease"
                }}>
                  {correlativosForm.egresoActive !== false ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <TextInput
                label="Inicio (Valor Inicial)"
                placeholder="Ej. EGR-0200"
                value={correlativosForm.egresoInicio || ""}
                onChange={(e) => handleInicioChange("egreso", e.target.value)}
                disabled={!editando || correlativosForm.egresoActive === false}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Actual (Siguiente a Generar)"
                placeholder="Ej. EGR-0200"
                value={correlativosForm.egresoActual || ""}
                onChange={(e) => handleActualChange("egreso", e.target.value)}
                disabled={!editando || correlativosForm.egresoActive === false}
                styles={inputStyles}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            {!editando ? (
              <Button
                onClick={handleIniciarEdicion}
                leftSection={<Edit size={14} />}
                styles={{
                  root: {
                    height: "36px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "13px",
                    padding: "0 16px",
                    background: "#0c8569",
                    color: "#ffffff",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "#0a7058"
                    }
                  }
                }}
              >
                Editar Correlativos
              </Button>
            ) : (
              <>
                <Button
                  loading={guardandoCorrelativos}
                  onClick={handleSave}
                  leftSection={<Check size={14} />}
                  styles={{
                    root: {
                      height: "36px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "13px",
                      padding: "0 16px",
                      background: "#000000",
                      color: "#ffffff",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: "#1e293b"
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
                  leftSection={<Cancel size={14} />}
                  styles={{
                    root: {
                      height: "36px",
                      borderRadius: "6px",
                      fontWeight: 500,
                      fontSize: "13px",
                    }
                  }}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
