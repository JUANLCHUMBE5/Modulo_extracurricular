import { z } from "zod";

// --- Aplicar descuento (matches direccion-descuentos.service.ts) ---
export const AplicarDescuentoSchema = z.object({
  inscripcionId: z.string({ message: "El ID de inscripción es requerido" }),
  tipo: z.string().optional(),
  valor: z.union([z.number(), z.string()]).optional(),
  justificacion: z.string({ message: "La justificación del descuento es requerida" }).min(1, "La justificación no puede estar vacía"),
});

// --- Actualizar correlativos (matches direccion-correlativos.service.ts) ---
export const UpdateCorrelativosSchema = z.object({
  reciboInicio: z.string().optional(),
  reciboActual: z.string().optional(),
  reciboActive: z.boolean().optional(),
  reciboVirtualInicio: z.string().optional(),
  reciboVirtualActual: z.string().optional(),
  reciboVirtualActive: z.boolean().optional(),
  egresoInicio: z.string().optional(),
  egresoActual: z.string().optional(),
  egresoActive: z.boolean().optional(),
});

export type AplicarDescuentoDto = z.infer<typeof AplicarDescuentoSchema>;
export type UpdateCorrelativosDto = z.infer<typeof UpdateCorrelativosSchema>;
