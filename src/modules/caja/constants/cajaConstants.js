import { fechaActualInput } from "../../../services/dateService";

export const formularioInicial = {
  inscripcionId: "",
  estudianteDni: "",
  estudianteNombre: "",
  programaId: "",
  programaNombre: "",
  periodo: "",
  tipoAlumno: "",
  monto: "",
  concepto: "Inscripcion",
  formaPago: "Efectivo",
  estado: "completado",
  fechaPago: fechaActualInput(),
  observaciones: "",
  nroRecibo: "",
};

export const estadoLabels = {
  completado: "Pagado",
  pendiente: "Pendiente",
  cancelado: "Anulado",
};

export const estadoColors = {
  completado: "green",
  pendiente: "yellow",
  cancelado: "red",
};

export const tiposReporte = [
  { value: "todos", label: "Todos los registros (Padres y Asistente)" },
  { value: "registro_secretaria", label: "Inscritos por Asistente" },
  { value: "registro_web", label: "Inscritos por Padres / Web" },
  { value: "pagos_pendientes", label: "Solo pendientes de pago" },
  { value: "pagos_realizados", label: "Solo pagos realizados / validados" },
  { value: "becas_descuentos", label: "Becas / Descuentos" },
];

export const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

export const alertClass = "mb-3 rounded-lg border border-[#f8c7c1] bg-[#fff0ef] px-3 py-2 text-[13px] font-extrabold text-[#b42318]";
export const reportCardClass = "rounded-lg border border-[#d8e5e1] bg-white px-4 py-2";
export const reportLabelClass = "block text-xs font-semibold text-slate-500";
export const reportValueClass = "my-0.5 block text-lg font-extrabold text-slate-900";
