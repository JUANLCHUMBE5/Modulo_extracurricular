import { z } from "zod";

// --- Crear categoría (matches coordinacion.controller.ts) ---
export const CrearCategoriaSchema = z.object({
  nombre: z.string({ message: "El nombre de la categoría es requerido" }).min(2, "El nombre debe tener al menos 2 caracteres"),
});

// --- Cambiar estado de programa ---
export const UpdateEstadoProgramaSchema = z.object({
  estado: z.string({ message: "El estado es requerido" }),
});

// --- Invitar estudiante a programa (matches coordinacion-invitation.service.ts) ---
export const InvitarEstudianteSchema = z.object({
  dni: z.string({ message: "El DNI del estudiante es requerido" }),
  nombres: z.string({ message: "Los nombres del estudiante son requeridos" }),
  grado: z.string().optional(),
  seccion: z.string().optional(),
  email: z.string().optional(),
  telefono: z.string().optional(),
  seleccion: z.string().optional(),
  nivelCambridge: z.string().optional(),
}).passthrough();

// --- Registrar asistencia (matches coordinacion-attendance.service.ts) ---
export const RegistrarAsistenciaSchema = z.object({
  inscripcion_id: z.string().optional(),
  pago_id: z.string().optional(),
  dni_estudiante: z.string({ message: "El DNI del estudiante es requerido" }),
  estado_acceso: z.string().optional(),
  observacion: z.string().optional(),
  origen: z.string().optional(),
}).passthrough();

export const SubirDocumentoProgramaSchema = z.object({
  id: z.string().optional(),
  plantillaBase64: z.string().optional(),
  plantilla_base64: z.string().optional(),
  plantillaVariables: z.array(z.string()).optional(),
  plantilla_variables: z.array(z.any()).optional(),
  plantillaNombre: z.string().optional(),
  plantilla: z.string().optional(),
  nombre_programa: z.string().optional(),
  nombre: z.string().optional(),
  categoria: z.string().optional(),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  monto: z.union([z.number(), z.string()]).optional(),
  costo: z.union([z.number(), z.string()]).optional(),
  cupos: z.union([z.number(), z.string()]).optional(),
  grados: z.array(z.string()).optional(),
  periodo: z.string().optional(),
  modalidad_cobro: z.string().optional(),
  requiere_uniforme: z.boolean().optional(),
  horario: z.string().optional(),
  grupo: z.string().optional(),
  dias: z.array(z.string()).optional(),
  comunicado: z.string().optional(),
  comunicado_completo: z.string().optional(),
  requisitos: z.string().optional(),
  detalle_costo: z.string().optional(),
  detalle_almuerzo: z.string().optional(),
  concesionarios: z.string().optional(),
  tipo_comunicado: z.string().optional(),
  tipoComunicado: z.string().optional(),
  tipo_documento: z.string().optional(),
  tipoDocumento: z.string().optional(),
}).passthrough();

export type CrearCategoriaDto = z.infer<typeof CrearCategoriaSchema>;
export type UpdateEstadoProgramaDto = z.infer<typeof UpdateEstadoProgramaSchema>;
export type InvitarEstudianteDto = z.infer<typeof InvitarEstudianteSchema>;
export type RegistrarAsistenciaDto = z.infer<typeof RegistrarAsistenciaSchema>;
export type SubirDocumentoProgramaDto = z.infer<typeof SubirDocumentoProgramaSchema>;
