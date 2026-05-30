import { useEffect, useState } from "react";
import { Alert as MantineAlert, Badge, Group, ActionIcon, Tooltip } from "@mantine/core";
import { toast } from "sonner";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconChevronRight as ChevronRight,
  IconCircleCheck as CheckCircle2,
  IconCurrencyDollar as DollarSign,
  IconEdit as Edit3,
  IconEye as Eye,
  IconFileDownload as FileDown,
  IconFileText as FileText,
  IconPhoto as Photo,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconPlus as Plus,
  IconSearch as Search,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconTrash as Trash2,
  IconUpload as Upload,
  IconUsers as Users,
  IconX as X,
} from "@tabler/icons-react";
import {
  diasSemana,
  LOGO_COLEGIO_SRC,
  nivelesGrados,
  variablesPlantillaAceptadas,
  variablesPlantillaRequeridas,
} from "./constants/coordinacionConstants";
import {
  listarProgramas, crearPrograma, crearProgramaDesdeDocumento, editarPrograma, cambiarEstadoPrograma,
  eliminarPrograma,
  listarCategorias, crearCategoria, eliminarCategoria, listarInvitados,
  previsualizarCargaAlumnosMasiva, confirmarCargaAlumnos, obtenerActividadPrograma,
} from "./services/coordinacionService";
import { calcularDuracionTexto, fechaActualIso, normalizarDuracionAvisoDias } from "../../services/dateService";
import GradeSelector from "./components/GradeSelector";
import { HorarioTabla, GradosTabla, VigenciaTabla, CuposTabla } from "./components/ProgramTableCells";
import CargaExcelView from "./components/CargaExcelView";
import DocumentosView from "./components/DocumentosView";
import { esCostoValido, formatearHora12, formatearSoles } from "./utils/coordinacionFormatters";
import { descargarListaAlumnosPdf } from "./utils/pdfUtils";
import {
  contarDatosDetectados,
  extraerDatosProgramaDesdeWord,
  filtrarDatosDocumento,
  leerArchivoBase64,
  leerDocumentoWord,
  leerDocumentoWordDesdeBase64,
  leerPlantillaWord,
  leerPlantillaWordDesdeBase64,
} from "./utils/wordTemplateUtils";
import "./Coordinacion.css";

const formInicial = {
  nombre: "", periodo: "escolar", categoria: "", grupo: "", horario: "",
  grupoEtario: "",
  gradosAplicables: [], edadMinima: "", edadMaxima: "", fechaNacimientoDesde: "", fechaNacimientoHasta: "", dias: [], horaInicio: "", horaFin: "",
  almuerzoInicio: "", almuerzoFin: "",
  horariosPorGrupo: [],
  talleresDeportivos: [],
  fechaInicio: "", fechaFin: "", duracionAvisoDias: "7", cupos: "", costo: "", modalidadCobro: "Mensual",
  responsable: "", tutora: "", plantilla: "", plantillaBase64: "", plantillaVariables: [],
  plantillaValidada: false, plantillaActualizadaEn: "", requisitos: "",
  comunicado: "", detalleCosto: "", detalleAlmuerzo: "", concesionarios: "",
  requiereUniforme: false, requiereIndumentaria: false, invitacionMasiva: false,
  anuncioImagen: "", anuncioImagenNombre: "", anuncioImagenTamano: 0, anuncioImagenComprimida: false,
};

const ANUNCIO_IMAGEN_MAX_BYTES = 900 * 1024;

const horarioGrupoInicial = {
  grados: [],
  dia: "Jueves",
  almuerzoInicio: "14:20",
  almuerzoFin: "15:10",
  horaInicio: "15:20",
  horaFin: "17:20",
  aula: "",
};

const vistasNav = [
  { id: "programas", label: "Gestion de Programas", icon: BookOpen, permissions: ["programas.crear", "programas.editar", "alumnos.historial.ver"] },
  { id: "carga", label: "Carga Excel", icon: Upload, permissions: ["grupos.crear", "grupos.editar"] },
  { id: "documentos", label: "Plantillas / Documentos", icon: FileText, permissions: ["programas.crear", "programas.editar"] },
];

function tienePermisoAsignado(user, permiso) {
  if (!user) return false;
  if (user.role === "administrador") return true;
  const permisos = Array.isArray(user.permisos)
    ? user.permisos
    : Array.isArray(user.permissions)
      ? user.permissions
      : [];
  return permisos.includes(permiso);
}

function puedeVerVista(user, vista) {
  return !vista.permissions?.length || vista.permissions.some((permiso) => tienePermisoAsignado(user, permiso));
}

function normalizarListaGrados(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizarListaTexto(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizarTextoBusqueda(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esProgramaDeportivo(nombre = "", categoria = "") {
  const texto = normalizarTextoBusqueda(`${nombre} ${categoria}`);
  return /\b(deport|voley|volley|futbol|futsal|fulbito|football|soccer)\b/.test(texto);
}

function calcularEdadDesdeFecha(fechaTexto) {
  if (!fechaTexto) return "";
  const fecha = new Date(fechaTexto);
  if (Number.isNaN(fecha.getTime())) return "";
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const mes = hoy.getMonth() - fecha.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) edad -= 1;
  return edad > 0 ? edad : "";
}

function calcularRangoEdades(desde, hasta) {
  const edadDesde = calcularEdadDesdeFecha(desde);
  const edadHasta = calcularEdadDesdeFecha(hasta);
  if (!edadDesde || !edadHasta) return { edadMinima: "", edadMaxima: "" };
  return {
    edadMinima: Math.min(edadDesde, edadHasta),
    edadMaxima: Math.max(edadDesde, edadHasta),
  };
}

function formatearPesoArchivo(bytes = 0) {
  const numero = Number(bytes || 0);
  if (!numero) return "";
  if (numero < 1024 * 1024) return `${Math.round(numero / 1024)} KB`;
  return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
}

function nombreProgramaDesdeArchivo(nombreArchivo = "") {
  return String(nombreArchivo || "")
    .replace(/\.[^.]+$/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(plantilla|digital|variables|word|docx)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function leerArchivoComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(archivo);
  });
}

function cargarImagen(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("La imagen seleccionada no se pudo procesar."));
    image.src = dataUrl;
  });
}

function dataUrlABytes(dataUrl = "") {
  const base64 = String(dataUrl).split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

async function comprimirImagenAnuncio(archivo) {
  const dataUrlOriginal = await leerArchivoComoDataUrl(archivo);
  if (archivo.size <= ANUNCIO_IMAGEN_MAX_BYTES) {
    return {
      dataUrl: dataUrlOriginal,
      bytes: archivo.size,
      comprimida: false,
    };
  }

  const imagen = await cargarImagen(dataUrlOriginal);
  const escala = Math.min(1, 1400 / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

  let calidad = 0.82;
  let comprimida = canvas.toDataURL("image/jpeg", calidad);
  while (dataUrlABytes(comprimida) > ANUNCIO_IMAGEN_MAX_BYTES && calidad > 0.46) {
    calidad -= 0.08;
    comprimida = canvas.toDataURL("image/jpeg", calidad);
  }

  return {
    dataUrl: comprimida,
    bytes: dataUrlABytes(comprimida),
    comprimida: true,
  };
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*aÃ±os?/i, "").trim();
}

function Coordinacion({
  delegatedContent,
  embedded = false,
  initialView = "programas",
  moduleSwitcher,
  onClearDelegatedModule,
  user,
  onLogout,
}) {
  const esProfesor = user?.username === "profe" || user?.name === "Profesor";
  const [vista, setVista] = useState(initialView || "programas");
  const [programas, setProgramas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [cargando, setCargando] = useState(false);


  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [guardando, setGuardando] = useState(false);
  const [nuevaCat, setNuevaCat] = useState("");
  const [catAEliminar, setCatAEliminar] = useState("");
  const [plantillaInputKey, setPlantillaInputKey] = useState(0);

  // Estados locales para añadir talleres deportivos
  const [tallerDepDeporte, setTallerDepDeporte] = useState("Vóley");
  const [tallerDepCustom, setTallerDepCustom] = useState("");
  const [tallerDepMinEdad, setTallerDepMinEdad] = useState("6");
  const [tallerDepMaxEdad, setTallerDepMaxEdad] = useState("9");
  const [tallerDepDia, setTallerDepDia] = useState("Jueves");
  const [tallerDepHoraInicio, setTallerDepHoraInicio] = useState("15:50");
  const [tallerDepHoraFin, setTallerDepHoraFin] = useState("16:50");
  const [programaDocsId, setProgramaDocsId] = useState("");
  const [lecturaDocumento, setLecturaDocumento] = useState(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(true);

  // Modal invitados
  const [showInvitados, setShowInvitados] = useState(false);
  const [invitados, setInvitados] = useState([]);
  const [progSeleccionado, setProgSeleccionado] = useState(null);

  // Carga Excel
  const cargaPeriodo = "escolar";
  const [archivosExcel, setArchivosExcel] = useState([]);
  const [archivoInputKey, setArchivoInputKey] = useState(0);
  const [previewCarga, setPreviewCarga] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(null);
  const [confirmandoCarga, setConfirmandoCarga] = useState(false);
  const puedeCrearProgramas = tienePermisoAsignado(user, "programas.crear");
  const puedeEditarProgramas = tienePermisoAsignado(user, "programas.editar");
  const puedeCrearGrupos = tienePermisoAsignado(user, "grupos.crear");
  const puedeEditarGrupos = tienePermisoAsignado(user, "grupos.editar");
  const puedeVerAlumnos = tienePermisoAsignado(user, "alumnos.historial.ver");
  const puedeCargarAlumnos = puedeCrearGrupos || puedeEditarGrupos;
  const puedeGestionarGruposFormulario = modoEditar ? puedeEditarGrupos : puedeCrearGrupos;
  const tieneAccionesPrograma = puedeEditarProgramas || puedeVerAlumnos;
  const vistasDisponibles = vistasNav.filter((item) => puedeVerVista(user, item));
  const vistaActualDisponible = vistasDisponibles.some((item) => item.id === vista);
  const puedeVerProgramasVista = vistasDisponibles.some((item) => item.id === "programas");
  const puedeVerCargaVista = vistasDisponibles.some((item) => item.id === "carga");
  const puedeVerDocumentosVista = vistasDisponibles.some((item) => item.id === "documentos");

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    if (!embedded || !initialView) return;
    setVista(initialView);
    setMensaje("");
  }, [embedded, initialView]);

  useEffect(() => {
    if (vistaActualDisponible || vistasDisponibles.length === 0) return;
    setVista(vistasDisponibles[0].id);
    setMensaje("");
  }, [vistaActualDisponible, vistasDisponibles, vista]);

  async function cargarDatos() {
    setCargando(true);
    const [progs, cats] = await Promise.all([
      listarProgramas(),
      listarCategorias(),
    ]);
    setProgramas(progs);
    setCategorias(cats);
    setCargando(false);
  }



  function mostrarMsg(texto, tipo = "error") {
    setMensaje(texto);
    setTipoMsg(tipo);
    const titulo = tipo === "success" ? "Coordinación" : "Revisar datos";
    if (tipo === "success") {
      toast.success(titulo, { description: texto });
    } else {
      toast.warning(titulo, { description: texto });
    }
    if (tipo === "success") setTimeout(() => setMensaje(""), 4000);
  }

  // ── Filtrar programas ──
  const programasFiltrados = programas.filter(p => {
    const coincide = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toLowerCase().includes(busqueda.toLowerCase());
    const filtra = filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === filtroPeriodo;
    return coincide && filtra;
  });
  const programaDocs = programas.find((item) => item.id === programaDocsId);
  const historialPlantillas = programas.filter((programa) =>
    programa.plantilla && (programa.plantillaBase64 || apiDb.plantillasPorPrograma?.[programa.id]?.plantillaBase64)
  );

  // ── Abrir modal crear ──
  function abrirCrear() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    setForm(formInicial);
    setModoEditar(false);
    setProgramaDocsId("");
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setShowModal(true);
    setMensaje("");
  }

  function datosProgramaAFormulario(prog) {
    return {
      nombre: prog.nombre, periodo: normalizarPeriodoVista(prog.periodo), categoria: prog.categoria,
      grupo: prog.grupo, grupoEtario: prog.grupoEtario || "", horario: prog.horario, fechaInicio: prog.fechaInicio,
      gradosAplicables: normalizarListaGrados(prog.gradosAplicables),
      edadMinima: prog.edadMinima || "",
      edadMaxima: prog.edadMaxima || "",
      fechaNacimientoDesde: prog.fechaNacimientoDesde || "",
      fechaNacimientoHasta: prog.fechaNacimientoHasta || "",
      dias: normalizarListaTexto(prog.dias),
      horaInicio: prog.horaInicio || "",
      horaFin: prog.horaFin || "",
      almuerzoInicio: prog.almuerzoInicio || "",
      almuerzoFin: prog.almuerzoFin || "",
      horariosPorGrupo: normalizarHorariosPorGrupo(prog.horariosPorGrupo),
      talleresDeportivos: Array.isArray(prog.talleresDeportivos) ? prog.talleresDeportivos : [],
      fechaFin: prog.fechaFin,
      duracionAvisoDias: String(normalizarDuracionAvisoDias(prog.duracionAvisoDias, 7)),
      cupos: String(prog.cupos), costo: String(prog.costo),
      modalidadCobro: prog.modalidadCobro, responsable: prog.responsable,
      tutora: prog.tutora, plantilla: prog.plantilla || "",
      plantillaBase64: prog.plantillaBase64 || "",
      plantillaVariables: prog.plantillaVariables || [],
      plantillaValidada: Boolean(prog.plantillaValidada),
      plantillaActualizadaEn: prog.plantillaActualizadaEn || "",
      requisitos: prog.requisitos || "",
      comunicado: prog.comunicado || "",
      detalleCosto: prog.detalleCosto || "",
      detalleAlmuerzo: prog.detalleAlmuerzo || "",
      concesionarios: prog.concesionarios || "",
      requiereUniforme: false,
      requiereIndumentaria: Boolean(prog.requiereIndumentaria),
      invitacionMasiva: Boolean(prog.invitacionMasiva),
      anuncioImagen: prog.anuncioImagen || "",
      anuncioImagenNombre: prog.anuncioImagenNombre || "",
      anuncioImagenTamano: prog.anuncioImagenTamano || 0,
      anuncioImagenComprimida: Boolean(prog.anuncioImagenComprimida),
      id: prog.id,
    };
  }

  // ── Abrir modal editar ──
  function abrirEditar(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setProgramaDocsId("");
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setShowModal(true);
    setMensaje("");
  }

  // ── Validar y guardar ──
  async function guardar(e) {
    e.preventDefault();
    if (!modoEditar && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    if (modoEditar && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    if (!form.nombre.trim()) return mostrarMsg("El nombre del programa es obligatorio.");
    if (!form.categoria) return mostrarMsg("Seleccione una categoría.");
    
    const esVeranoGuardar = normalizarPeriodoVista(form.periodo) === "verano";
    const esDeportivoGuardar = String(form.categoria).toLowerCase() === "deportivo" || esProgramaDeportivo(form.nombre, form.categoria);
    
    const talleres = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    if (esDeportivoGuardar && talleres.length === 0) {
      return mostrarMsg("Debe agregar al menos un taller deportivo con sus edades y horarios.");
    }

    const gruposHorario = (esVeranoGuardar || esDeportivoGuardar) ? [] : normalizarHorariosPorGrupo(form.horariosPorGrupo);
    
    let gradosFinales = [];
    if (esDeportivoGuardar) {
      gradosFinales = obtenerGradosDeportivos(talleres);
    } else if (!esVeranoGuardar) {
      gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    }

    let diasFinales = [];
    if (esDeportivoGuardar) {
      diasFinales = Array.from(new Set(talleres.map(t => t.dia)));
    } else {
      diasFinales = normalizarListaTexto(form.dias);
    }

    if (!esVeranoGuardar && gradosFinales.length === 0) {
      return mostrarMsg("Seleccione al menos un grado aplicable.");
    }
    if (esVeranoGuardar && (!form.edadMinima || !form.edadMaxima || Number(form.edadMinima) > Number(form.edadMaxima))) {
      return mostrarMsg("Seleccione un rango de edades válido para ciclo verano.");
    }

    if (!esDeportivoGuardar && gruposHorario.length === 0) {
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

    if (!esDeportivoGuardar) {
      const grupoInvalido = gruposHorario.find((grupo) =>
        grupo.grados.length === 0 || !grupo.dia || !grupo.horaInicio || !grupo.horaFin || grupo.horaInicio >= grupo.horaFin
      );
      if (grupoInvalido) return mostrarMsg("Revise los grupos por día: cada grupo debe tener grados, día y hora válida.");
    }

    if (!form.fechaInicio || !form.fechaFin) return mostrarMsg("Las fechas de inicio y fin son obligatorias.");
    if (form.fechaInicio > form.fechaFin) return mostrarMsg("La fecha de inicio no puede ser mayor a la de fin.");
    const duracionAvisoDias = normalizarDuracionAvisoDias(form.duracionAvisoDias, 7);
    if (String(duracionAvisoDias) !== String(form.duracionAvisoDias)) {
      return mostrarMsg("El aviso de inscripción puede durar de 1 a 7 días como máximo.");
    }
    if (!form.cupos || Number(form.cupos) <= 0) return mostrarMsg("Los cupos deben ser un número positivo.");
    if (!esCostoValido(form.costo)) return mostrarMsg("Ingrese un costo válido en soles, con máximo dos decimales.");
    if (!form.modalidadCobro) return mostrarMsg("Seleccione la modalidad de cobro.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    const datosGuardar = {
      ...form,
      costo: Number(form.costo).toFixed(2),
      gradosAplicables: gradosFinales,
      edadMinima: esVeranoGuardar ? Number(form.edadMinima) : "",
      edadMaxima: esVeranoGuardar ? Number(form.edadMaxima) : "",
      fechaNacimientoDesde: "",
      fechaNacimientoHasta: "",
      duracionTaller: calcularDuracionTexto(form.fechaInicio, form.fechaFin),
      duracionAvisoDias,
      dias: diasFinales,
      horariosPorGrupo: gruposHorario,
      grupo: esVeranoGuardar
        ? crearGrupoEtarioVerano(form)
        : esDeportivoGuardar
          ? resumenGrupoDeportivo(talleres)
          : resumenGrados(gradosFinales),
      grupoEtario: esVeranoGuardar ? crearGrupoEtarioVerano(form) : "",
      requiereUniforme: false,
      requiereIndumentaria: Boolean(form.requiereIndumentaria),
      anuncioImagen: form.invitacionMasiva ? form.anuncioImagen : "",
      anuncioImagenNombre: form.invitacionMasiva ? form.anuncioImagenNombre : "",
      anuncioImagenTamano: form.invitacionMasiva ? form.anuncioImagenTamano : 0,
      anuncioImagenComprimida: form.invitacionMasiva ? Boolean(form.anuncioImagenComprimida) : false,
      horario: esDeportivoGuardar
        ? resumenHorarioDeportivo(talleres)
        : gruposHorario.length
          ? resumenHorariosPorGrupo(gruposHorario)
          : resumenHorario(diasFinales, form.horaInicio, form.horaFin, form.almuerzoInicio, form.almuerzoFin),
    };
    try {
      if (modoEditar) {
        await editarPrograma(form.id, datosGuardar);
        mostrarMsg("Programa actualizado correctamente.", "success");
        setProgramas((actuales) =>
          actuales.map((programa) => {
            if (programa.id !== form.id) return programa;
            return {
              ...programa,
              ...datosGuardar,
              id: form.id,
              periodo: normalizarPeriodoVista(datosGuardar.periodo),
              cupos: Number(datosGuardar.cupos),
              costo: Number(datosGuardar.costo),
              cuposOcupados: programa.cuposOcupados || 0,
              cuposDisponibles: Number(datosGuardar.cupos) - Number(programa.cuposOcupados || 0),
              estado: programa.estado || "Habilitado",
            };
          })
        );
        setShowModal(true);
      } else {
        const nuevoPrograma = await crearPrograma(datosGuardar);
        mostrarMsg("Programa creado correctamente.", "success");
        setProgramas((actuales) => [...actuales, nuevoPrograma]);
        setModoEditar(true);
        setForm(datosProgramaAFormulario(nuevoPrograma));
        setShowModal(true);
      }
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  // ── Cambiar estado ──
  async function toggleEstado(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para cambiar el estado de programas.");
    const nuevo = prog.estado === "Habilitado" ? "Deshabilitado" : "Habilitado";
    await cambiarEstadoPrograma(prog.id, nuevo);
    mostrarMsg(`Programa ${nuevo.toLowerCase()}.`, "success");
    await cargarDatos();
  }

  async function finalizarPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para finalizar programas.");
    const confirmado = window.confirm(`Finalizar ${prog.nombre}? Secretaria ya no podrá registrar nuevas inscripciones.`);
    if (!confirmado) return;

    await cambiarEstadoPrograma(prog.id, "Finalizado");
    mostrarMsg("Programa finalizado correctamente.", "success");
    await cargarDatos();
  }

  // ── Ver invitados ──
  async function eliminarCurso(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar programas.");
    const confirmado = window.confirm(`Eliminar ${prog.nombre}? Tambien se retirara su lista de invitados cargada.`);
    if (!confirmado) return;

    try {
      await eliminarPrograma(prog.id);
      mostrarMsg("Programa eliminado correctamente.", "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function verInvitados(prog) {
    if (!puedeVerAlumnos) return mostrarMsg("No tiene permiso para ver alumnos.");
    setProgSeleccionado(prog);
    const lista = await listarInvitados(prog.id);
    setInvitados(lista);
    setShowInvitados(true);
  }

  function descargarPdfInvitados() {
    if (!progSeleccionado) return;
    if (!invitados.length) {
      mostrarMsg("No hay alumnos registrados para descargar.");
      return;
    }

    descargarListaAlumnosPdf(progSeleccionado, invitados);
    mostrarMsg("Lista de alumnos descargada en PDF.", "success");
  }

  function abrirDocumentosPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar documentos del programa.");
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setProgramaDocsId(prog.id);
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setMensaje("");
  }

  async function guardarDocumentoComoPrograma() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas desde documentos.");
    if (!form.plantillaBase64) return mostrarMsg("Primero suba el documento Word.");
    if (!form.plantillaValidada) return mostrarMsg("El Word debe tener variables editables antes de guardarlo.");
    const nombreDocumento = form.nombre.trim() || nombreProgramaDesdeArchivo(form.plantilla);
    if (!nombreDocumento) return mostrarMsg("Ingrese el nombre del programa.");

    setGuardando(true);
    try {
      const creado = await crearProgramaDesdeDocumento({
        ...form,
        nombre: nombreDocumento,
        categoria: form.categoria || categorias[0] || "General",
      });
      await cargarDatos();
      setProgramaDocsId("");
      setForm(formInicial);
      setLecturaDocumento(null);
      setPlantillaInputKey((actual) => actual + 1);
      mostrarMsg(`Plantilla de ${creado.nombre} guardada en el historial.`, "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  async function guardarDocumentosPrograma() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar documentos del programa.");
    if (!form.id) return mostrarMsg("Seleccione un programa para gestionar sus documentos.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    try {
      await editarPrograma(form.id, form);
      await cargarDatos();
      mostrarMsg("Documentos del programa actualizados correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  // ── Agregar categoría ──
  async function agregarCategoria() {
    if (!nuevaCat.trim()) return;
    try {
      await crearCategoria(nuevaCat.trim());
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm(f => ({ ...f, categoria: nuevaCat.trim() }));
      setNuevaCat("");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function quitarCategoria() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar categorías.");
    if (!catAEliminar) return mostrarMsg("Seleccione una categoría para quitar.");
    const confirmado = window.confirm(`Quitar la categoría "${catAEliminar}"?`);
    if (!confirmado) return;

    try {
      await eliminarCategoria(catAEliminar);
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm(f => ({ ...f, categoria: f.categoria === catAEliminar ? "" : f.categoria }));
      setCatAEliminar("");
      mostrarMsg("Categoría quitada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  function actualizarForm(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function actualizarInvitacionMasiva(activa) {
    setForm((actual) => ({
      ...actual,
      invitacionMasiva: activa,
      anuncioImagen: activa ? actual.anuncioImagen : "",
      anuncioImagenNombre: activa ? actual.anuncioImagenNombre : "",
      anuncioImagenTamano: activa ? actual.anuncioImagenTamano : 0,
      anuncioImagenComprimida: activa ? actual.anuncioImagenComprimida : false,
    }));
  }

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

  function quitarImagenAnuncio() {
    setForm((actual) => ({
      ...actual,
      anuncioImagen: "",
      anuncioImagenNombre: "",
      anuncioImagenTamano: 0,
      anuncioImagenComprimida: false,
    }));
  }

  const agregarTallerDeportivo = () => {
    const deporteFinal = tallerDepDeporte === "Otro" ? tallerDepCustom.trim() : tallerDepDeporte;
    if (!deporteFinal) {
      mostrarMsg("Ingrese el nombre del deporte.");
      return;
    }
    const minE = Number(tallerDepMinEdad);
    const maxE = Number(tallerDepMaxEdad);
    if (!tallerDepMinEdad || !tallerDepMaxEdad || minE > maxE) {
      mostrarMsg("Rango de edades inválido.");
      return;
    }
    if (!tallerDepHoraInicio || !tallerDepHoraFin) {
      mostrarMsg("Ingrese las horas de inicio y fin.");
      return;
    }
    if (tallerDepHoraInicio >= tallerDepHoraFin) {
      mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      return;
    }

    const nuevoTaller = {
      deporte: deporteFinal,
      edadMinima: minE,
      edadMaxima: maxE,
      dia: tallerDepDia,
      horaInicio: tallerDepHoraInicio,
      horaFin: tallerDepHoraFin,
    };

    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    setForm(prev => ({
      ...prev,
      talleresDeportivos: [...listaActual, nuevoTaller]
    }));

    setTallerDepCustom("");
  };

  const quitarTallerDeportivo = (index) => {
    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    setForm(prev => ({
      ...prev,
      talleresDeportivos: listaActual.filter((_, idx) => idx !== index)
    }));
  };

  function mapAgesToGrades(edadMinima, edadMaxima) {
    const min = Number(edadMinima || 0);
    const max = Number(edadMaxima || 0);
    const grados = [];
    for (let age = min; age <= max; age++) {
      if (age === 3) grados.push("Inicial:3 años");
      else if (age === 4) grados.push("Inicial:4 años");
      else if (age === 5) grados.push("Inicial:5 años");
      else if (age >= 6 && age <= 11) {
        grados.push(`Primaria:${age - 5}`);
      } else if (age >= 12 && age <= 16) {
        grados.push(`Secundaria:${age - 11}`);
      } else if (age >= 17) {
        grados.push("Secundaria:5");
      }
    }
    return grados;
  }

  function obtenerGradosDeportivos(talleres) {
    if (!Array.isArray(talleres)) return [];
    const sets = new Set();
    talleres.forEach(t => {
      const grades = mapAgesToGrades(t.edadMinima, t.edadMaxima);
      grades.forEach(g => sets.add(g));
    });
    return Array.from(sets);
  }

  function resumenGrupoDeportivo(talleres) {
    if (!Array.isArray(talleres) || talleres.length === 0) return "Por definir";
    const uniqueWorkshops = [];
    talleres.forEach(t => {
      const label = `${t.deporte} (${t.edadMinima}-${t.edadMaxima} años)`;
      if (!uniqueWorkshops.includes(label)) {
        uniqueWorkshops.push(label);
      }
    });
    return uniqueWorkshops.join(" / ");
  }

  function resumenHorarioDeportivo(talleres) {
    if (!Array.isArray(talleres) || talleres.length === 0) return "Por definir";
    const porDia = {};
    talleres.forEach(t => {
      if (!porDia[t.dia]) porDia[t.dia] = [];
      porDia[t.dia].push(`${t.deporte} (${t.edadMinima}-${t.edadMaxima} a.): ${t.horaInicio}-${t.horaFin}`);
    });
    return Object.keys(porDia).map(dia => `${dia}: ${porDia[dia].join(", ")}`).join(" / ");
  }

  function crearGrupoEtarioVerano(datos) {
    if (datos.grupoEtario) return datos.grupoEtario;
    if (datos.edadMinima && datos.edadMaxima) {
      return `Edades ${datos.edadMinima} a ${datos.edadMaxima} anios`;
    }
    return "";
  }

  function actualizarNombrePrograma(valor) {
    setForm((actual) => ({
      ...actual,
      nombre: valor,
      requiereIndumentaria: esProgramaDeportivo(valor, actual.categoria) ? true : actual.requiereIndumentaria,
    }));
  }

  function actualizarCategoriaPrograma(valor) {
    setForm((actual) => ({
      ...actual,
      categoria: valor,
      requiereIndumentaria: esProgramaDeportivo(actual.nombre, valor) ? true : actual.requiereIndumentaria,
    }));
  }

  function actualizarCosto(valor) {
    const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const normalizado = partes.length > 1
      ? `${partes[0]}.${partes.slice(1).join("").slice(0, 2)}`
      : partes[0];

    setForm(f => ({ ...f, costo: normalizado }));
  }

  function formatearCostoFormulario() {
    if (form.costo === "") return;
    const numero = Number(form.costo);
    setForm(f => ({ ...f, costo: Number.isFinite(numero) ? numero.toFixed(2) : "" }));
  }

  async function seleccionarPlantilla(event) {
    if (modoEditar && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar plantillas.");
    if (!modoEditar && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear plantillas.");
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!/\.docx$/i.test(archivo.name)) {
      setPlantillaInputKey((actual) => actual + 1);
      return mostrarMsg("Solo se permiten plantillas Word en formato .docx.");
    }

    if (modoEditar && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.tieneActividad) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) {
          setPlantillaInputKey((actual) => actual + 1);
          return;
        }
      }
    }

    try {
      const lectura = await leerPlantillaWord(archivo);
      const { variablesDetectadas, textoPlano } = lectura;
      const plantillaBase64 = await leerArchivoBase64(archivo);
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, archivo.name, categorias);
      const datosAplicables = vista === "documentos" ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      const nombreDocumento = datosDetectados.nombre || nombreProgramaDesdeArchivo(archivo.name);
      const totalDetectados = contarDatosDetectados(datosAplicables);
      if (vista === "documentos") {
        setLecturaDocumento({
          archivo: archivo.name,
          texto: textoPlano,
          datos: datosAplicables,
          variables: variablesDetectadas,
        });
      }
      setForm((actual) => ({
        ...actual,
        ...datosAplicables,
        nombre: actual.nombre || nombreDocumento,
        categoria: actual.categoria || datosDetectados.categoria || categorias[0] || "",
        plantilla: archivo.name,
        plantillaBase64,
        plantillaVariables: variablesDetectadas,
        plantillaValidada: lectura.plantillaValida,
        plantillaActualizadaEn: fechaActualIso(),
      }));
      mostrarMsg(
        totalDetectados > 0
          ? `Plantilla validada. Se autocompletaron ${totalDetectados} dato(s) del programa.`
          : "Plantilla validada. No se encontraron datos del programa para autocompletar.",
        "success"
      );
    } catch (err) {
      setLecturaDocumento(null);
      setForm((actual) => ({
        ...actual,
        plantilla: archivo.name,
        plantillaBase64: "",
        plantillaVariables: [],
        plantillaValidada: false,
        plantillaActualizadaEn: "",
      }));
      mostrarMsg(err.message || "No se pudo validar la plantilla Word.");
    }
  }

  async function autocompletarDesdePlantilla() {
    if (!form.plantillaBase64) {
      return mostrarMsg(vista === "documentos" ? "Primero suba un documento Word." : "Primero suba y valide una plantilla Word.");
    }

    try {
      const lectura = await leerDocumentoWordDesdeBase64(form.plantillaBase64);
      const { textoPlano, variablesDetectadas } = lectura;
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, form.plantilla, categorias);
      const datosAplicables = vista === "documentos" ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      const totalDetectados = contarDatosDetectados(datosAplicables);
      if (vista === "documentos") {
        setLecturaDocumento({
          archivo: form.plantilla,
          texto: textoPlano,
          datos: datosAplicables,
          variables: variablesDetectadas,
        });
      }

      if (totalDetectados === 0) {
        return mostrarMsg(vista === "documentos"
          ? "Documento leído. No se detectaron secciones automáticas para guardar."
          : "No se encontraron datos del programa dentro del Word. Complete los campos manualmente.");
      }

      setForm((actual) => ({
        ...actual,
        ...datosAplicables,
      }));
      return mostrarMsg(`Se autocompletaron ${totalDetectados} dato(s) del programa.`, "success");
    } catch (err) {
      return mostrarMsg(err.message || "No se pudo leer la plantilla guardada.");
    }
  }

  async function quitarPlantilla() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar plantillas.");
    if (vista === "documentos" && form.id && form.plantilla) {
      const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${form.plantilla}`);
      if (!confirmado) return;
    }

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    const siguienteForm = {
      ...form,
      ...datosLimpios,
    };

    setForm((actual) => ({
      ...actual,
      ...datosLimpios,
    }));
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);

    if (vista !== "documentos" || !form.id) return;

    setGuardando(true);
    try {
      await editarPrograma(form.id, siguienteForm);
      await cargarDatos();
      mostrarMsg("Documento eliminado del programa.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  async function eliminarPlantillaHistorial(programa) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar plantillas.");
    const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${programa.plantilla}`);
    if (!confirmado) return;

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    setGuardando(true);
    try {
      await editarPrograma(programa.id, {
        ...datosProgramaAFormulario(programa),
        ...datosLimpios,
      });
      if (programaDocsId === programa.id) {
        setProgramaDocsId("");
        setForm(formInicial);
        setLecturaDocumento(null);
      }
      await cargarDatos();
      mostrarMsg("Plantilla eliminada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  async function usarPlantillaExistente(programaId) {
    const programa = programas.find((item) => item.id === programaId);
    if (!programa || !programa.plantillaBase64) {
      return mostrarMsg("Seleccione un programa con plantilla validada.");
    }

    if (modoEditar && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.alumnos || actividad.inscripciones || actividad.documentos) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) return;
      }
    }

    setForm((actual) => ({
      ...actual,
      plantilla: programa.plantilla || "",
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaVariables: programa.plantillaVariables || [],
      plantillaValidada: Boolean(programa.plantillaValidada),
      plantillaActualizadaEn: fechaActualIso(),
    }));
    setPlantillaInputKey((actual) => actual + 1);
    mostrarMsg(`Se usará la plantilla de ${programa.nombre}.`, "success");
  }

  function cambiarPeriodoFormulario(valor) {
    const periodoNormalizado = normalizarPeriodoVista(valor);
    setForm(f => ({
      ...f,
      periodo: periodoNormalizado,
      modalidadCobro: periodoNormalizado === "verano" ? "Unico" : f.modalidadCobro,
      invitacionMasiva: periodoNormalizado === "verano" ? false : f.invitacionMasiva,
    }));
  }

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

  function toggleGrado(valor) {
    setForm(f => ({
      ...f,
      gradosAplicables: normalizarListaGrados(f.gradosAplicables).includes(valor)
        ? normalizarListaGrados(f.gradosAplicables).filter(item => item !== valor)
        : [...normalizarListaGrados(f.gradosAplicables), valor],
    }));
  }

  function toggleDia(valor) {
    setForm(f => ({
      ...f,
      dias: normalizarListaTexto(f.dias).includes(valor)
        ? normalizarListaTexto(f.dias).filter(item => item !== valor)
        : [...normalizarListaTexto(f.dias), valor],
    }));
  }

  function agregarGrupoHorario() {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: [
        ...(Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []),
        { ...horarioGrupoInicial, id: `grupo-${Date.now()}` },
      ],
    }));
  }

  function quitarGrupoHorario(index) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function actualizarGrupoHorario(index, campo, valor) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).map((grupo, itemIndex) =>
        itemIndex === index ? { ...grupo, [campo]: valor } : grupo
      ),
    }));
  }

  function toggleGradoGrupo(index, valor) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        const grados = normalizarListaGrados(grupo.grados);
        return {
          ...grupo,
          grados: grados.includes(valor)
            ? grados.filter((item) => item !== valor)
            : [...grados, valor],
        };
      }),
    }));
  }

  function resumenGrados(grados) {
    const gradosSeguros = normalizarListaGrados(grados);
    if (!gradosSeguros.length) return "";
    return nivelesGrados
      .map(({ nivel }) => {
        const items = gradosSeguros
          .filter(item => item.startsWith(`${nivel}:`))
          .map(item => etiquetaGradoCorta(item.split(":")[1]));
        return items.length ? `${nivel}: ${items.join(", ")}` : "";
      })
      .filter(Boolean)
      .join(" / ");
  }

  function resumenHorario(dias, inicio, fin, almuerzoInicio = "", almuerzoFin = "") {
    const diasSeguros = normalizarListaTexto(dias);
    if (!diasSeguros.length || !inicio || !fin) return "";
    const clase = `${formatearHora12(inicio)} - ${formatearHora12(fin)}`;
    const almuerzo = almuerzoInicio && almuerzoFin
      ? ` · almuerzo ${formatearHora12(almuerzoInicio)} - ${formatearHora12(almuerzoFin)}`
      : "";
    return `${diasSeguros.join(", ")} clase ${clase}${almuerzo}`;
  }

  function normalizarHorariosPorGrupo(grupos) {
    return (Array.isArray(grupos) ? grupos : []).map((grupo, index) => ({
      id: grupo.id || `grupo-${index + 1}`,
      grados: normalizarListaGrados(grupo.grados),
      dia: grupo.dia || "",
      almuerzoInicio: grupo.almuerzoInicio || "14:20",
      almuerzoFin: grupo.almuerzoFin || "15:10",
      horaInicio: grupo.horaInicio || "",
      horaFin: grupo.horaFin || "",
      aula: String(grupo.aula || "").trim(),
    })).filter((grupo) =>
      grupo.grados.length || grupo.dia || grupo.horaInicio || grupo.horaFin || grupo.aula
    );
  }

  function obtenerGradosFinales(gradosBase, gruposHorario) {
    return [...new Set([
      ...normalizarListaGrados(gradosBase),
      ...(Array.isArray(gruposHorario) ? gruposHorario : []).flatMap((grupo) => normalizarListaGrados(grupo.grados)),
    ])];
  }

  function resumenHorariosPorGrupo(gruposHorario) {
    return gruposHorario
      .map((grupo) => {
        const grados = resumenGrados(grupo.grados);
        const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
        return `${grados}: ${grupo.dia} almuerzo ${formatearHora12(grupo.almuerzoInicio)}-${formatearHora12(grupo.almuerzoFin)}, clase ${formatearHora12(grupo.horaInicio)}-${formatearHora12(grupo.horaFin)}${aula}`;
      })
      .join(" / ");
  }

  function normalizarPeriodoVista(valor) {
    return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
  }

  async function generarPreviewExcel() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para cargar alumnos.");
    setMensaje("");
    setPreviewCarga(null);
    setProgresoCarga(null);

    if (!archivosExcel.length) return mostrarMsg("Seleccione al menos un archivo Excel.");
    if (archivosExcel.length > 6) return mostrarMsg("Puede subir hasta 6 archivos Excel por carga.");

    const invalido = archivosExcel.find((archivo) => !/\.(xlsx|xls)$/i.test(archivo.name));
    const pesado = archivosExcel.find((archivo) => archivo.size > 5 * 1024 * 1024);
    const totalBytes = archivosExcel.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
    const extensionValida = !invalido;
    if (!extensionValida) return mostrarMsg("Solo se permiten archivos .xlsx o .xls.");
    if (pesado) return mostrarMsg("Cada archivo no debe superar 5 MB.");
    if (totalBytes > 25 * 1024 * 1024) return mostrarMsg("La carga masiva no debe superar 25 MB en total.");

    setCargandoPreview(true);
    setProgresoCarga({
      actual: 0,
      total: archivosExcel.length,
      porcentaje: 0,
      archivo: "",
      estado: "preparando",
    });
    try {
      const preview = await previsualizarCargaAlumnosMasiva({
        periodo: cargaPeriodo,
        archivos: archivosExcel,
        onProgress: setProgresoCarga,
      });
      setPreviewCarga(preview);
      setProgresoCarga({
        actual: archivosExcel.length,
        total: archivosExcel.length,
        porcentaje: 100,
        archivo: "",
        estado: "listo",
      });
      if (preview.resumen.validos === 0) {
        mostrarMsg("La vista previa no tiene alumnos listos para guardar. Revise la columna Detalle y confirme que curso_programa coincida con un programa habilitado de Año escolar.");
      } else {
        mostrarMsg(`Vista previa generada: ${preview.resumen.validos} alumno(s) listos para guardar.`, "success");
      }
    } catch (err) {
      mostrarMsg(err.message || "No se pudo leer el archivo Excel.");
      setProgresoCarga(null);
    }
    setCargandoPreview(false);
  }

  async function confirmarCargaExcel() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para confirmar cargas de alumnos.");
    if (!previewCarga || previewCarga.resumen.validos === 0) {
      return mostrarMsg("No hay registros válidos para confirmar.");
    }

    setConfirmandoCarga(true);
    try {
      await confirmarCargaAlumnos(previewCarga);
      await cargarDatos();
      setPreviewCarga(null);
      setProgresoCarga(null);
      setArchivosExcel([]);
      setArchivoInputKey((actual) => actual + 1);
      mostrarMsg("Carga confirmada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setConfirmandoCarga(false);
  }

  function cancelarCargaExcel() {
    setArchivosExcel([]);
    setPreviewCarga(null);
    setProgresoCarga(null);
    setMensaje("");
    setArchivoInputKey((actual) => actual + 1);
  }

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  const formGradosAplicables = normalizarListaGrados(form.gradosAplicables);
  const formDias = normalizarListaTexto(form.dias);
  const formHorariosPorGrupo = Array.isArray(form.horariosPorGrupo) ? form.horariosPorGrupo : [];
  const esFormularioVerano = normalizarPeriodoVista(form.periodo) === "verano";
  const esDeportivoForm = String(form.categoria).toLowerCase() === "deportivo" || esProgramaDeportivo(form.nombre, form.categoria);
  const duracionTallerFormulario = calcularDuracionTexto(form.fechaInicio, form.fechaFin);
  const mostrarIndumentariaDeportiva = esProgramaDeportivo(form.nombre, form.categoria);

  return (
    <div className={embedded ? "coord-embedded" : `coord-layout ${esProfesor ? "coord-layout-profesor" : ""} ${sidebarAbierta ? "" : "coord-layout-collapsed"}`}>
      {/* ── SIDEBAR ── */}
      {!embedded ? (
      <aside className="coord-sidebar">
        <button
          className="coord-sidebar-toggle"
          type="button"
          onClick={() => setSidebarAbierta((abierta) => !abierta)}
          aria-label={sidebarAbierta ? "Cerrar menu lateral" : "Abrir menu lateral"}
          title={sidebarAbierta ? "Cerrar menú" : "Abrir menú"}
        >
          <ChevronRight size={18} />
        </button>
        <div className="coord-brand" aria-label="Colegio San Rafael">
          <img className="coord-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="coord-module-label">{esProfesor ? "Módulo Profesores" : "Módulo Coordinación"}</p>
        <nav className="coord-nav">
          {vistasDisponibles.map(({ id, label, icon: Icon }) => (
            <button key={id}
              type="button"
              className={`coord-nav-item ${!delegatedContent && vista === id ? "coord-nav-item-active" : ""}`}
              onClick={() => { onClearDelegatedModule?.(); setVista(id); setMensaje(""); }}
              title={label}>
              <Icon size={18} /><span>{label}</span><ChevronRight className="coord-nav-arrow" size={16} />
            </button>
          ))}
        </nav>
        {moduleSwitcher ? (
          <div className="pt-3">
            {moduleSwitcher}
          </div>
        ) : null}
        <button className="coord-logout" type="button" onClick={onLogout} title="Cerrar sesión">
          <LogOut size={18} /><span>Cerrar sesion</span>
        </button>
      </aside>
      ) : null}

      {/* ── MAIN ── */}
      <main className={embedded ? "coord-main coord-main-embedded" : "coord-main"}>
        {delegatedContent ? (
          delegatedContent
        ) : (
          <>
        {/* ─── VISTA: GESTIÓN DE PROGRAMAS ─── */}
        {vista === "programas" && puedeVerProgramasVista && (
          <>
            <header className="coord-topbar">
              <span className="coord-topbar-eyebrow">Gestion academica</span>
              <h1>Programas extracurriculares</h1>
            </header>
            <section className="coord-workspace coord-workspace-single">
              <article className="coord-card coord-search-card">
                <div className="coord-card-title">
                  <span className="coord-title-icon"><BookOpen size={21} /></span>
                  <div><h2>Programas registrados</h2>
                    <p>Consulte, cree o administre programas y talleres.</p></div>
                </div>

                <div className="coord-form">
                  <div className="coord-filtros-row">
                    <div className="coord-field">
                      <label><CalendarDays size={14} /> Periodo</label>
                      <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="escolar">Año escolar</option>
                        <option value="verano">Ciclo verano</option>
                      </select>
                    </div>

                    {puedeCrearProgramas ? (
                      <button className="coord-register-button" type="button" onClick={abrirCrear}>
                        <Plus size={17} /><span>Nuevo programa</span>
                      </button>
                    ) : null}

                  </div>
                </div>

                {mensaje && (
                  <MantineAlert
                    className="coord-message"
                    color={tipoMsg === "success" ? "sanrafael" : "orange"}
                    radius="md"
                    icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  >
                    {mensaje}
                  </MantineAlert>
                )}

                {cargando ? (
                  <div className="coord-loading"><Loader2 className="coord-spin" size={28} /> Cargando programas…</div>
                ) : programasFiltrados.length === 0 ? (
                  <div className="coord-empty"><AlertCircle size={18} /><p>No se encontraron programas.</p></div>
                ) : (
                  <div className="coord-program-card-list">
                    {programasFiltrados.map(prog => (
                      <article
                        key={prog.id}
                        className={`coord-program-card-item coord-program-card-${String(prog.estado || "").toLowerCase()}`}
                      >
                        <div className="coord-program-card-body">
                          <div className="coord-program-card-header">
                            <div className="coord-program-card-title">
                              <h3>{prog.nombre}</h3>
                              <div className="coord-program-card-meta">
                                <span>{prog.id || "Sin código"}</span>
                                <span>{prog.categoria || "Sin categoría"}</span>
                                <span>Tutor: {prog.responsable || "No asignado"}</span>
                              </div>
                            </div>
                            <Badge
                              color={prog.estado === "Habilitado" ? "blue" : prog.estado === "Deshabilitado" ? "gray" : "yellow"}
                              variant="light"
                              size="sm"
                            >
                              {prog.estado}
                            </Badge>
                          </div>

                          <div className="coord-program-card-grid">
                            <div className="coord-program-card-detail">
                              <span>Grados</span>
                              <GradosTabla programa={prog} />
                            </div>
                            <div className="coord-program-card-detail coord-program-card-schedule">
                              <span>Días y horario</span>
                              <HorarioTabla programa={prog} />
                            </div>
                            <div className="coord-program-card-detail">
                              <span>Vigencia</span>
                              <VigenciaTabla
                                inicio={prog.fechaInicio}
                                fin={prog.fechaFin}
                                duracion={prog.duracionTaller}
                                avisoDias={prog.duracionAvisoDias}
                              />
                            </div>
                            <div className="coord-program-card-detail">
                              <span>Cupos</span>
                              <CuposTabla programa={prog} />
                            </div>
                            <div className="coord-program-card-detail coord-program-card-cost">
                              <span>Costo</span>
                              <strong>{formatearSoles(prog.costo)}</strong>
                            </div>
                          </div>
                        </div>

                        {tieneAccionesPrograma ? (
                          <div className="coord-program-card-actions" aria-label={`Acciones de ${prog.nombre}`}>
                            <Group gap={6} justify="flex-end">
                              {puedeEditarProgramas ? (
                                <Tooltip label="Editar">
                                  <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => abrirEditar(prog)}>
                                    <Edit3 size={15} />
                                  </ActionIcon>
                                </Tooltip>
                              ) : null}
                              {puedeVerAlumnos ? (
                                <Tooltip label="Ver alumnos">
                                  <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => verInvitados(prog)}>
                                    <Eye size={15} />
                                  </ActionIcon>
                                </Tooltip>
                              ) : null}
                              {puedeEditarProgramas && prog.estado !== "Finalizado" && (
                                <Tooltip label={prog.estado === "Habilitado" ? "Deshabilitar" : "Habilitar"}>
                                  <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => toggleEstado(prog)}>
                                    {prog.estado === "Habilitado" ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {puedeEditarProgramas && prog.estado !== "Finalizado" && (
                                <Tooltip label="Finalizar">
                                  <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => finalizarPrograma(prog)}>
                                    <CheckCircle2 size={15} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {puedeEditarProgramas ? (
                                <Tooltip label="Eliminar">
                                  <ActionIcon size="sm" color="red" variant="subtle" onClick={() => eliminarCurso(prog)}>
                                    <Trash2 size={15} />
                                  </ActionIcon>
                                </Tooltip>
                              ) : null}
                            </Group>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </article>


            </section>
          </>
        )}

        {vista === "carga" && puedeVerCargaVista && (
          <CargaExcelView
            archivoInputKey={archivoInputKey}
            archivosExcel={archivosExcel}
            cargandoPreview={cargandoPreview}
            cancelarCargaExcel={cancelarCargaExcel}
            confirmandoCarga={confirmandoCarga}
            confirmarCargaExcel={confirmarCargaExcel}
            generarPreviewExcel={generarPreviewExcel}
            mensaje={mensaje}
            previewCarga={previewCarga}
            progresoCarga={progresoCarga}
            setArchivosExcel={setArchivosExcel}
            setMensaje={setMensaje}
            setPreviewCarga={setPreviewCarga}
            setProgresoCarga={setProgresoCarga}
            tipoMsg={tipoMsg}
          />
        )}

        {vista === "documentos" && puedeVerDocumentosVista && (
          <DocumentosView
            abrirEditar={abrirEditar}
            autocompletarDesdePlantilla={autocompletarDesdePlantilla}
            eliminarPlantillaHistorial={eliminarPlantillaHistorial}
            form={form}
            guardando={guardando}
            guardarDocumentoComoPrograma={guardarDocumentoComoPrograma}
            guardarDocumentosPrograma={guardarDocumentosPrograma}
            historialPlantillas={historialPlantillas}
            lecturaDocumento={lecturaDocumento}
            mensaje={mensaje}
            plantillaInputKey={plantillaInputKey}
            programaDocs={programaDocs}
            programas={programas}
            quitarPlantilla={quitarPlantilla}
            seleccionarPlantilla={seleccionarPlantilla}
            setForm={setForm}
            tipoMsg={tipoMsg}
            usarPlantillaExistente={usarPlantillaExistente}
            variablesPlantillaAceptadas={variablesPlantillaAceptadas}
            variablesPlantillaRequeridas={variablesPlantillaRequeridas}
          />
        )}

        {/* ─── MODAL: CREAR / EDITAR PROGRAMA ─── */}
        {showModal && (
          <div className="coord-modal-overlay">
            <div className={`coord-modal ${esFormularioVerano ? "coord-modal-verano" : ""}`} onClick={e => e.stopPropagation()}>
              <div className="coord-modal-header">
                <div className="coord-modal-title">
                  <span className="coord-modal-icon"><Plus size={20} /></span>
                  <div>
                    <h2>{esFormularioVerano ? (modoEditar ? "Editar programa de verano" : "Registrar programa de verano") : (modoEditar ? "Editar programa" : "Registrar programa")}</h2>
                    <p>
                      {esFormularioVerano
                        ? "Complete los datos del programa antes de habilitarlo."
                        : "Complete la configuracion del taller antes de habilitarlo."}
                    </p>
                  </div>
                </div>
                <button className="coord-modal-close" type="button" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form className="coord-program-form" id="form-programa" onSubmit={guardar}>
                <div className="coord-program-form-main">
                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <BookOpen size={18} />
                      <div>
                        <h3>{esFormularioVerano ? "Datos del programa de verano" : "Datos generales"}</h3>
                      </div>
                    </div>
                    <div className="coord-section-grid coord-general-grid">
                      <div className="coord-field coord-program-name-field"><label>{esFormularioVerano ? "Nombre del programa de verano *" : "Nombre del programa *"}</label>
                        <input value={form.nombre} onChange={e => actualizarNombrePrograma(e.target.value)} placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelacion"} />
                      </div>
                      <div className="coord-field"><label>Periodo *</label>
                        <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
                          <option value="escolar">Año escolar</option><option value="verano">Ciclo verano</option>
                        </select>
                      </div>
                      <div className="coord-field coord-category-main"><label>Categoría *</label>
                        <select value={form.categoria} onChange={e => actualizarCategoriaPrograma(e.target.value)}>
                          <option value="">Seleccione</option>
                          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="coord-field coord-new-category-field">
                        <label>Nueva categoría</label>
                        <div className="coord-inline-field">
                          <input placeholder="Ej: Arte, verano, alto rendimiento" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
                          <button type="button" className="coord-mini-btn" onClick={agregarCategoria}><Plus size={14} /></button>
                        </div>
                      </div>
                      <div className="coord-field coord-remove-category-field">
                        <label>Quitar categoría</label>
                        <div className="coord-inline-field">
                          <select value={catAEliminar} onChange={e => setCatAEliminar(e.target.value)}>
                            <option value="">Seleccione</option>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" className="coord-mini-btn coord-mini-danger-btn" onClick={quitarCategoria}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {esFormularioVerano ? (
                        <div className="coord-age-range-row coord-field-full">
                          <div className="coord-field">
                            <label>Desde edad *</label>
                            <select value={form.edadMinima} onChange={e => actualizarForm("edadMinima", e.target.value)}>
                              <option value="">Seleccione</option>
                              {Array.from({ length: 14 }, (_, index) => String(index + 3)).map((edad) => (
                                <option key={edad} value={edad}>{edad} años</option>
                              ))}
                            </select>
                          </div>
                          <div className="coord-field">
                            <label>Hasta edad *</label>
                            <select value={form.edadMaxima} onChange={e => actualizarForm("edadMaxima", e.target.value)}>
                              <option value="">Seleccione</option>
                              {Array.from({ length: 14 }, (_, index) => String(index + 3)).map((edad) => (
                                <option key={edad} value={edad}>{edad} años</option>
                              ))}
                            </select>
                          </div>
                          <p className="coord-field-hint">
                            Seleccione el rango de edad permitido para este programa de verano.
                          </p>
                          {form.grupoEtario ? (
                            <p className="coord-field-hint coord-field-full">
                              Grupo etario: {form.grupoEtario}
                            </p>
                          ) : null}
                        </div>
                      ) : esDeportivoForm ? (
                        <div className="coord-field coord-field-full">
                          <label>Grados habilitados</label>
                          <p className="coord-field-hint" style={{ marginTop: "4px" }}>
                            Los grados escolares aplicables se calculan automáticamente a partir de los rangos de edad de los talleres de abajo.
                          </p>
                          {form.talleresDeportivos?.length > 0 && (
                            <div className="coord-deportivo-grados-summary" style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              <strong>Equivalente en Grados:</strong> <span style={{ color: "#006b5b", fontWeight: 700 }}>{resumenGrados(obtenerGradosDeportivos(form.talleresDeportivos)) || "Sin grados calculados"}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="coord-field coord-field-full">
                          <label>Grados aplicables *</label>
                          <GradeSelector
                            niveles={nivelesGrados}
                            seleccionados={formGradosAplicables}
                            onToggle={toggleGrado}
                          />
                          <p className="coord-field-hint">
                            {formGradosAplicables.length
                              ? resumenGrados(formGradosAplicables)
                              : "Seleccione nivel y grados del programa."}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <CalendarDays size={18} />
                      <div>
                        <h3>{esFormularioVerano ? "Fechas y turno de verano" : esDeportivoForm ? "Fechas y talleres deportivos" : "Horario y grupos de atención"}</h3>
                      </div>
                    </div>
                    <div className="coord-section-grid">
                      <div className="coord-compact-schedule-row coord-field-full" style={{ gridTemplateColumns: esDeportivoForm ? "1fr 1fr" : undefined }}>
                        {!esDeportivoForm && (
                          <>
                            <div className="coord-field" style={{ gridColumn: "1 / -1" }}>
                              <label>{esFormularioVerano ? "Días de atención *" : "Dias del programa / taller *"}</label>
                              <div className="coord-day-list">
                                {diasSemana.map(dia => (
                                  <label
                                    className={`coord-day-chip ${formDias.includes(dia) ? "is-selected" : ""}`}
                                    key={dia}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formDias.includes(dia)}
                                      onChange={() => toggleDia(dia)}
                                    />
                                    {dia}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="coord-field"><label>Hora inicio *</label>
                              <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
                            </div>
                            <div className="coord-field"><label>Hora fin *</label>
                              <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
                            </div>
                            <div className="coord-field"><label>Almuerzo inicio</label>
                              <input type="time" value={form.almuerzoInicio} onChange={e => actualizarForm("almuerzoInicio", e.target.value)} />
                            </div>
                            <div className="coord-field"><label>Almuerzo fin</label>
                              <input type="time" value={form.almuerzoFin} onChange={e => actualizarForm("almuerzoFin", e.target.value)} />
                            </div>
                          </>
                        )}
                        <div className="coord-field"><label>Fecha inicio *</label>
                          <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                        </div>
                        <div className="coord-field"><label>Fecha fin *</label>
                          <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                        </div>
                      </div>
                      
                      <div className="coord-program-window-row coord-field-full">
                        <div className="coord-field">
                          <label>Duración del taller</label>
                          <div className="coord-readonly-field">
                            {duracionTallerFormulario || "Seleccione fecha inicio y fin"}
                          </div>
                        </div>
                        <div className="coord-field">
                          <label>Aviso abierto *</label>
                          <input
                            type="number"
                            min="1"
                            max="7"
                            value={form.duracionAvisoDias}
                            onChange={e => actualizarForm("duracionAvisoDias", e.target.value)}
                            placeholder="Máximo 7 días"
                          />
                        </div>
                      </div>

                      {esDeportivoForm && (
                        <div className="coord-field coord-field-full">
                          <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
                            <strong>Configuración de Deportes por Edades y Horarios</strong>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#667085" }}>
                              Agregue cada taller deportivo detallando la disciplina, edad y horario específico (según el afiche).
                            </p>
                          </div>
                          
                          <div className="coord-deportivo-fields-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                            <div className="coord-field">
                              <label>Deporte *</label>
                              <select value={tallerDepDeporte} onChange={e => setTallerDepDeporte(e.target.value)}>
                                <option value="Vóley">Vóley</option>
                                <option value="Fútbol">Fútbol</option>
                                <option value="Básquet">Básquet</option>
                                <option value="Otro">Otro deporte...</option>
                              </select>
                              {tallerDepDeporte === "Otro" && (
                                <input 
                                  style={{ marginTop: "6px" }}
                                  placeholder="Escriba el deporte" 
                                  value={tallerDepCustom} 
                                  onChange={e => setTallerDepCustom(e.target.value)} 
                                />
                              )}
                            </div>
                            
                            <div className="coord-field">
                              <label>Edad mínima *</label>
                              <select value={tallerDepMinEdad} onChange={e => setTallerDepMinEdad(e.target.value)}>
                                {Array.from({ length: 15 }, (_, index) => String(index + 3)).map(edad => (
                                  <option key={edad} value={edad}>{edad} años</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="coord-field">
                              <label>Edad máxima *</label>
                              <select value={tallerDepMaxEdad} onChange={e => setTallerDepMaxEdad(e.target.value)}>
                                {Array.from({ length: 15 }, (_, index) => String(index + 3)).map(edad => (
                                  <option key={edad} value={edad}>{edad} años</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="coord-field">
                              <label>Día de atención *</label>
                              <select value={tallerDepDia} onChange={e => setTallerDepDia(e.target.value)}>
                                {diasSemana.map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="coord-field">
                              <label>Clase inicio *</label>
                              <input type="time" value={tallerDepHoraInicio} onChange={e => setTallerDepHoraInicio(e.target.value)} />
                            </div>
                            
                            <div className="coord-field">
                              <label>Clase fin *</label>
                              <input type="time" value={tallerDepHoraFin} onChange={e => setTallerDepHoraFin(e.target.value)} />
                            </div>
                            
                            <div className="coord-field" style={{ display: "flex", alignItems: "flex-end" }}>
                              <button 
                                type="button" 
                                className="coord-template-autofill" 
                                style={{ width: "100%", height: "38px", display: "flex", justifyContent: "center" }}
                                onClick={agregarTallerDeportivo}
                              >
                                <Plus size={14} /> Añadir taller
                              </button>
                            </div>
                          </div>
                          
                          <div className="coord-deportivo-workshops-list">
                            <strong style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#102035" }}>Talleres Agregados:</strong>
                            {form.talleresDeportivos?.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                                  <thead>
                                    <tr style={{ borderBottom: "2px solid #e2ece9", color: "#475467" }}>
                                      <th style={{ padding: "8px" }}>Deporte</th>
                                      <th style={{ padding: "8px" }}>Edades</th>
                                      <th style={{ padding: "8px" }}>Día y Horario</th>
                                      <th style={{ padding: "8px", textAlign: "right" }}>Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {form.talleresDeportivos.map((taller, idx) => (
                                      <tr key={idx} style={{ borderBottom: "1px solid #e2ece9" }}>
                                        <td style={{ padding: "8px", fontWeight: "bold" }}>{taller.deporte}</td>
                                        <td style={{ padding: "8px" }}>{taller.edadMinima} a {taller.edadMaxima} años</td>
                                        <td style={{ padding: "8px" }}>
                                          <span style={{ background: "#e8f7ef", color: "#006b5b", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginRight: "6px" }}>{taller.dia}</span>
                                          {formatearHora12(taller.horaInicio)} a {formatearHora12(taller.horaFin)}
                                        </td>
                                        <td style={{ padding: "8px", textAlign: "right" }}>
                                          <button 
                                            type="button" 
                                            style={{ background: "none", border: "none", color: "#b42318", cursor: "pointer", fontWeight: 700 }}
                                            onClick={() => quitarTallerDeportivo(idx)}
                                          >
                                            Quitar
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div style={{ padding: "20px", border: "1px dashed #cbd5e1", borderRadius: "8px", color: "#667085", textAlign: "center", background: "#f8fafc" }}>
                                Aún no se han configurado talleres deportivos. Agregue uno usando el formulario de arriba.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {puedeGestionarGruposFormulario && !esFormularioVerano && !esDeportivoForm ? (
                        <div className="coord-field coord-field-full">
                          <div className="coord-group-schedule-head">
                            <div>
                              <strong>{esFormularioVerano ? "Turnos de verano" : "Turnos del mismo curso"}</strong>
                              <p>
                                {esFormularioVerano
                                  ? "Use turnos si Secretaría debe ofrecer horarios distintos por grado o grupo."
                                  : "Separe los grados por día sin crear otro curso. Ejemplo: 4to, 5to y 1ro secundaria el jueves; 6to grado el viernes."}
                              </p>
                            </div>
                            <button type="button" className="coord-template-autofill" onClick={agregarGrupoHorario}>
                              <Plus size={14} />
                              {esFormularioVerano ? "Añadir turno" : "Añadir día para otros grados"}
                            </button>
                          </div>
                          {formHorariosPorGrupo.length ? (
                            <div className="coord-group-schedule-list">
                              {formHorariosPorGrupo.map((grupo, index) => (
                                <div className="coord-group-schedule" key={grupo.id || index}>
                                  <div className="coord-group-schedule-title">
                                    <strong>Grupo {index + 1}</strong>
                                    <button type="button" onClick={() => quitarGrupoHorario(index)} aria-label="Quitar grupo">
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <GradeSelector
                                    niveles={nivelesGrados}
                                    seleccionados={grupo.grados || []}
                                    onToggle={(valor) => toggleGradoGrupo(index, valor)}
                                  />
                                  <div className="coord-group-schedule-grid">
                                    <div className="coord-field">
                                      <label>Día</label>
                                      <select value={grupo.dia || ""} onChange={(event) => actualizarGrupoHorario(index, "dia", event.target.value)}>
                                        {diasSemana.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
                                      </select>
                                    </div>
                                    <div className="coord-field">
                                      <label>Aula</label>
                                      <input value={grupo.aula || ""} onChange={(event) => actualizarGrupoHorario(index, "aula", event.target.value)} placeholder="Ej: A-204" />
                                    </div>
                                    <div className="coord-field">
                                      <label>Almuerzo inicio</label>
                                      <input type="time" value={grupo.almuerzoInicio || "14:20"} onChange={(event) => actualizarGrupoHorario(index, "almuerzoInicio", event.target.value)} />
                                    </div>
                                    <div className="coord-field">
                                      <label>Almuerzo fin</label>
                                      <input type="time" value={grupo.almuerzoFin || "15:10"} onChange={(event) => actualizarGrupoHorario(index, "almuerzoFin", event.target.value)} />
                                    </div>
                                    <div className="coord-field">
                                      <label>Clase inicio</label>
                                      <input type="time" value={grupo.horaInicio || "15:20"} onChange={(event) => actualizarGrupoHorario(index, "horaInicio", event.target.value)} />
                                    </div>
                                    <div className="coord-field">
                                      <label>Clase fin</label>
                                      <input type="time" value={grupo.horaFin || "17:20"} onChange={(event) => actualizarGrupoHorario(index, "horaFin", event.target.value)} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="coord-field-hint"></p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <DollarSign size={18} />
                      <div>
                        <h3>{esFormularioVerano ? "Vacantes y pago de verano" : "Cupos y cobro"}</h3>
                      </div>
                    </div>
                    <div className="coord-section-grid coord-payment-grid">
                      <div className="coord-field"><label>Cupos</label>
                        <input type="number" min="1" value={form.cupos} onChange={e => actualizarForm("cupos", e.target.value)} placeholder="20" />
                      </div>
                      <div className="coord-field"><label>Costo (S/)</label>
                        <input inputMode="decimal" value={form.costo} onChange={e => actualizarCosto(e.target.value)} onBlur={formatearCostoFormulario} placeholder="70.00" />
                      </div>
                      <div className="coord-field"><label>Modalidad de cobro</label>
                        <select value={form.modalidadCobro} onChange={e => actualizarForm("modalidadCobro", e.target.value)} disabled={esFormularioVerano}>
                          <option value="Mensual">Cuota mensual</option><option value="Unico">Pago unico</option>
                        </select>
                      </div>
                      {!esFormularioVerano ? (
                        <div className="coord-field coord-field-full">
                        <label className="coord-check-label coord-check-label-stacked">
                          <span>
                            <input type="checkbox" checked={form.invitacionMasiva} onChange={e => actualizarInvitacionMasiva(e.target.checked)} />
                            Invitación masiva en Padres
                          </span>
                          <small>El curso aparecerá en el portal de padres para todos los alumnos de los grados seleccionados, sin cargar Excel de invitados.</small>
                        </label>
                        {form.invitacionMasiva ? (
                          <div className="coord-announcement-image-field">
                            <div className="coord-announcement-copy">
                              <Photo size={18} />
                              <div>
                                <strong>Imagen de anuncio para Padres</strong>
                                
                              </div>
                            </div>
                            {form.anuncioImagen ? (
                              <div className="coord-announcement-preview">
                                <img src={form.anuncioImagen} alt="Anuncio para portal de padres" />
                                <div>
                                  <strong>{form.anuncioImagenNombre || "Imagen de anuncio"}</strong>
                                  <span>
                                    {formatearPesoArchivo(form.anuncioImagenTamano)}
                                    {form.anuncioImagenComprimida ? " · comprimida" : ""}
                                  </span>
                                  <button type="button" onClick={quitarImagenAnuncio}>
                                    Quitar imagen
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="coord-announcement-upload">
                                <input type="file" accept="image/*" onChange={seleccionarImagenAnuncio} />
                                <Upload size={18} />
                                <span>Agregar imagen</span>
                              </label>
                            )}
                          </div>
                        ) : null}
                      </div>
                      ) : (
                        <div className="coord-summer-payment-note coord-field-full">
                          <CheckCircle2 size={16} />
                          <span>Secretaría verá este programa como opción de ciclo verano y registrará el tipo de alumno al momento de la inscripción.</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {mostrarIndumentariaDeportiva ? (
                    <section className="coord-form-section coord-sports-kit-section">
                      <div className="coord-section-heading">
                        <Users size={18} />
                        <div>
                          <h3>Indumentaria deportiva</h3>
                          <p>Para programas deportivos como vóley o fútbol, Secretaría puede registrar tallas por alumno.</p>
                        </div>
                      </div>
                      <div className="coord-section-grid">
                        <div className="coord-field coord-field-full">
                          <label className="coord-check-label coord-check-label-stacked">
                            <span>
                              <input
                                type="checkbox"
                                checked={Boolean(form.requiereIndumentaria)}
                                onChange={e => actualizarForm("requiereIndumentaria", e.target.checked)}
                              />
                              Pedir talla de polo y short en Secretaría
                            </span>
                            <small>Al registrar al alumno, Secretaría seleccionará la talla correspondiente para cada prenda.</small>
                          </label>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <Users size={18} />
                      <div>
                        <h3>Responsables</h3>
                      </div>
                    </div>
                    <div className="coord-section-grid">
                      <div className="coord-field"><label>Responsable</label>
                        <input value={form.responsable} onChange={e => actualizarForm("responsable", e.target.value)} placeholder="Prof. Ana Torres" />
                      </div>
                      <div className="coord-field"><label>Tutora / apoyo</label>
                        <input value={form.tutora} onChange={e => actualizarForm("tutora", e.target.value)} placeholder="(Srta. Lucia Vega)" />
                      </div>
                    </div>
                  </section>
                </div>

              </form>

              <div className="coord-modal-actions">
                <button type="button" className="coord-secondary-button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" form="form-programa" className="coord-register-button" disabled={guardando}>
                  {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{guardando ? "Guardando" : modoEditar ? "Actualizar" : "Crear programa"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: INVITADOS ─── */}
        {showInvitados && (
          <div className="coord-modal-overlay" onClick={() => setShowInvitados(false)}>
            <div className="coord-modal" onClick={e => e.stopPropagation()}>
              <div className="coord-modal-header">
                <h2>Invitados – {progSeleccionado?.nombre}</h2>
                <button className="coord-modal-close" type="button" onClick={() => setShowInvitados(false)}><X size={20} /></button>
              </div>
              <div className="coord-modal-body">
                <div className="coord-invitados-actions">
                  <button
                    className="coord-primary-button"
                    type="button"
                    onClick={descargarPdfInvitados}
                    disabled={!invitados.length}
                  >
                    <FileDown size={15} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
                {invitados.length === 0 ? (
                  <p className="coord-process-note">No hay invitados registrados para este programa.</p>
                ) : (
                  <div className="coord-table-wrap">
                    <table className="coord-table">
                      <thead><tr><th>DNI</th><th>Código</th><th>Estudiante</th><th>Grado</th><th>Sección</th></tr></thead>
                      <tbody>
                        {invitados.map((inv, index) => (
                          <tr key={`${inv.dni || inv.codigoEstudiante || inv.nombres}-${index}`}>
                            <td>{inv.dni || "Sin DNI"}</td>
                            <td>{inv.codigoEstudiante || "—"}</td>
                            <td>{inv.nombres}</td>
                            <td>{inv.grado}</td>
                            <td>{inv.seccion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}

export default Coordinacion;
