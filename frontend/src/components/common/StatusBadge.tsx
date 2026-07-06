import React from "react";
import { Badge } from "@mantine/core";

// Mappings of project status strings to Mantine theme colors/variants
const STATUS_COLOR_MAP = {
  // Pagos / Cobros
  pagado: "green",
  pago: "green",
  completado: "green",
  pendiente: "orange",
  observado: "red",
  vencido: "red",
  "pago en proceso": "blue",
  "pago verificado": "green",
  verificando: "blue",

  // Inscripciones / Flujo padres
  "inscripción completada": "green",
  "inscripcion completada": "green",
  "cupo reservado": "orange",
  "reservar": "orange",
  "derivado": "blue",
  "derivado a caja": "blue",
  "por revisar": "orange",

  // Estados de Cuentas / Usuarios / Talleres
  activo: "teal",
  inactivo: "gray",
  habilitado: "teal",
  deshabilitado: "gray",
  vigente: "teal",
};

/**
 * StatusBadge - A reusable component that translates status strings
 * to unified, beautifully colored badges for consistent UI styling.
 */
export default function StatusBadge({ status, children, size = "md", radius = "sm", ...props }) {
  const normalizedStatus = String(status || children || "").toLowerCase().trim();

  // Find color match or default to gray
  let color = "gray";
  for (const [key, val] of Object.entries(STATUS_COLOR_MAP)) {
    if (normalizedStatus.includes(key)) {
      color = val;
      break;
    }
  }

  // Define some custom styling variables based on Mantine values
  return (
    <Badge
      color={color}
      size={size}
      radius={radius}
      variant="light"
      style={{
        textTransform: "capitalize",
        fontWeight: 600,
        ...props.style,
      }}
      {...props}
    >
      {children || status}
    </Badge>
  );
}
