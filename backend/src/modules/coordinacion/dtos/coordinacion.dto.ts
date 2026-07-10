import { z } from "zod";

// --- Crear categoría ---
export const CrearCategoriaSchema = z.object({
  nombre: z.string({ message: "El nombre de la categoría es requerido" }).min(2, "El nombre debe tener al menos 2 caracteres"),
});

// --- Cambiar estado de programa ---
export const UpdateEstadoProgramaSchema = z.object({
  estado: z.string({ message: "El estado es requerido" }),
});

// --- Invitar estudiante a programa ---
export const InvitarEstudianteSchema = z.object({
  estudianteDni: z.string({ message: "El DNI del estudiante es requerido" }),
  grado: z.string().optional(),
  grupo: z.string().optional(),
});

// --- Registrar asistencia ---
export const RegistrarAsistenciaSchema = z.object({
  estudianteDni: z.string({ message: "El DNI del estudiante es requerido" }),
  programaId: z.string({ message: "El ID del programa es requerido" }),
  fecha: z.string().optional(),
  estado: z.string().optional(),
  observaciones: z.string().optional(),
});

// --- Subir documento de programa ---
export const SubirDocumentoProgramaSchema = z.object({
  programaId: z.string({ message: "El ID del programa es requerido" }),
  plantilla: z.string().optional(),
  plantillaBase64: z.string().optional(),
  plantillaValidada: z.boolean().optional(),
});

export type CrearCategoriaDto = z.infer<typeof CrearCategoriaSchema>;
export type UpdateEstadoProgramaDto = z.infer<typeof UpdateEstadoProgramaSchema>;
export type InvitarEstudianteDto = z.infer<typeof InvitarEstudianteSchema>;
export type RegistrarAsistenciaDto = z.infer<typeof RegistrarAsistenciaSchema>;
export type SubirDocumentoProgramaDto = z.infer<typeof SubirDocumentoProgramaSchema>;
