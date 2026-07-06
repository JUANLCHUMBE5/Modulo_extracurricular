// Compara la hora actual con el inicio de clase para saber si el alumno llega antes del margen permitido de 10 minutos.
export function verificarLlegadaTemprano(horarioStr) {
  // 1. Si no hay horario configurado, devuelve valores por defecto indicando que no aplica
  if (!horarioStr) return { esTemprano: false, esTarde: false, horaInicio: "", horaFin: "" };

  const str = String(horarioStr);

  // 2. Intenta buscar el rango de horario de clases usando la palabra clave "clase"
  let match = str.match(/clase\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);

  if (!match) {
    // 2.1. Si no lo encuentra, limpia el horario del almuerzo para evitar cruces
    const cleaned = str.replace(/almuerzo\s+\d{2}:\d{2}-\d{2}:\d{2},?\s*/gi, "");
    
    // 2.2. Intenta buscar cualquier rango genérico HH:MM - HH:MM
    match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);

    // 2.3. Si sigue sin encontrar un rango, intenta buscar al menos una hora simple (hora de inicio)
    if (!match) {
      const singleMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
      if (!singleMatch) return { esTemprano: false, esTarde: false, horaInicio: "", horaFin: "" };

      const hours = parseInt(singleMatch[1], 10);
      const minutes = parseInt(singleMatch[2], 10);
      const meridian = singleMatch[3] ? singleMatch[3].toLowerCase().replace(/\s/g, "") : null;
      const horaInicioFmt = `${singleMatch[1]}:${singleMatch[2]}${singleMatch[3] ? ' ' + singleMatch[3] : ''}`.trim();

      // Convierte la hora de inicio a formato de 24 horas
      let hours24 = hours;
      if (meridian) {
        if (meridian.includes("p") && hours < 12) hours24 += 12;
        else if (meridian.includes("a") && hours === 12) hours24 = 0;
      }
      const inicioMinutos = hours24 * 60 + minutes;

      // Obtiene la hora actual del reloj
      const ahora = new Date();
      const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
      const diferenciaMinutos = inicioMinutos - ahoraMinutos;

      // Calcula los minutos restantes para alcanzar el margen permitido de 10 minutos previos
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

  // 3. Si encuentra el rango de hora (inicio y fin), parsea cada valor numérico
  const startHrs = parseInt(match[1], 10);
  const startMins = parseInt(match[2], 10);
  const startMeridian = match[3] ? match[3].toLowerCase().replace(/\s/g, "") : null;

  const endHrs = parseInt(match[4], 10);
  const endMins = parseInt(match[5], 10);
  const endMeridian = match[6] ? match[6].toLowerCase().replace(/\s/g, "") : null;

  // 3.1. Convierte la hora de inicio del rango a formato 24 horas
  let startHrs24 = startHrs;
  if (startMeridian) {
    if (startMeridian.includes("p") && startHrs < 12) startHrs24 += 12;
    else if (startMeridian.includes("a") && startHrs === 12) startHrs24 = 0;
  }
  const inicioMinutos = startHrs24 * 60 + startMins;

  // 3.2. Convierte la hora de término a formato 24 horas
  let endHrs24 = endHrs;
  if (endMeridian) {
    if (endMeridian.includes("p") && endHrs < 12) endHrs24 += 12;
    else if (endMeridian.includes("a") && endHrs === 12) endHrs24 = 0;
  }
  if (endHrs24 < startHrs24 && !endMeridian) {
    endHrs24 += 12; // Maneja cruce de medianoche en rangos sin meridianos explícitos
  }
  const finMinutos = endHrs24 * 60 + endMins;

  // 4. Obtiene el tiempo actual y calcula la diferencia respecto a la clase
  const ahora = new Date();
  const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const diferenciaMinutos = inicioMinutos - ahoraMinutos;

  const horaInicioFmt = `${match[1]}:${match[2]}${match[3] ? ' ' + match[3] : ''}`.trim();
  const horaFinFmt = `${match[4]}:${match[5]}${match[6] ? ' ' + match[6] : ''}`.trim();

  // 5. Calcula cuántos minutos de espera le corresponden al alumno antes de poder ingresar
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
  // 1. Si no hay horario asignado, bloquea el acceso por seguridad
  if (!horarioStr) return false;

  // 2. Obtiene el día de la semana correspondiente a hoy en español y minúsculas
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const hoyEsp = diasSemana[new Date().getDay()];

  // Helper para eliminar acentos y pasar a minúsculas
  const normalizar = (txt) => String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 3. Normaliza el string de horarios de la base de datos
  const horarioNorm = normalizar(horarioStr);
  const diasEncontrados = diasSemana.filter(dia => horarioNorm.includes(dia));

  // 4. Si el horario no contiene ningún día de la semana (ej. "Horario no configurado"), deniega el acceso
  if (diasEncontrados.length === 0) return false;

  // 5. Compara si el día de hoy está contenido en los días permitidos del taller
  return horarioNorm.includes(hoyEsp);
}
