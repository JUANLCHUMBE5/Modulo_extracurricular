import React from "react";
import StatusBadge from "../../../components/common/StatusBadge";

export default function PortalBadge({ children, tone = "green" }) {
  const toneToStatus = {
    green: "inscripcion completada",
    orange: "cupo reservado",
    blue: "pago en proceso",
    gray: "inactivo",
  };

  const status = toneToStatus[tone] || "pendiente";

  return (
    <StatusBadge status={status} size="sm" className="padres-flow-badge">
      {children}
    </StatusBadge>
  );
}
