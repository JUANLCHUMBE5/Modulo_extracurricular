import { z } from "zod";

// --- Registro de pago (matches caja-payment-registration.service.ts) ---
export const RegistrarPagoSchema = z.object({
  inscripcion_id: z.string().optional(),
  inscripcionId: z.string().optional(),
  monto: z.union([z.number(), z.string()]).optional(),
  monto_pago: z.union([z.number(), z.string()]).optional(),
  forma_pago: z.string().optional(),
  metodo_pago: z.string().optional(),
  formaPago: z.string().optional(),
  numero_operacion: z.string().optional(),
  numeroOperacion: z.string().optional(),
  telefono_operacion: z.string().optional(),
  telefonoOperacion: z.string().optional(),
  fecha_pago: z.string().optional(),
  fechaPago: z.string().optional(),
  fecha: z.string().optional(),
  usuario_registro: z.string().optional(),
  origen_registro: z.string().optional(),
  dni_estudiante: z.string().optional(),
  dniEstudiante: z.string().optional(),
  nombres_estudiante: z.string().optional(),
  nombresEstudiante: z.string().optional(),
  programa: z.string().optional(),
  programaNombre: z.string().optional(),
  periodo: z.string().optional(),
});

// --- Registro de egreso (matches caja-correlativo.service.ts) ---
export const RegistrarEgresoSchema = z.object({
  monto: z.union([z.number(), z.string()], { message: "El monto es requerido" }),
  concepto: z.string().optional(),
  beneficiario: z.string().optional(),
  dni: z.string().optional(),
  periodo: z.string().optional(),
  fecha: z.string().optional(),
});

// --- Acción sobre pago (validar, observar, rechazar, anular) ---
export const AccionPagoSchema = z.object({
  observaciones: z.string().optional(),
});

// --- Cancelar correlativo (matches caja-correlativo.service.ts) ---
export const CancelarCorrelativoSchema = z.object({
  tipo: z.string({ message: "El tipo de correlativo es requerido" }),
  motivo: z.string({ message: "El motivo es requerido" }),
  nroRecibo: z.string().optional(),
  dniEstudiante: z.string().optional(),
  nombresEstudiante: z.string().optional(),
});

export type RegistrarPagoDto = z.infer<typeof RegistrarPagoSchema>;
export type RegistrarEgresoDto = z.infer<typeof RegistrarEgresoSchema>;
export type AccionPagoDto = z.infer<typeof AccionPagoSchema>;
export type CancelarCorrelativoDto = z.infer<typeof CancelarCorrelativoSchema>;
