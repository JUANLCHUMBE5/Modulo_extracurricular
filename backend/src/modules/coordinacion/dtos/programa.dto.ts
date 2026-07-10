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
  horaLimiteInscripcion: z.string().optional(),
  
  // Avisos y notificaciones
  duracionAvisoDias: z.union([z.number(), z.string()]).optional(),
  horaLimiteAviso: z.string().optional(),
  
  // Estructuras de horarios avanzadas
  horariosPorGrupo: z.array(z.any()).optional(),
  tablaHorariosNivel: z.array(z.any()).optional(),
  
  // Estado general
  estado: z.string().optional(),
  periodo: z.string().optional(),
}).refine(data => {
  return (data.nombre || data.nombre_programa);
}, {
  message: "Debe especificar el nombre del programa (nombre o nombre_programa)",
  path: ["nombre"]
});

export type ProgramaDto = z.infer<typeof ProgramaSchema>;
