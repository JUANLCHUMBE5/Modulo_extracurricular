import { z } from "zod";

// --- Crear inscripción (matches inscripcion-registration.service.ts) ---
export const CrearInscripcionSchema = z.object({
  estudiante_id: z.string({ message: "El DNI del estudiante es requerido" }),
  programa_id: z.string({ message: "El ID del programa es requerido" }),
  origen_inscripcion: z.string().optional(),
  seccion: z.string().optional(),
  grado: z.string().optional(),
  apoderado: z.string().optional(),
  telefono_apoderado: z.string().optional(),
  correo_apoderado: z.string().optional(),
  talla_uniforme: z.string().optional(),
  talla_polo: z.string().optional(),
  talla_short: z.string().optional(),
  seleccion: z.string().optional(),
  nivel_cambridge: z.string().optional(),
  horario: z.string().optional(),
});

// --- Registrar documento de inscripción (matches inscripcion-workflow.service.ts) ---
export const RegistrarDocumentoSchema = z.object({
  usuario: z.string().optional(),
  tipo_documento: z.string().optional(),
  plantilla: z.string().optional(),
});

// --- Derivar a caja / Reservar caja (matches inscripcion-workflow.service.ts) ---
// derivarCaja hace spread de body completo, reservarCaja usa body.dni_estudiante
export const DerivarCajaSchema = z.object({
  dni_estudiante: z.string().optional(),
  monto: z.union([z.number(), z.string()]).optional(),
  observaciones: z.string().optional(),
  costo: z.union([z.number(), z.string()]).optional(),
  costoOriginal: z.union([z.number(), z.string()]).optional(),
});

// --- Actualizar apoderado (matches inscripcion-portal.service.ts) ---
export const UpdateApoderadoSchema = z.object({
  apoderado: z.string().optional(),
  telefono: z.string().optional(),
  telefono_apoderado: z.string().optional(),
  correo: z.string().optional(),
  correo_apoderado: z.string().optional(),
});

export type CrearInscripcionDto = z.infer<typeof CrearInscripcionSchema>;
export type RegistrarDocumentoDto = z.infer<typeof RegistrarDocumentoSchema>;
export type DerivarCajaDto = z.infer<typeof DerivarCajaSchema>;
export type UpdateApoderadoDto = z.infer<typeof UpdateApoderadoSchema>;
