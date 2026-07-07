export const badgeStyle = (activo, tone) => ({
  padding: "2px 6px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 700,
  background: activo ? "#e8f7ef" : tone === "warning" ? "#fef6e7" : "#fdf2f2",
  color: activo ? "#006b5b" : tone === "warning" ? "#b25e00" : "#b42318",
  display: "inline-block",
});

export function formatearFechaAsistencia(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  const texto = fecha.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function obtenerFechaAsistencia(asistencia = {}) {
  return asistencia.fechaRegistro || asistencia.fecha || asistencia.createdAt || asistencia.fechaAsistencia || "";
}

export function obtenerDniAsistencia(asistencia = {}) {
  return asistencia.dni || asistencia.dniEstudiante || asistencia.estudianteId || "";
}

export function obtenerNombreAsistencia(asistencia = {}) {
  return asistencia.nombres || asistencia.nombresEstudiante || asistencia.estudianteNombre || asistencia.alumno || "";
}

export function obtenerEstadoAccesoAsistencia(asistencia = {}) {
  return asistencia.estadoAcceso || asistencia.estado || asistencia.estadoAsistencia || "";
}

export function formatearHoraAsistencia(valor) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  
  let hours = fecha.getHours();
  const minutes = String(fecha.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${hours}.${minutes} ${ampm}`;
}

export function claveFechaAsistencia(valor) {
  if (!valor) return "sin-fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "sin-fecha";
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function agruparAsistenciasPorFecha(asistencias) {
  return asistencias.reduce((grupos, asistencia) => {
    const fecha = obtenerFechaAsistencia(asistencia);
    const clave = claveFechaAsistencia(fecha);
    if (!grupos[clave]) {
      grupos[clave] = {
        clave,
        titulo: formatearFechaAsistencia(fecha),
        filas: [],
      };
    }
    grupos[clave].filas.push(asistencia);
    return grupos;
  }, {});
}

export function normalizarNombreArchivoPdf(valor) {
  return String(valor || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "archivo";
}

export function calcularEdad(fechaNac) {
  if (!fechaNac) return "—";
  const birth = new Date(fechaNac);
  if (Number.isNaN(birth.getTime())) return "—";
  const hoy = new Date();
  let edad = hoy.getFullYear() - birth.getFullYear();
  const m = hoy.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < birth.getDate())) {
    edad--;
  }
  return `${edad} años`;
}

export function limpiarHorarioSinAlmuerzo(horarioStr = "") {
  if (!horarioStr) return "";
  return String(horarioStr)
    .replace(/almuerzo\s+[^,]+,\s*(clase\s*)?/i, "")
    .replace(/\bclase\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatGradoLabel(g: any) {
  if (!g) return "Sin Grado";
  const parts = String(g || "").split(":");
  if (parts.length === 2) {
    const nivel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    return `${parts[1]}° ${nivel}`;
  }
  const match = String(g).match(/(\d+)\s+(\w+)/);
  if (match) {
    const nivel = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
    return `${match[1]}° ${nivel}`;
  }
  return g;
}

export function obtenerNombreHojaSeguro(name: string) {
  let clean = String(name || "Hoja")
    .replace(/[\\/?*\[\]:]/g, "")
    .trim();
  if (clean.length > 31) {
    clean = clean.substring(0, 31);
  }
  return clean || "Hoja";
}

export function normalizarTextoSimple(val = "") {
  return String(val || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function compararGrados(g1 = "", g2 = "") {
  const t1 = String(g1 || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const t2 = String(g2 || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
    
  if (t1 === t2) return true;

  const num1 = t1.match(/\d+/)?.[0] || "";
  const num2 = t2.match(/\d+/)?.[0] || "";
  if (!num1 || !num2 || num1 !== num2) return false;

  const nivel1 = ["inicial", "primaria", "secundaria"].find((n) => t1.includes(n)) || "";
  const nivel2 = ["inicial", "primaria", "secundaria"].find((n) => t2.includes(n)) || "";

  return nivel1 === nivel2;
}

export const parseDiasSemana = (texto = "") => {
  const norm = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  const diasEncontrados = [];
  if (norm.includes("lunes")) diasEncontrados.push(1);
  if (norm.includes("martes")) diasEncontrados.push(2);
  if (norm.includes("miercoles")) diasEncontrados.push(3);
  if (norm.includes("jueves")) diasEncontrados.push(4);
  if (norm.includes("viernes")) diasEncontrados.push(5);
  if (norm.includes("sabado")) diasEncontrados.push(6);
  if (norm.includes("domingo")) diasEncontrados.push(0);
  return diasEncontrados;
};

export const generarFechasProgramadas = (prog: any, inicioStr: string, finStr: string) => {
  if (!inicioStr || !finStr) return [];
  
  let textoDias = "";
  if (Array.isArray(prog?.horariosPorGrupo) && prog.horariosPorGrupo.length > 0) {
    textoDias = prog.horariosPorGrupo.map((g: any) => g.dia).join(", ");
  } else {
    textoDias = prog?.horario || "";
  }
  
  const diasSemana = parseDiasSemana(textoDias);
  if (diasSemana.length === 0) return [];
  
  const start = new Date(inicioStr + "T00:00:00");
  const end = new Date(finStr + "T00:00:00");
  
  const dates = [];
  let current = new Date(start);
  let safety = 0;
  while (current <= end && safety < 366) {
    safety++;
    const dayOfWeek = current.getDay();
    if (diasSemana.includes(dayOfWeek)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};
