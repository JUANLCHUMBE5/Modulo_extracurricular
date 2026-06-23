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

  return (
    <section className="dir-correlativos-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <article className="dir-correlativos-container" style={{ borderRadius: "12px", overflow: "hidden", padding: "12px 0" }}>
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: 0, color: "#000000", fontSize: "20px", fontWeight: 800 }}>Correlativos del Sistema</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}>
          <TextInput
            label="Próximo Correlativo de Recibo Físico"
            placeholder="Ej. REC-00001 o 000125"
            value={correlativosForm.recibo}
            onChange={(e) => setCorrelativosForm({ ...correlativosForm, recibo: e.target.value })}
            disabled={!editando}
            styles={{
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
            }}
          />

          <TextInput
            label="Próximo Correlativo de Recibo Virtual"
            placeholder="Ej. V-00001 o V-0125"
            value={correlativosForm.reciboVirtual || ""}
            onChange={(e) => setCorrelativosForm({ ...correlativosForm, reciboVirtual: e.target.value })}
            disabled={!editando}
            styles={{
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
            }}
          />

          <TextInput
            label="Próximo Correlativo de Egreso"
            placeholder="Ej. EGR-00001 o 000045"
            value={correlativosForm.egreso}
            onChange={(e) => setCorrelativosForm({ ...correlativosForm, egreso: e.target.value })}
            disabled={!editando}
            styles={{
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
            }}
          />

          <div style={{ marginTop: "4px", display: "flex", gap: "12px" }}>
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
