import { Text } from "@mantine/core";
import { dividirHorarioPadres, repararTexto, convertirHorasAMPM } from "../utils/padresTextUtils";

export default function HorarioProgramaPadres({ horario }) {
  const datos = dividirHorarioPadres(horario);
  
  if (datos) {
    return (
      <div className="padres-schedule-box">
        <strong>{datos.grados}</strong>
        <div className="padres-schedule-pills">
          <span>{datos.dia}</span>
          <span>Almuerzo: {convertirHorasAMPM(datos.almuerzo)}</span>
          <span>Clase: {convertirHorasAMPM(datos.clase)}</span>
        </div>
      </div>
    );
  }

  const texto = repararTexto(String(horario || "")).trim();
  const sessions = texto.split("/").map(s => s.trim()).filter(Boolean);
  const isComplex = sessions.some(s => s.includes(":"));

  if (isComplex) {
    const dias = [];
    sessions.forEach((session) => {
      const colonIdx = session.indexOf(":");
      if (colonIdx > -1) {
        const left = session.substring(0, colonIdx).trim();
        // Validate that the left side doesn't contain digits (so it's a day, not a time)
        if (!/\d/.test(left) && left.length > 2) {
          dias.push(left);
        }
      }
    });

    const uniqueDias = Array.from(new Set(dias));
    let diasTexto = "";
    if (uniqueDias.length === 1) {
      diasTexto = uniqueDias[0];
    } else if (uniqueDias.length > 1) {
      diasTexto = `${uniqueDias.slice(0, -1).join(", ")} y ${uniqueDias[uniqueDias.length - 1]}`;
    } else {
      diasTexto = "Varios días";
    }

    return <Text size="sm">{diasTexto}</Text>;
  }

  return <Text size="sm">{convertirHorasAMPM(texto) || "Por confirmar"}</Text>;
}
