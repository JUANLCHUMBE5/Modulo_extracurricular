import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconLogout as LogOut,
  IconSearch as Search,
} from "@tabler/icons-react";
import {
  buscarEstudiantePorDni,
  buscarEstudiantesPorNombre,
  buscarInscripcionEstudiante,
  listarInscripcionesEstudiante,
  listarProgramasPorPeriodo,
  obtenerProgramaPorId,
  derivarInscripcionCaja,
  registrarInscripcion,
} from "./services/secretariaService";
import {
  validarDni,
  validarTelefono,
  validarTextoSeguro,
} from "../../services/validators";
import {
  formatearFechaPeru,
} from "../../services/dateService";
import { resolverHorarioPorGradoLocal } from "./utils/horariosSecretaria";
import { imprimirInscripcionDirecta } from "./components/SecretariaFicha";
import SecretariaRegistroModal from "./components/SecretariaRegistroModal";
import SecretariaCursoAdicionalModal from "./components/SecretariaCursoAdicionalModal";
import SecretariaSearchCard from "./components/SecretariaSearchCard";
import SecretariaStudentPanel from "./components/SecretariaStudentPanel";
import SecretariaSuccessModal from "./components/SecretariaSuccessModal";
import {
  resumirHorarioSecretaria,
} from "./components/SecretariaFields";
import "./Secretaria.css";

const formularioInicial = {
  dniExterno: "",
  nombresExterno: "",
  edadExterno: "",
  fechaNacimientoExterno: "",
  domicilioExterno: "",
  sexoExterno: "",
  tipoAlumnoVerano: "Alumno externo",
  gradoExterno: "",
  programa: "",
  colegioProcedencia: "",
  apoderado: "",
  telefono: "",
  correo: "",
  medioEnvio: "Impreso",
  tallaUniforme: "",
  tallaPolo: "",
  tallaShort: "",
  observacion: "",
  aceptaCondiciones: false,
};

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcularEdadSecretaria(estudiante, formulario = {}) {
  const edadDirecta = Number(formulario.edadExterno || estudiante?.edad || estudiante?.edadEstudiante || "");
  if (Number.isFinite(edadDirecta) && edadDirecta > 0) return edadDirecta;

  const fecha = formulario.fechaNacimientoExterno || estudiante?.fechaNacimiento;
  if (!fecha) return "";
  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return "";
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad > 0 ? edad : "";
}

function programaDisponibleParaEdadSecretaria(programa, edadAlumno = "") {
  const minimo = Number(programa?.edadMinima || 0);
  const maximo = Number(programa?.edadMaxima || 0);
  if (!minimo && !maximo) return true;
  const edad = Number(edadAlumno);
  if (!Number.isFinite(edad) || edad <= 0) return true;
  if (minimo && edad < minimo) return false;
  if (maximo && edad > maximo) return false;
  return true;
}

function etiquetaProgramaSecretaria(programa) {
  return programa?.nombre || "";
}

function Secretaria({ delegatedContent, moduleSwitcher, onClearDelegatedModule, onLogout }) {
  const [periodo, setPeriodo] = useState("escolar");
  const [dni, setDni] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [estudiante, setEstudiante] = useState(null);
  const [inscripcion, setInscripción] = useState(null);
  const [inscripcionesEstudiante, setInscripcionesEstudiante] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [programas, setProgramas] = useState([]);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [modalExito, setModalExito] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [imprimiendoFichaRegistro, setImprimiendoFichaRegistro] = useState(false);
  const [derivandoCaja, setDerivandoCaja] = useState(false);
  const [modalCursoAdicional, setModalCursoAdicional] = useState(false);
  const [cursoAdicionalId, setCursoAdicionalId] = useState("");
  const [registrandoCursoAdicional, setRegistrandoCursoAdicional] = useState(false);
  const [resultadosNombre, setResultadosNombre] = useState([]);

  function mostrarMensaje(texto, tipo = "error") {
    setMensaje(texto);
    const titulo = tipo === "success" ? "Secretaría" : "Revisar atención";
    if (tipo === "success") {
      toast.success(titulo, { description: texto });
    } else {
      toast.warning(titulo, { description: texto });
    }
  }

  const programaAsignado = estudiante
    ? programas.find((programa) => programa.id === estudiante.programaAsignado)
    : null;
  const programaSeleccionado = programas.find((programa) => programa.id === formulario.programa);
  const esCicloVerano = periodo === "verano";
  const edadAlumnoFormulario = calcularEdadSecretaria(estudiante, formulario);
  const programasCompatiblesFormulario = esCicloVerano
    ? programas.filter((programa) => programaDisponibleParaEdadSecretaria(programa, edadAlumnoFormulario))
    : programas;
  const tieneInvitacionOperativa = !esCicloVerano && Boolean(estudiante?.tieneInvitacion);
  const invitacionSinHorario = tieneInvitacionOperativa && estudiante?.programaDisponible === false;
  const tipoAlumnoMostrado = esCicloVerano
    ? (estudiante?.esExterno ? "Alumno externo" : "Alumno interno")
    : estudiante?.tipoAlumno;
  
  // Si el estudiante tiene invitación, usamos los datos que vienen del servicio para mostrar el nombre
  // Si no tiene invitación, usamos el programa seleccionado en el dropdown
  const nombreProgramaAMostrar = tieneInvitacionOperativa
    ? estudiante.programaNombre 
    : (programaSeleccionado?.nombre || "");
  const registroAdicional = Boolean(inscripcion);
  const programaAsignadoInvitacion = tieneInvitacionOperativa ? {
    id: estudiante.programaAsignado,
    nombre: estudiante.programaNombre,
    grupo: estudiante.programaGrupo,
    grupoEtario: estudiante.programaGrupoEtario,
    horario: estudiante.programaHorario,
    docente: estudiante.programaDocente,
    costo: estudiante.programaCosto,
    cupos: estudiante.programaCupos,
    cuposDisponibles: estudiante.programaCuposDisponibles,
    modalidadCobro: estudiante.programaModalidadCobro,
    requisitos: estudiante.programaRequisitos,
    fechaInicio: estudiante.programaFechaInicio,
    fechaFin: estudiante.programaFechaFin,
    duracionTaller: estudiante.programaDuracionTaller,
    duracionAvisoDias: estudiante.programaDuracionAvisoDias,
    seleccion: estudiante.seleccion,
    nivelCambridge: estudiante.nivelCambridge,
    plantilla: estudiante.plantilla,
    plantillaBase64: estudiante.plantillaBase64,
    plantillaVariables: estudiante.plantillaVariables,
    requiereUniforme: estudiante.requiereUniforme,
    requiereIndumentaria: estudiante.requiereIndumentaria,
  } : null;
  const programasParaSelector = programaAsignadoInvitacion && !registroAdicional
    ? [
        programaAsignadoInvitacion,
        ...programasCompatiblesFormulario.filter((programa) => programa.id !== programaAsignadoInvitacion.id),
      ]
    : programasCompatiblesFormulario;
  const mostrarSelectorPrograma = esCicloVerano || !tieneInvitacionOperativa || registroAdicional || programasCompatiblesFormulario.length > 0;
  const clavesProgramasRegistrados = new Set(
    inscripcionesEstudiante.flatMap((item) => [
      item.programaId ? `id:${item.programaId}` : "",
      item.programa ? `nombre:${normalizarComparacion(item.programa)}` : "",
    ]).filter(Boolean)
  );
  const programasCursoAdicional = programasCompatiblesFormulario.filter((programa) =>
    !clavesProgramasRegistrados.has(`id:${programa.id}`) &&
    !clavesProgramasRegistrados.has(`nombre:${normalizarComparacion(programa.nombre)}`)
  );

  const programaParaRegistro = programaSeleccionado || programaAsignado || programaAsignadoInvitacion;
  const inscripcionMasivaSeleccionada = Boolean(programaParaRegistro?.invitacionMasiva);
  const gradoParaHorarioRegistro = estudiante?.esExterno
    ? formulario.gradoExterno
    : estudiante?.grado;
  const horarioTextoRegistro = resolverHorarioPorGradoLocal(programaParaRegistro, gradoParaHorarioRegistro)
    || programaParaRegistro?.horario
    || "";
  const horarioResumenRegistro = resumirHorarioSecretaria(horarioTextoRegistro);

  useEffect(() => {
    listarProgramasPorPeriodo(periodo).then(setProgramas);
    setFormulario(formularioInicial);
    setEstudiante(null);
    setInscripción(null);
    setInscripcionesEstudiante([]);
    setModoRegistro(false);
    setModalCursoAdicional(false);
    setModalExito(false);
    setMensaje("");
  }, [periodo]);

  useEffect(() => {
    async function refrescarDesdeBase() {
      if (validarDni(dni)) {
        const encontrado = await buscarEstudiantePorDni(dni, periodo);
        if (encontrado) {
          setEstudiante(encontrado);
          const registro = await buscarInscripcionEstudiante(encontrado, periodo);
          setInscripción(registro);
          setInscripcionesEstudiante(await listarInscripcionesEstudiante(encontrado, periodo));
          const programasActualizados = await listarProgramasPorPeriodo(periodo, encontrado.grado || "", calcularEdadSecretaria(encontrado, formularioInicial));
          setProgramas(programasActualizados);
          return;
        }
      }

      const programasActualizados = await listarProgramasPorPeriodo(periodo);
      setProgramas(programasActualizados);
    }

    window.addEventListener("mock-db-updated", refrescarDesdeBase);
    window.addEventListener("storage", refrescarDesdeBase);

    return () => {
      window.removeEventListener("mock-db-updated", refrescarDesdeBase);
      window.removeEventListener("storage", refrescarDesdeBase);
    };
  }, [periodo, dni]);

  async function cargarProgramasDelPeriodo(gradoAlumno = estudiante?.grado || "", edadAlumno = calcularEdadSecretaria(estudiante, formulario)) {
    const programasActualizados = await listarProgramasPorPeriodo(periodo, gradoAlumno, edadAlumno);
    setProgramas(programasActualizados);
    return programasActualizados;
  }

  async function buscarEstudiante(event) {
    event.preventDefault();
    await consultarEstudiante();
  }

  async function consultarEstudiante() {
    setInscripción(null);
    setInscripcionesEstudiante([]);
    setModoRegistro(false);
    setResultadosNombre([]);
    const busqueda = String(dni || "").trim();
    const dniLimpio = busqueda.replace(/\D/g, "");

    try {
      if (!validarDni(dniLimpio)) {
        await cargarProgramasDelPeriodo();
        if (busqueda.length >= 3) {
          setBuscando(true);
          const resultados = await buscarEstudiantesPorNombre(busqueda, periodo);
          setBuscando(false);

          if (resultados.length === 1) {
            await aplicarEstudianteEncontrado(resultados[0]);
            return;
          }

          if (resultados.length > 1) {
            setEstudiante(null);
            setResultadosNombre(resultados);
            setMensaje("Seleccione el estudiante encontrado por nombre.");
            return;
          }
        }

        setEstudiante(null);
        setMensaje("Ingrese un DNI válido de 8 números o al menos 3 letras del nombre.");
        return;
      }

      setBuscando(true);
      const encontrado = await buscarEstudiantePorDni(dniLimpio, periodo);
      setBuscando(false);

      if (!encontrado) {
        if (periodo !== "verano") {
          setEstudiante(null);
          setMensaje("No se encontro al estudiante. El alumno externo solo puede registrarse en ciclo verano.");
          return;
        }

        await abrirRegistroAlumnoExterno(dniLimpio);
        return;
      }

      setDni(dniLimpio);
      await aplicarEstudianteEncontrado(encontrado);
    } catch (error) {
      setEstudiante(null);
      setMensaje(error.message || "No se pudo consultar el estudiante. Verifique la conexion con la base local.");
    } finally {
      setBuscando(false);
    }
  }

  async function abrirRegistroAlumnoExterno(dniSugerido = "") {
    if (periodo !== "verano") {
      mostrarMensaje("El registro de alumno externo solo esta disponible en ciclo verano.");
      return;
    }

    const dniLimpio = String(dniSugerido || dni || "").replace(/\D/g, "").slice(0, 8);
    const programasActualizados = await cargarProgramasDelPeriodo();
    const primerProgramaPeriodo = programasActualizados[0]?.id || "";

    setInscripción(null);
    setResultadosNombre([]);
    setEstudiante({
      dni: dniLimpio,
      nombres: "Alumno externo por registrar",
      grado: "Por registrar",
      seccion: "Por registrar",
      tipoAlumno: "Alumno externo",
      periodo: "Ciclo verano",
      tieneInvitacion: false,
      requiereUniforme: false,
      programaAsignado: "",
      estadoInscripción: "Nuevo registro",
      esExterno: true,
    });
    setFormulario({
      ...formularioInicial,
      dniExterno: dniLimpio,
      programa: primerProgramaPeriodo,
    });
    setModoRegistro(true);
    setMensaje("");
  }

  async function aplicarEstudianteEncontrado(encontrado) {
    setResultadosNombre([]);
    const registroExistente = await buscarInscripcionEstudiante(encontrado, periodo);
    const registrosExistentes = await listarInscripcionesEstudiante(encontrado, periodo);
    const programasCompatiblesBase = await listarProgramasPorPeriodo(periodo, encontrado.grado || "", calcularEdadSecretaria(encontrado, formularioInicial));
    const programasCompatibles = programasCompatiblesBase;
    setProgramas(programasCompatibles);
    const estadoRegistro = registroExistente?.estadoInscripción || registroExistente?.estadoInscripcion;
    setEstudiante({
      ...encontrado,
      estadoInscripcion: estadoRegistro || encontrado.estadoInscripcion || encontrado.estadoInscripción || "No inscrito",
      estadoInscripción: estadoRegistro || encontrado.estadoInscripcion || encontrado.estadoInscripción || "No inscrito",
      estadoPago: registroExistente?.estadoPago || encontrado.estadoPago,
    });
    setInscripción(registroExistente);
    setInscripcionesEstudiante(registrosExistentes);
    setFormulario({
      ...formularioInicial,
      programa: encontrado.tieneInvitacion ? encontrado.programaAsignado : "",
      apoderado: registroExistente?.apoderado ?? encontrado.apoderado ?? "",
      telefono: registroExistente?.telefono ?? encontrado.telefonoApoderado ?? "",
      correo: registroExistente?.correo ?? "",
      medioEnvio: registroExistente?.medioEnvio ?? "Impreso",
      tallaUniforme: registroExistente?.tallaUniforme ?? "",
      tallaPolo: registroExistente?.tallaPolo ?? "",
      tallaShort: registroExistente?.tallaShort ?? "",
      observacion: registroExistente?.observacion ?? "",
      tipoAlumnoVerano: periodo === "verano" ? "Alumno interno" : formularioInicial.tipoAlumnoVerano,
      colegioProcedencia: periodo === "verano" ? (registroExistente?.colegioProcedencia || "Colegio San Rafael") : "",
    });
    if (!encontrado.tieneInvitacion && periodo === "escolar" && programasCompatibles.length === 0) {
      setMensaje("No hay programas de invitación masiva disponibles para el grado del estudiante.");
      return;
    }
    if (encontrado.tieneInvitacion && encontrado.programaDisponible === false) {
      setMensaje("El alumno esta cargado por Coordinacion, pero el programa no tiene horario para su grado. Coordinacion debe agregar el turno antes de inscribir.");
      return;
    }
    setMensaje("");
  }



  function actualizarFormulario(campo, valor) {
    setFormulario((actual) => {
      const siguiente = {
        ...actual,
        [campo]: valor,
      };
      if (periodo === "verano" && campo === "edadExterno") {
        const compatibles = programas.filter((programa) =>
          programaDisponibleParaEdadSecretaria(programa, valor)
        );
        const programaActualValido = compatibles.some((programa) => programa.id === actual.programa);
        siguiente.programa = programaActualValido ? actual.programa : compatibles[0]?.id || "";
      }
      return siguiente;
    });
  }

  function actualizarFechaNacimientoExterno(valor) {
    setFormulario((actual) => ({
      ...actual,
      fechaNacimientoExterno: valor,
      edadExterno: calcularEdadSecretaria(null, { fechaNacimientoExterno: valor }) || "",
    }));
  }

  function limpiarBusquedaEstudiante() {
    setDni("");
    setMensaje("");
    setEstudiante(null);
    setInscripción(null);
    setInscripcionesEstudiante([]);
    setFormulario(formularioInicial);
    setModoRegistro(false);
    setModalCursoAdicional(false);
    setModalExito(false);
    setResultadosNombre([]);
  }

  async function guardarInscripción(event) {
    event.preventDefault();
    setMensaje("");

    if (!estudiante) {
      mostrarMensaje("Primero busque un estudiante registrado.");
      return;
    }

    if (estudiante.esExterno) {
      if (!validarDni(formulario.dniExterno)) {
        mostrarMensaje("Ingrese el DNI del alumno externo con 8 numeros.");
        return;
      }
      if (!validarTextoSeguro(formulario.nombresExterno)) {
        mostrarMensaje("Ingrese el nombre completo del alumno externo.");
        return;
      }
      if (!validarTextoSeguro(formulario.edadExterno) || Number(formulario.edadExterno) <= 0) {
        mostrarMensaje("Seleccione la fecha de nacimiento del estudiante.");
        return;
      }
      if (!validarTextoSeguro(formulario.domicilioExterno)) {
        mostrarMensaje("Ingrese el domicilio del estudiante.");
        return;
      }
      if (!formulario.sexoExterno) {
        mostrarMensaje("Seleccione el sexo del estudiante.");
        return;
      }
      if (!validarTextoSeguro(formulario.gradoExterno)) {
        mostrarMensaje("Ingrese el grado del alumno externo.");
        return;
      }
    }

    const seleccionoProgramaDistinto = Boolean(formulario.programa && formulario.programa !== estudiante.programaAsignado);
    const requiereSeleccionPrograma = periodo === "verano" || !estudiante.tieneInvitacion || registroAdicional || seleccionoProgramaDistinto;
    const programaIdRegistro = requiereSeleccionPrograma
      ? formulario.programa
      : estudiante.programaAsignado;

    if (requiereSeleccionPrograma && !formulario.programa) {
      setMensaje(programas.length === 0
        ? "No hay programas habilitados para este periodo. Coordinación debe registrar o habilitar uno."
        : "Seleccione el programa o taller disponible para este periodo.");
      return;
    }

    const programaActualizado = programaIdRegistro
      ? await obtenerProgramaPorId(programaIdRegistro, periodo)
      : null;

    if (!programaActualizado) {
      mostrarMensaje("No se encontro el programa actualizado para este periodo. Actualice y vuelva a intentar.");
      return;
    }

    if (periodo === "escolar" && !estudiante.tieneInvitacion && !inscripcionMasivaSeleccionada && !validarTextoSeguro(formulario.observacion)) {
      mostrarMensaje("La inscripcion excepcional requiere una observacion obligatoria.");
      return;
    }

    if (periodo === "verano" && !validarTextoSeguro(formulario.colegioProcedencia)) {
      mostrarMensaje("Ingrese el colegio de procedencia del estudiante.");
      return;
    }

    if (!validarTextoSeguro(formulario.apoderado)) {
      mostrarMensaje("Ingrese el nombre del apoderado sin caracteres especiales.");
      return;
    }

    if (!validarTelefono(formulario.telefono)) {
      mostrarMensaje("Ingrese un telefono de contacto valido de 9 numeros.");
      return;
    }

    if (programaActualizado.requiereUniforme && !formulario.tallaUniforme) {
      mostrarMensaje("Seleccione la talla de uniforme requerida por el taller.");
      return;
    }

    if (programaActualizado.requiereIndumentaria && (!formulario.tallaPolo || !formulario.tallaShort)) {
      mostrarMensaje("Seleccione la talla de polo y short para la indumentaria deportiva.");
      return;
    }

    if (!formulario.aceptaCondiciones) {
      mostrarMensaje("Debe confirmar que el apoderado acepta las condiciones del programa.");
      return;
    }

    try {
      setGuardando(true);
      const dniRegistro = estudiante.esExterno ? formulario.dniExterno.trim() : estudiante.dni;
      const nombresRegistro = estudiante.esExterno
        ? formulario.nombresExterno.trim()
        : estudiante.nombres;
      const gradoRegistro = estudiante.esExterno
        ? formulario.gradoExterno.trim()
        : estudiante.grado || "";
      const edadRegistro = calcularEdadSecretaria(estudiante, formulario);
      const tipoAlumnoVeranoAutomatico = estudiante.esExterno ? "Alumno externo" : "Alumno interno";
      const horarioRegistro = resolverHorarioPorGradoLocal(programaActualizado, gradoRegistro)
        || programaActualizado.horario;
      const registro = await registrarInscripcion({
        dniEstudiante: dniRegistro,
        codigoEstudiante: estudiante.codigoEstudiante || "",
        gradoEstudiante: gradoRegistro,
        seccionEstudiante: estudiante.esExterno ? "" : estudiante.seccion || "",
        nombresEstudiante: nombresRegistro,
        esExterno: estudiante.esExterno,
        esNuevoVerano: Boolean(estudiante.esExterno),
        edadEstudiante: edadRegistro ? String(edadRegistro) : "",
        domicilioEstudiante: estudiante.esExterno ? formulario.domicilioExterno.trim() : "",
        sexoEstudiante: estudiante.esExterno ? formulario.sexoExterno : "",
        tipoAlumno: esCicloVerano ? tipoAlumnoVeranoAutomatico : estudiante.tipoAlumno,
        tipoInscripción:
          esCicloVerano
            ? (tipoAlumnoVeranoAutomatico === "Alumno externo" ? "Verano externo" : "Verano interno")
            :
          periodo === "escolar" && !estudiante.tieneInvitacion && !programaActualizado.invitacionMasiva
            ? "Excepcional"
            : "Regular",
        programa: programaActualizado.nombre,
        programaId: programaActualizado.id,
        colegioProcedencia: formulario.colegioProcedencia.trim(),
        horario: horarioRegistro,
        docente: programaActualizado.docente,
        costo: programaActualizado.costo,
        cupos: programaActualizado.cupos,
        requiereUniforme: programaActualizado.requiereUniforme,
        periodo,
        apoderado: formulario.apoderado.trim(),
        telefono: formulario.telefono,
        correo: "",
        medioEnvio: "Impreso",
        seleccion: estudiante.seleccion || programaParaRegistro?.seleccion || "",
        nivelCambridge: estudiante.nivelCambridge || programaParaRegistro?.nivelCambridge || "",
        tallaUniforme: formulario.tallaUniforme,
        tallaPolo: formulario.tallaPolo,
        tallaShort: formulario.tallaShort,
        observacion: formulario.observacion.trim(),
        origenRegistro: estudiante.esExterno
          ? "Alumno externo de ciclo verano"
          : esCicloVerano
          ? "Alumno interno de ciclo verano"
          : estudiante.tieneInvitacion
          ? "Alumno invitado por Coordinación"
          : "Registro excepcional por Secretaría",
      });

      setInscripción(registro);
      setInscripcionesEstudiante(await listarInscripcionesEstudiante({
        ...estudiante,
        dni: dniRegistro,
        nombres: nombresRegistro,
        grado: gradoRegistro,
      }, periodo));
      setEstudiante((actual) =>
        actual ? {
          ...actual,
          dni: dniRegistro,
          nombres: nombresRegistro,
          grado: gradoRegistro,
          seccion: estudiante.esExterno ? "" : actual.seccion,
          tipoAlumno: registro.tipoAlumno,
          estadoInscripción: registro.estadoInscripción,
          estadoPago: registro.estadoPago,
        } : actual
      );
      setModoRegistro(false);
      setModalExito(true);
      setMensaje("");
      toast.success("Secretaría", {
        description: "Inscripción registrada correctamente.",
      });
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo registrar la inscripcion. Intente actualizar y vuelva a confirmar.");
    } finally {
      setGuardando(false);
    }
  }

  async function abrirRegistro() {
    if (invitacionSinHorario && !registroAdicional) {
      mostrarMensaje("El alumno esta cargado por Coordinacion, pero falta configurar un horario para su grado antes de inscribirlo.");
      return;
    }

    const programasActualizados = await cargarProgramasDelPeriodo(estudiante?.grado || "", calcularEdadSecretaria(estudiante, formulario));
    const programaAsignadoActual = tieneInvitacionOperativa && !registroAdicional
      ? await obtenerProgramaPorId(estudiante.programaAsignado, periodo).catch(() => null)
      : null;

    if (tieneInvitacionOperativa && !registroAdicional && !programaAsignadoActual) {
      mostrarMensaje("El programa asignado por Coordinación no está habilitado o no tiene cupos disponibles.");
      return;
    }
    const primerProgramaPeriodo = programasActualizados[0]?.id || "";
    const debeEscogerEntreInvitacionYMasiva = Boolean(programaAsignadoActual && programasActualizados.length > 0);
    setFormulario((actual) => ({
      ...actual,
      programa: debeEscogerEntreInvitacionYMasiva
        ? ""
        : programaAsignadoActual
        ? estudiante.programaAsignado
        : actual.programa || primerProgramaPeriodo,
      colegioProcedencia: actual.colegioProcedencia || (estudiante?.esExterno ? "" : "Colegio San Rafael"),
      tipoAlumnoVerano: periodo === "verano"
        ? (estudiante?.esExterno ? "Alumno externo" : "Alumno interno")
        : actual.tipoAlumnoVerano,
      apoderado: actual.apoderado || estudiante?.apoderado || "",
      telefono: actual.telefono || estudiante?.telefonoApoderado || "",
      aceptaCondiciones: false,
    }));
    setModoRegistro(true);
  }

  function abrirCursoAdicional() {
    if (!inscripcion) {
      abrirRegistro();
      return;
    }

    if (!programasCursoAdicional.length) {
      mostrarMensaje("El estudiante ya esta inscrito en los cursos disponibles o no hay otro taller habilitado para su grado.");
      return;
    }

    setCursoAdicionalId((actual) =>
      programasCursoAdicional.some((programa) => programa.id === actual)
        ? actual
        : programasCursoAdicional[0]?.id || ""
    );
    setModalCursoAdicional(true);
    setMensaje("");
  }

  async function registrarCursoAdicional(event) {
    event.preventDefault();
    if (!estudiante || !inscripcion || registrandoCursoAdicional) return;

    const programaSeleccionadoAdicional = programasCursoAdicional.find((programa) => programa.id === cursoAdicionalId);
    if (!programaSeleccionadoAdicional) {
      mostrarMensaje("Seleccione un curso adicional disponible.");
      return;
    }

    if (
      clavesProgramasRegistrados.has(`id:${programaSeleccionadoAdicional.id}`) ||
      clavesProgramasRegistrados.has(`nombre:${normalizarComparacion(programaSeleccionadoAdicional.nombre)}`)
    ) {
      mostrarMensaje("El estudiante ya tiene una inscripcion registrada en este programa.");
      return;
    }

    setRegistrandoCursoAdicional(true);
    setMensaje("");
    try {
      const programaActualizado = await obtenerProgramaPorId(programaSeleccionadoAdicional.id, periodo);
      if (!programaActualizado) {
        mostrarMensaje("El curso seleccionado ya no esta disponible. Actualice y vuelva a intentar.");
        return;
      }

      const gradoRegistro = estudiante.grado || "";
      const horarioRegistro = resolverHorarioPorGradoLocal(programaActualizado, gradoRegistro)
        || programaActualizado.horario;
      const registro = await registrarInscripcion({
        dniEstudiante: estudiante.dni,
        codigoEstudiante: estudiante.codigoEstudiante || "",
        gradoEstudiante: gradoRegistro,
        seccionEstudiante: estudiante.seccion || "",
        nombresEstudiante: estudiante.nombres,
        esExterno: Boolean(estudiante.esExterno),
        edadEstudiante: calcularEdadSecretaria(estudiante, formulario) ? String(calcularEdadSecretaria(estudiante, formulario)) : "",
        tipoAlumno: esCicloVerano ? (estudiante.esExterno ? "Alumno externo" : "Alumno interno") : estudiante.tipoAlumno,
        tipoInscripción: "Curso adicional",
        programa: programaActualizado.nombre,
        programaId: programaActualizado.id,
        colegioProcedencia: inscripcion.colegioProcedencia || (estudiante.esExterno ? "" : "Colegio San Rafael"),
        horario: horarioRegistro,
        docente: programaActualizado.docente,
        costo: programaActualizado.costo,
        cupos: programaActualizado.cupos,
        requiereUniforme: programaActualizado.requiereUniforme,
        periodo,
        apoderado: inscripcion.apoderado || estudiante.apoderado || formulario.apoderado,
        telefono: inscripcion.telefono || estudiante.telefonoApoderado || formulario.telefono,
        correo: inscripcion.correo || "",
        medioEnvio: inscripcion.medioEnvio || "Impreso",
        seleccion: estudiante.seleccion || "",
        nivelCambridge: estudiante.nivelCambridge || "",
        observacion: "Curso adicional registrado por Secretaria.",
        origenRegistro: "Curso adicional por Secretaria",
      });

      setInscripción(registro);
      setInscripcionesEstudiante(await listarInscripcionesEstudiante(estudiante, periodo));
      setModalCursoAdicional(false);
      setCursoAdicionalId("");
      setModalExito(true);
      toast.success("Secretaría", {
        description: "Curso adicional registrado correctamente.",
      });
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo registrar el curso adicional.");
    } finally {
      setRegistrandoCursoAdicional(false);
    }
  }

  async function abrirFichaGenerada() {
    if (!inscripcion || imprimiendoFichaRegistro) return;

    setImprimiendoFichaRegistro(true);
    setMensaje("");
    try {
      const inscripcionActualizada = await buscarInscripcionEstudiante(estudiante, periodo);
      const fichaRegistro = await completarInscripcionConProgramaActual(inscripcionActualizada || inscripcion);
      const fechaDocumento = new Date().toISOString();
      const fichaCompleta = {
        ...fichaRegistro,
        fichaGenerada: true,
        documentoGenerado: true,
        ultimoDocumentoGeneradoEn: fechaDocumento,
      };
      setInscripción(fichaCompleta);
      setModalExito(false);
      await imprimirInscripcionDirecta(estudiante, fichaCompleta);
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo preparar la ficha para imprimir.");
    } finally {
      setImprimiendoFichaRegistro(false);
    }
  }

  async function derivarACaja() {
    if (!inscripcion || derivandoCaja) return;
    if (inscripcion.derivadoCaja) {
      mostrarMensaje("Este taller ya fue derivado a Caja. Registre un curso adicional si necesita derivar otro taller.");
      return;
    }
    if (!inscripcion.fichaGenerada && !inscripcion.documentoGenerado) {
      mostrarMensaje("Primero imprima o genere la ficha de inscripción antes de derivar a Caja.");
      return;
    }

    const programaDerivacion = inscripcion.programa || "el taller seleccionado";
    const confirmarDerivacion = window.confirm(
      `Se derivara a Caja la inscripcion de ${estudiante?.nombres || "este estudiante"} en ${programaDerivacion}. ¿Desea continuar?`
    );
    if (!confirmarDerivacion) return;

    setDerivandoCaja(true);
    setMensaje("");
    try {
      const inscripcionActualizada = await buscarInscripcionEstudiante(estudiante, periodo);
      const registroCompleto = await completarInscripcionConProgramaActual({
        ...(inscripcionActualizada || {}),
        ...inscripcion,
      });
      const derivada = await derivarInscripcionCaja(registroCompleto.id, {
        ...registroCompleto,
        dniEstudiante: registroCompleto.dniEstudiante || estudiante?.dni,
        nombresEstudiante: registroCompleto.nombresEstudiante || estudiante?.nombres,
        codigoEstudiante: registroCompleto.codigoEstudiante || estudiante?.codigoEstudiante,
        gradoEstudiante: registroCompleto.gradoEstudiante || estudiante?.grado,
        seccionEstudiante: registroCompleto.seccionEstudiante || estudiante?.seccion,
      });
      setInscripción(derivada);
      mostrarMensaje("Derivado exitosamente a Caja.", "success");
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo derivar la inscripcion a Caja.");
    } finally {
      setDerivandoCaja(false);
    }
  }

  async function completarInscripcionConProgramaActual(registro) {
    const programaId = registro.programaId || estudiante?.programaAsignado || programaParaRegistro?.id;
    let programaActual = null;

    if (programaId) {
      programaActual = await obtenerProgramaPorId(programaId, periodo).catch(() => null);
    }

    if (!programaActual) {
      programaActual = programas.find((programa) =>
        normalizarComparacion(programa.nombre) === normalizarComparacion(registro.programa)
      ) || programaParaRegistro;
    }

    if (!programaActual) return registro;

    return {
      ...registro,
      programaId: programaActual.id || registro.programaId,
      programa: programaActual.nombre || registro.programa,
      horario: resolverHorarioPorGradoLocal(programaActual, registro.gradoEstudiante || registro.grado || estudiante?.grado) || registro.horario || programaActual.horario,
      docente: programaActual.docente || registro.docente,
      costo: programaActual.costo ?? registro.costo,
      modalidadCobro: programaActual.modalidadCobro || registro.modalidadCobro,
      fechaInicio: programaActual.fechaInicio || registro.fechaInicio,
      fechaFin: programaActual.fechaFin || registro.fechaFin,
      duracionTaller: programaActual.duracionTaller || registro.duracionTaller,
      duracionAvisoDias: programaActual.duracionAvisoDias || registro.duracionAvisoDias,
      requisitos: programaActual.requisitos || registro.requisitos,
      plantilla: programaActual.plantilla || registro.plantilla,
      plantillaBase64: programaActual.plantillaBase64 || registro.plantillaBase64,
      plantillaVariables: programaActual.plantillaVariables || registro.plantillaVariables || [],
      requiereUniforme: programaActual.requiereUniforme ?? registro.requiereUniforme,
      requiereIndumentaria: programaActual.requiereIndumentaria ?? registro.requiereIndumentaria,
      seleccion: registro.seleccion || estudiante?.seleccion || "",
      nivelCambridge: registro.nivelCambridge || estudiante?.nivelCambridge || "",
    };
  }

  const mostrarVistaDelegada = Boolean(delegatedContent);

  return (
    <div className="secretaria-layout">
      <aside className="secretaria-sidebar">
        <div className="secretaria-sidebar-brand" aria-label="Colegio San Rafael">
          <img src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
          <div>
            <span>Secretaria</span>
          </div>
        </div>

        <nav className="secretaria-nav" aria-label="Menu del modulo secretaria">
          <button
            className={`secretaria-nav-item ${!mostrarVistaDelegada ? "secretaria-nav-item-active" : ""}`}
            type="button"
            onClick={onClearDelegatedModule}
          >
            <Search size={18} />
            <span>Inscripción presencial</span>
          </button>
        </nav>

        {moduleSwitcher ? (
          <div className="pt-3">
            {moduleSwitcher}
          </div>
        ) : null}

        <div className="secretaria-sidebar-footer">
          <button className="secretaria-logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <main className="secretaria-main">
        {mostrarVistaDelegada ? (
          delegatedContent
        ) : (
          <>
        <section className="secretaria-workspace secretaria-workspace-system">
          <SecretariaSearchCard
            aplicarEstudianteEncontrado={aplicarEstudianteEncontrado}
            abrirRegistroAlumnoExterno={abrirRegistroAlumnoExterno}
            buscando={buscando}
            buscarEstudiante={buscarEstudiante}
            dni={dni}
            estudiante={estudiante}
            mensaje={mensaje}
            periodo={periodo}
            resultadosNombre={resultadosNombre}
            setDni={setDni}
            setPeriodo={setPeriodo}
          >
            <SecretariaStudentPanel
              abrirCursoAdicional={abrirCursoAdicional}
              abrirFichaGenerada={abrirFichaGenerada}
              abrirRegistro={abrirRegistro}
              cursosAdicionalesDisponibles={programasCursoAdicional.length}
              derivarACaja={derivarACaja}
              derivandoCaja={derivandoCaja}
              esCicloVerano={esCicloVerano}
              estudiante={estudiante}
              imprimiendoFichaRegistro={imprimiendoFichaRegistro}
              inscripcion={inscripcion}
              invitacionSinHorario={invitacionSinHorario}
              limpiarBusquedaEstudiante={limpiarBusquedaEstudiante}
              nombreProgramaAMostrar={nombreProgramaAMostrar}
              programas={programas}
              tieneInvitacionOperativa={tieneInvitacionOperativa}
              tipoAlumnoMostrado={tipoAlumnoMostrado}
            />
          </SecretariaSearchCard>

        </section>

        <SecretariaRegistroModal
          actualizarFormulario={actualizarFormulario}
          esCicloVerano={esCicloVerano}
          estudiante={estudiante}
          formulario={formulario}
          guardarInscripción={guardarInscripción}
          guardando={guardando}
          horarioResumenRegistro={horarioResumenRegistro}
          etiquetaPrograma={etiquetaProgramaSecretaria}
          mensaje={mensaje}
          modoRegistro={modoRegistro}
          mostrarSelectorPrograma={mostrarSelectorPrograma}
          programaParaRegistro={programaParaRegistro}
          programas={programas}
          programasParaSelector={programasParaSelector}
          setModoRegistro={setModoRegistro}
        />
        {modalCursoAdicional ? (
          <SecretariaCursoAdicionalModal
            cursoId={cursoAdicionalId}
            estudiante={estudiante}
            guardando={registrandoCursoAdicional}
            inscripcionActual={inscripcion}
            onCancel={() => setModalCursoAdicional(false)}
            onChange={setCursoAdicionalId}
            onSubmit={registrarCursoAdicional}
            programas={programasCursoAdicional}
          />
        ) : null}
        {modalExito ? (
          <SecretariaSuccessModal
            imprimiendo={imprimiendoFichaRegistro}
            inscripcion={inscripcion}
            onClose={() => setModalExito(false)}
            onPrint={abrirFichaGenerada}
          />
        ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default Secretaria;

