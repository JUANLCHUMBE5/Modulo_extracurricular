import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  obtenerProgramasCoordinacion,
  obtenerResumenPadre,
  registrarInscripcionPadres,
  registrarPagoVerificacionPadres,
  reservarCupoCajaPadres,
} from "../services/padresService";
import {
  obtenerBannerEstudiante,
  obtenerIniciales,
  obtenerNombreCorto,
  obtenerSiguientePaso,
  obtenerTipoReforzamiento,
  prepararProgramaParaGrado,
} from "../utils/padresAssistantUtils";
import { usePadresForm } from "./usePadresForm";
import { usePadresAssistant } from "./usePadresAssistant";
import { useDoubleSubmit } from "../../../hooks/useDoubleSubmit";

const INTERVALO_REFRESCO_RESPALDO_MS = 180000;

export default function usePadres(user: any) {
  const [resumen, setResumen] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [programasCoordinacion, setProgramasCoordinacion] = useState<any[]>([]);
  const [cargandoProgramas, setCargandoProgramas] = useState(false);
  const [programaSeleccionadoId, setProgramaSeleccionadoId] = useState("");
  const [infoProgramaAbierta, setInfoProgramaAbiertaState] = useState(false);
  const [comunicadoLeidoEnSesion, setComunicadoLeidoEnSesion] = useState(false);

  const setInfoProgramaAbierta = useCallback((val: boolean) => {
    setInfoProgramaAbiertaState(val);
    if (val) {
      setComunicadoLeidoEnSesion(true);
    }
  }, []);

  const [infoProgramaAceptada, setInfoProgramaAceptada] = useState(false);
  const [pagoConfirmado, setPagoConfirmado] = useState<any>(null);
  const lastFetchTimeRef = useRef(0);

  const cargarResumen = useCallback(async ({ silencioso = false } = {}) => {
    if (!user?.dni) {
      setError("No se encontro el DNI del estudiante en la sesion.");
      setCargando(false);
      return;
    }

    if (!silencioso) setCargando(true);
    setError("");

    try {
      const datos = await obtenerResumenPadre(user.dni);
      lastFetchTimeRef.current = Date.now();
      setResumen(datos);
      const estudiante = datos.estudiante;
      const inscripcion = datos.inscripcionActual;

      setForm((actual) => {
        if (silencioso && formularioEditadoRef.current) {
          return actual;
        }

        return {
          ...actual,
          apoderado: inscripcion?.apoderado || estudiante.apoderado || actual.apoderado,
          telefono: inscripcion?.telefono || estudiante.telefonoApoderado || actual.telefono,
          correo: inscripcion?.correo || estudiante.correoApoderado || actual.correo,
          enviarPdfCorreo: Boolean(inscripcion?.enviarPdfCorreo ?? estudiante.enviarPdfCorreo ?? actual.enviarPdfCorreo),
        };
      });

    } catch (err: any) {
      const mensaje = err.message || "No se pudo cargar la información del estudiante.";
      setError(mensaje);
      toast.warning("Padres", { description: mensaje });
    } finally {
      setCargando(false);
    }
  }, [user?.dni]);

  const formHook = usePadresForm({
    userDni: user?.dni,
    cargarResumenCallback: cargarResumen,
  });

  const {
    form,
    setForm,
    guardando,
    actualizar,
    guardarDatos,
    formularioEditadoRef,
  } = formHook;

  const cargarProgramas = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargandoProgramas(true);
    try {
      const datos = await obtenerProgramasCoordinacion(user.dni);
      setProgramasCoordinacion(datos || []);
    } catch {
      // Ignorar fallas silenciosas en segundo plano
    } finally {
      setCargandoProgramas(false);
    }
  }, [user?.dni]);

  useEffect(() => {
    cargarResumen();
    cargarProgramas();
  }, [cargarResumen, cargarProgramas]);

  useEffect(() => {
    const handleFocus = () => {
      const msTranscurridos = Date.now() - lastFetchTimeRef.current;
      if (msTranscurridos > 30000 && document.visibilityState === "visible") {
        cargarResumen({ silencioso: true });
        cargarProgramas({ silencioso: true });
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("api-db-updated", () => {
      cargarResumen({ silencioso: true });
      cargarProgramas({ silencioso: true });
    });
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("api-db-updated", handleFocus);
    };
  }, [cargarResumen, cargarProgramas]);

  useEffect(() => {
    const backupInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        cargarResumen({ silencioso: true });
        cargarProgramas({ silencioso: true });
      }
    }, INTERVALO_REFRESCO_RESPALDO_MS);
    return () => clearInterval(backupInterval);
  }, [cargarResumen, cargarProgramas]);

  const estudiante = resumen?.estudiante || null;
  const inscripcion = resumen?.inscripcionActual || null;
  const inscripciones = resumen?.inscripciones || [];
  const pagos = resumen?.pagos || [];
  const programasAsociados = resumen?.programasAsociados || [];
  const invitacion = resumen?.invitacionActual || null;
  const programa = inscripcion || invitacion || null;

  const [programaChatId, setProgramaChatId] = useState("");

  const programaChat = useMemo(() => {
    if (programaChatId) {
      return programasAsociados.find((p: any) => p.id === programaChatId) || null;
    }
    return programa;
  }, [programaChatId, programasAsociados, programa]);

  const assistantHook = usePadresAssistant({
    user,
    estudiante,
    inscripcion,
    pagos,
    form,
    programaChat,
  });

  const {
    asistenteAbierto,
    setAsistenteAbierto,
    mensajes,
    consulta,
    setConsulta,
    preguntar,
    consultarRafael,
  } = assistantHook;

  const tipoReforzamiento = useMemo(() => obtenerTipoReforzamiento(programaChat), [programaChat]);
  const nombreCorto = obtenerNombreCorto(estudiante?.nombres);
  const iniciales = obtenerIniciales(estudiante?.nombres);
  const bannerEstudiante = obtenerBannerEstudiante(estudiante);
  const siguientePaso = obtenerSiguientePaso({ programa: programaChat, inscripcion });
  const programasYaRegistrados = useMemo(
    () => new Set(inscripciones.map((item) => item.programaId).filter(Boolean)),
    [inscripciones]
  );
  const inscripcionesPorPrograma = useMemo(
    () => new Map(inscripciones.map((item) => [item.programaId, item])),
    [inscripciones]
  );
  const mostrarCatalogoProgramas = Boolean(estudiante);
  const programasDisponibles = useMemo(
    () => programasCoordinacion
      .map((item) => prepararProgramaParaGrado(item, estudiante?.grado))
      .filter((item) => item.id !== (programa?.programaId || programa?.id))
      .filter((item) => {
        const tieneInvitacion = Array.isArray(resumen?.invitaciones) && resumen.invitaciones.some(
          (inv) => (inv.programaId === item.id || inv.id === item.id)
        );

        if (item.ventanaInscripcion && !item.ventanaInscripcion.permitida) {
          const limiteTime = item.ventanaInscripcion.limiteTimestamp;
          if (limiteTime && Date.now() > limiteTime + 24 * 60 * 60 * 1000) {
            if (!programasYaRegistrados.has(item.id)) {
              return false;
            }
          }
        }

        return (item.registrable || tieneInvitacion) && (item.estado || "Habilitado") === "Habilitado" && item.disponibleParaGrado;
      })
      .map((item) => ({
        ...item,
        registrado: programasYaRegistrados.has(item.id),
        inscripcionRegistrada: inscripcionesPorPrograma.get(item.id) || null,
      })),
    [programa?.programaId, programa?.id, programasCoordinacion, programasYaRegistrados, inscripcionesPorPrograma, estudiante?.grado, resumen?.invitaciones]
  );

  const programaIdAnteriorRef = useRef(programa?.programaId || programa?.id || null);

  useEffect(() => {
    const programaIdActual = programa?.programaId || programa?.id || null;
    if (programaIdActual !== programaIdAnteriorRef.current) {
      programaIdAnteriorRef.current = programaIdActual;
      formularioEditadoRef.current = false;
      setInfoProgramaAceptada(false);
      setInfoProgramaAbierta(false);
      setPagoConfirmado(null);
      setComunicadoLeidoEnSesion(false);
    }
  }, [programa?.programaId, programa?.id, formularioEditadoRef]);

  // Wrap registration request with useDoubleSubmit
  const { execute: solicitarInscripcionPadresAction } = useDoubleSubmit(
    async (programaId = "", horarioPersonalizado = "", tallas = {}) => {
      if (!form.apoderado.trim()) {
        toast.warning("Revisar datos", { description: "Ingrese el nombre del padre o apoderado." });
        return false;
      }
      if (!/^\d{9}$/.test(form.telefono.trim())) {
        toast.warning("Revisar datos", { description: "Ingrese un telefono de contacto valido de 9 numeros." });
        return false;
      }
      if (!form.acepta) {
        toast.warning("Revisar datos", { description: "Confirme que los datos son correctos antes de solicitar el registro." });
        return false;
      }
      if (!programaId && invitacion && !inscripcion && !infoProgramaAceptada) {
        setInfoProgramaAbierta(true);
        toast.warning("Revisar datos", { description: "Revise y acepte el comunicado del programa antes de registrar la inscripcion." });
        return false;
      }

      const targetProgramaId = programaId || programa?.programaId || programa?.id || "";
      if (!targetProgramaId) {
        toast.warning("Revisar datos", { description: "No se encontro el programa para registrar." });
        return false;
      }

      setForm((f: any) => ({ ...f }));
      try {
        const registro = await registrarInscripcionPadres(user.dni, form, targetProgramaId, horarioPersonalizado, tallas);
        toast.success("Padres", {
          description: "Inscripción registrada con éxito.",
        });
        await cargarResumen({ silencioso: true });
        return registro;
      } catch (err: any) {
        if (String(err.message || "").toLowerCase().includes("ya tiene una inscrip")) {
          await cargarResumen({ silencioso: true });
          return inscripcionesPorPrograma.get(targetProgramaId) || true;
        }
        toast.warning("Revisar datos", { description: err.message || "No se pudo registrar la inscripcion." });
        return false;
      }
    }
  );

  async function solicitarInscripcionPadres(programaId = "", horarioPersonalizado = "", tallas = {}) {
    return await solicitarInscripcionPadresAction(programaId, horarioPersonalizado, tallas);
  }

  function abrirPago() {
    if (!programa) return consultarRafael("Monto a pagar");
    setInfoProgramaAbierta(true);
  }

  async function continuarPago() {
    if (!infoProgramaAceptada) {
      toast.warning("Revisar datos", { description: "Debe aceptar que leyó la información del programa antes de continuar." });
      return;
    }
    if (invitacion && !inscripcion) {
      const registrado = await solicitarInscripcionPadres();
      if (registrado) setInfoProgramaAbierta(false);
      return;
    }

    setInfoProgramaAbierta(false);
    consultarRafael("Monto a pagar");
  }

  // Wrap payment upload with useDoubleSubmit
  const { execute: enviarPagoVerificacionPadresAction } = useDoubleSubmit(
    async (datosPago = {}, inscripcionObjetivoId = "") => {
      const inscripcionId = inscripcionObjetivoId || inscripcion?.id || "";
      if (!inscripcionId) {
        toast.warning("Revisar datos", { description: "Primero registre la inscripcion para generar el pago." });
        return false;
      }

      try {
        const pago = await registrarPagoVerificacionPadres(user.dni, inscripcionId, datosPago);
        setPagoConfirmado(pago);
        toast.dismiss();
        toast.success("Inscripción y pago registrados", {
          description: "Inscripción registrada con éxito y comprobante enviado a verificación. El colegio validará la operación.",
        });
        await cargarResumen({ silencioso: true });
        return true;
      } catch (err: any) {
        toast.warning("Revisar datos", { description: err.message || "No se pudo enviar el pago a verificacion." });
        return false;
      }
    }
  );

  async function enviarPagoVerificacionPadres(datosPago = {}, inscripcionObjetivoId = "") {
    return await enviarPagoVerificacionPadresAction(datosPago, inscripcionObjetivoId);
  }

  // Wrap reserve slot with useDoubleSubmit
  const { execute: reservarCupoCajaAction } = useDoubleSubmit(
    async (inscripcionObjetivoId = "") => {
      const inscripcionId = inscripcionObjetivoId || inscripcion?.id || "";
      if (!inscripcionId) {
        toast.warning("Revisar datos", { description: "Primero registre la inscripcion para reservar." });
        return false;
      }

      try {
        await reservarCupoCajaPadres(user.dni, inscripcionId);
        toast.dismiss();
        toast.success("Inscripción y reserva registradas", {
          description: "Inscripción registrada con éxito y vacante reservada. Por favor, acércate a Caja para realizar el pago.",
        });
        await cargarResumen({ silencioso: true });
        return true;
      } catch (err: any) {
        toast.warning("Revisar datos", { description: err.message || "No se pudo reservar el cupo." });
        return false;
      }
    }
  );

  async function reservarCupoCaja(inscripcionObjetivoId = "") {
    return await reservarCupoCajaAction(inscripcionObjetivoId);
  }

  return {
    abrirPago,
    actualizar,
    asistenteAbierto,
    bannerEstudiante,
    cargando,
    cargandoProgramas,
    consulta,
    consultarRafael,
    continuarPago,
    error,
    estudiante,
    form,
    guardando,
    infoProgramaAbierta,
    infoProgramaAceptada,
    comunicadoLeidoEnSesion,
    iniciales,
    inscripcion,
    inscripciones,
    invitacion,
    mensajes,
    mostrarCatalogoProgramas,
    nombreCorto,
    preguntar,
    enviarPagoVerificacionPadres,
    pagoConfirmado,
    pagos,
    programa,
    programasDisponibles,
    programaSeleccionadoId,
    setAsistenteAbierto,
    setConsulta,
    setInfoProgramaAbierta,
    setInfoProgramaAceptada,
    siguientePaso,
    solicitarInscripcionPadres,
    guardarDatos,
    reservarCupoCaja,
    programasAsociados,
    programaChatId,
    setProgramaChatId,
  };
}

export { formatearSoles } from "../utils/padresAssistantUtils";
