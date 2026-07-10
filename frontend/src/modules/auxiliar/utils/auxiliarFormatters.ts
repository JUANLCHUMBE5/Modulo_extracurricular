export function parsearHorario(horarioStr, gradoEstudiante = "") {
  if (!horarioStr) return { nivel: "", dias: "", hora: "" };

  let str = String(horarioStr).trim();
  const gradoLower = String(gradoEstudiante || "").trim().toLowerCase();

  // Si contiene multiples niveles separados por "/"
  if (str.includes("/")) {
    const partes = str.split("/");
    let parteSeleccionada = partes[0]; // Por defecto la primera parte

    if (gradoLower) {
      const esSecundaria = gradoLower.includes("secundaria");
      const esPrimaria = gradoLower.includes("primaria");
      const esInicial = gradoLower.includes("inicial");

      for (const parte of partes) {
        const parteLower = parte.toLowerCase();
        if (esSecundaria && parteLower.includes("secundaria")) {
          parteSeleccionada = parte;
          break;
        }
        if (esPrimaria && parteLower.includes("primaria")) {
          parteSeleccionada = parte;
          break;
        }
        if (esInicial && parteLower.includes("inicial")) {
          parteSeleccionada = parte;
          break;
        }
      }
    }
    str = parteSeleccionada.trim();
  }

  const hourRegexGlobal = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  const matches = str.match(hourRegexGlobal);
  if (str.includes("/") || (matches && matches.length > 1)) {
    return { nivel: str, dias: "", hora: "" };
  }

  let cleaned = str;
  // Limpiar almuerzo y clase
  cleaned = cleaned.replace(/almuerzo\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?,?\s*/gi, "");
  cleaned = cleaned.replace(/clase\s+/gi, "");

  // Buscar el rango de horas
  const hourRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i;
  const match = cleaned.match(hourRegex);

  let hora = "";
  if (match) {
    hora = match[1];
    cleaned = cleaned.replace(hora, "").trim();
  }

  cleaned = cleaned.replace(/,$/, "").trim();
  cleaned = cleaned.replace(/\s*·\s*$/, "").trim();

  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    if (parts.length > 2) {
      const nivel = `${parts[0].trim()} (${parts[1].trim()})`;
      const dias = parts.slice(2).join(":").trim();
      return { nivel, dias, hora };
    } else {
      const nivel = parts[0].trim();
      const dias = parts[1].trim();
      return { nivel, dias, hora };
    }
  }

  return { nivel: cleaned, dias: "", hora };
}
