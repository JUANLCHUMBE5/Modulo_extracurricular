import { z } from "zod";

// --- Aplicar descuento ---
export const AplicarDescuentoSchema = z.object({
  inscripcionId: z.string({ message: "El ID de inscripción es requerido" }),
  porcentaje: z.union([z.number(), z.string()]).optional(),
  montoFijo: z.union([z.number(), z.string()]).optional(),
  motivo: z.string({ message: "El motivo del descuento es requerido" }).min(2, "El motivo debe tener al menos 2 caracteres"),
  tipoDescuento: z.string().optional(),
});

// --- Actualizar correlativos ---
export const UpdateCorrelativosSchema = z.object({
  serie: z.string({ message: "La serie es requerida" }),
  siguiente: z.union([z.number(), z.string()], { message: "El siguiente correlativo es requerido" }),
  tipo: z.string().optional(),
});

export type AplicarDescuentoDto = z.infer<typeof AplicarDescuentoSchema>;
export type UpdateCorrelativosDto = z.infer<typeof UpdateCorrelativosSchema>;
