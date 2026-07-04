import {
  obtenerGradoCompletoApi,
  obtenerPlantillaProgramaApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  tieneHorariosPorGrupoApi,
  programaListoParaPortalPadresApi,
  programaDisponibleParaGradoApi
} from "../../../common/shared/mappers.js";

export function mapEstudiantePortal(student: any) {
  return {
    id: student.dni,
    dni_estudiante: student.dni,
    codigo_estudiante: student.codigoEstudiante,
    nombres: student.nombres,
    apellidos: student.apellidos || "",
    fecha_nacimiento: student.fechaNacimiento,
    grado_nombre: student.grado,
    seccion: student.seccion,
    nivel_nombre: student.nivel || "",
    tipo_alumno: student.tipoAlumno || "Alumno interno",
    estado_matricula: student.estadoMatricula || "Activo",
    apoderado: student.apoderado || "",
    telefono_apoderado: student.telefonoApoderado || "",
    correo_apoderado: student.correoApoderado || ""
  };
}

export function construirInvitacionesLegacy(db: any, dni: string) {
  const invitaciones: any[] = [];
  const programs = db.programas || [];
  for (const prog of programs) {
    const invitados = db.invitadosPorPrograma[prog.id] || [];
    const inv = invitados.find((item: any) => String(item.dni).replace(/\D/g, "") === String(dni).replace(/\D/g, ""));
    if (inv) {
      invitaciones.push({
        programaId: prog.id,
        programa: prog,
        invitado: inv
      });
    }
  }
  return invitaciones;
}

function mapProgramaPortalBase(db: any, prog: any, gradoCompleto: string, invitacionMasiva: boolean) {
  const plantilla = obtenerPlantillaProgramaApi(db, prog);
  return {
    programa_id: prog.id,
    programa: prog.nombre,
    categoria: prog.categoria || "",
    costo: prog.costo,
    horario: resolverHorarioPorGradoApi(prog, gradoCompleto) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
    responsable: resolverDocentePorGradoApi(prog, gradoCompleto),
    modalidad_cobro: prog.modalidadCobro || "",
    requisitos: prog.requisitos || "",
    comunicado: prog.comunicado || "",
    comunicado_completo: prog.comunicadoCompleto || "",
    detalle_costo: prog.detalleCosto || "",
    detalle_almuerzo: prog.detalleAlmuerzo || "",
    concesionarios: prog.concesionarios || "",
    anuncio_imagen: prog.anuncioImagen || "",
    anuncio_imagen_nombre: prog.anuncioImagenNombre || "",
    grados: prog.gradosAplicables || [],
    horarios_por_grupo: prog.horariosPorGrupo || [],
    fecha_inicio: prog.fechaInicio || "",
    fecha_fin: prog.fechaFin || "",
    estado_programa: prog.estado || "",
    requiere_uniforme: Boolean(prog.requiereUniforme),
    requiere_indumentaria: Boolean(prog.requiereIndumentaria),
    invitacion_masiva: invitacionMasiva,
    plantilla: plantilla.plantilla,
    plantilla_base64: plantilla.plantillaBase64,
    plantilla_variables: plantilla.plantillaVariables,
    plantilla_validada: plantilla.plantillaValidada,
    creado_desde_documento: Boolean(prog.creadoDesdeDocumento),
    tipo_comunicado: prog.tipoComunicado || "",
    tipo_documento: prog.tipoDocumento || "",
    numero_documento: prog.numeroDocumento || "",
    area_tematica: prog.areaTematica || "",
    motivo_justificacion: prog.motivoJustificacion || prog.comunicado || "",
    nombre_ciclo: prog.nombreCiclo || "",
    duracion: prog.duracion || prog.duracionTaller || "",
    tabla_horarios_nivel: prog.tablaHorariosNivel || [],
    incluye_almuerzo: Boolean(prog.incluyeAlmuerzo),
    horario_recepcion_almuerzo: prog.horarioRecepcionAlmuerzo || "",
    modalidades_cambridge: prog.modalidadesCambridge || [],
    costo_ciclo: prog.costoCiclo || (prog.costo ? String(prog.costo) : ""),
    monto_primer_pago: prog.montoPrimerPago || "",
    dias: Array.isArray(prog.dias) ? prog.dias : []
  };
}

export function construirInvitacionesPortal(db: any, student: any, dni: string) {
  const invitations: any[] = [];
  const programs = db.programas || [];

  for (const prog of programs) {
    const estadoProg = prog.estado || "Habilitado";
    if (estadoProg !== "Habilitado" || !programaListoParaPortalPadresApi(prog)) continue;

    const gradoCompleto = obtenerGradoCompletoApi(student?.grado, student?.nivel);
    if (prog.invitacionMasiva && programaDisponibleParaGradoApi(prog, gradoCompleto)) {
      invitations.push({
        id: `${prog.id}-masiva-${dni}`,
        nombre: prog.nombre,
        codigo_estudiante: student?.codigoEstudiante || "",
        dni: student?.dni || "",
        nombres: student?.nombres || "",
        grado: student?.grado || "",
        seccion: student?.seccion || "",
        nivel_educativo: student?.nivel || "",
        seleccion: student?.seleccion || "",
        nivel_cambridge: student?.nivelCambridge || "",
        periodo: prog.periodo,
        ...mapProgramaPortalBase(db, prog, gradoCompleto, true)
      });
      continue;
    }

    const invitados = db.invitadosPorPrograma[prog.id] || [];
    const inv = invitados.find((item: any) => String(item.dni || "").replace(/\D/g, "") === String(dni || "").replace(/\D/g, ""));
    if (!inv) continue;

    const gradoCompletoInvitado = obtenerGradoCompletoApi(
      inv.grado,
      inv.nivelEducativo || inv.nivel || student?.nivel || student?.nivel_nombre || "",
      student?.grado
    );
    invitations.push({
      id: prog.id,
      nombre: prog.nombre,
      codigo_estudiante: inv.codigoEstudiante || "",
      dni: inv.dni,
      nombres: inv.nombres,
      grado: inv.grado,
      seccion: inv.seccion,
      nivel_educativo: inv.nivelEducativo || "",
      seleccion: inv.seleccion || "",
      nivel_cambridge: inv.nivelCambridge || "",
      periodo: inv.periodo || prog.periodo,
      ...mapProgramaPortalBase(db, prog, gradoCompletoInvitado, Boolean(prog.invitacionMasiva))
    });
  }

  return invitations;
}
