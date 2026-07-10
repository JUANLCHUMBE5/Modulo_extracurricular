import { useState, useEffect } from "react";
import { Button, TextInput, Switch, Loader, Badge, Group, Modal, Text } from "@mantine/core";
import {
  IconEdit as Edit,
  IconCheck as Check,
  IconX as Cancel,
  IconPlus as Plus,
  IconTrash as Trash,
  IconCreditCard as CreditCard,
  IconSettings as Settings
} from "@tabler/icons-react";

export default function DireccionCorrelativos({
  correlativosForm,
  setCorrelativosForm,
  handleGuardarCorrelativos,
  guardandoCorrelativos,
  metodosPago = [],
  actualizarMetodosPago,
}: {
  correlativosForm: any;
  setCorrelativosForm: any;
  handleGuardarCorrelativos: any;
  guardandoCorrelativos: boolean;
  metodosPago: string[];
  actualizarMetodosPago: (nuevosMetodos: string[]) => Promise<boolean>;
}) {
  const [editando, setEditando] = useState(false);
  const [backupForm, setBackupForm] = useState(null);

  const [listaMetodos, setListaMetodos] = useState<string[]>(metodosPago);
  const [nuevoMetodo, setNuevoMetodo] = useState("");
  const [guardandoMetodos, setGuardandoMetodos] = useState(false);
  const [activeTab, setActiveTab] = useState<"correlativos" | "metodos">("correlativos");
  const [metodoAEliminar, setMetodoAEliminar] = useState<{ index: number; nombre: string } | null>(null);

  useEffect(() => {
    setListaMetodos(metodosPago);
  }, [metodosPago]);

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

  const handleAgregarMetodo = () => {
    const clean = nuevoMetodo.trim();
    if (!clean) return;
    if (listaMetodos.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      return;
    }
    setListaMetodos([...listaMetodos, clean]);
    setNuevoMetodo("");
  };

  const handleEliminarMetodo = (index: number) => {
    const metodo = listaMetodos[index];
    if (metodo.toLowerCase() === "efectivo") return;
    setMetodoAEliminar({ index, nombre: metodo });
  };

  const confirmarEliminarMetodo = () => {
    if (metodoAEliminar === null) return;
    const nueva = [...listaMetodos];
    nueva.splice(metodoAEliminar.index, 1);
    setListaMetodos(nueva);
    setMetodoAEliminar(null);
  };

  const handleGuardarMetodos = async () => {
    setGuardandoMetodos(true);
    await actualizarMetodosPago(listaMetodos);
    setGuardandoMetodos(false);
  };

  const seCambioMetodos = JSON.stringify(listaMetodos) !== JSON.stringify(metodosPago);

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
          Ajustes de Caja
        </h2>
      </header>

      {/* Tarjeta contenedora unificada blanca */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          width: "100%",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
        }}
      >
        {/* Pestañas de Selección */}
        <div className="dir-module-tabs-row" role="tablist" style={{ marginTop: "-12px", marginBottom: "24px" }}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "correlativos"}
            className={`dir-module-tab ${activeTab === "correlativos" ? "is-active" : ""}`}
            onClick={() => setActiveTab("correlativos")}
          >
            <Settings size={18} />
            <div>
              <strong>Correlativos del Sistema</strong>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "metodos"}
            className={`dir-module-tab ${activeTab === "metodos" ? "is-active" : ""}`}
            onClick={() => setActiveTab("metodos")}
          >
            <CreditCard size={18} />
            <div>
              <strong>Métodos de Pago</strong>
            </div>
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        {activeTab === "correlativos" ? (
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px" }}>
            {/* Agregar Método */}
            <Group style={{ width: "100%", gap: "8px" }} align="flex-end">
              <TextInput
                placeholder="Ingrese nuevo método (ej. PayPal)"
                value={nuevoMetodo}
                onChange={(e) => setNuevoMetodo(e.target.value)}
                style={{ flex: 1 }}
                size="sm"
                styles={{
                  input: { borderRadius: "6px", borderColor: "#cbd5e1", height: "34px", fontSize: "13px" }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAgregarMetodo();
                }}
              />
              <Button
                onClick={handleAgregarMetodo}
                leftSection={<Plus size={14} />}
                size="sm"
                disabled={!nuevoMetodo.trim()}
                styles={{
                  root: {
                    borderRadius: "6px",
                    backgroundColor: "#0c8569",
                    color: "#ffffff",
                    fontWeight: 600,
                    height: "34px",
                    padding: "0 12px",
                    fontSize: "13px",
                    "&:hover": { backgroundColor: "#0a7058" }
                  }
                }}
              >
                Agregar
              </Button>
            </Group>

            {/* Lista de Métodos */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                backgroundColor: "#f8fafc",
                overflow: "hidden",
                width: "100%"
              }}
            >
              {listaMetodos.map((metodo, idx) => {
                const esEfectivo = metodo.toLowerCase() === "efectivo";
                return (
                  <div
                    key={metodo}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderBottom: idx < listaMetodos.length - 1 ? "1px solid #e2e8f0" : "none",
                      backgroundColor: esEfectivo ? "#f0fdf4" : "transparent"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{metodo}</span>
                      {esEfectivo && (
                        <Badge variant="light" color="green" size="xs">
                          Obligatorio
                        </Badge>
                      )}
                    </div>
                    {!esEfectivo && (
                      <Button
                        variant="subtle"
                        color="red"
                        onClick={() => handleEliminarMetodo(idx)}
                        size="xs"
                        styles={{
                          root: {
                            padding: "0 6px",
                            height: "24px",
                            minWidth: "auto",
                            borderRadius: "4px"
                          }
                        }}
                      >
                        <Trash size={14} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Guardar métodos */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                onClick={handleGuardarMetodos}
                loading={guardandoMetodos}
                disabled={!seCambioMetodos}
                leftSection={<Check size={14} />}
                styles={{
                  root: {
                    borderRadius: "6px",
                    backgroundColor: seCambioMetodos ? "#000000" : "#cbd5e1",
                    color: "#ffffff",
                    fontWeight: 600,
                    height: "36px",
                    padding: "0 16px",
                    fontSize: "13px",
                    "&:hover": {
                      backgroundColor: seCambioMetodos ? "#1e293b" : "#cbd5e1"
                    }
                  }
                }}
              >
                Guardar Configuración
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Modal de confirmación para eliminar método de pago */}
      <Modal
        opened={metodoAEliminar !== null}
        onClose={() => setMetodoAEliminar(null)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Trash size={16} color="#dc2626" />
            <strong style={{ fontSize: "14px", color: "#1e293b" }}>Confirmar Eliminación</strong>
          </div>
        }
        centered
        size="sm"
        radius="lg"
        styles={{
          header: { borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px" },
          close: { color: "#94a3b8", "&:hover": { color: "#64748b", backgroundColor: "#f8fafc" } }
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Text size="sm" style={{ color: "#475569", lineHeight: "1.5" }}>
            ¿Está seguro de que desea eliminar el método de pago <strong>"{metodoAEliminar?.nombre}"</strong>?
          </Text>
          <Group justify="flex-end" gap="10px">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setMetodoAEliminar(null)}
              size="sm"
              styles={{ root: { borderRadius: "6px" } }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarEliminarMetodo}
              size="sm"
              styles={{
                root: {
                  borderRadius: "6px",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  "&:hover": { backgroundColor: "#b91c1c" }
                }
              }}
            >
              Confirmar
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  );
}
