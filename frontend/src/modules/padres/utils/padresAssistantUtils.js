import { repararTexto } from "./padresTextUtils";

export function responderAsistenteLocal(
  pregunta,
  { estudiante, programa, inscripcion, pagos = [], siguientePaso, tipoReforzamiento, form = {}, contextoFlujo = {} }
) {
  const texto = normalizarConsulta(pregunta);
  const intencion = detectarIntencionAsistente(texto);
  const nombreEstudiante = obtenerNombreCorto(estudiante?.nombres);

  if (!programa) {
    if (["programa", "inscripcion", "siguiente", "estado"].includes(intencion)) {
      return `Aun no encuentro un programa activo para ${nombreEstudiante}. Cuando Coordinación Académica habilite una invitacion o un taller disponible, aparecera en esta pantalla.`;
    }
    return `Por ahora no tengo datos de un programa activo para ${nombreEstudiante}. Puedo ayudarte cuando exista una invitacion, inscripcion o curso disponible.`;
  }

  const nombrePrograma = programa.programa || programa.nombre || "el programa asignado";
  const estadoInscripcion = obtenerEstadoInscripcionAsistente({ programa, inscripcion });
  const estadoPago = inscripcion?.estadoPago || "Pendiente de pago";
  const costo = formatearSoles(programa.costo);
  const rawHorario = repararTexto(programa.horario) || "horario por confirmar";
  const horario = rawHorario.toLowerCase().includes("almuerzo") && rawHorario.toLowerCase().includes("clase")
    ? rawHorario
        .replace(/almuerzo\s*/i, "\n    🍱 Almuerzo: ")
        .replace(/(?:,\s*)?clase\s*/i, "\n    🏫 Clase: ")
    : rawHorario;
  const ultimoPago = obtenerPagoRelacionado(pagos, inscripcion);
  const paso = siguientePaso || obtenerSiguientePaso({ programa, inscripcion });

  switch (intencion) {
    case "saludo":
      return `¡Hola! Soy Rafael, el asistente del portal. 🙋‍♂️\n\n` +
             `Puedo ayudarte a responder dudas sobre:\n` +
             `🏫 El taller asignado para ${nombreEstudiante}\n` +
             `📅 Su horario y días de clase\n` +
             `💰 El costo, pagos y validación bancaria\n` +
             `📄 Descarga de la ficha de inscripción\n` +
             `👉 Cuál es el siguiente paso a realizar`;
    case "estado":
      return responderEstadoAsistente({ estadoInscripcion, estadoPago, ultimoPago, paso });
    case "pago":
      return responderPagoAsistente({ nombrePrograma, costo, estadoPago, inscripcion, ultimoPago });
    case "horario":
      return `📅 Horario de Clase:\n\n` +
             `🏫 Taller: ${nombrePrograma}\n` +
             `📅 Horario: ${horario}\n\n` +
             `*Nota: Si aparece "por confirmar", Coordinación Académica asignará las clases en las próximas horas.*`;
    case "ficha":
      return responderFichaAsistente({ inscripcion, estadoPago });
    case "comprobante":
      return responderComprobanteAsistente({ inscripcion, ultimoPago });
    case "siguiente":
      return responderGuiaAsistente({ paso, contextoFlujo, programa, inscripcion, estadoPago, ultimoPago, form });
    case "programa":
      const explicacionMotivo = (programa.motivoJustificacion || programa.comunicado || "ha sido asignado por Coordinación Académica para el reforzamiento y desarrollo escolar del estudiante").trim();
      let motivoTexto = explicacionMotivo;
      const lowerMotivo = motivoTexto.toLowerCase();
      if (!lowerMotivo.includes("invita") && !lowerMotivo.includes("porque")) {
        motivoTexto = `Le invitamos porque ${motivoTexto.charAt(0).toLowerCase() + motivoTexto.slice(1)}`;
      }
      return `📢 Taller Disponible:\n` +
             `¡Le invitamos al taller **${nombrePrograma}**!\n\n` +
             `📝 **Motivo:** ${motivoTexto}\n\n` +
             `👤 Estudiante: ${nombreEstudiante}\n` +
             `🏷️ Tipo: ${tipoReforzamiento}\n` +
             `📅 Horario: ${horario}\n` +
             `💰 Costo: ${costo}`;
    case "apoderado":
      return responderApoderadoAsistente({ form, estudiante, inscripcion });
    case "contacto":
      return `📞 Canales de Soporte y Contacto:\n\n` +
             `Para atención presencial en el colegio, visítenos de lunes a viernes de 8:00 AM a 4:30 PM. También puede comunicarse por los siguientes medios:\n\n` +
             `📝 Datos de Alumno o Inscripción:\n` +
             `   • Encargado: Asistente (Secretaría)\n` +
             `   • Oficina: Pabellón A - Primer Piso\n` +
             `   • Teléfono: (01) 613-8300 (Anexo 101)\n` +
             `   • Correo: secretaria@colegiosanrafael.edu.pe\n\n` +
             `💵 Validación de Depósitos y Yape:\n` +
             `   • Encargado: Cajera (Caja)\n` +
             `   • Oficina: Ventanilla principal de Caja\n` +
             `   • WhatsApp: +51 987 654 321\n` +
             `   • Teléfono: (01) 613-8300 (Anexo 102)\n` +
             `   • Correo: caja@colegiosanrafael.edu.pe\n\n` +
             `🏫 Programas Académicos o Horarios:\n` +
             `   • Encargado: Coordinación Académica\n` +
             `   • Oficina: Pabellón B - Segundo Piso\n` +
             `   • Teléfono: (01) 613-8300 (Anexo 103)\n` +
             `   • Correo: coordinacion@colegiosanrafael.edu.pe`;
    default:
      return `Puedo ayudarte con programa, horario, pago, ficha, estado o el siguiente paso.\n\n` +
             `👉 Actualmente: ${responderGuiaAsistente({ paso, contextoFlujo, programa, inscripcion, estadoPago, ultimoPago, form })}`;
  }
}

function normalizarConsulta(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectarIntencionAsistente(texto) {
  const grupos = [
    { id: "saludo", palabras: ["hola", "buenas", "buen dia", "buenas tardes", "buenas noches"] },
    { id: "comprobante", palabras: ["voucher", "comprobante", "constancia", "boleta", "recibo", "operacion", "subir", "adjuntar", "yape", "qr"] },
    { id: "pago", palabras: ["monto", "pagar", "pago", "costo", "precio", "cuanto", "debo", "deuda", "cancelar", "validar", "correctamente", "como pagar"] },
    { id: "horario", palabras: ["horario", "hora", "dia", "dias", "clase", "cuando", "inicio", "empieza", "termina"] },
    { id: "ficha", palabras: ["ficha", "descargar", "documento", "comunicado", "pdf", "archivo", "imprimir"] },
    { id: "estado", palabras: ["estado", "situacion", "proceso", "pendiente", "inscrito", "matriculado", "validado", "aprobado", "rechazado"] },
    { id: "siguiente", palabras: ["hacer", "siguiente", "ahora", "ayuda", "paso", "continuar", "falta", "terminar", "hago"] },
    { id: "programa", palabras: ["programa", "taller", "curso", "asignado", "disponible", "nombre"] },
    { id: "apoderado", palabras: ["apoderado", "telefono", "correo", "datos", "celular", "email"] },
    { id: "contacto", palabras: ["secretaria", "caja", "coordinacion", "colegio", "llamar", "atencion", "soporte", "contacto", "canales"] },
  ];

  let mejor = { id: "general", puntos: 0 };
  grupos.forEach((grupo) => {
    const puntos = grupo.palabras.reduce((total, palabra) => total + (texto.includes(palabra) ? 1 : 0), 0);
    if (puntos > mejor.puntos) mejor = { id: grupo.id, puntos };
  });
  return mejor.id;
}

function responderEstadoAsistente({ estadoInscripcion, estadoPago, ultimoPago, paso }) {
  const detallePago = ultimoPago
    ? `\n💰 Último pago registrado: ${ultimoPago.estado || ultimoPago.estadoPago || "en revisión"} por ${formatearSoles(ultimoPago.monto || ultimoPago.importe)}.`
    : "";
  return `📊 Estado Actual de la Matrícula:\n\n` +
         `📝 Inscripción: ${estadoInscripcion}\n` +
         `💳 Estado de Pago: ${estadoPago}${detallePago}\n\n` +
         `👉 Siguiente Acción: ${paso.detalle}`;
}

function responderGuiaAsistente({ paso, contextoFlujo = {}, programa, inscripcion, estadoPago, ultimoPago, form = {} }) {
  const pasoActivo = Number(contextoFlujo.pasoActivo);
  const comunicadoAceptado = Boolean(contextoFlujo.infoProgramaAceptada);
  const datosConfirmados = Boolean(contextoFlujo.datosConfirmados);
  const requiereCaja = Boolean(contextoFlujo.requiereCaja);
  const nombrePrograma = repararTexto(programa?.programa || programa?.nombre || "el programa");

  if (!programa) {
    return "Todavía no hay un programa seleccionado. Revise la pantalla de Inicio y elija un programa disponible cuando aparezca.";
  }

  if (pasoActivo === 0) {
    if (inscripcion && !esPagoRegistrado(estadoPago)) {
      return `Ya hay una inscripción para ${nombrePrograma}. Toque "Continuar al pago" para revisar el monto y registrar el comprobante.`;
    }
    return `En Inicio, revise el programa ${nombrePrograma}. Si desea avanzar, toque el botón principal para iniciar o continuar el registro.`;
  }

  if (pasoActivo === 1) {
    if (!comunicadoAceptado) {
      return "Está en Comunicado. Primero toque \"Ver comunicado\", lea hasta el final, marque la aceptación y luego presione \"Continuar a datos\".";
    }
    return "El comunicado ya está aceptado. Ahora toque el botón \"Continuar a datos\" que está en esta misma pantalla para pasar al formulario del apoderado.";
  }

  if (pasoActivo === 2) {
    if (!String(form.apoderado || "").trim()) return "Está en Datos. Complete el nombre del apoderado antes de continuar.";
    if (!/^\d{9}$/.test(String(form.telefono || "").trim())) return "Está en Datos. Revise el teléfono del apoderado: debe tener 9 dígitos.";
    if (!form.acepta) return "Está en Datos. Marque la casilla \"Confirmo que los datos son correctos\" para habilitar el avance.";
    return "Los datos ya están listos. Presione el botón principal para guardar y continuar al pago.";
  }

  if (pasoActivo === 3) {
    if (requiereCaja) return "Está en Pago, pero este caso debe revisarse en Cajera. Acérquese a Cajera para que validen o registren la matrícula.";
    if (!inscripcion) return "Está en Pago, pero falta que la inscripción quede registrada. Vuelva a Datos, confirme la información y continúe al pago.";
    if (ultimoPago && !esPagoRegistrado(ultimoPago.estado || ultimoPago.estadoPago || estadoPago)) return "El comprobante ya fue enviado. Ahora solo queda esperar la validación de Caja; no necesita volver a subirlo.";
    if (esPagoRegistrado(estadoPago)) return "El pago ya figura validado. Revise el horario y descargue o conserve la ficha del programa.";
    return "Está en Pago. Pague por Yape con el QR, escriba el número de operación, suba la captura y presione \"Guardar pago\".";
  }

  return paso.detalle;
}

function responderPagoAsistente({ nombrePrograma, costo, estadoPago, inscripcion, ultimoPago }) {
  if (!inscripcion) {
    return `💰 Costo e Instrucciones - ${nombrePrograma}:\n\n` +
           `💵 Costo total: ${costo}\n\n` +
           `Pasos para matricularse:\n` +
           `1️⃣ Lea y acepte el comunicado oficial.\n` +
           `2️⃣ Confirme los datos del apoderado.\n` +
           `3️⃣ Registre la pre-inscripción.\n` +
           `4️⃣ Suba su voucher de Yape o transferencia bancaria.`;
  }
  if (ultimoPago) {
    return `💰 Estado del Pago - ${nombrePrograma}:\n\n` +
           `💵 Costo del taller: ${costo}\n` +
           `💸 Pago enviado: ${formatearSoles(ultimoPago.monto || ultimoPago.importe)}\n` +
           `📊 Estado actual: ${ultimoPago.estado || ultimoPago.estadoPago || estadoPago}`;
  }
  return `💰 Instrucciones de Pago - ${nombrePrograma}:\n\n` +
         `💵 Monto a pagar: ${costo}\n\n` +
         `Para completar el proceso:\n` +
         `1️⃣ Realice la transferencia usando el código QR de Yape.\n` +
         `2️⃣ Copie el número de operación bancaria.\n` +
         `3️⃣ Suba la captura del comprobante en la sección "Pago".\n` +
         `4️⃣ Presione el botón "Guardar pago".\n\n` +
         `*Caja revisará la transacción en las próximas horas.*`;
}

function responderFichaAsistente({ inscripcion, estadoPago }) {
  if (!inscripcion) {
    return `📄 Ficha de Inscripción:\n\n` +
           `La ficha estará disponible para su descarga después de registrar la pre-inscripción en la pestaña "Datos".`;
  }
  if (!esPagoRegistrado(estadoPago)) {
    return `📄 Ficha de Inscripción:\n\n` +
           `Su pre-inscripción ya está registrada, pero falta que Caja valide su comprobante de pago. La ficha final con código QR se habilitará tan pronto como el pago sea validado.`;
  }
  return `📄 Ficha de Inscripción:\n\n` +
         `¡Su inscripción está validada! Ya puede descargar la ficha firmada con su código de acceso.`;
}

function responderComprobanteAsistente({ inscripcion, ultimoPago }) {
  if (!inscripcion) {
    return `📲 Registro de Comprobante:\n\n` +
           `Primero debe registrar sus datos y solicitar la pre-inscripción. Tras esto, el sistema le habilitará el paso 4 para adjuntar el voucher.`;
  }
  if (ultimoPago) {
    return `📲 Registro de Comprobante:\n\n` +
           `Ya registramos un comprobante con estado "${ultimoPago.estado || ultimoPago.estadoPago || "en revisión"}". No es necesario volver a subirlo a menos que sea solicitado por Caja.`;
  }
  return `📲 Registro de Comprobante:\n\n` +
         `Si ya realizó el depósito o transferencia, ingrese al paso 4 ("Pago"), digite el número de operación, adjunte la foto de la captura de pantalla y guarde el registro para que Caja lo concilie.`;
}

function responderApoderadoAsistente({ form, estudiante, inscripcion }) {
  const apoderado = form.apoderado || inscripcion?.apoderado || estudiante?.apoderado || "sin registrar";
  const telefono = form.telefono || inscripcion?.telefono || estudiante?.telefonoApoderado || "sin registrar";
  const correo = form.correo || inscripcion?.correo || estudiante?.correoApoderado || "sin registrar";
  return `📞 Datos de Contacto del Apoderado:\n\n` +
         `👤 Apoderado: ${apoderado}\n` +
         `📱 Teléfono: ${telefono}\n` +
         `✉️ Correo: ${correo}\n\n` +
         `*Si desea corregir algún dato, puede editarlo en la pestaña "Datos" antes de proceder con el registro.*`;
}

function obtenerPagoRelacionado(pagos = [], inscripcion = null) {
  if (!Array.isArray(pagos) || pagos.length === 0) return null;
  if (!inscripcion?.id) return pagos[0] || null;
  return pagos.find((pago) => pago.inscripcionId === inscripcion.id || pago.inscripcion_id === inscripcion.id) || pagos[0] || null;
}

function obtenerEstadoInscripcionAsistente({ programa, inscripcion }) {
  if (inscripcion?.estadoInscripcion) return inscripcion.estadoInscripcion;
  if (inscripcion) return "Inscripcion registrada";
  if (programa) return "Programa asignado, pendiente de registrar";
  return "Sin programa asignado";
}

export function obtenerTipoReforzamiento(programa) {
  const nombre = String(programa?.programa || "").toLowerCase();
  if (nombre.includes("reforz")) return "Reforzamiento y nivelacion";
  if (nombre.includes("tarea")) return "Club de tareas";
  if (nombre.includes("deporte")) return "Taller deportivo";
  if (nombre.includes("matem")) return "Refuerzo academico";
  return "Programa extracurricular";
}

export function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

export function obtenerNombreCorto(nombre) {
  return String(nombre || "su hijo(a)").trim().split(/\s+/).slice(0, 2).join(" ");
}

export function obtenerIniciales(nombre) {
  const partes = String(nombre || "SR").trim().split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "SR";
}

export function obtenerBannerEstudiante(estudiante) {
  const sexo = normalizarSexo(estudiante?.sexo || estudiante?.genero || estudiante?.gender) || inferirSexoDemo(estudiante?.nombres);
  if (sexo === "hombre") return "/assets/padres/BANNER%20DE%20HOMBRES.png";
  if (sexo === "mujer") return "/assets/padres/BANNER%20DE%20MUJERES.png";
  return "/assets/padres/BANNER%20DE%20HOMBRES.png";
}

function normalizarSexo(valor) {
  const texto = String(valor || "").trim().toLowerCase();
  if (["m", "masculino", "hombre", "varon", "varón", "male"].includes(texto)) return "hombre";
  if (["f", "femenino", "mujer", "female"].includes(texto)) return "mujer";
  return "";
}

function inferirSexoDemo(nombre) {
  const primerNombre = String(nombre || "").trim().split(/\s+/)[0]?.toLowerCase();
  if (["camila", "lucia", "maria", "rosa", "claudia", "patricia", "ana"].includes(primerNombre)) return "mujer";
  if (["juan", "mateo", "jose", "carlos", "thiago", "gael", "bruno", "sebastian", "adrian", "nicolas"].includes(primerNombre)) return "hombre";
  return "";
}

export function prepararProgramaParaGrado(programa, gradoEstudiante) {
  const horarioDelGrado = resolverHorarioCatalogoPorGrado(programa, gradoEstudiante);
  const docenteDelGrado = resolverDocenteCatalogoPorGrado(programa, gradoEstudiante);
  const disponibleParaGrado = programaDisponibleCatalogoParaGrado(programa, gradoEstudiante, horarioDelGrado);

  return {
    ...programa,
    horario: disponibleParaGrado ? repararTexto(horarioDelGrado || programa.horario) : "",
    responsable: disponibleParaGrado ? docenteDelGrado : programa.responsable,
    docente: disponibleParaGrado ? docenteDelGrado : programa.docente,
    disponibleParaGrado,
  };
}

function programaDisponibleCatalogoParaGrado(programa, gradoEstudiante, horarioDelGrado = "") {
  if (esProgramaCambridgeCatalogo(programa)) return false;
  if (programa?.invitacionMasiva) return programaDisponibleCatalogoParaAlcanceMasivo(programa, gradoEstudiante);

  if (!programa?.requiereGradoCompatible) return true;
  if (Array.isArray(programa.horariosPorGrupo) && programa.horariosPorGrupo.length > 0) {
    return Boolean(horarioDelGrado);
  }

  const gradosAplicables = Array.isArray(programa.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGradoCatalogo(gradoEstudiante);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado) => coincideGradoCatalogo(grado, gradoNormalizado));
}

function esProgramaCambridgeCatalogo(programa = {}) {
  const variables = Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [];
  const texto = normalizarTexto([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.tipoComunicado,
    programa.plantilla,
    ...variables,
  ].filter(Boolean).join(" "));

  return texto.includes("cambridge") ||
    texto.includes("cambrigde") ||
    texto.includes("cabringde") ||
    texto.includes("camringde") ||
    texto.includes("certificacion cam") ||
    texto.includes("ingles") ||
    texto.includes("ingless") ||
    texto.includes("certificacion") ||
    texto.includes("preparacion") ||
    variables.some((variable) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(String(variable || "").toLowerCase())
    );
}

function programaDisponibleCatalogoParaAlcanceMasivo(programa, gradoEstudiante = "") {
  const alcance = normalizarTexto(programa?.alcanceInvitacionMasiva || "colegio");
  if (!alcance || alcance === "colegio" || alcance === "todos") return true;

  const gradoNormalizado = descomponerGradoCatalogo(gradoEstudiante);
  if (!gradoNormalizado.nivel) return false;

  if (alcance === "primaria" || alcance === "secundaria" || alcance === "inicial") {
    return gradoNormalizado.nivel === alcance;
  }

  if (alcance === "grados" || alcance === "seleccionados") {
    const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
    if (!gradosAplicables.length || !gradoNormalizado.numero) return false;
    return gradosAplicables.some((grado) => coincideGradoCatalogo(grado, gradoNormalizado));
  }

  return true;
}

function resolverHorarioCatalogoPorGrado(programa, gradoEstudiante = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGradoCatalogo(gradoEstudiante);
  if (!gradoNormalizado.numero) return "";

  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGradoCatalogo(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grado = formatearGradoCatalogo(gradoDelTurno || gradoEstudiante);
  const aula = grupo.aula ? ` - Aula ${grupo.aula}` : "";
  return `${grado ? `${grado}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

function resolverDocenteCatalogoPorGrado(programa, gradoEstudiante = "") {
  const grupos = programa?.horariosPorGrupo || [];
  const fallback = programa?.responsable || programa?.docente || "Por definir";
  if (!Array.isArray(grupos) || grupos.length === 0) return fallback;

  const gradoNormalizado = descomponerGradoCatalogo(gradoEstudiante);
  if (!gradoNormalizado.numero) return fallback;

  const grupo = grupos.find((item) =>
    (item.grados || []).some((grado) => coincideGradoCatalogo(grado, gradoNormalizado))
  );
  return grupo?.responsable?.trim() || fallback;
}

function coincideGradoCatalogo(gradoGrupo, gradoEstudiante) {
  const grupo = descomponerGradoCatalogo(gradoGrupo);
  if (!grupo.numero || !gradoEstudiante?.numero) return false;
  if (grupo.numero !== gradoEstudiante.numero) return false;
  return !grupo.nivel || grupo.nivel === gradoEstudiante.nivel;
}

function formatearGradoCatalogo(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

function descomponerGradoCatalogo(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function normalizarTexto(texto) {
  return repararTexto(String(texto || ""))
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function obtenerSiguientePaso({ programa, inscripcion }) {
  if (!programa) {
    return {
      titulo: "Sin programa asignado",
      detalle: "Coordinación Académica aun no registra una invitacion para este estudiante.",
    };
  }

  if (!inscripcion) {
    if (programa?.ventanaInscripcion?.requiereCaja) {
      return {
        titulo: "Registro por Cajera",
        detalle: "El aviso de inscripcion web ya cerro. Acerquese a Cajera si aun desea matricular al estudiante.",
      };
    }

    return {
      titulo: "Registro disponible",
      detalle: "Puede confirmar los datos y registrar la inscripcion web. El pago quedara pendiente para validarse en Cajera.",
    };
  }

  if (!esPagoRegistrado(inscripcion.estadoPago)) {
    return {
      titulo: "Pago pendiente",
      detalle: "La inscripcion ya fue registrada. Acerquese a Cajera para validar el pago del programa.",
    };
  }

  return {
    titulo: "Proceso al dia",
    detalle: "El pago figura como registrado. Revise el horario y conserve la ficha del programa.",
  };
}

function esPagoRegistrado(valor) {
  const texto = normalizarTexto(valor);
  if (texto.includes("pendiente")) return false;
  return ["pagado", "validado", "completado"].some((estado) => texto.includes(estado));
}
