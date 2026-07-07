import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  guardarDatosApoderadoPadres,
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
  responderAsistenteLocal,
} from "../utils/padresAssistantUtils";

const mensajesIniciales = [
  {
    autor: "bot",
    texto: "Hola, soy Rafael. Puedo orientarte sobre el programa, horario, pago, ficha y el siguiente paso del registro.",
  },
];

const INTERVALO_REFRESCO_RESPALDO_MS = 180000;

function usePadres(user) {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [consulta, setConsulta] = useState("");
  const [programasCoordinacion, setProgramasCoordinacion] = useState([]);
  const [cargandoProgramas, setCargandoProgramas] = useState(false);
  const [programaSeleccionadoId, setProgramaSeleccionadoId] = useState("");
  const [infoProgramaAbierta, setInfoProgramaAbiertaState] = useState(false);
  const [comunicadoLeidoEnSesion, setComunicadoLeidoEnSesion] = useState(false);

  const setInfoProgramaAbierta = useCallback((val) => {
    setInfoProgramaAbiertaState(val);
    if (val) {
      setComunicadoLeidoEnSesion(true);
    }
  }, []);

  const [infoProgramaAceptada, setInfoProgramaAceptada] = useState(false);
  const [pagoConfirmado, setPagoConfirmado] = useState(null);
  const formularioEditadoRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const [form, setForm] = useState({
    apoderado: "",
    telefono: "",
    correo: "",
    acepta: false,
    enviarPdfCorreo: false,
  });

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

    } catch (err) {
      const mensaje = err.message || "No se pudo cargar la información del estudiante.";
      setError(mensaje);
      toast.warning("Padres", { description: mensaje });
    } finally {
      setCargando(false);
    }
  }, [user?.dni]);

  const cargarProgramas = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargandoProgramas(true);
    try {
      const programas = await obtenerProgramasCoordinacion();
      lastFetchTimeRef.current = Date.now();
      setProgramasCoordinacion(programas);
    } catch (err) {
      console.error("Error cargando programas:", err);
    } finally {
      if (!silencioso) setCargandoProgramas(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    cargarProgramas();
  }, [cargarResumen, cargarProgramas]);

  useEffect(() => {
    formularioEditadoRef.current = false;
  }, [user?.dni]);

  useEffect(() => {
    const actualizar = ({ forzar = false } = {}) => {
      const ahora = Date.now();
      if (!forzar && ahora - lastFetchTimeRef.current < 30000) {
        return;
      }
      cargarResumen({ silencioso: true });
      cargarProgramas({ silencioso: true });
    };

    const actualizarPorStorage = (event) => {
      if (event.key === "san_rafael_db_updated_at") actualizar({ forzar: true });
    };

    const handleDbUpdated = () => actualizar({ forzar: true });
    const handleFocus = () => actualizar({ forzar: false });

    window.addEventListener("mock-db-updated", handleDbUpdated);
    window.addEventListener("api-db-updated", handleDbUpdated);
    window.addEventListener("storage", actualizarPorStorage);
    window.addEventListener("focus", handleFocus);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        actualizar({ forzar: true });
      }
    }, INTERVALO_REFRESCO_RESPALDO_MS);

    return () => {
      window.removeEventListener("mock-db-updated", handleDbUpdated);
      window.removeEventListener("api-db-updated", handleDbUpdated);
      window.removeEventListener("storage", actualizarPorStorage);
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(intervalo);
    };
  }, [cargarResumen, cargarProgramas]);

  const estudiante = resumen?.estudiante;
  const inscripcion = resumen?.inscripcionActual;
  const invitacion = resumen?.invitacionActual;
  const inscripciones = Array.isArray(resumen?.inscripciones) ? resumen.inscripciones : [];
  const pagos = Array.isArray(resumen?.pagos) ? resumen.pagos : [];
  const programa = inscripcion || invitacion;

  useEffect(() => {
    if (!pagoConfirmado) return;

    const freshPago = pagos.find((item) =>
      (pagoConfirmado.id && item.id === pagoConfirmado.id) ||
      (pagoConfirmado.inscripcionId && item.inscripcionId === pagoConfirmado.inscripcionId)
    );

    if (!freshPago) {
      setPagoConfirmado(null);
    } else if (JSON.stringify(freshPago) !== JSON.stringify(pagoConfirmado)) {
      setPagoConfirmado(freshPago);
    }
  }, [inscripciones, pagoConfirmado, pagos]);
 
  // Initialize pagoConfirmado from pagos list if it is in a pending/verificando or observed state
  useEffect(() => {
    if (!inscripcion || pagoConfirmado) return;
    const pendingPago = pagos.find((item) =>
      item.inscripcionId === inscripcion.id &&
      ["por verificar", "pendiente", "verificando", "observado", "rechazado"].includes(String(item.estado || "").toLowerCase())
    );
    if (pendingPago) {
      setPagoConfirmado(pendingPago);
    }
  }, [inscripcion, pagos, pagoConfirmado]);

  const [programaChatId, setProgramaChatId] = useState("");

  const programasAsociados = useMemo(() => {
    const asociados = [];
    const ids = new Set();

    inscripciones.forEach((ins) => {
      const pId = ins.programaId || ins.id;
      if (pId && !ids.has(pId)) {
        ids.add(pId);
        asociados.push({
          id: pId,
          nombre: ins.programa || ins.nombre || "Taller",
          programaOriginal: ins
        });
      }
    });

    const invitaciones = Array.isArray(resumen?.invitaciones) ? resumen.invitaciones : [];
    invitaciones.forEach((inv) => {
      const pId = inv.programaId || inv.id;
      if (pId && !ids.has(pId)) {
        ids.add(pId);
        asociados.push({
          id: pId,
          nombre: inv.nombre || inv.programa || "Taller",
          programaOriginal: inv
        });
      }
    });

    return asociados;
  }, [inscripciones, resumen?.invitaciones]);

  useEffect(() => {
    if (programa && !programaChatId) {
      setProgramaChatId(programa.programaId || programa.id || "");
    }
  }, [programa, programaChatId]);

  const programaChat = useMemo(() => {
    if (!programaChatId) return programa;
    const encontrado = programasAsociados.find((p) => p.id === programaChatId);
    return encontrado ? encontrado.programaOriginal : programa;
  }, [programaChatId, programasAsociados, programa]);

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

        return (item.registrable || tieneInvitacion) && item.disponibleParaGrado;
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
  }, [programa?.programaId, programa?.id]);

  async function guardarDatos(eventOrOptions) {
    const isEvent = eventOrOptions && (typeof eventOrOptions.preventDefault === "function" || eventOrOptions.nativeEvent);
    const options = isEvent ? {} : (eventOrOptions || {});
    if (isEvent) {
      eventOrOptions.preventDefault();
    }

    if (!form.apoderado.trim()) {
      avisar("Ingrese el nombre del padre o apoderado.");
      return false;
    }
    if (!/^\d{9}$/.test(form.telefono.trim())) {
      avisar("Ingrese un telefono de contacto valido de 9 numeros.");
      return false;
    }
    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      avisar("Ingrese un correo valido o deje el campo vacio.");
      return false;
    }
    if (!form.acepta) {
      avisar("Confirme que los datos son correctos.");
      return false;
    }

    setGuardando(true);
    try {
      await guardarDatosApoderadoPadres(user.dni, form);
      formularioEditadoRef.current = false;
      if (!options.silencioso) {
        toast.success("Padres", {
          description: "Datos del apoderado guardados.",
        });
      }
      await cargarResumen({ silencioso: true });
      return true;
    } catch (err) {
      avisar(err.message || "No se pudieron guardar los datos.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function solicitarInscripcionPadres(programaId = "", horarioPersonalizado = "", tallas = {}) {
    if (!form.apoderado.trim()) {
      avisar("Ingrese el nombre del padre o apoderado.");
      return false;
    }
    if (!/^\d{9}$/.test(form.telefono.trim())) {
      avisar("Ingrese un telefono de contacto valido de 9 numeros.");
      return false;
    }
    if (!form.acepta) {
      avisar("Confirme que los datos son correctos antes de solicitar el registro.");
      return false;
    }
    if (!programaId && invitacion && !inscripcion && !infoProgramaAceptada) {
      setInfoProgramaAbierta(true);
      avisar("Revise y acepte el comunicado del programa antes de registrar la inscripcion.");
      return false;
    }

    const targetProgramaId = programaId || programa?.programaId || programa?.id || "";
    if (!targetProgramaId) {
      avisar("No se encontro el programa para registrar.");
      return false;
    }

    setGuardando(true);
    setProgramaSeleccionadoId(targetProgramaId);
    try {
      const registro = await registrarInscripcionPadres(user.dni, form, targetProgramaId, horarioPersonalizado, tallas);
      toast.success("Padres", {
        description: "Inscripción registrada con éxito.",
      });
      await cargarResumen({ silencioso: true });
      return registro;
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("ya tiene una inscrip")) {
        await cargarResumen({ silencioso: true });
        return inscripcionesPorPrograma.get(targetProgramaId) || true;
      }
      avisar(err.message || "No se pudo registrar la inscripcion.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function avisar(message) {
    toast.warning("Revisar datos", { description: message });
  }

  function actualizar(campo, valor) {
    formularioEditadoRef.current = true;
    setForm((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "correo" && !String(valor || "").trim()) {
        siguiente.enviarPdfCorreo = false;
      }
      return siguiente;
    });
  }

  function preguntar(texto, contextoExtra = {}) {
    const pregunta = String(texto || consulta).trim();
    if (!pregunta) return;

    const currentProg = programaChat || programa;
    const activeInscripcion = currentProg 
      ? inscripciones.find(ins => ins.programaId === (currentProg.programaId || currentProg.id))
      : null;

    const currentInscripcion = activeInscripcion || inscripcion;

    const respuesta = responderAsistenteLocal(pregunta, {
      estudiante,
      programa: currentProg,
      inscripcion: currentInscripcion,
      pagos,
      siguientePaso: obtenerSiguientePaso({ programa: currentProg, inscripcion: currentInscripcion }),
      tipoReforzamiento: obtenerTipoReforzamiento(currentProg),
      form,
      contextoFlujo: {
        ...contextoExtra,
        programaActual: currentProg,
        inscripcionActual: currentInscripcion
      },
    });
    setMensajes((actual) => [
      ...actual,
      { autor: "padre", texto: pregunta },
      { autor: "bot", texto: respuesta },
    ]);
    setConsulta("");
  }

  function consultarRafael(texto, contextoExtra = {}) {
    setAsistenteAbierto(true);
    preguntar(texto, contextoExtra);
  }

  function abrirPago() {
    if (!programa) return consultarRafael("Monto a pagar");
    setInfoProgramaAbierta(true);
  }

  async function continuarPago() {
    if (!infoProgramaAceptada) return avisar("Debe aceptar que leyó la información del programa antes de continuar.");
    if (invitacion && !inscripcion) {
      const registrado = await solicitarInscripcionPadres();
      if (registrado) setInfoProgramaAbierta(false);
      return;
    }

    setInfoProgramaAbierta(false);
    consultarRafael("Monto a pagar");
  }

  async function enviarPagoVerificacionPadres(datosPago = {}, inscripcionObjetivoId = "") {
    const inscripcionId = inscripcionObjetivoId || inscripcion?.id || "";
    if (!inscripcionId) {
      avisar("Primero registre la inscripcion para generar el pago.");
      return false;
    }

    setGuardando(true);
    try {
      const pago = await registrarPagoVerificacionPadres(user.dni, inscripcionId, datosPago);
      setPagoConfirmado(pago);
      toast.dismiss();
      toast.success("Inscripción y pago registrados", {
        description: "Inscripción registrada con éxito y comprobante enviado a verificación. El colegio validará la operación.",
      });
      await cargarResumen({ silencioso: true });
      return true;
    } catch (err) {
      avisar(err.message || "No se pudo enviar el pago a verificacion.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function reservarCupoCaja(inscripcionObjetivoId = "") {
    const inscripcionId = inscripcionObjetivoId || inscripcion?.id || "";
    if (!inscripcionId) {
      avisar("Primero registre la inscripcion para reservar.");
      return false;
    }

    setGuardando(true);
    try {
      await reservarCupoCajaPadres(user.dni, inscripcionId);
      toast.dismiss();
      toast.success("Inscripción y reserva registradas", {
        description: "Inscripción registrada con éxito y vacante reservada. Por favor, acércate a Caja para realizar el pago.",
      });
      await cargarResumen({ silencioso: true });
      return true;
    } catch (err) {
      avisar(err.message || "No se pudo reservar el cupo.");
      return false;
    } finally {
      setGuardando(false);
    }
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
export default usePadres;
