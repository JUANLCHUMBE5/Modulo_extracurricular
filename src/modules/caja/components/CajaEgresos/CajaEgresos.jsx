import React, { useState, useEffect } from "react";
import { Button, Textarea, TextInput, Paper, Text, Group } from "@mantine/core";
import { IconMenu2 as Menu, IconCheck as Check, IconCoins as Coins } from "@tabler/icons-react";
import { toast } from "sonner";
import { registrarEgresoCaja } from "../../cajaService";
import { obtenerCorrelativos } from "../../../direccion/direccionService";

export default function CajaEgresos({ sidebarExpanded, toggleSidebar, periodo, onEgresoRegistrado }) {
  const [correlativos, setCorrelativos] = useState(null);
  const [cargandoCorr, setCargandoCorr] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Form states
  const [beneficiario, setBeneficiario] = useState("");
  const [dni, setDni] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  async function cargarCorrelativos() {
    setCargandoCorr(true);
    try {
      const res = await obtenerCorrelativos();
      if (res) {
        setCorrelativos(res);
      }
    } catch (err) {
      toast.error("Error", { description: "No se pudieron cargar los correlativos actuales." });
    } finally {
      setCargandoCorr(false);
    }
  }

  useEffect(() => {
    cargarCorrelativos();
  }, []);

  const handleRegistrar = async (e) => {
    e.preventDefault();

    if (correlativos?.egresoActive === false) {
      toast.error("Serie Inactiva", { description: "La serie de recibos de egreso está inactiva. Actívela en Dirección." });
      return;
    }

    const limpioBeneficiario = String(beneficiario || "").trim();
    const limpioConcepto = String(concepto || "").trim();
    const numMonto = Number(monto);

    if (!limpioBeneficiario) {
      toast.error("Campo requerido", { description: "Debe ingresar el nombre del beneficiario." });
      return;
    }

    if (isNaN(numMonto) || numMonto <= 0) {
      toast.error("Monto inválido", { description: "El monto debe ser un número mayor a 0." });
      return;
    }

    if (!limpioConcepto) {
      toast.error("Campo requerido", { description: "Debe ingresar el concepto o justificación." });
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        beneficiario: limpioBeneficiario,
        dni: dni.trim(),
        monto: numMonto,
        concepto: limpioConcepto,
        periodo: periodo || "escolar",
      };

      const resEgreso = await registrarEgresoCaja(datos);

      toast.success("Egreso registrado", {
        description: `Se registró el egreso ${resEgreso.nroRecibo} por S/ ${numMonto.toFixed(2)} correctamente.`,
      });

      // Clear form
      setBeneficiario("");
      setDni("");
      setMonto("");
      setConcepto("");

      await cargarCorrelativos();

      if (onEgresoRegistrado) {
        onEgresoRegistrado();
      }
    } catch (err) {
      toast.error("Error al registrar", { description: err.message || "Intente nuevamente." });
    } finally {
      setGuardando(false);
    }
  };

  const egresoActual = correlativos?.egresoActual || "Pendiente de cargar";
  const activo = correlativos?.egresoActive !== false;

  return (
    <section className="caja-payment-workspace" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {!sidebarExpanded && (
        <div style={{ marginBottom: "6px" }}>
          <button
            className="caja-menu-toggle-btn-header"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={22} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <Coins size={24} style={{ color: "#0c8569" }} />
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1f2937" }}>
          Registrar Egreso de Caja
        </h2>
      </div>

      <Paper withBorder p="lg" radius="md" shadow="sm" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
        <form onSubmit={handleRegistrar} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <TextInput
              label="Beneficiario (Nombre/Razón Social)"
              placeholder="Ej. Juan Pérez o Librería San José"
              required
              value={beneficiario}
              onChange={(e) => setBeneficiario(e.currentTarget.value)}
              styles={{
                label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                input: { borderRadius: "8px", height: "38px" }
              }}
              style={{ flex: 2, minWidth: "250px" }}
            />

            <TextInput
              label="DNI / RUC (Opcional)"
              placeholder="Ej. 12345678"
              value={dni}
              onChange={(e) => setDni(e.currentTarget.value)}
              styles={{
                label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                input: { borderRadius: "8px", height: "38px" }
              }}
              style={{ flex: 1, minWidth: "150px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <TextInput
              label="Monto a entregar (S/)"
              placeholder="Ej. 150.00"
              required
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.currentTarget.value)}
              styles={{
                label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                input: { borderRadius: "8px", height: "38px" }
              }}
              style={{ flex: 1, minWidth: "150px" }}
            />

            <TextInput
              label="N° de Comprobante de Egreso (Siguiente a Generar)"
              value={egresoActual}
              disabled={true}
              styles={{
                label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                input: {
                  borderRadius: "8px",
                  height: "38px",
                  backgroundColor: "#f3f4f6",
                  color: "#1f2937",
                  fontWeight: 700,
                  opacity: 1
                }
              }}
              style={{ flex: 1, minWidth: "200px" }}
            />
          </div>

          <Textarea
            label="Concepto / Justificación del Gasto"
            placeholder="Ej. Reembolso por cancelación de taller de Robótica o compra de cartulinas para Arte."
            required
            rows={4}
            value={concepto}
            onChange={(e) => setConcepto(e.currentTarget.value)}
            styles={{
              label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
              input: { borderRadius: "8px" }
            }}
          />

          {!activo && (
            <Paper withBorder p="xs" radius="md" style={{ background: "#fef2f2", borderColor: "#fca5a5" }}>
              <Text size="xs" color="#dc2626" style={{ textAlign: "center", fontWeight: 700 }}>
                ⚠️ La serie de recibos de egreso está inactiva en el panel de Dirección. Debe activarla para poder registrar egresos.
              </Text>
            </Paper>
          )}

          <Group justify="flex-end" style={{ marginTop: "8px" }}>
            <Button
              type="submit"
              loading={guardando}
              disabled={!activo || cargandoCorr}
              leftSection={<Check size={16} />}
              styles={{
                root: {
                  height: "38px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  background: "#0c8569",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "#09634e"
                  }
                }
              }}
            >
              Registrar Egreso
            </Button>
          </Group>
        </form>
      </Paper>
    </section>
  );
}
