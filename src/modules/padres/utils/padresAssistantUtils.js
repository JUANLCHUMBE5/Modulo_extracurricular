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
  const horario = repararTexto(programa.horario) || "horario por confirmar";
  const ultimoPago = obtenerPagoRelacionado(pagos, inscripcion);
  const paso = siguientePaso || obtenerSiguientePaso({ programa, inscripcion });

  switch (intencion) {
    case "saludo":
      return `Hola. Puedo ayudarte con el programa de ${nombreEstudiante}, horario, pago, ficha, estado o el siguiente paso.`;
    case "estado":
      return responderEstadoAsistente({ estadoInscripcion, estadoPago, ultimoPago, paso });
    case "pago":
      return responderPagoAsistente({ nombrePrograma, costo, estadoPago, inscripcion, ultimoPago });
    case "horario":
      return `El horario registrado para ${nombrePrograma} es: ${horario}. Si aparece "por confirmar", Coordinación Académica aun debe completar ese dato.`;
    case "ficha":
      return responderFichaAsistente({ inscripcion, estadoPago });
    case "comprobante":
      return responderComprobanteAsistente({ inscripcion, ultimoPago });
    case "siguiente":
      return responderGuiaAsistente({ paso, contextoFlujo, programa, inscripcion, estadoPago, ultimoPago, form });
    case "programa":
      return `${nombreEstudiante} tiene disponible ${nombrePrograma}. Tipo: ${tipoReforzamiento}. Horario: ${horario}. Costo: ${costo}.`;
    case "apoderado":
      return responderApoderadoAsistente({ form, estudiante, inscripcion });
    case "contacto":
      return "Si necesita una correccion que no puede hacer desde el portal, comuniquese con Asistente o Cajera segun el caso: Asistente para datos/inscripcion y Cajera para pagos.";
    default:
      return `Puedo ayudarte con programa, horario, pago, ficha, estado o el siguiente paso. Ahora: ${responderGuiaAsistente({ paso, contextoFlujo, programa, inscripcion, estadoPago, ultimoPago, form })}`;
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
    { id: "pago", palabras: ["monto", "pagar", "pago", "costo", "precio", "cuanto", "debo", "deuda", "cancelar", "validar", "correctamente", "como pago"] },
    { id: "horario", palabras: ["horario", "hora", "dia", "dias", "clase", "cuando", "inicio", "empieza", "termina"] },
    { id: "ficha", palabras: ["ficha", "descargar", "documento", "comunicado", "pdf", "archivo", "imprimir"] },
    { id: "estado", palabras: ["estado", "situacion", "proceso", "pendiente", "inscrito", "matriculado", "validado", "aprobado", "rechazado"] },
    { id: "siguiente", palabras: ["hacer", "siguiente", "ahora", "ayuda", "paso", "continuar", "falta", "terminar"] },
    { id: "programa", palabras: ["programa", "taller", "curso", "asignado", "disponible", "nombre"] },
    { id: "apoderado", palabras: ["apoderado", "telefono", "correo", "datos", "contacto", "celular", "email"] },
    { id: "contacto", palabras: ["secretaria", "caja", "coordinacion", "colegio", "llamar", "atencion"] },
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
    ? ` Ultimo pago registrado: ${ultimoPago.estado || ultimoPago.estadoPago || "en revision"} por ${formatearSoles(ultimoPago.monto || ultimoPago.importe)}.`
    : "";
  return `Estado actual: ${estadoInscripcion}. Pago: ${estadoPago}.${detallePago} Siguiente paso: ${paso.detalle}`;
}

function responderGuiaAsistente({ paso, contextoFlujo = {}, programa, inscripcion, estadoPago, ultimoPago, form = {} }) {
  const pasoActivo = Number(contextoFlujo.pasoActivo);
  const comunicadoAceptado = Boolean(contextoFlujo.infoProgramaAceptada);
  const datosConfirmados = Boolean(contextoFlujo.datosConfirmados);
  const requiereCaja = Boolean(contextoFlujo.requiereCaja);
  const nombrePrograma = repararTexto(programa?.programa || programa?.nombre || "el programa");

  if (!programa) {
    return "Todavia no hay un programa seleccionado. Revise la pantalla de Inicio y elija un programa disponible cuando aparezca.";
  }

  if (pasoActivo === 0) {
    if (inscripcion && !esPagoRegistrado(estadoPago)) {
      return `Ya hay una inscripcion para ${nombrePrograma}. Toque "Continuar al pago" para revisar el monto y registrar el comprobante.`;
    }
    return `En Inicio, revise el programa ${nombrePrograma}. Si desea avanzar, toque el boton principal para iniciar o continuar el registro.`;
  }

  if (pasoActivo === 1) {
    if (!comunicadoAceptado) {
      return "Esta en Comunicado. Primero toque \"Ver comunicado\", lea hasta el final, marque la aceptacion y luego presione \"Continuar a datos\".";
    }
    return "El comunicado ya esta aceptado. Ahora toque el boton \"Continuar a datos\" que esta en esta misma pantalla para pasar al formulario del apoderado.";
  }

  if (pasoActivo === 2) {
    if (!String(form.apoderado || "").trim()) return "Esta en Datos. Complete el nombre del apoderado antes de continuar.";
    if (!/^\d{9}$/.test(String(form.telefono || "").trim())) return "Esta en Datos. Revise el telefono del apoderado: debe tener 9 digitos.";
    if (!form.acepta) return "Esta en Datos. Marque la casilla \"Confirmo que los datos son correctos\" para habilitar el avance.";
    return "Los datos ya estan listos. Presione el boton principal para guardar y continuar al pago.";
  }

  if (pasoActivo === 3) {
    if (requiereCaja) return "Esta en Pago, pero este caso debe revisarse en Cajera. Acerquese a Cajera para que validen o registren la matricula.";
    if (!inscripcion) return "Esta en Pago, pero falta que la inscripcion quede registrada. Vuelva a Datos, confirme la informacion y continue al pago.";
    if (ultimoPago && !esPagoRegistrado(ultimoPago.estado || ultimoPago.estadoPago || estadoPago)) return "El comprobante ya fue enviado. Ahora solo queda esperar la validacion de Cajera; no necesita volver a subirlo.";
    if (esPagoRegistrado(estadoPago)) return "El pago ya figura validado. Revise el horario y descargue o conserve la ficha del programa.";
    return "Esta en Pago. Pague por Yape con el QR, escriba el numero de operacion, suba la captura y presione \"Guardar pago\".";
  }

  return paso.detalle;
}

function responderPagoAsistente({ nombrePrograma, costo, estadoPago, inscripcion, ultimoPago }) {
  if (!inscripcion) {
    return `${nombrePrograma} tiene un costo de ${costo}. Para pagar correctamente: 1. Revise y acepte el comunicado. 2. Confirme los datos del apoderado. 3. Registre la inscripcion. 4. Luego use el QR de Yape, guarde la captura y anote el numero de operacion.`;
  }
  if (ultimoPago) {
    return `El monto del programa es ${costo}. Tengo un pago registrado por ${formatearSoles(ultimoPago.monto || ultimoPago.importe)} con estado ${ultimoPago.estado || ultimoPago.estadoPago || estadoPago}.`;
  }
  return `Para pagar correctamente ${nombrePrograma}: 1. Verifique que el monto sea ${costo}. 2. Pague por Yape usando el QR mostrado. 3. Copie el numero de operacion. 4. Suba una captura clara del pago. 5. Presione "Guardar pago". Cajera revisara la operacion y el estado quedara como ${estadoPago} hasta ser validado.`;
}

function responderFichaAsistente({ inscripcion, estadoPago }) {
  if (!inscripcion) return "La ficha se habilita despues de registrar la inscripcion. Primero revise el comunicado, confirme datos del apoderado y solicite el registro.";
  if (!esPagoRegistrado(estadoPago)) return "La inscripcion ya existe, pero el pago aun no figura como validado. La ficha final se completa cuando Cajera o Asistente confirme el proceso.";
  return "La ficha del programa debe estar disponible cuando Asistente genere el documento. Si no la ve, revise el estado o consulte con Asistente.";
}

function responderComprobanteAsistente({ inscripcion, ultimoPago }) {
  if (!inscripcion) return "Primero debe registrar la inscripcion. Luego podra enviar el comprobante de pago para revision.";
  if (ultimoPago) return `Ya existe un pago/comprobante registrado con estado ${ultimoPago.estado || ultimoPago.estadoPago || "en revision"}. Espere la validacion de Cajera.`;
  return "Si ya realizo el pago, registre el comprobante desde la seccion de pago. Cajera lo validara y el estado cambiara cuando sea revisado.";
}

function responderApoderadoAsistente({ form, estudiante, inscripcion }) {
  const apoderado = form.apoderado || inscripcion?.apoderado || estudiante?.apoderado || "sin registrar";
  const telefono = form.telefono || inscripcion?.telefono || estudiante?.telefonoApoderado || "sin registrar";
  const correo = form.correo || inscripcion?.correo || estudiante?.correoApoderado || "sin registrar";
  return `Datos actuales del apoderado: ${apoderado}. Telefono: ${telefono}. Correo: ${correo}. Puede corregirlos en el formulario antes de continuar.`;
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
  if (["m", "masculino", "hombre", "varon", "varÃ³n", "male"].includes(texto)) return "hombre";
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
