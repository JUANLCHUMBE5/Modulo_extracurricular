import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  IconReceipt as Receipt,
  IconToolsKitchen2 as Utensils,
  IconBulb as Bulb,
  IconCalendar as Calendar,
  IconClipboardCheck as ClipboardCheck,
  IconClock as Clock,
  IconNotes as Notes,
  IconPhone as Phone,
  IconUser as User,
  IconBook2 as BookOpen,
  IconCategory as Category,
  IconBallFootball as BallFootball,
} from "@tabler/icons-react";
import { prepararComunicadoPadres } from "../utils/padresTextUtils";

const PASO_PAGO_STORAGE_PREFIX = "padres:pasoPago:";

export function obtenerMetaSeccionComunicado(titulo = "") {
  const texto = String(titulo).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (texto.includes("costo")) return { Icono: Receipt, clase: "is-cost", ayuda: "Monto y modalidad registrados para este programa." };
  if (texto.includes("almuerzo")) return { Icono: Utensils, clase: "is-lunch", ayuda: "Recepción y concesionarios autorizados por la institución." };
  if (texto.includes("ventaja")) return { Icono: Bulb, clase: "is-benefits", ayuda: "Beneficios incluidos durante el ciclo." };
  if (texto.includes("nota")) return { Icono: Notes, clase: "is-note", ayuda: "Compromisos importantes para la familia." };
  if (texto.includes("util")) return { Icono: ClipboardCheck, clase: "is-supplies", ayuda: "Materiales que debe preparar la familia." };
  if (texto.includes("concesionario")) return { Icono: Phone, clase: "is-contact", ayuda: "Contactos autorizados por la institución." };
  return { Icono: BookOpen, clase: "is-general", ayuda: "Información importante del programa." };
}

export function obtenerIconoPorTipo(tipo = "") {
  if (tipo === "vigencia") return Calendar;
  if (tipo === "horario") return Clock;
  if (tipo === "costo") return Receipt;
  if (tipo === "plazo" || tipo === "inicio") return Calendar;
  if (tipo === "responsable") return User;
  if (tipo === "modalidad") return Category;
  if (tipo === "disponibles") return BallFootball;
  return BookOpen;
}

export function obtenerClasePorTipo(tipo = "") {
  if (tipo === "vigencia" || tipo === "inicio") return "is-vigencia";
  if (tipo === "horario") return "is-horario";
  if (tipo === "costo") return "is-costo";
  if (tipo === "plazo") return "is-plazo";
  if (tipo === "responsable") return "is-responsable";
  if (tipo === "modalidad") return "is-horario";
  if (tipo === "disponibles") return "is-vigencia";
  return "is-general";
}

export function obtenerPasoPagoGuardado(dni: string | undefined) {
  if (typeof window === "undefined" || !dni) return null;
  return window.sessionStorage.getItem(`${PASO_PAGO_STORAGE_PREFIX}${dni}`) === "3" ? 3 : null;
}

export function guardarPasoPago(dni: string | undefined, paso: number | null) {
  if (typeof window === "undefined" || !dni) return;
  const key = `${PASO_PAGO_STORAGE_PREFIX}${dni}`;
  if (paso === 3) {
    window.sessionStorage.setItem(key, "3");
    return;
  }
  window.sessionStorage.removeItem(key);
}

interface UsePortalPadresProps {
  user: any;
  padresHook: any;
}

export default function usePortalPadres({ user, padresHook }: UsePortalPadresProps) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [historialPagosAbierto, setHistorialPagosAbierto] = useState(false);
  const [pagoDetalle, setPagoDetalle] = useState<any>(null);
  const pasoPagoGuardado = obtenerPasoPagoGuardado(user?.dni);
  const [pasoActivo, setPasoActivo] = useState(pasoPagoGuardado ?? 0);
  const [pasoObjetivo, setPasoObjetivo] = useState<number | null>(pasoPagoGuardado);
  const [mantenerPasoPago, setMantenerPasoPago] = useState(pasoPagoGuardado === 3);
  const [anuncioCerrado, setAnuncioCerrado] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState("");
  const [tallaPolo, setTallaPolo] = useState("");
  const [tallaShort, setTallaShort] = useState("");
  const [tallaUniforme, setTallaUniforme] = useState("");
  const [programaAdicional, setProgramaAdicional] = useState<any>(null);
  const [inscripcionPagoId, setInscripcionPagoId] = useState("");
  const [comunicadoCompletoVisto, setComunicadoCompletoVisto] = useState(false);
  const comunicadoModalRef = useRef<HTMLDivElement | null>(null);

  const {
    actualizar,
    cargando,
    form,
    guardando,
    infoProgramaAceptada,
    inscripcion,
    inscripciones,
    invitacion,
    pagos,
    programa,
    programasDisponibles,
    setInfoProgramaAceptada,
    solicitarInscripcionPadres,
    enviarPagoVerificacionPadres,
    guardarDatos,
    reservarCupoCaja,
    infoProgramaAbierta,
    setInfoProgramaAbierta,
    consultarRafael,
  } = padresHook;

  const programaActual = programaAdicional || programa;
  const inscripcionPago = inscripcionPagoId
    ? inscripciones.find((item: any) => item.id === inscripcionPagoId) || null
    : programaAdicional
      ? inscripciones.find((item: any) => item.programaId === programaAdicional.id) || null
      : inscripcion;
  const programaActualKey = programaActual
    ? `${programaActual.programaId || programaActual.id || ""}:${programaActual.programa || programaActual.nombre || ""}`
    : "";

  const comunicadoPadres = prepararComunicadoPadres(programaActual, padresHook.estudiante);
  const invitacionPendiente = Boolean(invitacion && !inscripcion);
  const requiereCaja = Boolean(!inscripcionPago && programaActual?.ventanaInscripcion?.requiereCaja);
  const tieneCursosDisponibles = programasDisponibles.length > 0;
  const programaConAnuncio = programaActual?.anuncioImagen
    ? programaActual
    : programasDisponibles.find((item: any) => item.anuncioImagen);
  const anuncioPadres = programaConAnuncio?.anuncioImagen
    ? {
        id: programaConAnuncio.programaId || programaConAnuncio.id || programaConAnuncio.programa || programaConAnuncio.nombre,
        imagen: programaConAnuncio.anuncioImagen,
        nombre: programaConAnuncio.anuncioImagenNombre || `Anuncio de ${programaConAnuncio.programa || programaConAnuncio.nombre}`,
        programa: programaConAnuncio.programa || programaConAnuncio.nombre,
      }
    : null;

  const datosConfirmados = Boolean(
    (form.apoderado.trim() &&
    /^\d{9}$/.test(form.telefono.trim()) &&
    form.acepta) ||
    inscripcionPago
  );

  const contextoAsistente = useMemo(() => ({
    datosConfirmados,
    infoProgramaAceptada,
    inscripcionActual: inscripcionPago,
    pasoActivo,
    programaActual,
    requiereCaja,
  }), [datosConfirmados, infoProgramaAceptada, inscripcionPago, pasoActivo, programaActual, requiereCaja]);

  const pagosOrdenados = useMemo(() => {
    return [...pagos].sort((a: any, b: any) =>
      new Date(b.fecha || b.createdAt || b.fechaPago || 0).getTime() - new Date(a.fecha || a.createdAt || a.fechaPago || 0).getTime()
    );
  }, [pagos]);

  const pasoMaximo = useMemo(() => {
    if (mantenerPasoPago || pasoObjetivo === 3) return 3;
    if (!programaActual) return tieneCursosDisponibles ? 2 : 0;
    if (!infoProgramaAceptada) return 1;
    if (!datosConfirmados) return 2;
    return 3;
  }, [datosConfirmados, infoProgramaAceptada, mantenerPasoPago, pasoObjetivo, programaActual, tieneCursosDisponibles]);

  useEffect(() => {
    if (pasoObjetivo != null && pasoActivo !== pasoObjetivo) {
      setPasoActivo(pasoObjetivo);
      return;
    }
    if (pasoActivo > pasoMaximo) setPasoActivo(pasoMaximo);
  }, [pasoActivo, pasoMaximo, pasoObjetivo]);

  useEffect(() => {
    if (cargando || guardando || pasoActivo !== 3) return;
    if (inscripcionPago || invitacionPendiente || programaAdicional) return;

    setMantenerPasoPago(false);
    setPasoObjetivo(null);
    setProgramaAdicional(null);
    setInscripcionPagoId("");
    guardarPasoPago(user?.dni, null);
    setPasoActivo(0);
  }, [cargando, guardando, inscripcionPago, pasoActivo, user?.dni, invitacionPendiente, programaAdicional]);

  useEffect(() => {
    setAnuncioCerrado(false);
  }, [anuncioPadres?.id]);

  useEffect(() => {
    setComunicadoCompletoVisto(false);
  }, [programaActualKey]);

  useEffect(() => {
    if (!infoProgramaAbierta) return undefined;

    const revisarLecturaCompleta = () => {
      const modal = comunicadoModalRef.current;
      if (!modal) return;
      const noNecesitaScroll = modal.scrollHeight <= modal.clientHeight + 8;
      const llegoAlFinal = modal.scrollTop + modal.clientHeight >= modal.scrollHeight - 24;
      if (noNecesitaScroll || llegoAlFinal) {
        setComunicadoCompletoVisto(true);
      }
    };

    const frame = window.requestAnimationFrame(revisarLecturaCompleta);
    return () => window.cancelAnimationFrame(frame);
  }, [infoProgramaAbierta, programaActualKey]);

  function cambiarPaso(paso: number) {
    if (paso === 3) {
      setMantenerPasoPago(true);
      setPasoObjetivo(3);
      guardarPasoPago(user?.dni, 3);
    } else {
      setMantenerPasoPago(false);
      setPasoObjetivo(null);
      guardarPasoPago(user?.dni, null);
    }
    setPasoActivo(paso);
  }

  function volverDesdeStepper(paso: number) {
    if (paso >= pasoActivo) return;
    cambiarPaso(paso);
  }

  function manejarInscribirProgramaPrincipal() {
    setProgramaAdicional(null);
    setInscripcionPagoId("");
    setHorarioSeleccionado("");
    setTallaPolo("");
    setTallaShort("");
    setTallaUniforme("");
    const tieneComunicado = Boolean((programa?.comunicado && programa.comunicado.trim()) || (programa?.comunicadoCompleto && programa.comunicadoCompleto.trim()));
    const tieneRequisitos = Boolean(programa?.requisitos && programa.requisitos.trim());
    const tieneAmbos = tieneComunicado && tieneRequisitos;
    setInfoProgramaAceptada(
      Boolean(programa?.inscripcionRegistrada) || !tieneAmbos
    );
    cambiarPaso(1);
  }

  function manejarInscribirCursoAdicional(prog: any) {
    setProgramaAdicional(prog);
    setInscripcionPagoId(prog.inscripcionRegistrada?.id || "");
    setHorarioSeleccionado("");
    setTallaPolo("");
    setTallaShort("");
    setTallaUniforme("");
    const tieneComunicado = Boolean((prog.comunicado && prog.comunicado.trim()) || (prog.comunicadoCompleto && prog.comunicadoCompleto.trim()));
    const tieneRequisitos = Boolean(prog.requisitos && prog.requisitos.trim());
    const tieneAmbos = tieneComunicado && tieneRequisitos;
    setInfoProgramaAceptada(
      Boolean(prog.inscripcionRegistrada) || !tieneAmbos
    );
    cambiarPaso(prog.inscripcionRegistrada ? 3 : 1);
  }

  async function guardarDatosYEntrarAPago(event?: any) {
    event?.preventDefault?.();
    setMantenerPasoPago(true);
    setPasoObjetivo(3);
    guardarPasoPago(user?.dni, 3);

    const guardado = await guardarDatos({ silencioso: true });
    if (!guardado) {
      setMantenerPasoPago(false);
      setPasoObjetivo(null);
      guardarPasoPago(user?.dni, null);
      return false;
    }

    setInfoProgramaAceptada(true);
    cambiarPaso(3);
    return { pasoDestino: 3 };
  }

  async function manejarAccionPago(datosPago = null) {
    if (!programaActual) {
      consultarRafael("Que programa tiene disponible mi hijo", contextoAsistente);
      return;
    }
    if (!infoProgramaAceptada) {
      cambiarPaso(1);
      return;
    }
    if (!datosConfirmados) {
      cambiarPaso(2);
      return;
    }
    if (requiereCaja) {
      consultarRafael("Que debo hacer ahora", contextoAsistente);
      return;
    }

    let targetInscripcionId = inscripcionPago?.id || "";

    if ((invitacionPendiente || programaAdicional) && !targetInscripcionId) {
      const progId = programaAdicional?.id;
      const registrado = await solicitarInscripcionPadres(progId, horarioSeleccionado, { tallaPolo, tallaShort, tallaUniforme });
      if (!registrado) {
        return;
      }
      if (typeof registrado === "object" && registrado.id) {
        targetInscripcionId = registrado.id;
        setInscripcionPagoId(registrado.id);
      } else {
        const targetProgId = progId || programaActual?.programaId || programaActual?.id || "";
        const found = inscripciones.find((ins: any) => ins.programaId === targetProgId);
        if (found?.id) {
          targetInscripcionId = found.id;
          setInscripcionPagoId(found.id);
        }
      }
    }

    if (!targetInscripcionId) {
      toast.warning("Revisar datos", { description: "No se pudo registrar la inscripción del programa." });
      return;
    }

    await enviarPagoVerificacionPadres(datosPago, targetInscripcionId);
  }

  function manejarFinalizarPago() {
    setMantenerPasoPago(false);
    setPasoObjetivo(null);
    setProgramaAdicional(null);
    setInscripcionPagoId("");
    guardarPasoPago(user?.dni, null);
    setPasoActivo(0);
  }

  async function manejarReservaCaja() {
    if (!inscripcionPago?.id) return false;
    return await reservarCupoCaja(inscripcionPago.id);
  }

  function marcarComunicadoVistoSiCorresponde(event: any) {
    const modal = event.currentTarget;
    const llegoAlFinal = modal.scrollTop + modal.clientHeight >= modal.scrollHeight - 24;
    if (llegoAlFinal) {
      setComunicadoCompletoVisto(true);
    }
  }

  function actualizarAceptacionComunicado(event: any) {
    const marcado = event.target.checked;
    if (marcado && !comunicadoCompletoVisto && !infoProgramaAceptada) return;
    setInfoProgramaAceptada(marcado);
  }

  function continuarDesdeComunicado() {
    if (!infoProgramaAceptada) return;
    setInfoProgramaAbierta(false);
    cambiarPaso(2);
  }

  return {
    menuUsuarioAbierto,
    setMenuUsuarioAbierto,
    historialPagosAbierto,
    setHistorialPagosAbierto,
    pagoDetalle,
    setPagoDetalle,
    pasoActivo,
    setPasoActivo: cambiarPaso,
    pasoObjetivo,
    setPasoObjetivo,
    mantenerPasoPago,
    setMantenerPasoPago,
    anuncioCerrado,
    setAnuncioCerrado,
    horarioSeleccionado,
    setHorarioSeleccionado,
    tallaPolo,
    setTallaPolo,
    tallaShort,
    setTallaShort,
    tallaUniforme,
    setTallaUniforme,
    programaAdicional,
    setProgramaAdicional,
    inscripcionPagoId,
    setInscripcionPagoId,
    comunicadoCompletoVisto,
    setComunicadoCompletoVisto,
    comunicadoModalRef,
    programaActual,
    inscripcionPago,
    comunicadoPadres,
    invitacionPendiente,
    requiereCaja,
    tieneCursosDisponibles,
    anuncioPadres,
    datosConfirmados,
    contextoAsistente,
    pagosOrdenados,
    pasoMaximo,
    cambiarPaso,
    volverDesdeStepper,
    manejarInscribirProgramaPrincipal,
    manejarInscribirCursoAdicional,
    guardarDatosYEntrarAPago,
    manejarAccionPago,
    manejarFinalizarPago,
    manejarReservaCaja,
    marcarComunicadoVistoSiCorresponde,
    actualizarAceptacionComunicado,
    continuarDesdeComunicado,
  };
}
