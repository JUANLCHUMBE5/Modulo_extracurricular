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
  }, [user?.dni, formularioEditadoRef]);

  useEffect(() => {
    const actualizarData = ({ forzar = false } = {}) => {
      const ahora = Date.now();
      if (!forzar && ahora - lastFetchTimeRef.current < 30000) {
        return;
      }
      cargarResumen({ silencioso: true });
      cargarProgramas({ silencioso: true });
    };

    const actualizarPorStorage = (event: any) => {
      if (event.key === "san_rafael_db_updated_at") actualizarData({ forzar: true });
    };

    const handleDbUpdated = () => actualizarData({ forzar: true });
    const handleFocus = () => actualizarData({ forzar: false });

    window.addEventListener("mock-db-updated", handleDbUpdated);
    window.addEventListener("api-db-updated", handleDbUpdated);
    window.addEventListener("storage", actualizarPorStorage);
    window.addEventListener("focus", handleFocus);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        actualizarData({ forzar: true });
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
    const asociados: any[] = [];
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

  const assistantHook = usePadresAssistant({
    estudiante,
    programa,
    inscripcion,
    inscripciones,
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
  }, [programa?.programaId, programa?.id, formularioEditadoRef]);

  async function solicitarInscripcionPadres(programaId = "", horarioPersonalizado = "", tallas = {}) {
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

    setForm((f: any) => ({ ...f })); // force write via hook or API
    // trigger loader locally
    setForm((actual: any) => actual);
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

  async function enviarPagoVerificacionPadres(datosPago = {}, inscripcionObjetivoId = "") {
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

  async function reservarCupoCaja(inscripcionObjetivoId = "") {
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
