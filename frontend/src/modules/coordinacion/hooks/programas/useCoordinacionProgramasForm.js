import { useState, useMemo } from "react";
import { calcularDuracionTexto } from "../../../../services/dateService";
import { formInicial, horarioGrupoInicial, TEMPLATES_POR_TIPO } from "../../constants/coordinacionFormDefaults";
import {
  calcularRangoEdades,
  comprimirImagenAnuncio,
  esProgramaCambridge,
  esProgramaDeportivo,
  normalizarHorariosPorGrupo,
  normalizarListaGrados,
  normalizarListaTexto,
  normalizarPeriodoVista,
  resumenGrupoDeportivo,
  resumenGrados,
  resumenHorario,
  resumenHorarioDeportivo,
  resumenHorariosPorGrupo,
  calcularTextoCiclosCambridge,
} from "../../utils/coordinacionProgramUtils";

const tallerDepFormInicial = {
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

/**
 * Hook para la gestión del estado interno del formulario de registro/edición de talleres.
 * 
 * @param {Object} params Parámetros de inicialización.
 * @param {Array} params.programas Lista actual de programas para calcular sugerencias correlativas.
 * @param {Function} params.mostrarMsg Callback para mostrar mensajes de alerta.
 * @param {Function} params.sugerirNumeroDocumento Función para generar códigos de documentos.
 */
export default function useCoordinacionProgramasForm({
  programas,
  mostrarMsg,
  sugerirNumeroDocumento
}) {
  const [form, setForm] = useState(formInicial);
  const [tallerDepForm, setTallerDepForm] = useState(tallerDepFormInicial);
  const [indiceTallerEditando, setIndiceTallerEditando] = useState(null);
  const [alertaConfiguracion, setAlertaConfiguracion] = useState("");

  /**
   * Muestra la advertencia visual si falta algún dato requerido en la configuración del taller.
   */
  function mostrarAlertaConfiguracion(detalle = "") {
    const texto = detalle
      ? `Complete la configuracion del taller antes de habilitarlo. ${detalle}`
      : "Complete la configuracion del taller antes de habilitarlo.";
    setAlertaConfiguracion(texto);
  }

  /**
   * Actualiza los campos en el objeto de estado del formulario.
   */
  function actualizarForm(campo, valor) {
    if (typeof campo === "object" && campo !== null) {
      setForm((f) => ({ ...f, ...campo }));
    } else {
      setForm((f) => ({ ...f, [campo]: valor }));
    }
  }

  /**
   * Activa o desactiva la invitación masiva y limpia sus campos asociados.
   */
  function actualizarInvitacionMasiva(activa) {
    setForm((actual) => ({
      ...actual,
      invitacionMasiva: activa,
      alcanceInvitacionMasiva: activa ? actual.alcanceInvitacionMasiva || "colegio" : "colegio",
      anuncioImagen: activa ? actual.anuncioImagen : "",
      anuncioImagenNombre: activa ? actual.anuncioImagenNombre : "",
      anuncioImagenTamano: activa ? actual.anuncioImagenTamano : 0,
      anuncioImagenComprimida: activa ? actual.anuncioImagenComprimida : false,
    }));
  }

  /**
   * Valida, comprime y setea una imagen cargada para el anuncio del portal de padres.
   */
  async function seleccionarImagenAnuncio(event) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      event.target.value = "";
      mostrarMsg("Seleccione una imagen valida para el anuncio.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      event.target.value = "";
      mostrarMsg("La imagen no debe superar 8 MB antes de comprimir.");
      return;
    }

    try {
      const resultado = await comprimirImagenAnuncio(archivo);
      setForm((actual) => ({
        ...actual,
        anuncioImagen: resultado.dataUrl,
        anuncioImagenNombre: archivo.name,
        anuncioImagenTamano: resultado.bytes,
        anuncioImagenComprimida: resultado.comprimida,
      }));
      mostrarMsg(
        resultado.comprimida
          ? "Imagen agregada y comprimida para el portal de padres."
          : "Imagen agregada para el portal de padres.",
        "success"
      );
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      event.target.value = "";
    }
  }

  /**
   * Quita la imagen de anuncio asignando valores por defecto.
   */
  function quitarImagenAnuncio() {
    setForm((actual) => ({
      ...actual,
      anuncioImagen: "",
      anuncioImagenNombre: "",
      anuncioImagenTamano: 0,
      anuncioImagenComprimida: false,
    }));
  }

  /**
   * Activa el modo de edición para un subtaller deportivo de la lista.
   */
  const iniciarEdicionTaller = (index) => {
    const lista = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const taller = lista[index];
    if (!taller) return;

    setIndiceTallerEditando(index);

    const deportesPorDefecto = normalizarPeriodoVista(form.periodo) === "verano"
      ? (form.categoria === "Talleres Deportivos"
          ? ["Fútbol", "Vóley", "Básquet"]
          : ["Danza", "Mini Chef", "Pintura", "Teatro", "Inglés", "Zancos", "Artes plásticas"])
      : ["Vóley", "Fútbol", "Básquet"];

    const esOtro = !deportesPorDefecto.includes(taller.deporte);

    setTallerDepForm({
      deporte: esOtro ? "Otro" : taller.deporte,
      custom: esOtro ? taller.deporte : "",
      minEdad: String(taller.edadMinima),
      maxEdad: String(taller.edadMaxima),
      dias: [taller.dia],
      horaInicio: taller.horaInicio,
      horaFin: taller.horaFin,
      cupos: String(taller.cupos || 20),
      nivel: taller.nivel || "Formativo",
      docente: taller.docente || "",
    });
  };

  /**
   * Cancela la edición activa de un taller deportivo.
   */
  const cancelarEdicionTaller = () => {
    setIndiceTallerEditando(null);
    setTallerDepForm({
      ...tallerDepFormInicial,
      deporte: normalizarPeriodoVista(form.periodo) === "verano"
        ? (form.categoria === "Talleres Deportivos" ? "Fútbol" : "Danza")
        : "Vóley"
    });
  };

  /**
   * Registra un taller deportivo o de verano en la lista de bloques del formulario.
   */
  const agregarTallerDeportivo = () => {
    const deporteFinal = tallerDepForm.deporte === "Otro" ? tallerDepForm.custom.trim() : tallerDepForm.deporte;
    if (!deporteFinal) {
      mostrarMsg("Ingrese el nombre del deporte.");
      return;
    }
    const minE = Number(tallerDepForm.minEdad);
    const maxE = Number(tallerDepForm.maxEdad);
    if (!tallerDepForm.minEdad || !tallerDepForm.maxEdad || minE > maxE) {
      mostrarMsg("Rango de edades inválido.");
      return;
    }
    if (!tallerDepForm.horaInicio || !tallerDepForm.horaFin) {
      mostrarMsg("Ingrese las horas de inicio y fin.");
      return;
    }
    if (tallerDepForm.horaInicio >= tallerDepForm.horaFin) {
      mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      return;
    }
    const cuposTaller = Number(tallerDepForm.cupos);
    if (Number.isNaN(cuposTaller) || cuposTaller <= 0) {
      mostrarMsg("Ingrese un número de cupos válido para el taller.");
      return;
    }
    const docenteFinal = tallerDepForm.docente.trim();
    if (!docenteFinal) {
      mostrarMsg("Ingrese el tutor o docente a cargo del taller.");
      return;
    }
    if (!tallerDepForm.dias || tallerDepForm.dias.length === 0) {
      mostrarMsg("Seleccione al menos un día de atención.");
      return;
    }

    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    let nuevaLista;
    if (indiceTallerEditando !== null) {
      const nuevoTaller = {
        deporte: deporteFinal,
        edadMinima: minE,
        edadMaxima: maxE,
        dia: tallerDepForm.dias[0] || "Lunes",
        horaInicio: tallerDepForm.horaInicio,
        horaFin: tallerDepForm.horaFin,
        cupos: cuposTaller,
        nivel: tallerDepForm.nivel,
        docente: docenteFinal,
      };
      nuevaLista = listaActual.map((taller, idx) => idx === indiceTallerEditando ? nuevoTaller : taller);
    } else {
      const nuevosTalleres = tallerDepForm.dias.map(d => ({
        deporte: deporteFinal,
        edadMinima: minE,
        edadMaxima: maxE,
        dia: d,
        horaInicio: tallerDepForm.horaInicio,
        horaFin: tallerDepForm.horaFin,
        cupos: cuposTaller,
        nivel: tallerDepForm.nivel,
        docente: docenteFinal,
      }));
      nuevaLista = [...listaActual, ...nuevosTalleres];
    }
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm((prev) => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    setIndiceTallerEditando(null);
    setTallerDepForm((prev) => ({
      ...prev,
      custom: "",
      cupos: "20",
      nivel: "Formativo",
      docente: "",
      dias: ["Jueves"],
    }));
  };

  /**
   * Remueve un subtaller deportivo de la lista y recalcula cupos.
   */
  const quitarTallerDeportivo = (index) => {
    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const nuevaLista = listaActual.filter((_, idx) => idx !== index);
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm((prev) => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    if (indiceTallerEditando === index) {
      setIndiceTallerEditando(null);
      setTallerDepForm((prev) => ({
        ...prev,
        custom: "",
        cupos: "20",
        nivel: "Formativo",
        docente: "",
      }));
    } else if (indiceTallerEditando > index) {
      setIndiceTallerEditando((prev) => prev - 1);
    }
  };

  /**
   * Actualiza el nombre del taller y recalcula dinámicamente si es deportivo.
   */
  function actualizarNombrePrograma(valor) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(actual.categoria || "").toLowerCase();
      const catClean = catLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esAcademicoLocal = catClean.includes("academico") || catClean.includes("reforzamiento") || catClean.includes("tareas") || catClean === "vacaciones utiles";
      const esDeportivo = catClean === "deportivo" || catClean === "talleres deportivos" || esProgramaDeportivo(valor, actual.categoria);
      const usaTalleresPorEdad = esVerano ? !esAcademicoLocal : esDeportivo;
      const talleres = Array.isArray(actual.talleresDeportivos) ? actual.talleresDeportivos : [];
      let nuevosCupos = actual.cupos;
      if (usaTalleresPorEdad && talleres.length > 0) {
        nuevosCupos = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
      }
      return {
        ...actual,
        nombre: valor,
        cupos: nuevosCupos,
        requiereIndumentaria: esDeportivo ? actual.requiereIndumentaria : false,
      };
    });
  }

  /**
   * Modifica la categoría e inicializa los templates de circulares académicos sugeridos.
   */
  function actualizarCategoriaPrograma(valor) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(valor || "").toLowerCase();
      const catClean = catLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esAcademico = catClean.includes("academico") || catClean.includes("reforzamiento") || catClean.includes("tareas") || catClean === "vacaciones utiles";

      const esDeportivo = catClean === "deportivo" || catClean === "talleres deportivos" || esProgramaDeportivo(actual.nombre, valor);
      const usaTalleresPorEdad = esVerano ? !esAcademico : esDeportivo;
      const talleres = Array.isArray(actual.talleresDeportivos) ? actual.talleresDeportivos : [];
      let nuevosCupos = actual.cupos;
      if (usaTalleresPorEdad && talleres.length > 0) {
        nuevosCupos = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
      }

      let nuevosCamposAcademico = {};
      if (esAcademico) {
        let sugeridoTipo = actual.tipoComunicado || "Otro genérico";
        if (sugeridoTipo === "Otro genérico") {
          if (catClean.includes("reforzamiento") || catClean.includes("circulo")) {
            sugeridoTipo = "Reforzamiento (Circular)";
          } else if (catClean.includes("tareas") || catClean.includes("club")) {
            sugeridoTipo = "Club de Tareas";
          } else if (catClean.includes("cambridge") || catClean.includes("ingles")) {
            sugeridoTipo = "Cambridge";
          }
        }

        if (sugeridoTipo !== actual.tipoComunicado) {
          const template = TEMPLATES_POR_TIPO[sugeridoTipo] || { comunicado: "", requisitos: "" };
          const tipoDocSugerido = (sugeridoTipo === "Cambridge" || sugeridoTipo === "Certificación Cambridge") ? "Carta" : "Comunicado";
          const numDocSugerido = sugerirNumeroDocumento(tipoDocSugerido, programas);
          nuevosCamposAcademico = {
            tipoComunicado: sugeridoTipo,
            comunicado: template.comunicado,
            comunicadoCompleto: template.comunicado,
            requisitos: template.requisitos,
            tipoDocumento: tipoDocSugerido,
            numeroDocumento: numDocSugerido,
          };
        }
      }

      const reseteosCircular = (!esAcademico) ? {
        tipoComunicado: "Otro genérico",
        tipoDocumento: "Comunicado",
        numeroDocumento: "",
        areaTematica: "No aplica",
        nombreCiclo: "Ciclo I",
        duracionTaller: "",
        tablaHorariosNivel: [],
        incluyeAlmuerzo: false,
        horarioRecepcionAlmuerzo: "",
        nivelCambridge: "",
        modalidadesCambridge: [],
        montoPrimerPago: "",
        comunicado: "",
        comunicadoCompleto: "",
        requisitos: "",
      } : {};

      return {
        ...actual,
        ...reseteosCircular,
        ...nuevosCamposAcademico,
        categoria: valor,
        cupos: nuevosCupos,
        requiereIndumentaria: esDeportivo ? actual.requiereIndumentaria : false,
      };
    });

    const esVerano = normalizarPeriodoVista(form.periodo) === "verano";
    if (esVerano) {
      setTallerDepForm(prev => ({
        ...prev,
        deporte: valor === "Talleres Deportivos" ? "Fútbol" : "Danza"
      }));
    }
  }

  /**
   * Limpia y formatea la entrada del costo a decimales válidos.
   */
  function actualizarCosto(valor) {
    const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const normalizado = partes.length > 1 ? `${partes[0]}.${partes.slice(1).join("").slice(0, 2)}` : partes[0];
    setForm((f) => ({ ...f, costo: normalizado }));
  }

  /**
   * Formatea la cadena final del costo con dos decimales fijos.
   */
  function formatearCostoFormulario() {
    if (form.costo === "") return;
    const numero = Number(form.costo);
    setForm((f) => ({ ...f, costo: Number.isFinite(numero) ? numero.toFixed(2) : "" }));
  }

  /**
   * Adapta las opciones del formulario al alternar entre periodo escolar y verano.
   */
  function cambiarPeriodoFormulario(valor) {
    const periodoNormalizado = normalizarPeriodoVista(valor);
    let nuevaCategoria = form.categoria;
    const catLowerNew = String(form.categoria || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (periodoNormalizado === "verano") {
      const esCatVerano = [
        "vacaciones utiles",
        "talleres recreativos",
        "talleres deportivos"
      ].includes(catLowerNew);
      if (!esCatVerano) {
        nuevaCategoria = "";
      }
    } else {
      const esCatVerano = [
        "vacaciones utiles",
        "talleres recreativos",
        "talleres deportivos",
        "deportivos",
        "taller recreativo",
        "vacaciones"
      ].includes(catLowerNew);
      if (esCatVerano) {
        nuevaCategoria = "";
      }
    }

    const catLowerFinal = String(nuevaCategoria || "").toLowerCase();
    const esDeportivo = catLowerFinal === "deportivo" || catLowerFinal === "talleres deportivos" || esProgramaDeportivo(form.nombre, nuevaCategoria);
    const usaTalleresPorEdad =
      periodoNormalizado === "verano"
        ? catLowerFinal !== "academico" && catLowerFinal !== "académico" && catLowerFinal !== "vacaciones utiles" && catLowerFinal !== "vacaciones útiles"
        : esDeportivo;

    if (periodoNormalizado === "verano") {
      setTallerDepForm((prev) => ({ ...prev, deporte: nuevaCategoria === "Talleres Deportivos" ? "Fútbol" : "Danza" }));
    } else {
      setTallerDepForm((prev) => {
        if (!["Vóley", "Fútbol", "Básquet", "Otro"].includes(prev.deporte)) {
          return { ...prev, deporte: "Vóley" };
        }
        return prev;
      });
    }
    setForm((f) => ({
      ...f,
      periodo: periodoNormalizado,
      categoria: nuevaCategoria,
      modalidadCobro: periodoNormalizado === "verano" ? "Unico" : f.modalidadCobro,
      invitacionMasiva: periodoNormalizado === "verano" ? false : f.invitacionMasiva,
      requiereIndumentaria: periodoNormalizado === "verano" ? false : f.requiereIndumentaria,
      horariosPorGrupo: usaTalleresPorEdad ? [] : f.horariosPorGrupo,
      usaHorariosPorBloque: usaTalleresPorEdad ? false : f.usaHorariosPorBloque,
    }));
  }

  /**
   * Calcula el rango de edades en base a las fechas de nacimiento (Ciclo Verano).
   */
  function actualizarFechaNacimientoVerano(campo, valor) {
    setForm((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      const rango = calcularRangoEdades(siguiente.fechaNacimientoDesde, siguiente.fechaNacimientoHasta);
      return {
        ...siguiente,
        edadMinima: rango.edadMinima,
        edadMaxima: rango.edadMaxima,
      };
    });
  }

  /**
   * Activa o desactiva la selección de un grado escolar aplicable.
   */
  function toggleGrado(valor) {
    setForm((f) => {
      const yaExiste = normalizarListaGrados(f.gradosAplicables).includes(valor);
      const nuevosGrados = yaExiste
        ? normalizarListaGrados(f.gradosAplicables).filter((item) => item !== valor)
        : [...normalizarListaGrados(f.gradosAplicables), valor];

      let nuevosGrupos = f.horariosPorGrupo;
      if (yaExiste && Array.isArray(f.horariosPorGrupo)) {
        nuevosGrupos = f.horariosPorGrupo.map((grupo) => ({
          ...grupo,
          grados: normalizarListaGrados(grupo.grados).filter((item) => item !== valor),
        }));
      }

      let nuevaTabla = Array.isArray(f.tablaHorariosNivel) ? [...f.tablaHorariosNivel] : [];
      const [nivel] = valor.split(":");
      if (nivel) {
        const hasGradesForNivel = nuevosGrados.some((g) => g.startsWith(`${nivel}:`));
        const hasRowForNivel = nuevaTabla.some((row) => row.nivel === nivel);
        if (hasGradesForNivel && !hasRowForNivel) {
          nuevaTabla.push({ nivel, dia: "", horarioAlmuerzo: "", horarioClase: "" });
        } else if (!hasGradesForNivel && hasRowForNivel) {
          nuevaTabla = nuevaTabla.filter((row) => row.nivel !== nivel);
        }
      }

      return {
        ...f,
        gradosAplicables: nuevosGrados,
        horariosPorGrupo: nuevosGrupos,
        tablaHorariosNivel: nuevaTabla,
      };
    });
  }

  /**
   * Vincula o desvincula un día de atención del listado.
   */
  function toggleDia(valor) {
    setForm((f) => {
      const actuales = normalizarListaTexto(f.dias);
      const yaExiste = actuales.includes(valor);
      const catLower = String(f.categoria || "").toLowerCase();
      const esDeportivo = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(f.nombre, f.categoria);
      const usaTalleresPorEdad =
        normalizarPeriodoVista(f.periodo) === "verano"
          ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
          : esDeportivo;
      if (!yaExiste && normalizarPeriodoVista(f.periodo) === "verano" && usaTalleresPorEdad && actuales.length >= 7) {
        mostrarMsg("El taller de verano no puede exceder los 7 dias de atencion.");
        return f;
      }
      return {
        ...f,
        dias: yaExiste ? actuales.filter((item) => item !== valor) : [...actuales, valor],
      };
    });
  }

  /**
   * Agrega un nuevo bloque de horarios en la tabla por grupos del formulario.
   */
  function agregarGrupoHorario(grupo = horarioGrupoInicial) {
    setForm((actual) => {
      const nuevaLista = [...(Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []), { ...grupo, id: grupo.id || `grupo-${Date.now()}` }];
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        usaHorariosPorBloque: true,
        gradosAplicables: normalizarListaGrados([...normalizarListaGrados(actual.gradosAplicables), ...normalizarListaGrados(grupo.grados)]),
        horariosPorGrupo: nuevaLista,
        cupos: String(totalCupos),
      };
    });
  }

  /**
   * Elimina un bloque de horarios de grupo.
   */
  function quitarGrupoHorario(index) {
    setForm((actual) => {
      const nuevaLista = (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).filter((_, itemIndex) => itemIndex !== index);
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        horariosPorGrupo: nuevaLista,
        cupos: nuevaLista.length > 0 ? String(totalCupos) : actual.cupos,
      };
    });
  }

  /**
   * Modifica valores dentro de un bloque específico de horario de grupo.
   */
  function actualizarGrupoHorario(index, campo, valor) {
    setForm((actual) => {
      const lista = Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : [];
      const nuevaLista = lista.map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        if (campo && typeof campo === "object") {
          return { ...campo, id: grupo.id || campo.id || `grupo-${Date.now()}` };
        }
        return { ...grupo, [campo]: valor };
      });
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        horariosPorGrupo: nuevaLista,
        cupos: String(totalCupos),
      };
    });
  }

  /**
   * Activa o desactiva la selección de un grado dentro de un bloque de grupo de horario.
   */
  function toggleGradoGrupo(index, valor) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        const grados = normalizarListaGrados(grupo.grados);
        return {
          ...grupo,
          grados: grados.includes(valor) ? grados.filter((item) => item !== valor) : [...grados, valor],
        };
      }),
    }));
  }

  // --- PROPIEDADES COMPUTADAS DEL FORMULARIO ---
  const formGradosAplicables = useMemo(() => normalizarListaGrados(form.gradosAplicables), [form.gradosAplicables]);
  const formDias = useMemo(() => normalizarListaTexto(form.dias), [form.dias]);
  const formHorariosPorGrupo = useMemo(() => Array.isArray(form.horariosPorGrupo) ? form.horariosPorGrupo : [], [form.horariosPorGrupo]);
  const esFormularioVerano = useMemo(() => normalizarPeriodoVista(form.periodo) === "verano", [form.periodo]);

  const esDeportivoForm = useMemo(() => {
    return String(form.categoria || "").toLowerCase() === "deportivo" || 
      String(form.categoria || "").toLowerCase() === "talleres deportivos" || 
      esProgramaDeportivo(form.nombre, form.categoria);
  }, [form.nombre, form.categoria]);

  const esCambridgeForm = useMemo(() => esProgramaCambridge(form), [form]);
  const ciclosCambridgeFormulario = useMemo(() => calcularTextoCiclosCambridge(form.fechaInicio, form.fechaFin), [form.fechaInicio, form.fechaFin]);

  const usaTalleresPorEdad = useMemo(() => {
    const catLowerForm = String(form.categoria || "").toLowerCase();
    return esFormularioVerano
      ? catLowerForm !== "academico" && catLowerForm !== "académico" && catLowerForm !== "vacaciones utiles" && catLowerForm !== "vacaciones útiles"
      : esDeportivoForm;
  }, [esFormularioVerano, esDeportivoForm, form.categoria]);

  const duracionTallerFormulario = useMemo(() => calcularDuracionTexto(form.fechaInicio, form.fechaFin), [form.fechaInicio, form.fechaFin]);
  const mostrarIndumentariaDeportiva = esDeportivoForm;

  return {
    form,
    setForm,
    tallerDepForm,
    setTallerDepForm,
    indiceTallerEditando,
    setIndiceTallerEditando,
    alertaConfiguracion,
    setAlertaConfiguracion,

    // Computados
    formGradosAplicables,
    formDias,
    formHorariosPorGrupo,
    esFormularioVerano,
    esDeportivoForm,
    esCambridgeForm,
    ciclosCambridgeFormulario,
    usaTalleresPorEdad,
    duracionTallerFormulario,
    mostrarIndumentariaDeportiva,

    // Métodos
    mostrarAlertaConfiguracion,
    actualizarForm,
    actualizarInvitacionMasiva,
    seleccionarImagenAnuncio,
    quitarImagenAnuncio,
    iniciarEdicionTaller,
    cancelarEdicionTaller,
    agregarTallerDeportivo,
    quitarTallerDeportivo,
    actualizarNombrePrograma,
    actualizarCategoriaPrograma,
    actualizarCosto,
    formatearCostoFormulario,
    cambiarPeriodoFormulario,
    actualizarFechaNacimientoVerano,
    toggleGrado,
    toggleDia,
    agregarGrupoHorario,
    quitarGrupoHorario,
    actualizarGrupoHorario,
    toggleGradoGrupo,
  };
}
