import {
  IconAlertTriangle as AlertTriangle,
  IconX as X,
} from "@tabler/icons-react";

export default function ArchivarProgramaModal({
  onClose,
  onConfirm,
  programa,
}) {
  if (!programa) return null;

  return (
    <div className="coord-modal-overlay" onClick={onClose}>
      <div className="coord-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "550px", borderRadius: "16px", overflow: "hidden" }}>
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
              background: "#ffedd5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ea580c",
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827", lineHeight: "1.3" }}>
                ¿Archivar programa?
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#4b5563", lineHeight: "1.4" }}>
                ¿Está seguro de que desea archivar el taller <strong>{programa.nombre}</strong>?
              </p>
            </div>
          </div>

          <div style={{
            background: "#fffbeb",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "24px",
          }}>
            <strong style={{ display: "block", color: "#c2410c", fontSize: "12.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px" }}>
              Advertencia importante
            </strong>
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#7c2d12", display: "grid", gap: "4px", lineHeight: "1.4" }}>
              <li>Se guardará en el Historial con todos sus alumnos inscritos, asistencias y pagos.</li>
              <li>Ya no se mostrará en la lista activa ni estará disponible para nuevas inscripciones.</li>
              <li>Podrá consultar reportes de este taller, clonarlo para un nuevo ciclo o restaurarlo a activo en cualquier momento desde el apartado de Historial.</li>
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
                background: "#ea580c",
                border: "1px solid #ea580c",
                color: "#ffffff",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#c2410c"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#ea580c"}
            >
              Sí, archivar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
