import {
  esProgramaDeportivo,
  normalizarHorariosPorGrupo,
  normalizarListaGrados,
  normalizarListaTexto,
  normalizarPeriodoVista,
} from "./coordinacionProgramUtils";
import { fechaActualInput, normalizarDuracionAvisoDias } from "../../../services/dateService";

export const sugerirNumeroDocumento = (tipoDoc: string, programasList: any[] = []) => {
  const anio = new Date().getFullYear();
  const prefix = tipoDoc === "Carta" ? "CAR" : "COM";
  const count = (programasList || []).filter(p => {
    const pAnio = p.fechaInicio ? new Date(p.fechaInicio).getFullYear() : anio;
    const pTipo = p.tipoDocumento || "Comunicado";
    return pTipo === tipoDoc && pAnio === anio;
  }).length;

  const correlativo = String(count + 1).padStart(3, "0");
  return `${prefix}-${correlativo}-${anio}`;
};

export const tallerDepFormInicial = {
  deporte: "Vóley",
  custom: "",
  minEdad: "6",
  maxEdad: "9",
  dias: ["Jueves"],
  horaInicio: "15:50",
  horaFin: "16:50",
  cupos: "20",
  nivel: "Formativo",
  docente: "",
};

export function parseRangeTimes(rango: any) {
  if (!rango) return { inicio: "", fin: "" };
  const matches = String(rango).match(/(\d{1,2}:\d{2})/g);
  if (matches && matches.length >= 2) {
    const pad = (str: string) => str.split(":").map(s => s.padStart(2, "0")).join(":");
    return {
      inicio: pad(matches[0]),
      fin: pad(matches[1])
    };
  }
  const matchesHours = String(rango).match(/(\d{1,2})/g);
  if (matchesHours && matchesHours.length >= 2) {
    const padHour = (h: string) => `${h.padStart(2, "0")}:00`;
    return {
      inicio: padHour(matchesHours[0]),
      fin: padHour(matchesHours[1])
    };
  }
  return { inicio: "", fin: "" };
}

export function datosProgramaAFormulario(prog: any) {
  const nombrePrograma = prog.nombre || prog.nombre_programa || "";
  const talleres = Array.isArray(prog.talleresDeportivos || prog.talleres_deportivos) 
    ? (prog.talleresDeportivos || prog.talleres_deportivos) 
    : [];
  const esVerano = normalizarPeriodoVista(prog.periodo) === "verano";
  const catLower = String(prog.categoria || "").toLowerCase();
  const esDeportivo = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(nombrePrograma, prog.categoria);
  const usaTalleresPorEdad = esVerano
    ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
    : esDeportivo;

  let cuposCalculados = prog.cupos;
  if (usaTalleresPorEdad && talleres.length > 0) {
    cuposCalculados = String(talleres.reduce((sum: number, t: any) => sum + (Number(t.cupos) || 20), 0));
  }

  let rawGroups = prog.horariosPorGrupo || prog.horarios_por_grupo || [];
  let horariosPorGrupo = normalizarHorariosPorGrupo(rawGroups);
  if (!usaTalleresPorEdad && horariosPorGrupo.length === 0) {
    const tablaRaw = prog.tablaHorariosNivel || prog.tabla_horarios_nivel || [];
    if (Array.isArray(tablaRaw) && tablaRaw.length > 0) {
      horariosPorGrupo = tablaRaw.map((row: any, idx: number) => {
        const claseTimes = parseRangeTimes(row.horarioClase || row.horario_clase);
        const almuerzoTimes = parseRangeTimes(row.horarioAlmuerzo || row.horario_almuerzo);
        const nivel = row.nivel || "";
        const gradosNivel = (normalizarListaGrados(prog.gradosAplicables || prog.grados) || [])
          .filter((g: any) => g.startsWith(`${nivel}:`));
        return {
          id: `grupo-migrado-tabla-${idx}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          grados: gradosNivel,
          dia: row.dia || "Lunes",
          almuerzoInicio: almuerzoTimes.inicio || "14:20",
          almuerzoFin: almuerzoTimes.fin || "15:10",
          horaInicio: claseTimes.inicio || "15:20",
          horaFin: claseTimes.fin || "17:20",
          aula: row.aula || "",
          responsable: row.responsable || "",
          tutora: row.tutora || "",
          cupos: Number(prog.cupos) || 20,
        };
      });
    } else if (prog.horaInicio && prog.horaFin) {
      const diasArray = normalizarListaTexto(prog.dias);
      horariosPorGrupo = [
        {
          id: `grupo-migrado-${Date.now()}`,
          grados: normalizarListaGrados(prog.gradosAplicables || prog.grados),
          dia: diasArray.length > 0 ? diasArray.join(", ") : "Lunes",
          almuerzoInicio: prog.almuerzoInicio || "14:20",
          almuerzoFin: prog.almuerzoFin || "15:10",
          horaInicio: prog.horaInicio,
          horaFin: prog.horaFin,
          aula: prog.aula || "",
          responsable: prog.responsable || "",
          tutora: prog.tutora || "",
          cupos: Number(prog.cupos) || 20,
        },
      ];
    }
  }

  if (!usaTalleresPorEdad && horariosPorGrupo.length > 0) {
    cuposCalculados = String(horariosPorGrupo.reduce((sum: number, g: any) => sum + (Number(g.cupos) || 20), 0));
  }

  return {
    nombre: nombrePrograma,
    periodo: normalizarPeriodoVista(prog.periodo),
    categoria: prog.categoria,
    grupo: prog.grupo,
    grupoEtario: prog.grupoEtario || prog.grupo_etario || "",
    horario: prog.horario,
    fechaInicio: prog.fechaInicio || prog.fecha_inicio,
    gradosAplicables: normalizarListaGrados(prog.gradosAplicables || prog.grados),
    edadMinima: prog.edadMinima || prog.edad_minima || "",
    edadMaxima: prog.edadMaxima || prog.edad_maxima || "",
    fechaNacimientoDesde: prog.fechaNacimientoDesde || prog.fecha_nacimiento_desde || "",
    fechaNacimientoHasta: prog.fechaNacimientoHasta || prog.fecha_nacimiento_hasta || "",
    dias: normalizarListaTexto(prog.dias),
    horaInicio: prog.horaInicio || prog.hora_inicio || "",
    horaFin: prog.horaFin || prog.hora_fin || "",
    almuerzoInicio: prog.almuerzoInicio || prog.almuerzo_inicio || "",
    almuerzoFin: prog.almuerzoFin || prog.almuerzo_fin || "",
    horariosPorGrupo: horariosPorGrupo,
    usaHorariosPorBloque: !usaTalleresPorEdad,
    talleresDeportivos: talleres,
    fechaFin: prog.fechaFin || prog.fecha_fin,
    cicloI: prog.cicloI || "",
    cicloII: prog.cicloII || "",
    duracionAvisoDias: String(normalizarDuracionAvisoDias(prog.duracionAvisoDias || prog.duracion_aviso_dias, 7)),
    horaLimiteAviso: prog.horaLimiteAviso || prog.hora_limite_aviso || "23:59",
    cupos: String(cuposCalculados),
    costo: String(prog.costo !== undefined ? prog.costo : (prog.monto !== undefined ? prog.monto : (prog.precio !== undefined ? prog.precio : 0))),
    modalidadCobro: prog.modalidadCobro || prog.modalidad_cobro || "Unico",
    responsable: prog.responsable || prog.docente || "",
    tutora: prog.tutora || "",
    plantilla: prog.plantilla || "",
    plantillaBase64: prog.plantillaBase64 || prog.plantilla_base64 || "",
    plantillaVariables: prog.plantillaVariables || prog.plantilla_variables || [],
    plantillaValidada: Boolean(prog.plantillaValidada ?? prog.plantilla_validada),
    plantillaActualizadaEn: prog.plantillaActualizadaEn || prog.plantilla_actualizada_en || "",
    requisitos: prog.requisitos || "",
    comunicado: prog.comunicado || "",
    comunicadoCompleto: prog.comunicadoCompleto || prog.comunicado_completo || "",
    detalleCosto: prog.detalleCosto || prog.detalle_costo || "",
    detalleAlmuerzo: "",
    concesionarios: "",
    requiereUniforme: Boolean(prog.requiereUniforme ?? prog.requiere_uniforme),
    requiereIndumentaria: Boolean(prog.requiereIndumentaria ?? prog.requiere_indumentaria),
    invitacionMasiva: Boolean(prog.invitacionMasiva ?? prog.invitacion_masiva),
    alcanceInvitacionMasiva: prog.alcanceInvitacionMasiva || prog.alcance_invitacion_masiva || "colegio",
    anuncioImagen: prog.anuncioImagen || prog.anuncio_imagen || "",
    anuncioImagenNombre: prog.anuncioImagenNombre || prog.anuncio_imagen_nombre || "",
    anuncioImagenTamano: prog.anuncioImagenTamano || prog.anuncio_imagen_tamano || 0,
    anuncioImagenComprimida: Boolean(prog.anuncioImagenComprimida ?? prog.anuncio_imagen_comprimida),
    usarFechaLimiteInscripcion: Boolean(prog.usarFechaLimiteInscripcion ?? prog.usar_fecha_limite_inscripcion),
    fechaAperturaInscripcion: prog.fechaAperturaInscripcion || prog.fecha_apertura_inscripcion || "",
    horaAperturaInscripcion: prog.horaAperturaInscripcion || prog.hora_apertura_inscripcion || "",
    fechaLimiteInscripcion: prog.fechaLimiteInscripcion || prog.fecha_limite_inscripcion || "",
    horaLimiteInscripcion: prog.horaLimiteInscripcion || prog.hora_limite_inscripcion || "",
    id: prog.id,
    tipoComunicado: prog.tipoComunicado || prog.tipo_comunicado || "Otro genérico",
    tipoDocumento: prog.tipoDocumento || prog.tipo_documento || "Comunicado",
    numeroDocumento: prog.numeroDocumento || prog.numero_documento || "",
    areaTematica: prog.areaTematica || prog.area_tematica || "No aplica",
    nombreCiclo: prog.nombreCiclo || prog.nombre_ciclo || "Ciclo I",
    duracionTaller: prog.duracionTaller || prog.duracion || "",
    tablaHorariosNivel: prog.tablaHorariosNivel || prog.tabla_horarios_nivel || [],
    incluyeAlmuerzo: Boolean(prog.incluyeAlmuerzo ?? prog.incluye_almuerzo),
    horarioRecepcionAlmuerzo: prog.horarioRecepcionAlmuerzo || prog.horario_recepcion_almuerzo || "",
    nivelCambridge: prog.nivelCambridge || prog.nivel_cambridge || "",
    modalidadesCambridge: prog.modalidadesCambridge || prog.modalidades_cambridge || [],
    costoCiclo: prog.costoCiclo !== undefined ? String(prog.costoCiclo) : (prog.costo_ciclo !== undefined ? String(prog.costo_ciclo) : (prog.costo !== undefined ? String(prog.costo) : (prog.monto !== undefined ? String(prog.monto) : ""))),
    montoPrimerPago: prog.montoPrimerPago !== undefined ? String(prog.montoPrimerPago) : (prog.monto_primer_pago !== undefined ? String(prog.monto_primer_pago) : ""),
  };
}
