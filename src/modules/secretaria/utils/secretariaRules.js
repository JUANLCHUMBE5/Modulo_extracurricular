export const formularioInicial = {
  dniExterno: "",
  nombresExterno: "",
  edadExterno: "",
  fechaNacimientoExterno: "",
  domicilioExterno: "",
  sexoExterno: "",
  tipoAlumnoVerano: "Alumno externo",
  gradoExterno: "",
  programa: "",
  colegioProcedencia: "",
  apoderado: "",
  telefono: "",
  correo: "",
  medioEnvio: "Impreso",
  tallaUniforme: "",
  tallaPolo: "",
  tallaShort: "",
  observacion: "",
  aceptaCondiciones: false,
};

export const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

export function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function calcularEdadSecretaria(estudiante, formulario = {}) {
  const edadDirecta = Number(formulario.edadExterno || estudiante?.edad || estudiante?.edadEstudiante || "");
  if (Number.isFinite(edadDirecta) && edadDirecta > 0) return edadDirecta;

  const fecha = formulario.fechaNacimientoExterno || estudiante?.fechaNacimiento;
  if (!fecha) return "";
  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return "";
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad > 0 ? edad : "";
}

export function programaDisponibleParaEdadSecretaria(programa, edadAlumno = "") {
  const minimo = Number(programa?.edadMinima || 0);
  const maximo = Number(programa?.edadMaxima || 0);
  if (!minimo && !maximo) return true;
  const edad = Number(edadAlumno);
  if (!Number.isFinite(edad) || edad <= 0) return true;
  if (minimo && edad < minimo) return false;
  if (maximo && edad > maximo) return false;
  return true;
}

export function etiquetaProgramaSecretaria(programa) {
  return programa?.nombre || "";
}

export function esProgramaCambridgeSecretaria(programa) {
  return normalizarComparacion([
    programa?.nombre,
    programa?.programa,
    programa?.plantilla,
  ].filter(Boolean).join(" ")).includes("cambridge");
}
