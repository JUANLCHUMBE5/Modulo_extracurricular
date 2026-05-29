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
  { value: "registro_secretaria", label: "Inscritos por Secretaria" },
  { value: "registro_web", label: "Inscritos por Padres / Web" },
];

export const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

export const alertClass = "mb-3 rounded-lg border border-[#f8c7c1] bg-[#fff0ef] px-3 py-2 text-[13px] font-extrabold text-[#b42318]";
export const reportCardClass = "min-h-[72px] rounded-lg border border-[#d8e5e1] bg-white px-4 py-3";
export const reportLabelClass = "block text-[13px] font-bold text-slate-500";
export const reportValueClass = "my-1 block text-[22px] font-black text-slate-900";
