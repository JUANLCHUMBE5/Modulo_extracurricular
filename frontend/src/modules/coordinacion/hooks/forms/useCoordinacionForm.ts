import { useState } from "react";
import { formInicial, horarioGrupoInicial, TEMPLATES_POR_TIPO } from "../../constants/coordinacionFormDefaults";
import {
  esProgramaCambridge,
  esProgramaDeportivo,
  normalizarHorariosPorGrupo,
  obtenerGradosDeportivos,
  obtenerGradosFinales,
  normalizarListaGrados,
  normalizarListaTexto,
  obtenerDiasEntreFechas,
  normalizarPeriodoVista,
  calcularTextoCiclosCambridge,
  resumenGrupoDeportivo,
  resumenGrados,
  resumenResponsablesPorGrupo,
  resumenTutoraPorGrupo,
} from "../../utils/coordinacionProgramUtils";
import { normalizarDuracionAvisoDias, calcularDuracionTexto } from "../../../../services/dateService";
import { esCostoValido } from "../../utils/coordinacionFormatters";
import { crearPrograma, editarPrograma } from "../../services/coordinacionService";
import useFormTalleresDeportivos, { tallerDepFormInicial } from "./useFormTalleresDeportivos";
import useFormGrupoHorarios from "./useFormGrupoHorarios";
import useFormAnuncioImagen from "./useFormAnuncioImagen";

const sugerirNumeroDocumento = (tipoDoc: string, programasList: any[] = []) => {
  const anio = new Date().getFullYear();
  const prefix = tipoDoc === "Carta" ? "CAR" : "COM";
  const count = (programasList || []).filter((p) => {
    const pAnio = p.fechaInicio ? new Date(p.fechaInicio).getFullYear() : anio;
    const pTipo = p.tipoDocumento || "Comunicado";
    return pTipo === tipoDoc && pAnio === anio;
  }).length;

  const correlativo = String(count + 1).padStart(3, "0");
  return `${prefix}-${correlativo}-${anio}`;
};

function calcularRangoEdades(desde: string, hasta: string) {
  if (!desde || !hasta) return { edadMinima: "", edadMaxima: "" };
  const calcularEdad = (fechaNac: string) => {
    const nac = new Date(fechaNac);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
      edad--;
    }
    return edad;
  };
  const e1 = calcularEdad(desde);
  const e2 = calcularEdad(hasta);
  return {
    edadMinima: String(Math.min(e1, e2)),
    edadMaxima: String(Math.max(e1, e2)),
  };
}

export default function useCoordinacionForm({
  puedeCrearProgramas,
  puedeEditarProgramas,
  modoEditar,
  setModoEditar,
  programas,
  setProgramas,
  setShowModal,
  embedded,
  navigate,
  mostrarMsg,
  mostrarAlertaConfiguracion,
  setAlertaConfiguracion,
  setMensaje,
  documentos,
}: any) {
  const [form, setForm] = useState(formInicial);
  const [guardando, setGuardando] = useState(false);

  const {
    tallerDepForm,
    setTallerDepForm,
    indiceTallerEditando,
    setIndiceTallerEditando,
    iniciarEdicionTaller,
    cancelarEdicionTaller,
    agregarTallerDeportivo,
    quitarTallerDeportivo,
  } = useFormTalleresDeportivos({
    form,
    setForm,
    mostrarMsg,
  });

  const {
    agregarGrupoHorario,
    quitarGrupoHorario,
    actualizarGrupoHorario,
    toggleGradoGrupo,
  } = useFormGrupoHorarios({
    form,
    setForm,
  });

  const {
    seleccionarImagenAnuncio,
    quitarImagenAnuncio,
  } = useFormAnuncioImagen({
    form,
    setForm,
    mostrarMsg,
  });

  function actualizarForm(campo: any, valor?: any) {
    if (typeof campo === "object" && campo !== null) {
      setForm((f) => ({ ...f, ...campo }));
    } else {
      setForm((f) => ({ ...f, [campo]: valor }));
    }
  }

  function actualizarInvitacionMasiva(activa: boolean) {
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

  function actualizarNombrePrograma(valor: string) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(actual.categoria || "").toLowerCase();
      const catClean = catLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esAcademicoLocal =
        catClean.includes("academico") ||
        catClean.includes("reforzamiento") ||
        catClean.includes("tareas") ||
        catClean === "vacaciones utiles";
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

  function actualizarCategoriaPrograma(valor: string) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(valor || "").toLowerCase();
      const catClean = catLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esAcademico =
        catClean.includes("academico") ||
        catClean.includes("reforzamiento") ||
        catClean.includes("tareas") ||
        catClean === "vacaciones utiles";

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
          const tipoDocSugerido =
            sugeridoTipo === "Cambridge" || sugeridoTipo === "Certificación Cambridge" ? "Carta" : "Comunicado";
          const numDocSugerido = sugerirNumeroDocumento(tipoDocSugerido, programas);
          nuevosCamposAcademico = {
            tipoComunicado: sugeridoTipo,
            comunicado: template.comunicado || "",
            comunicadoCompleto: template.comunicado || "",
            requisitos: template.requisitos || "",
            tipoDocumento: tipoDocSugerido,
            numeroDocumento: numDocSugerido,
          };
        }
      }

      const reseteosCircular = !esAcademico
        ? {
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
          }
        : {};

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
      setTallerDepForm((prev) => ({
        ...prev,
        deporte: valor === "Talleres Deportivos" ? "Fútbol" : "Danza",
      }));
    }
  }

  function actualizarCosto(valor: string) {
    const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const normalizado = partes.length > 1 ? `${partes[0]}.${partes.slice(1).join("").slice(0, 2)}` : partes[0];

    setForm((f) => ({ ...f, costo: normalizado }));
  }

  function formatearCostoFormulario() {
    if (form.costo === "") return;
    const numero = Number(form.costo);
    setForm((f) => ({ ...f, costo: Number.isFinite(numero) ? numero.toFixed(2) : "" }));
  }

  function cambiarPeriodoFormulario(valor: string) {
    const periodoNormalizado = normalizarPeriodoVista(valor);

    let nuevaCategoria = form.categoria;
    const catLowerNew = String(form.categoria || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (periodoNormalizado === "verano") {
      const esCatVerano = ["vacaciones utiles", "talleres recreativos", "talleres deportivos"].includes(catLowerNew);
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
        "vacaciones",
      ].includes(catLowerNew);
      if (esCatVerano) {
        nuevaCategoria = "";
      }
    }

    const catLowerFinal = String(nuevaCategoria || "").toLowerCase();
    const esDeportivo = catLowerFinal === "deportivo" || catLowerFinal === "talleres deportivos" || esProgramaDeportivo(form.nombre, nuevaCategoria);
    const usaTalleresPorEdad =
      periodoNormalizado === "verano"
        ? catLowerFinal !== "academico" &&
          catLowerFinal !== "académico" &&
          catLowerFinal !== "vacaciones utiles" &&
          catLowerFinal !== "vacaciones útiles"
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

  function actualizarFechaNacimientoVerano(campo: string, valor: any) {
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

  function toggleGrado(valor: string) {
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

  function toggleDia(valor: string) {
    setForm((f) => {
      const actuales = normalizarListaTexto(f.dias);
      const yaExiste = actuales.includes(valor);
      const catLower = String(f.categoria || "").toLowerCase();
      const esDeportivo = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(f.nombre, f.categoria);
      const usaTalleresPorEdad =
        normalizarPeriodoVista(f.periodo) === "verano"
          ? catLower !== "academico" &&
            catLower !== "académico" &&
            catLower !== "vacaciones utiles" &&
            catLower !== "vacaciones útiles"
          : esDeportivo;
      if (!yaExiste && normalizarPeriodoVista(f.periodo) === "verano" && usaTalleresPorEdad && actuales.length >= 7) {
        mostrarMsg("El taller de verano no puede exceder los 7 días de atención.");
        return f;
      }
      return {
        ...f,
        dias: yaExiste ? actuales.filter((item) => item !== valor) : [...actuales, valor],
      };
    });
  }

  async function guardar(e: any) {
    e.preventDefault();
    setAlertaConfiguracion("");
    if (!modoEditar && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    if (modoEditar && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    if (!form.nombre.trim()) return mostrarAlertaConfiguracion("Revise: nombre del programa.");
    if (!form.categoria) return mostrarAlertaConfiguracion("Revise: categoría.");

    const esVeranoGuardar = normalizarPeriodoVista(form.periodo) === "verano";
    const catLower = String(form.categoria || "").toLowerCase();
    const esCambridgeGuardar = esProgramaCambridge(form);
    const esDeportivoGuardar = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(form.nombre, form.categoria);
    const esMaratonGuardar = catLower === "maraton" || catLower === "maratón";
    const usaTalleresPorEdad = esVeranoGuardar
      ? catLower !== "academico" &&
        catLower !== "académico" &&
        catLower !== "vacaciones utiles" &&
        catLower !== "vacaciones útiles"
      : esDeportivoGuardar;

    const talleres = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    if (usaTalleresPorEdad && talleres.length === 0) {
      return mostrarAlertaConfiguracion(
        esVeranoGuardar
          ? "Revise: talleres de verano, edades y horarios."
          : "Revise: talleres deportivos, edades y horarios."
      );
    }

    const gruposHorario =
      usaTalleresPorEdad || esMaratonGuardar ? [] : normalizarHorariosPorGrupo(form.horariosPorGrupo);
    const usaHorariosPorBloqueGuardar = !usaTalleresPorEdad && !esMaratonGuardar;

    let gradosFinales: any[] = [];
    if (usaTalleresPorEdad) {
      gradosFinales = obtenerGradosDeportivos(talleres);
    } else if (gruposHorario.length > 0) {
      gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    } else if (
      form.invitacionMasiva &&
      form.alcanceInvitacionMasiva &&
      ["inicial", "primaria", "secundaria", "colegio", "todos"].includes(form.alcanceInvitacionMasiva.toLowerCase())
    ) {
      const alcanceLower = form.alcanceInvitacionMasiva.toLowerCase();
      if (alcanceLower === "inicial") {
        gradosFinales = ["Inicial:3 años", "Inicial:4 años", "Inicial:5 años"];
      } else if (alcanceLower === "primaria") {
        gradosFinales = ["Primaria:1", "Primaria:2", "Primaria:3", "Primaria:4", "Primaria:5", "Primaria:6"];
      } else if (alcanceLower === "secundaria") {
        gradosFinales = ["Secundaria:1", "Secundaria:2", "Secundaria:3", "Secundaria:4", "Secundaria:5"];
      } else if (alcanceLower === "colegio" || alcanceLower === "todos") {
        gradosFinales = [
          "Inicial:3 años",
          "Inicial:4 años",
          "Inicial:5 años",
          "Primaria:1",
          "Primaria:2",
          "Primaria:3",
          "Primaria:4",
          "Primaria:5",
          "Primaria:6",
          "Secundaria:1",
          "Secundaria:2",
          "Secundaria:3",
          "Secundaria:4",
          "Secundaria:5",
        ];
      }
    } else if (esMaratonGuardar) {
      gradosFinales = normalizarListaGrados(form.gradosAplicables);
    } else {
      gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    }

    let diasFinales: any[] = [];
    if (usaTalleresPorEdad) {
      const todosDias = talleres.flatMap((t) =>
        String(t.dia || "")
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      );
      diasFinales = Array.from(new Set(todosDias));
    } else if (esMaratonGuardar) {
      diasFinales = obtenerDiasEntreFechas(form.fechaInicio, form.fechaFin);
    } else {
      diasFinales = normalizarListaTexto(form.dias);
    }

    if (form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin) {
      return mostrarAlertaConfiguracion("Revise: la fecha de inicio no puede ser posterior a la fecha de fin.");
    }

    const camposFaltantes = [];
    if (!form.fechaInicio || !form.fechaFin) camposFaltantes.push("fechas de vigencia");
    if (!form.cupos || Number(form.cupos) <= 0) camposFaltantes.push("cupos");
    if (!String(form.costo || "").trim()) camposFaltantes.push("costo");
    if (!form.modalidadCobro) camposFaltantes.push("modalidad de cobro");
    if (esCambridgeGuardar && !String(form.responsable || "").trim()) camposFaltantes.push("docente/profesor responsable");
    if (esMaratonGuardar) {
      if (!form.horaInicio || !form.horaFin) camposFaltantes.push("horario");
    } else if (esVeranoGuardar && usaTalleresPorEdad) {
      if (diasFinales.length === 0) camposFaltantes.push("días de atención");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) camposFaltantes.push("días del programa");
      if (!form.horaInicio || !form.horaFin) camposFaltantes.push("horario");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (form.tipoComunicado === "Otro genérico") {
        camposFaltantes.push("bloques por grado");
      }
    }

    if (!esCambridgeGuardar && form.tipoComunicado && form.tipoComunicado !== "Otro genérico") {
      if (gruposHorario.length === 0) {
        camposFaltantes.push("horarios por grado/bloque/docente");
      }
    }

    if (camposFaltantes.length > 0) {
      return mostrarAlertaConfiguracion(`Revise: ${camposFaltantes.join(", ")}.`);
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && gradosFinales.length === 0) {
      return mostrarAlertaConfiguracion("Revise: grados aplicables.");
    }
    if (esVeranoGuardar && usaTalleresPorEdad && diasFinales.length === 0) {
      return mostrarAlertaConfiguracion("Revise: seleccione al menos 1 día de atención para verano.");
    }

    if (esMaratonGuardar) {
      if (form.horaInicio >= form.horaFin) {
        return mostrarMsg("La hora de inicio de la maratón debe ser menor a la hora de fin.");
      }
    }

    if (esCambridgeGuardar) {
      if (diasFinales.length === 0) return mostrarMsg("Seleccione los días de clase del programa Cambridge.");
      if (!form.horaInicio || !form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa Cambridge.");
      if (form.horaInicio >= form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) return mostrarMsg("Seleccione los días del programa.");
      if (!form.horaInicio || !form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa.");
      if (form.horaInicio >= form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      if ((form.almuerzoInicio && !form.almuerzoFin) || (!form.almuerzoInicio && form.almuerzoFin)) {
        return mostrarMsg("Complete hora de inicio y fin del almuerzo.");
      }
      if (form.almuerzoInicio && form.almuerzoFin && form.almuerzoInicio >= form.almuerzoFin) {
        return mostrarMsg("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
      }
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad) {
      const grupoInvalido = gruposHorario.find(
        (grupo) =>
          grupo.grados.length === 0 || !grupo.dia || !grupo.horaInicio || !grupo.horaFin || grupo.horaInicio >= grupo.horaFin
      );
      if (grupoInvalido)
        return mostrarAlertaConfiguracion("Revise los grupos por día: cada grupo debe tener grados, día y hora válida.");
      const grupoAlmuerzoInvalido = gruposHorario.find(
        (grupo) =>
          (grupo.almuerzoInicio && !grupo.almuerzoFin) ||
          (!grupo.almuerzoInicio && grupo.almuerzoFin) ||
          (grupo.almuerzoInicio && grupo.almuerzoFin && grupo.almuerzoInicio >= grupo.almuerzoFin)
      );
      if (grupoAlmuerzoInvalido) return mostrarAlertaConfiguracion("Revise los grupos por grado: complete horarios de almuerzo válidos.");
      const grupoSinDocente = gruposHorario.find((grupo) => !grupo.responsable);
      if (grupoSinDocente)
        return mostrarAlertaConfiguracion("Revise los grupos por grado: cada grupo debe tener docente o tutor responsable.");
    }

    if (!form.fechaInicio || !form.fechaFin) return mostrarAlertaConfiguracion("Revise: fechas de inicio y fin.");
    if (form.fechaInicio > form.fechaFin) return mostrarMsg("La fecha de inicio no puede ser mayor a la de fin.");
    const duracionAvisoDiasVal = normalizarDuracionAvisoDias(form.duracionAvisoDias, 7);
    if (String(duracionAvisoDiasVal) !== String(form.duracionAvisoDias)) {
      return mostrarMsg("El aviso de inscripción puede durar de 1 a 7 días como máximo.");
    }
    if (!form.cupos || Number(form.cupos) <= 0) return mostrarAlertaConfiguracion("Revise: cupos.");
    if (!esCostoValido(form.costo)) return mostrarMsg("Ingrese un costo válido en soles, con máximo dos decimales.");
    if (!form.modalidadCobro) return mostrarAlertaConfiguracion("Revise: modalidad de cobro.");
    if (form.modalidadCobro === "Mensual")
      return mostrarMsg('La modalidad "Cuota mensual" no está disponible todavía. Seleccione "Pago único".');
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    const esCambridgeForm = esProgramaCambridge(form);
    const ciclosCambridgeGuardar = calcularTextoCiclosCambridge(form.fechaInicio, form.fechaFin);
    const edadesTalleres = talleres
      .flatMap((taller) => [Number(taller.edadMinima), Number(taller.edadMaxima)])
      .filter(Number.isFinite);
    const edadMinimaVerano = edadesTalleres.length ? Math.min(...edadesTalleres) : "";
    const edadMaximaVerano = edadesTalleres.length ? Math.max(...edadesTalleres) : "";
    const datosGuardar = {
      ...form,
      usarFechaLimiteInscripcion: Boolean(form.fechaLimiteInscripcion),
      modalidadCobro: form.modalidadCobro,
      responsable: usaTalleresPorEdad
        ? Array.from(new Set(talleres.map((t) => t.docente).filter(Boolean))).join(" · ") || form.responsable
        : gruposHorario.length > 0
        ? resumenResponsablesPorGrupo(gruposHorario, form.responsable)
        : form.tablaHorariosNivel && form.tablaHorariosNivel.length > 0
        ? resumenResponsablesPorGrupo(form.tablaHorariosNivel, form.responsable)
        : form.responsable,
      tutora:
        gruposHorario.length > 0
          ? resumenTutoraPorGrupo(gruposHorario, form.tutora)
          : form.tablaHorariosNivel && form.tablaHorariosNivel.length > 0
          ? resumenTutoraPorGrupo(form.tablaHorariosNivel, form.tutora)
          : form.tutora,
      costo: Number(form.costo).toFixed(2),
      gradosAplicables: esCambridgeGuardar ? [] : gradosFinales,
      edadMinima: usaTalleresPorEdad ? edadMinimaVerano : "",
      edadMaxima: usaTalleresPorEdad ? edadMaximaVerano : "",
      fechaNacimientoDesde: "",
      fechaNacimientoHasta: "",
      duracionTaller: calcularDuracionTexto(form.fechaInicio, form.fechaFin),
      cicloI: esCambridgeForm ? ciclosCambridgeGuardar.cicloI : form.cicloI || "",
      cicloII: esCambridgeForm ? ciclosCambridgeGuardar.cicloII : form.cicloII || "",
      modalidadesCambridge: [],
      duracionAvisoDias: duracionAvisoDiasVal,
      dias: diasFinales,
      horariosPorGrupo: gruposHorario,
      usaHorariosPorBloque: gruposHorario.length > 0,
      grupo: esCambridgeForm
        ? "Asignado por Excel"
        : usaTalleresPorEdad
        ? resumenGrupoDeportivo(talleres)
        : resumenGrados(gradosFinales),
      grupoEtario: usaTalleresPorEdad ? `Edades ${edadMinimaVerano} a ${edadMaximaVerano} años` : "",
      requiereUniforme: false,
      requiereIndumentaria: Boolean(form.requiereIndumentaria),
      invitacionMasiva: esCambridgeGuardar ? false : Boolean(form.invitacionMasiva),
      alcanceInvitacionMasiva: !esCambridgeGuardar && form.invitacionMasiva ? form.alcanceInvitacionMasiva || "colegio" : "",
      anuncioImagen: !esCambridgeGuardar && form.invitacionMasiva ? form.anuncioImagen : "",
      anuncioImagenNombre: !esCambridgeGuardar && form.invitacionMasiva ? form.anuncioImagenNombre : "",
      anuncioImagenTamano: !esCambridgeGuardar && form.invitacionMasiva ? form.anuncioImagenTamano : 0,
    };

    try {
      if (modoEditar) {
        const editado = await editarPrograma(form.id, datosGuardar);
        setProgramas((act: any[]) => act.map((p) => (p.id === form.id ? editado : p)));
        mostrarMsg("Programa modificado correctamente.", "success");
      } else {
        const nuevo = await crearPrograma(datosGuardar);
        setProgramas((act: any[]) => [nuevo, ...act]);
        mostrarMsg("Programa creado correctamente.", "success");
      }
      setModoEditar(false);
      setShowModal(false);
      if (!embedded) navigate("/coordinacion/programas");
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo guardar el programa.");
    } finally {
      setGuardando(false);
    }
  }

  return {
    form,
    setForm,
    guardando,
    tallerDepForm,
    setTallerDepForm,
    indiceTallerEditando,
    setIndiceTallerEditando,
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
    guardar,
  };
}
