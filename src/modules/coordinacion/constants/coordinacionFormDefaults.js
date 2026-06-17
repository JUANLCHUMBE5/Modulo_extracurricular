export const formInicial = {
  nombre: "", periodo: "escolar", categoria: "", grupo: "", horario: "",
  grupoEtario: "",
  gradosAplicables: [], edadMinima: "", edadMaxima: "", fechaNacimientoDesde: "", fechaNacimientoHasta: "", dias: [], horaInicio: "", horaFin: "",
  almuerzoInicio: "", almuerzoFin: "",
  horariosPorGrupo: [], usaHorariosPorBloque: false, talleresDeportivos: [],
  fechaInicio: "", fechaFin: "", duracionAvisoDias: "7", horaLimiteAviso: "23:59", cupos: "", costo: "", modalidadCobro: "Mensual",
  cicloI: "", cicloII: "",
  responsable: "", tutora: "", plantilla: "", plantillaBase64: "", plantillaVariables: [],
  plantillaValidada: false, plantillaActualizadaEn: "", requisitos: "",
  comunicado: "", comunicadoCompleto: "", detalleCosto: "", detalleAlmuerzo: "", concesionarios: "",
  requiereUniforme: false, requiereIndumentaria: false, invitacionMasiva: false, alcanceInvitacionMasiva: "colegio",
  anuncioImagen: "", anuncioImagenNombre: "", anuncioImagenTamano: 0, anuncioImagenComprimida: false,
  
  // Nuevos campos condicionales por tipo de circular
  tipoComunicado: "Otro genérico",
  tipoDocumento: "Comunicado",
  numeroDocumento: "",
  areaTematica: "No aplica",
  nombreCiclo: "Ciclo I",
  tablaHorariosNivel: [],
  incluyeAlmuerzo: false,
  horarioRecepcionAlmuerzo: "",
  nivelCambridge: "",
  modalidadesCambridge: [],
  montoPrimerPago: "",
};

export const horarioGrupoInicial = {
  grados: [],
  dia: "Jueves",
  almuerzoInicio: "14:20",
  almuerzoFin: "15:10",
  horaInicio: "15:20",
  horaFin: "17:20",
  aula: "",
  responsable: "",
  tutora: "",
};

export const TEMPLATES_POR_TIPO = {
  "Club de Tareas": {
    comunicado: "Club de Tareas está diseñado para brindar a nuestros estudiantes un espacio guiado y estructurado para la resolución y presentación oportuna de sus tareas escolares, fortaleciendo sus hábitos de estudio, autonomía y organización bajo el acompañamiento de docentes especialistas.",
    requisitos: "Cuaderno de apuntes, cartuchera completa (lápiz, borrador, tajador, regla, colores), agenda escolar física, y los textos/cuadernos de trabajo del colegio correspondientes a las tareas pendientes del día."
  },
  "Reforzamiento (Circular)": {
    comunicado: "El programa de Reforzamiento Académico tiene como objetivo primordial consolidar los aprendizajes del año escolar, brindando un soporte pedagógico personalizado para nivelar competencias y aclarar dudas en las áreas de mayor complejidad cognitiva.",
    requisitos: "Cuaderno exclusivo del área (cuadriculado para Matemática, rayado para Comunicación), lapiceros azul y rojo, lápiz, borrador, tajador, regla y las fichas o materiales provistos por el docente de reforzamiento."
  },
  "Certificación Cambridge": {
    comunicado: "La preparación para la Certificación Internacional de Cambridge English brinda a nuestros alumnos la oportunidad de certificar oficialmente su nivel de dominio del idioma inglés bajo el Marco Común Europeo de Referencia para las Lenguas (MCER), potenciando su perfil académico global.",
    requisitos: "Libro de preparación oficial Cambridge (según el nivel asignado), cuaderno A4 cuadriculado para apuntes, cartuchera personal completa, y auriculares con conexión auxiliar de 3.5mm para las prácticas de Listening."
  },
  "Otro genérico": {
    comunicado: "",
    requisitos: ""
  }
};

