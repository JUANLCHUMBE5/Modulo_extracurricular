import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDoubleSubmit } from "../../../hooks/useDoubleSubmit";
import {
  buscarInscripcionEstudiante,
  listarInscripcionesEstudiante,
  obtenerProgramaPorId,
  derivarInscripcionCaja,
  registrarInscripcion,
} from "../services/secretariaService";
import { resolverHorarioPorGradoLocal } from "../utils/horariosSecretaria";
import { imprimirInscripcionDirecta } from "../components/SecretariaFicha";
import {
  resumirHorarioSecretaria,
} from "../components/SecretariaFields";
import {
  calcularEdadSecretaria,
  formularioInicial,
  programaDisponibleParaEdadSecretaria,
} from "../utils/secretariaRules";
import { validarFormularioRegistro } from "../utils/secretariaValidation";
import { construirPayloadInscripcion, completarInscripcionConProgramaActual } from "../utils/secretariaMappers";
import { useSecretariaForm } from "./useSecretariaForm";
import { useSecretariaOptions } from "./useSecretariaOptions";

export function useSecretariaRegistration({
  periodo,
  vistaActiva,
  estudiante,
  inscripcion,
  inscripcionesEstudiante,
  programas,
  setEstudiante,
  setInscripción,
  setInscripcionesEstudiante,
  limpiarBusquedaEstudiante,
  setDni,
  mensaje,
  setMensaje,
  cargarProgramasDelPeriodo,
  registroDesdeLista,
  setRegistroDesdeLista,
}: any) {
  const formHook = useSecretariaForm({
    period: periodo,
    programs: programas,
  });

  const {
    formulario,
    setFormulario,
    actualizarFormulario,
  } = formHook;

  const [modoRegistro, setModoRegistro] = useState(false);
  const [modalExito, setModalExito] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [imprimiendoFichaRegistro, setImprimiendoFichaRegistro] = useState(false);
  const [derivandoCaja, setDerivandoCaja] = useState(false);
  const [modoCursoAdicional, setModoCursoAdicional] = useState(false);
  const [asistenciaModal, setAsistenciaModal] = useState<any>({ open: false, inscripcion: null });

  function mostrarMensaje(texto: string, tipo = "error") {
    setMensaje(texto);
    const titulo = tipo === "success" ? "Asistente" : "Revisar atención";
    if (tipo === "success") {
      toast.success(titulo, { description: texto });
    } else {
      toast.warning(titulo, { description: texto });
    }
  }

  const options = useSecretariaOptions({
    periodo,
    estudiante,
    programas,
    formulario,
    inscripcionesEstudiante,
    modoCursoAdicional,
  });

  const {
    esCicloVerano,
    edadAlumnoFormulario,
    gradoEstudiante,
    programaAsignado,
    programaSeleccionado,
    programasCompatiblesFormulario,
    tieneInvitacionOperativa,
    programaAsignadoInvitacion,
    clavesProgramasRegistrados,
    programasCursoAdicional,
    programasParaSelector,
    programaUnicoDisponible,
    mostrarSelectorPrograma,
    programaParaRegistro,
  } = options;

  const invitacionSinHorario = false;
  const tipoAlumnoMostrado = esCicloVerano
    ? (estudiante?.esExterno ? "Alumno externo" : "Alumno interno")
    : estudiante?.tipoAlumno;

  const nombreProgramaAMostrar = tieneInvitacionOperativa
    ? estudiante.programaNombre
    : (inscripcion ? inscripcion.programa : "El alumno no cuenta con invitación");
  const registroAdicional = modoCursoAdicional;

  const inscripcionMasivaSeleccionada = Boolean(programaParaRegistro?.invitacionMasiva);
  const gradoParaHorarioRegistro = estudiante?.esExterno
    ? formulario.gradoExterno
    : estudiante?.grado;
  const horarioTextoRegistro = resolverHorarioPorGradoLocal(programaParaRegistro, gradoParaHorarioRegistro)
    || programaParaRegistro?.horario
    || "";
  const horarioResumenRegistro = resumirHorarioSecretaria(horarioTextoRegistro);

  // Sync form when period switches
  useEffect(() => {
    setFormulario(formularioInicial);
    setModoRegistro(false);
    setModoCursoAdicional(false);
    setModalExito(false);
    setAsistenciaModal({ open: false, inscripcion: null });
  }, [periodo, setFormulario]);

  async function abrirRegistroAlumnoExterno(dniSugerido = "") {
    if (periodo !== "verano") {
      mostrarMensaje("El registro de alumno externo solo esta disponible en ciclo verano.");
      return;
    }
    const primerProgramaPeriodo = programas[0]?.id || "";
    setDni(dniSugerido);
    setEstudiante({
      dni: dniSugerido,
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
      dniExterno: dniSugerido,
      programa: primerProgramaPeriodo,
    });
    setModoRegistro(true);
    setMensaje("");
  }

  async function aplicarEstudianteEncontradoCallback(studentData: any, registroExistente: any, compatibles: any[], iniciarRegistro: boolean) {
    if (iniciarRegistro) {
      if (registroExistente) {
        toast.info("El alumno ya tiene un taller registrado. Use 'Registrar curso adicional' si corresponde.");
        setFormulario({
          ...formularioInicial,
          programa: (studentData.tieneInvitacion && studentData.programaDisponible !== false) ? studentData.programaAsignado : "",
          apoderado: registroExistente?.apoderado ?? studentData.apoderado ?? "",
          telefono: registroExistente?.telefono ?? studentData.telefonoApoderado ?? "",
          correo: registroExistente?.correo ?? "",
          medioEnvio: registroExistente?.medioEnvio ?? "Impreso",
          tallaUniforme: registroExistente?.tallaUniforme ?? "",
          tallaPolo: registroExistente?.tallaPolo ?? "",
          tallaShort: registroExistente?.tallaShort ?? "",
          observacion: registroExistente?.observacion ?? "",
          tipoAlumnoVerano: periodo === "verano" ? "Alumno interno" : formularioInicial.tipoAlumnoVerano,
          colegioProcedencia: periodo === "verano" ? (registroExistente?.colegioProcedencia || "Colegio San Rafael") : "",
        });
        if (vistaActiva === "inscripcion") {
          setModoRegistro(true);
        }
      } else {
        setModoCursoAdicional(false);
        const tieneInvitacionOperativa = Boolean(studentData.tieneInvitacion);
        const programaAsignadoActual = tieneInvitacionOperativa
          ? await obtenerProgramaPorId(studentData.programaAsignado, periodo).catch(() => null)
          : null;

        if (tieneInvitacionOperativa && !programaAsignadoActual) {
          mostrarMensaje("El programa asignado por Coordinación Académica no está habilitado o no tiene cupos disponibles.");
          return;
        }

        const primerProgramaPeriodo = compatibles[0]?.id || "";
        const debeEscogerEntreInvitacionYMasiva = Boolean(programaAsignadoActual && compatibles.length > 0);

        setFormulario({
          ...formularioInicial,
          programa: debeEscogerEntreInvitacionYMasiva
            ? ""
            : programaAsignadoActual
              ? studentData.programaAsignado
              : primerProgramaPeriodo,
          colegioProcedencia: studentData.esExterno ? "" : "Colegio San Rafael",
          tipoAlumnoVerano: esCicloVerano
            ? (studentData.esExterno ? "Alumno externo" : "Alumno interno")
            : formularioInicial.tipoAlumnoVerano,
          apoderado: studentData.apoderado || "",
          telefono: studentData.telefonoApoderado || "",
          correo: "",
          medioEnvio: "Impreso",
          tallaUniforme: "",
          tallaPolo: "",
          tallaShort: "",
          observacion: "",
          aceptaCondiciones: false,
        });
        setModoRegistro(true);
      }
    } else {
      setFormulario({
        ...formularioInicial,
        programa: (studentData.tieneInvitacion && studentData.programaDisponible !== false) ? studentData.programaAsignado : "",
        apoderado: registroExistente?.apoderado ?? studentData.apoderado ?? "",
        telefono: registroExistente?.telefono ?? studentData.telefonoApoderado ?? "",
        correo: registroExistente?.correo ?? "",
        medioEnvio: registroExistente?.medioEnvio ?? "Impreso",
        tallaUniforme: registroExistente?.tallaUniforme ?? "",
        tallaPolo: registroExistente?.tallaPolo ?? "",
        tallaShort: registroExistente?.tallaShort ?? "",
        observacion: registroExistente?.observacion ?? "",
        tipoAlumnoVerano: periodo === "verano" ? "Alumno interno" : formularioInicial.tipoAlumnoVerano,
        colegioProcedencia: periodo === "verano" ? (registroExistente?.colegioProcedencia || "Colegio San Rafael") : "",
      });
      setModoRegistro(true);
    }

    setMensaje("");
  }

  const { execute: guardarInscripciónAction } = useDoubleSubmit(async (event: any) => {
    event.preventDefault();
    setMensaje("");

    const seleccionoProgramaDistinto = Boolean(formulario.programa && formulario.programa !== estudiante?.programaAsignado);
    const requiereSeleccionPrograma = periodo === "verano" || !estudiante?.tieneInvitacion || registroAdicional || seleccionoProgramaDistinto;
    const programaUnicoRegistro = programasParaSelector.length === 1 ? programasParaSelector[0] : null;
    const programaIdRegistro = requiereSeleccionPrograma
      ? (formulario.programa || programaUnicoRegistro?.id || "")
      : estudiante?.programaAsignado;

    const programaActualizado = programaIdRegistro
      ? await obtenerProgramaPorId(programaIdRegistro, periodo).catch(() => null)
      : null;

    // Delegate Form Validation to utility
    const errorValidacion = validarFormularioRegistro({
      estudiante,
      formulario,
      periodo,
      programas,
      programasParaSelector,
      clavesProgramasRegistrados,
      registroAdicional,
      programaActualizado,
    });

    if (errorValidacion) {
      mostrarMensaje(errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      
      // Build enrollment payload using mapper
      const payloadInscripcion = construirPayloadInscripcion({
        estudiante,
        formulario,
        programaActualizado: programaParaRegistro,
        programaParaRegistro,
        periodo,
        registroAdicional,
        esCicloVerano,
      });

      const registro = await registrarInscripcion(payloadInscripcion);

      let derivadoExito = false;
      try {
        await derivarInscripcionCaja(registro.id || registro.inscripcionId, {
          estudiante_id: estudiante?.id || estudiante?.dni || payloadInscripcion.dniEstudiante,
          usuario: payloadInscripcion.usuarioRegistro || "Asistente",
          tipo_documento: registro.tipoDocumento || "Comunicado",
          plantilla: registro.plantilla || ""
        });
        derivadoExito = true;
      } catch (errDerivar) {
        console.warn("No se pudo derivar a caja de manera automatica:", errDerivar);
      }

      const inscripcionesActualizadas = await listarInscripcionesEstudiante({
        ...estudiante,
        dni: payloadInscripcion.dniEstudiante,
        nombres: payloadInscripcion.nombresEstudiante,
        grado: payloadInscripcion.gradoEstudiante,
      }, periodo);
      setInscripcionesEstudiante(inscripcionesActualizadas);

      setEstudiante((actual: any) =>
        actual ? {
          ...actual,
          dni: payloadInscripcion.dniEstudiante,
          nombres: payloadInscripcion.nombresEstudiante,
          grado: payloadInscripcion.gradoEstudiante,
          seccion: estudiante.esExterno ? "" : actual.seccion,
          tipoAlumno: registro.tipoAlumno,
          estadoInscripción: registro.estadoInscripción,
          estadoPago: derivadoExito ? "Derivado a caja" : (registro.estadoPago || "Pendiente"),
          derivadoCaja: derivadoExito,
        } : actual
      );

      setInscripción(registro);
      setModoCursoAdicional(false);
      setModalExito(false);
      setMensaje("");
      mostrarMensaje(`Inscripción de ${payloadInscripcion.nombresEstudiante} en ${registro.programa || ""} registrada y derivada a caja con éxito.`, "success");
    } catch (err: any) {
      mostrarMensaje(err.message || "No se pudo registrar la inscripcion. Intente actualizar y vuelva a confirmar.");
    } finally {
      setGuardando(false);
    }
  });

  async function guardarInscripción(event: any) {
    await guardarInscripciónAction(event);
  }

  async function abrirRegistro() {
    setModoCursoAdicional(false);
    if (invitacionSinHorario && !registroAdicional) {
      mostrarMensaje("El alumno esta cargado por Coordinación Académica, pero falta configurar un horario para su grado antes de inscribirlo.");
      return;
    }

    const programasActualizados = await cargarProgramasDelPeriodo(estudiante?.grado || "", calcularEdadSecretaria(estudiante, formulario));
    const programaAsignadoActual = tieneInvitacionOperativa && !registroAdicional
      ? await obtenerProgramaPorId(estudiante.programaAsignado, periodo).catch(() => null)
      : null;

    if (tieneInvitacionOperativa && !registroAdicional && !programaAsignadoActual) {
      mostrarMensaje("El programa asignado por Coordinación Académica no está habilitado o no tiene cupos disponibles.");
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

    const primerCursoAdicional = programasCursoAdicional[0]?.id || "";
    setFormulario((actual) => ({
      ...actual,
      programa: programasCursoAdicional.some((programa) => programa.id === actual.programa)
        ? actual.programa
        : primerCursoAdicional,
      colegioProcedencia: inscripcion.colegioProcedencia || actual.colegioProcedencia || (estudiante?.esExterno ? "" : "Colegio San Rafael"),
      tipoAlumnoVerano: periodo === "verano"
        ? (estudiante?.esExterno ? "Alumno externo" : "Alumno interno")
        : actual.tipoAlumnoVerano,
      apoderado: inscripcion.apoderado || estudiante?.apoderado || actual.apoderado || "",
      telefono: inscripcion.telefono || estudiante?.telefonoApoderado || actual.telefono || "",
      correo: inscripcion.correo || actual.correo || "",
      medioEnvio: inscripcion.medioEnvio || actual.medioEnvio || "Impreso",
      tallaUniforme: "",
      tallaPolo: "",
      tallaShort: "",
      observacion: "",
      aceptaCondiciones: false,
    }));
    setModoCursoAdicional(true);
    setModoRegistro(true);
    setMensaje("");
  }

  async function abrirFichaGenerada() {
    if (!inscripcion || imprimiendoFichaRegistro) return;

    setImprimiendoFichaRegistro(true);
    setMensaje("");
    try {
      const inscripcionActualizada = await buscarInscripcionEstudiante(estudiante, periodo);
      
      // Use mapper to complete registry details
      const fichaCompleta = await completarInscripcionConProgramaActual({
        registro: inscripcionActualizada || inscripcion,
        estudiante,
        programaParaRegistro,
        periodo,
        programas,
      });

      const fechaDocumento = new Date().toISOString();
      const fichaGenerada = {
        ...fichaCompleta,
        fichaGenerada: true,
        documentoGenerado: true,
        ultimoDocumentoGeneradoEn: fechaDocumento,
      };

      setInscripción(fichaGenerada);
      setModalExito(false);
      await imprimirInscripcionDirecta(estudiante, fichaGenerada);
    } catch (err: any) {
      mostrarMensaje(err.message || "No se pudo preparar la ficha para imprimir.");
    } finally {
      setImprimiendoFichaRegistro(false);
    }
  }

  async function imprimirFichaDesdeFormulario() {
    const seleccionoProgramaDistinto = Boolean(formulario.programa && formulario.programa !== estudiante?.programaAsignado);
    const requiereSeleccionPrograma = periodo === "verano" || !estudiante?.tieneInvitacion || registroAdicional || seleccionoProgramaDistinto;
    const programaUnicoRegistro = programasParaSelector.length === 1 ? programasParaSelector[0] : null;
    const programaIdRegistro = requiereSeleccionPrograma
      ? (formulario.programa || programaUnicoRegistro?.id || "")
      : estudiante?.programaAsignado;

    const programaActualizado = programaIdRegistro
      ? await obtenerProgramaPorId(programaIdRegistro, periodo).catch(() => null)
      : null;

    if (!programaActualizado) {
      mostrarMensaje("Seleccione un taller o programa antes de imprimir.");
      return;
    }

    setImprimiendoFichaRegistro(true);
    setMensaje("");
    try {
      const payloadInscripcion = construirPayloadInscripcion({
        estudiante,
        formulario,
        programaActualizado,
        programaParaRegistro: programaActualizado,
        periodo,
        registroAdicional,
        esCicloVerano,
      });

      const fichaGenerada = await completarInscripcionConProgramaActual({
        registro: payloadInscripcion,
        estudiante,
        programaParaRegistro: programaActualizado,
        periodo,
        programas,
      });

      await imprimirInscripcionDirecta(estudiante, fichaGenerada);
    } catch (err: any) {
      mostrarMensaje(err.message || "No se pudo preparar la ficha para imprimir.");
    } finally {
      setImprimiendoFichaRegistro(false);
    }
  }

  const { execute: derivarACajaAction } = useDoubleSubmit(async () => {
    if (!inscripcion || derivandoCaja) return;
    if (inscripcion.derivadoCaja) {
      mostrarMensaje("Este taller ya fue derivado a Cajera. Registre un curso adicional si necesita derivar otro taller.");
      return;
    }

    const programaDerivacion = inscripcion.programa || "el taller seleccionado";
    const confirmarDerivacion = window.confirm(
      `Se derivara a Cajera la inscripcion de ${estudiante?.nombres || "este estudiante"} en ${programaDerivacion}. ¿Desea continuar?`
    );
    if (!confirmarDerivacion) return;

    setDerivandoCaja(true);
    setMensaje("");
    try {
      const inscripcionActualizada = await buscarInscripcionEstudiante(estudiante, periodo);
      
      // Use mapper to complete registry details
      const registroCompleto = await completarInscripcionConProgramaActual({
        registro: {
          ...(inscripcionActualizada || {}),
          ...inscripcion,
        },
        estudiante,
        programaParaRegistro,
        periodo,
        programas,
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
      mostrarMensaje("Derivado exitosamente a Cajera.", "success");
    } catch (err: any) {
      mostrarMensaje(err.message || "No se pudo derivar la inscripcion a Cajera.");
    } finally {
      setDerivandoCaja(false);
    }
  });

  async function derivarACaja() {
    await derivarACajaAction();
  }

  return {
    formulario,
    modoRegistro,
    setModoRegistro,
    modalExito,
    setModalExito,
    guardando,
    setGuardando,
    imprimiendoFichaRegistro,
    derivandoCaja,
    modoCursoAdicional,
    setModoCursoAdicional,
    asistenciaModal,
    setAsistenciaModal,
    programaAsignado,
    programaSeleccionado,
    programasCompatiblesFormulario,
    tieneInvitacionOperativa,
    invitacionSinHorario,
    tipoAlumnoMostrado,
    nombreProgramaAMostrar,
    programaAsignadoInvitacion,
    programasCursoAdicional,
    programasParaSelector,
    programaUnicoDisponible,
    mostrarSelectorPrograma,
    programaParaRegistro,
    inscripcionMasivaSeleccionada,
    horarioResumenRegistro,
    abrirRegistroAlumnoExterno,
    actualizarFormulario,
    guardarInscripción,
    abrirRegistro,
    abrirCursoAdicional,
    abrirFichaGenerada,
    imprimirFichaDesdeFormulario,
    derivarACaja,
    aplicarEstudianteEncontradoCallback,
  };
}
