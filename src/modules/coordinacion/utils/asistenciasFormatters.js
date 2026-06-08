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
  return fecha.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
