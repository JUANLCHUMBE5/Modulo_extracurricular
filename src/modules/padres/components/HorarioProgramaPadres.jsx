import { Text } from "@mantine/core";
import { dividirHorarioPadres, repararTexto } from "../utils/padresTextUtils";

export default function HorarioProgramaPadres({ horario }) {
  const datos = dividirHorarioPadres(horario);
  if (!datos) return <Text size="sm" fw={600}>{repararTexto(horario) || "Por confirmar"}</Text>;

  return (
    <div className="padres-schedule-box">
      <strong>{datos.grados}</strong>
      <div className="padres-schedule-pills">
        <span>{datos.dia}</span>
        <span>Almuerzo: {datos.almuerzo}</span>
        <span>Clase: {datos.clase}</span>
      </div>
    </div>
  );
}
