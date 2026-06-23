export function parsearHorario(horarioStr) {
  if (!horarioStr) return { nivel: "", dias: "", hora: "" };

  let cleaned = String(horarioStr).trim();
  // Limpiar almuerzo y clase
  cleaned = cleaned.replace(/almuerzo\s+\d{2}:\d{2}-\d{2}:\d{2},?\s*/gi, "");
  cleaned = cleaned.replace(/clase\s+/gi, "");

  const parts = cleaned.split(":");
  if (parts.length >= 2) {
    const nivel = parts[0].trim();
    const rest = parts.slice(1).join(":").trim();

    const hourRegex = /(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/g;
    const hours = rest.match(hourRegex);
    if (hours && hours.length > 0) {
      const hora = hours[0];
      const dias = rest.replace(hora, "").trim().replace(/,$/, "").trim();
      return { nivel, dias, hora };
    }
    return { nivel, dias: rest, hora: "" };
  }
  return { nivel: cleaned, dias: "", hora: "" };
}
