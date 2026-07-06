import { useEffect } from "react";
import {
  IconAlertTriangle as AlertTriangle,
  IconX as X,
} from "@tabler/icons-react";

export default function FinalizarProgramaModal({
  onClose,
  onConfirm,
  programa,
}) {
  if (!programa) return null;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="coord-modal-overlay" onClick={onClose}>
      <div className="coord-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ position: "relative", padding: "24px 24px 20px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#4b5563"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
          >
            <X size={20} />
          </button>

          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "20px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827", lineHeight: "1.3" }}>
                ¿Finalizar programa?
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#4b5563", lineHeight: "1.4" }}>
                ¿Está seguro de que desea finalizar el programa <strong>{programa.nombre}</strong>?
              </p>
            </div>
          </div>

          <div style={{
            background: "#fffbeb",
            borderLeft: "4px solid #f59e0b",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "24px",
          }}>
            <strong style={{ display: "block", color: "#b45309", fontSize: "12.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px" }}>
              Advertencia importante
            </strong>
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#6b5930", display: "grid", gap: "4px", lineHeight: "1.4" }}>
              <li>Se cerrará la inscripción: Secretaría y el módulo de Padres ya no podrán registrar nuevos alumnos.</li>
              <li>El programa permanecerá visible en la lista activa para consultar datos, reportes y clonarlo para un nuevo ciclo.</li>
              <li>Si desea reabrir la matrícula, puede modificar las fechas o el campo «Aviso (días)» desde la edición del programa.</li>
              <li>Para moverlo al historial definitivamente, use la opción «Archivar» después de finalizar.</li>
            </ul>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid #f3f4f6",
            paddingTop: "16px",
          }}>
            <button
              className="coord-secondary-button"
              type="button"
              onClick={onClose}
              style={{ height: "38px", minWidth: "90px", borderRadius: "8px" }}
            >
              Cancelar
            </button>
            <button
              className="coord-danger-button"
              type="button"
              onClick={onConfirm}
              style={{
                height: "38px",
                minWidth: "120px",
                borderRadius: "8px",
                background: "#dc2626",
                border: "1px solid #dc2626",
                color: "#ffffff",
                fontWeight: 600,
              }}
            >
              Sí, finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
