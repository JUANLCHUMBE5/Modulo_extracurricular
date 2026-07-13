import { z } from "zod";

// Zod Schema to validate program creation and update requests
export const ProgramaSchema = z.object({
  // Nombres del programa/curso
  nombre: z.string().min(2, "El nombre del programa es requerido").optional(),
  nombre_programa: z.string().min(2, "El nombre del programa es requerido").optional(),
  
  // Categoría/Área del programa
  area: z.string().optional(),
  categoria: z.string().optional(),
  
  // Costos e importes financieros
  costo: z.union([z.number(), z.string()]).optional(),
  monto: z.union([z.number(), z.string()]).optional(),
  
  // Fechas y vigencias
  fechaInicio: z.string().optional(),
  fecha_inicio: z.string().optional(),
  fechaFin: z.string().optional(),
  fecha_fin: z.string().optional(),
  
  // Cupos y aforos
  cupos: z.union([z.number(), z.string()]).optional(),
  
  // Modalidades y configuraciones específicas
  modalidadCobro: z.string().optional(),
  modalidad_cobro: z.string().optional(),
  
  // Grados y grupos elegibles
  gradosAplicables: z.array(z.string()).optional(),
  grados: z.array(z.string()).optional(),
  
  // Datos informativos adicionales
  horario: z.string().optional(),
  responsable: z.string().optional(),
  comunicado: z.string().optional(),
  comunicadoCompleto: z.string().optional(),
  comunicado_completo: z.string().optional(),
  
  // Flags de requerimientos
  requiereUniforme: z.boolean().optional(),
  requiere_uniforme: z.boolean().optional(),
  requiereIndumentaria: z.boolean().optional(),
  requiere_indumentaria: z.boolean().optional(),
  
  // Controles de fecha de cierre
  usarFechaLimiteInscripcion: z.boolean().optional(),
  usar_fecha_limite_inscripcion: z.boolean().optional(),
  fechaLimiteInscripcion: z.string().optional(),
  fecha_limite_inscripcion: z.string().optional(),
  horaLimiteInscripcion: z.string().optional(),
  hora_limite_inscripcion: z.string().optional(),
  fechaAperturaInscripcion: z.string().optional(),
  fecha_apertura_inscripcion: z.string().optional(),
  horaAperturaInscripcion: z.string().optional(),
  hora_apertura_inscripcion: z.string().optional(),
  
  // Avisos y notificaciones
  duracionAvisoDias: z.union([z.number(), z.string()]).optional(),
  horaLimiteAviso: z.string().optional(),
  
  // Exámenes Internacionales Cambridge
  fechaExamen: z.string().optional(),
  fecha_examen: z.string().optional(),
  lugarExamen: z.string().optional(),
  lugar_examen: z.string().optional(),
  precioStarters: z.string().optional(),
  precio_starters: z.string().optional(),
  precioMovers: z.string().optional(),
  precio_movers: z.string().optional(),
  precioFlyers: z.string().optional(),
  precio_flyers: z.string().optional(),
  precioKet: z.string().optional(),
  precio_ket: z.string().optional(),
  precioPet: z.string().optional(),
  precio_pet: z.string().optional(),
  numeroCuotas: z.string().optional(),
  numero_cuotas: z.string().optional(),
  fechaVencCuota1: z.string().optional(),
  fecha_venc_cuota_1: z.string().optional(),
  fechaVencCuota2: z.string().optional(),
  fecha_venc_cuota_2: z.string().optional(),
  fechaVencCuota3: z.string().optional(),
  fecha_venc_cuota_3: z.string().optional(),
  fechaLimitePago: z.string().optional(),
  fecha_limite_pago: z.string().optional(),
  
  // Estructuras de horarios avanzadas
  horariosPorGrupo: z.array(z.any()).optional(),
  tablaHorariosNivel: z.array(z.any()).optional(),

  // Campos del formato de comunicado
  requisitos: z.string().optional(),
  concesionarios: z.string().optional(),
  detalle_costo: z.string().optional(),
  detalle_almuerzo: z.string().optional(),
  incluye_almuerzo: z.boolean().optional(),
  horario_recepcion_almuerzo: z.string().optional(),
  nivel_cambridge: z.string().optional(),
  modalidades_cambridge: z.array(z.any()).optional(),
  costo_ciclo: z.union([z.number(), z.string()]).optional(),
  monto_primer_pago: z.union([z.number(), z.string()]).optional(),
  invitacion_masiva: z.boolean().optional(),
  alcance_invitacion_masiva: z.string().optional(),
  plantilla: z.string().optional(),
  plantilla_base64: z.string().optional(),
  plantilla_variables: z.array(z.any()).optional(),
  plantilla_validada: z.boolean().optional(),
  dias: z.array(z.string()).optional(),
  tipo_comunicado: z.string().optional(),
  tipo_documento: z.string().optional(),
  numero_documento: z.string().optional(),
  area_tematica: z.string().optional(),
  motivo_justificacion: z.string().optional(),
  talleres_deportivos: z.array(z.any()).optional(),
  horarios_por_grupo: z.array(z.any()).optional(),
  edad_minima: z.union([z.number(), z.string()]).optional(),
  edad_maxima: z.union([z.number(), z.string()]).optional(),
  grupo_etario: z.string().optional(),
  
  // Estado general
  estado: z.string().optional(),
  periodo: z.string().optional(),
}).passthrough().refine(data => {
  return (data.nombre || data.nombre_programa);
}, {
  message: "Debe especificar el nombre del programa (nombre o nombre_programa)",
  path: ["nombre"]
});

export type ProgramaDto = z.infer<typeof ProgramaSchema>;
