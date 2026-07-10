import { z } from "zod";

// --- Registro de pago ---
export const RegistrarPagoSchema = z.object({
  estudianteDni: z.string({ message: "El DNI del estudiante es requerido" }),
  inscripcionId: z.string({ message: "El ID de inscripción es requerido" }),
  monto: z.union([z.number(), z.string()], { message: "El monto es requerido" }),
  medioPago: z.string().optional(),
  observaciones: z.string().optional(),
  comprobante: z.string().optional(),
  concepto: z.string().optional(),
});

// --- Registro de egreso ---
export const RegistrarEgresoSchema = z.object({
  concepto: z.string({ message: "El concepto del egreso es requerido" }).min(2, "El concepto debe tener al menos 2 caracteres"),
  monto: z.union([z.number(), z.string()], { message: "El monto es requerido" }),
  categoria: z.string().optional(),
  observaciones: z.string().optional(),
  fecha: z.string().optional(),
});

// --- Acción sobre pago (validar, observar, rechazar, anular) ---
export const AccionPagoSchema = z.object({
  observaciones: z.string().optional(),
});

// --- Cancelar correlativo ---
export const CancelarCorrelativoSchema = z.object({
  serie: z.string({ message: "La serie es requerida" }),
  correlativo: z.union([z.number(), z.string()], { message: "El correlativo es requerido" }),
  motivo: z.string().optional(),
});

export type RegistrarPagoDto = z.infer<typeof RegistrarPagoSchema>;
export type RegistrarEgresoDto = z.infer<typeof RegistrarEgresoSchema>;
export type AccionPagoDto = z.infer<typeof AccionPagoSchema>;
export type CancelarCorrelativoDto = z.infer<typeof CancelarCorrelativoSchema>;
