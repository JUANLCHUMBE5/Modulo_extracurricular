export function parsearHorario(horarioStr) {
  if (!horarioStr) return { nivel: "", dias: "", hora: "" };

  const str = String(horarioStr).trim();
  
  // Si contiene multiples rangos de hora (por ejemplo, / o multiples coincidencias de formato hora)
  const hourRegexGlobal = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  const matches = str.match(hourRegexGlobal);
  if (str.includes("/") || (matches && matches.length > 1)) {
    // Es un horario complejo/multiple. Devolvemos vacio para que la UI muestre la cadena original intacta.
    return { nivel: "", dias: "", hora: "" };
  }

  let cleaned = str;
  // Limpiar almuerzo y clase
  cleaned = cleaned.replace(/almuerzo\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?,?\s*/gi, "");
  cleaned = cleaned.replace(/clase\s+/gi, "");

  // Buscar el rango de horas (soporta AM/PM y formatos de 1 o 2 dígitos de hora)
  const hourRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i;
  const match = cleaned.match(hourRegex);

  let hora = "";
  if (match) {
    hora = match[1];
    // Quitar la hora de cleaned
    cleaned = cleaned.replace(hora, "").trim();
  }

  // Quitar comas sobrantes al final de lo que queda
  cleaned = cleaned.replace(/,$/, "").trim();

  // Si queda un separador de nivel/grado (dos puntos)
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    const nivel = parts[0].trim();
    const dias = parts.slice(1).join(":").trim();
    return { nivel, dias, hora };
  }

  // Si no hay dos puntos, todo lo restante se considera nivel o texto principal (ej. "Jueves")
  return { nivel: cleaned, dias: "", hora };
}
