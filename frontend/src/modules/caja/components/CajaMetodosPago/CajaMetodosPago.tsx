import React, { useState } from "react";
import { TextInput, Button, Group, Badge } from "@mantine/core";
import {
  IconPlus as Plus,
  IconTrash as Trash,
  IconCheck as Check,
  IconMenu2 as Menu,
  IconCreditCard as CreditCard,
} from "@tabler/icons-react";

export default function CajaMetodosPago({
  sidebarExpanded,
  toggleSidebar,
  metodosPago = [],
  actualizarMetodosPago,
}: {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  metodosPago: string[];
  actualizarMetodosPago: (nuevosMetodos: string[]) => Promise<boolean>;
}) {
  const [listaMetodos, setListaMetodos] = useState<string[]>(metodosPago);
  const [nuevoMetodo, setNuevoMetodo] = useState("");
  const [guardando, setGuardando] = useState(false);

  React.useEffect(() => {
    setListaMetodos(metodosPago);
  }, [metodosPago]);

  const handleAgregar = () => {
    const clean = nuevoMetodo.trim();
    if (!clean) return;
    if (listaMetodos.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      return;
    }
    setListaMetodos([...listaMetodos, clean]);
    setNuevoMetodo("");
  };

  const handleEliminar = (index: number) => {
    const metodo = listaMetodos[index];
    if (metodo.toLowerCase() === "efectivo") return;
    const nueva = [...listaMetodos];
    nueva.splice(index, 1);
    setListaMetodos(nueva);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    await actualizarMetodosPago(listaMetodos);
    setGuardando(false);
  };

  const seCambio = JSON.stringify(listaMetodos) !== JSON.stringify(metodosPago);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {!sidebarExpanded && (
          <button
            className="sidebar-floating-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
              borderRadius: "6px",
              color: "#374151"
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CreditCard size={22} color="#0c8569" />
          <h2 style={{ margin: 0, color: "#111827", fontSize: "20px", fontWeight: 800 }}>
            Configuración de Métodos de Pago
          </h2>
        </div>
      </header>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "20px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {/* Fila para agregar */}
        <Group style={{ width: "100%", gap: "12px" }} align="flex-end">
          <TextInput
            placeholder="Ingrese nuevo método (ej. PayPal)"
            value={nuevoMetodo}
            onChange={(e) => setNuevoMetodo(e.target.value)}
            style={{ flex: 1 }}
            size="sm"
            styles={{
              input: { borderRadius: "6px", borderColor: "#cbd5e1", height: "38px" }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAgregar();
            }}
          />
          <Button
            onClick={handleAgregar}
            leftSection={<Plus size={16} />}
            size="sm"
            disabled={!nuevoMetodo.trim()}
            styles={{
              root: {
                borderRadius: "6px",
                backgroundColor: "#0c8569",
                color: "#ffffff",
                fontWeight: 600,
                height: "38px",
                padding: "0 16px",
                "&:hover": { backgroundColor: "#0a7058" }
              }
            }}
          >
            Agregar
          </Button>
        </Group>

        {/* Lista de canales */}
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
                  padding: "12px 16px",
                  borderBottom: idx < listaMetodos.length - 1 ? "1px solid #e2e8f0" : "none",
                  backgroundColor: esEfectivo ? "#f0fdf4" : "transparent"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{metodo}</span>
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
                    onClick={() => handleEliminar(idx)}
                    size="xs"
                    styles={{
                      root: {
                        padding: "0 8px",
                        height: "28px",
                        minWidth: "auto",
                        borderRadius: "6px"
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

        {/* Botón Guardar */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
          <Button
            onClick={handleGuardar}
            loading={guardando}
            disabled={!seCambio}
            leftSection={<Check size={16} />}
            styles={{
              root: {
                borderRadius: "6px",
                backgroundColor: seCambio ? "#000000" : "#cbd5e1",
                color: "#ffffff",
                fontWeight: 600,
                height: "38px",
                padding: "0 20px",
                "&:hover": {
                  backgroundColor: seCambio ? "#1e293b" : "#cbd5e1"
                }
              }
            }}
          >
            Guardar Configuración
          </Button>
        </div>
      </section>
    </div>
  );
}
