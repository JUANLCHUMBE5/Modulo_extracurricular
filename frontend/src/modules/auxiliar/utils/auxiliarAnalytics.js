// Compara la hora actual con el inicio de clase para saber si el alumno llega antes del margen permitido de 10 minutos.
export function verificarLlegadaTemprano(horarioStr) {
  if (!horarioStr) return { esTemprano: false, esTarde: false, horaInicio: "", horaFin: "" };

  const str = String(horarioStr);

  // 1. Intentar buscar rango de clase con prefijo "clase"
  let match = str.match(/clase\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);

  if (!match) {
    // Si no encontramos con "clase", limpiamos almuerzo e intentamos buscar cualquier rango de hora
    const cleaned = str.replace(/almuerzo\s+\d{2}:\d{2}-\d{2}:\d{2},?\s*/gi, "");
    match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);

    // Si aún no encontramos un rango de hora, buscamos al menos una hora simple (hora de inicio)
    if (!match) {
      const singleMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
      if (!singleMatch) return { esTemprano: false, esTarde: false, horaInicio: "", horaFin: "" };

      const hours = parseInt(singleMatch[1], 10);
      const minutes = parseInt(singleMatch[2], 10);
      const meridian = singleMatch[3] ? singleMatch[3].toLowerCase().replace(/\s/g, "") : null;
      const horaInicioFmt = `${singleMatch[1]}:${singleMatch[2]}${singleMatch[3] ? ' ' + singleMatch[3] : ''}`.trim();

      let hours24 = hours;
      if (meridian) {
        if (meridian.includes("p") && hours < 12) hours24 += 12;
        else if (meridian.includes("a") && hours === 12) hours24 = 0;
      }
      const inicioMinutos = hours24 * 60 + minutes;

      const ahora = new Date();
      const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
      const diferenciaMinutos = inicioMinutos - ahoraMinutos;

      const minutosFaltantes = diferenciaMinutos - 10;
      return {
        esTemprano: diferenciaMinutos > 10,
        esTarde: false,
        horaInicio: horaInicioFmt,
        horaFin: "",
        minutosFaltantes: minutosFaltantes > 0 ? minutosFaltantes : 0
      };
    }
  }

  // Si encontramos un rango de hora: inicio - fin
  const startHrs = parseInt(match[1], 10);
  const startMins = parseInt(match[2], 10);
  const startMeridian = match[3] ? match[3].toLowerCase().replace(/\s/g, "") : null;

  const endHrs = parseInt(match[4], 10);
  const endMins = parseInt(match[5], 10);
  const endMeridian = match[6] ? match[6].toLowerCase().replace(/\s/g, "") : null;

  let startHrs24 = startHrs;
  if (startMeridian) {
    if (startMeridian.includes("p") && startHrs < 12) startHrs24 += 12;
    else if (startMeridian.includes("a") && startHrs === 12) startHrs24 = 0;
  }
  const inicioMinutos = startHrs24 * 60 + startMins;

  let endHrs24 = endHrs;
  if (endMeridian) {
    if (endMeridian.includes("p") && endHrs < 12) endHrs24 += 12;
    else if (endMeridian.includes("a") && endHrs === 12) endHrs24 = 0;
  }
  if (endHrs24 < startHrs24 && !endMeridian) {
    endHrs24 += 12;
  }
  const finMinutos = endHrs24 * 60 + endMins;

  const ahora = new Date();
  const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();

  const diferenciaMinutos = inicioMinutos - ahoraMinutos;

  const horaInicioFmt = `${match[1]}:${match[2]}${match[3] ? ' ' + match[3] : ''}`.trim();
  const horaFinFmt = `${match[4]}:${match[5]}${match[6] ? ' ' + match[6] : ''}`.trim();

  const minutosFaltantes = diferenciaMinutos - 10;
  return {
    esTemprano: diferenciaMinutos > 10,
    esTarde: ahoraMinutos > finMinutos,
    horaInicio: horaInicioFmt,
    horaFin: horaFinFmt,
    minutosFaltantes: minutosFaltantes > 0 ? minutosFaltantes : 0
  };
}

// Verifica si hoy corresponde al día programado para el taller del alumno.
export function esDiaCorrecto(horarioStr) {
  if (!horarioStr) return false;

  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const hoyEsp = diasSemana[new Date().getDay()];

  const normalizar = (txt) => String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const horarioNorm = normalizar(horarioStr);
  const diasEncontrados = diasSemana.filter(dia => horarioNorm.includes(dia));

  if (diasEncontrados.length === 0) return false;

  return horarioNorm.includes(hoyEsp);
}
