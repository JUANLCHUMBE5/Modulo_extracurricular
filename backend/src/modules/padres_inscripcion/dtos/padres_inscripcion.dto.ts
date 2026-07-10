import { z } from "zod";

// --- Crear inscripción ---
export const CrearInscripcionSchema = z.object({
  estudianteDni: z.string({ message: "El DNI del estudiante es requerido" }),
  programaId: z.string({ message: "El ID del programa es requerido" }),
  periodo: z.string().optional(),
  grupo: z.string().optional(),
  grado: z.string().optional(),
  apoderado: z.string().optional(),
  telefonoApoderado: z.string().optional(),
});

// --- Registrar documento de inscripción ---
export const RegistrarDocumentoSchema = z.object({
  tipo: z.string().optional(),
  nombre: z.string().optional(),
  contenido: z.string().optional(),
  base64: z.string().optional(),
});

// --- Derivar a caja ---
export const DerivarCajaSchema = z.object({
  monto: z.union([z.number(), z.string()]).optional(),
  observaciones: z.string().optional(),
});

// --- Actualizar apoderado ---
export const UpdateApoderadoSchema = z.object({
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
  parentesco: z.string().optional(),
});

export type CrearInscripcionDto = z.infer<typeof CrearInscripcionSchema>;
export type RegistrarDocumentoDto = z.infer<typeof RegistrarDocumentoSchema>;
export type DerivarCajaDto = z.infer<typeof DerivarCajaSchema>;
export type UpdateApoderadoDto = z.infer<typeof UpdateApoderadoSchema>;
