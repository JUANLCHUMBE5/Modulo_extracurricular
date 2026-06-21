import { Alert } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconBook2 as BookOpen,
  IconBulb as Bulb,
  IconCalendar as Calendar,
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconClock as Clock,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconNotes as Notes,
  IconPhone as Phone,
  IconReceipt as Receipt,
  IconToolsKitchen2 as Utensils,
  IconUser as User,
  IconX as X,
} from "@tabler/icons-react";
import AsistentePadres from "../components/AsistentePadres";
import ComunicadoStep from "../components/ComunicadoStep";
import DatosApoderadoStep from "../components/DatosApoderadoStep";
import HistorialPagosModal from "../components/HistorialPagosModal";
import InicioStep from "../components/InicioStep";
import PagoStep from "../components/PagoStep";
import StepperProceso from "../components/StepperProceso";
import StudentHeader from "../components/StudentHeader";
import usePadres from "../hooks/usePadres";
import { prepararComunicadoPadres, obtenerTipoCampo } from "../utils/padresTextUtils";
import "../Padres.css";

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";
const PASO_PAGO_STORAGE_PREFIX = "padres:pasoPago:";

function obtenerMetaSeccionComunicado(titulo = "") {
  const texto = String(titulo).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (texto.includes("costo")) return { Icono: Receipt, clase: "is-cost", ayuda: "Monto y modalidad registrados para este programa." };
  if (texto.includes("almuerzo")) return { Icono: Utensils, clase: "is-lunch", ayuda: "Horario de entrega y recomendaciones para la lonchera." };
  if (texto.includes("ventaja")) return { Icono: Bulb, clase: "is-benefits", ayuda: "Beneficios incluidos durante el ciclo." };
  if (texto.includes("nota")) return { Icono: Notes, clase: "is-note", ayuda: "Compromisos importantes para la familia." };
  if (texto.includes("util")) return { Icono: ClipboardCheck, clase: "is-supplies", ayuda: "Materiales que debe preparar la familia." };
  if (texto.includes("concesionario")) return { Icono: Phone, clase: "is-contact", ayuda: "Contactos autorizados por la institución." };
  return { Icono: BookOpen, clase: "is-general", ayuda: "Información importante del programa." };
}

function obtenerIconoPorTipo(tipo = "") {
  if (tipo === "vigencia") return Calendar;
  if (tipo === "horario") return Clock;
  if (tipo === "costo") return Receipt;
  if (tipo === "plazo") return ClipboardCheck;
  if (tipo === "responsable") return User;
  return BookOpen;
}

function obtenerClasePorTipo(tipo = "") {
  if (tipo === "vigencia") return "is-vigencia";
  if (tipo === "horario") return "is-horario";
  if (tipo === "costo") return "is-costo";
  if (tipo === "plazo") return "is-plazo";
  if (tipo === "responsable") return "is-responsable";
  return "is-general";
};

function obtenerPasoPagoGuardado(dni) {
  if (typeof window === "undefined" || !dni) return null;
  return window.sessionStorage.getItem(`${PASO_PAGO_STORAGE_PREFIX}${dni}`) === "3" ? 3 : null;
}

function guardarPasoPago(dni, paso) {
  if (typeof window === "undefined" || !dni) return;
  const key = `${PASO_PAGO_STORAGE_PREFIX}${dni}`;
  if (paso === 3) {
    window.sessionStorage.setItem(key, "3");
    return;
  }
  window.sessionStorage.removeItem(key);
}

export default function Padres({ user, onLogout }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [historialPagosAbierto, setHistorialPagosAbierto] = useState(false);
  const [pagoDetalle, setPagoDetalle] = useState(null);
  const pasoPagoGuardado = obtenerPasoPagoGuardado(user?.dni);
  const [pasoActivo, setPasoActivo] = useState(pasoPagoGuardado ?? 0);
  const [pasoObjetivo, setPasoObjetivo] = useState(pasoPagoGuardado);
  const [mantenerPasoPago, setMantenerPasoPago] = useState(pasoPagoGuardado === 3);
  const [anuncioCerrado, setAnuncioCerrado] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState("");
  const [tallaPolo, setTallaPolo] = useState("");
  const [tallaShort, setTallaShort] = useState("");
  const [tallaUniforme, setTallaUniforme] = useState("");
  const [programaAdicional, setProgramaAdicional] = useState(null);
  const [inscripcionPagoId, setInscripcionPagoId] = useState("");
  const [comunicadoCompletoVisto, setComunicadoCompletoVisto] = useState(false);
  const comunicadoModalRef = useRef(null);

  const {
    actualizar,
    asistenteAbierto,
    bannerEstudiante,
    cargando,
    cargandoProgramas,
    consulta,
    consultarRafael,
    error,
    estudiante,
    form,
    guardando,
    infoProgramaAbierta,
    infoProgramaAceptada,
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
    solicitarInscripcionPadres,
    guardarDatos,
    reservarCupoCaja,
  } = usePadres(user);

  const programaActual = programaAdicional || programa;
  const inscripcionPago = inscripcionPagoId
    ? inscripciones.find((item) => item.id === inscripcionPagoId) || null
    : programaAdicional
      ? inscripciones.find((item) => item.programaId === programaAdicional.id) || null
      : inscripcion;
  const programaActualKey = programaActual
    ? `${programaActual.programaId || programaActual.id || ""}:${programaActual.programa || programaActual.nombre || ""}`
    : "";

  const comunicadoPadres = prepararComunicadoPadres(programaActual, estudiante);
  const invitacionPendiente = Boolean(invitacion && !inscripcion);
  const requiereCaja = Boolean(!inscripcionPago && programaActual?.ventanaInscripcion?.requiereCaja);
  const tieneCursosDisponibles = programasDisponibles.length > 0;
  const programaConAnuncio = programaActual?.anuncioImagen
    ? programaActual
    : programasDisponibles.find((item) => item.anuncioImagen);
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
  const pagosOrdenados = [...pagos].sort((a, b) =>
    new Date(b.fecha || b.createdAt || b.fechaPago || 0) - new Date(a.fecha || a.createdAt || a.fechaPago || 0)
  );
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
    if (cargando || guardando || pasoActivo !== 3 || inscripcionPago) return;

    setMantenerPasoPago(false);
    setPasoObjetivo(null);
    setProgramaAdicional(null);
    setInscripcionPagoId("");
    guardarPasoPago(user?.dni, null);
    setPasoActivo(0);
  }, [cargando, guardando, inscripcionPago, pasoActivo, user?.dni]);

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

  function cambiarPaso(paso) {
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

  function volverDesdeStepper(paso) {
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

  function manejarInscribirCursoAdicional(prog) {
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

  async function guardarDatosYEntrarAPago(event) {
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
    if (invitacionPendiente || programaAdicional) {
      const progId = programaAdicional?.id;
      const registrado = await solicitarInscripcionPadres(progId, horarioSeleccionado, { tallaPolo, tallaShort, tallaUniforme });
      if (!registrado) {
        setMantenerPasoPago(false);
        setPasoObjetivo(null);
        guardarPasoPago(user?.dni, null);
        return false;
      }
      if (programaAdicional && registrado?.id) {
        setInscripcionPagoId(registrado.id);
      }
    }

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
    if ((invitacionPendiente || programaAdicional) && !inscripcionPago) {
      const progId = programaAdicional?.id;
      const registrado = await solicitarInscripcionPadres(progId, horarioSeleccionado, { tallaPolo, tallaShort, tallaUniforme });
      if (registrado?.id) {
        setInscripcionPagoId(registrado.id);
      }
      return;
    }
    await enviarPagoVerificacionPadres(datosPago, inscripcionPago?.id);
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

  function marcarComunicadoVistoSiCorresponde(event) {
    const modal = event.currentTarget;
    const llegoAlFinal = modal.scrollTop + modal.clientHeight >= modal.scrollHeight - 24;
    if (llegoAlFinal) {
      setComunicadoCompletoVisto(true);
    }
  }

  function actualizarAceptacionComunicado(event) {
    const marcado = event.target.checked;
    if (marcado && !comunicadoCompletoVisto && !infoProgramaAceptada) return;
    setInfoProgramaAceptada(marcado);
  }

  function continuarDesdeComunicado() {
    if (!infoProgramaAceptada) return;
    setInfoProgramaAbierta(false);
    cambiarPaso(2);
  }

  function renderPaso() {
    if (pasoActivo === 1) {
      return (
        <ComunicadoStep
          comunicadoPadres={comunicadoPadres}
          infoProgramaAceptada={infoProgramaAceptada}
          programa={programaActual}
          setInfoProgramaAbierta={setInfoProgramaAbierta}
          setPasoActivo={cambiarPaso}
          horarioSeleccionado={horarioSeleccionado}
          setHorarioSeleccionado={setHorarioSeleccionado}
          tallaPolo={tallaPolo}
          setTallaPolo={setTallaPolo}
          tallaShort={tallaShort}
          setTallaShort={setTallaShort}
          tallaUniforme={tallaUniforme}
          setTallaUniforme={setTallaUniforme}
        />
      );
    }

    if (pasoActivo === 2) {
      return (
        <DatosApoderadoStep
          actualizar={actualizar}
          form={form}
          guardando={guardando}
          guardarDatos={guardarDatosYEntrarAPago}
          pasoDespuesDeGuardar={programaActual ? 3 : 0}
          setPasoActivo={cambiarPaso}
        />
      );
    }

    if (pasoActivo === 3) {
      return (
        <PagoStep
          datosConfirmados={datosConfirmados}
          guardando={guardando}
          infoProgramaAceptada={infoProgramaAceptada}
          inscripcion={inscripcionPago}
          invitacionPendiente={invitacionPendiente}
          manejarAccionPago={manejarAccionPago}
          pagoConfirmado={pagoConfirmado}
          programa={programaActual}
          requiereCaja={requiereCaja}
          setPasoActivo={cambiarPaso}
          onFinalizarPago={manejarFinalizarPago}
          onReservarCupoCaja={manejarReservaCaja}
        />
      );
    }

    return (
      <>
        <InicioStep
          cargandoProgramas={cargandoProgramas}
          datosConfirmados={datosConfirmados}
          guardando={guardando}
          inscripcion={inscripcion}
          invitacionPendiente={invitacionPendiente}
          mostrarCatalogoProgramas={mostrarCatalogoProgramas}
          programa={programa}
          programaSeleccionadoId={programaSeleccionadoId}
          programasDisponibles={programasDisponibles}
          setPasoActivo={cambiarPaso}
          solicitarInscripcionPadres={solicitarInscripcionPadres}
          onInscribirCursoAdicional={manejarInscribirCursoAdicional}
          onInscribirProgramaPrincipal={manejarInscribirProgramaPrincipal}
        />
      </>
    );
  }

  return (
    <div className="padres-layout padres-portal-flow">
      <main className="padres-main padres-flow-main">
        <header className="padres-header padres-flow-header">
          <div className="padres-brand">
            <img className="padres-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
            <div>
              <strong>Colegio San Rafael</strong>
              <p>Portal de padres</p>
            </div>
          </div>
          <div className="padres-header-actions">
            <div className="padres-family-chip">
              <span>Familia de</span>
              <strong>{nombreCorto}</strong>
            </div>
            <div className="padres-user-menu">
              <button
                className="padres-family-avatar"
                type="button"
                aria-expanded={menuUsuarioAbierto}
                aria-label="Abrir menu de usuario"
                onClick={() => setMenuUsuarioAbierto((abierto) => !abierto)}
              >
                {iniciales}
              </button>
              {menuUsuarioAbierto ? (
                <div className="padres-user-dropdown">
                  <button
                    className="padres-menu-action"
                    type="button"
                    onClick={() => {
                      setHistorialPagosAbierto(true);
                      setMenuUsuarioAbierto(false);
                    }}
                  >
                    <Receipt size={16} />
                    <span>Historial de pagos</span>
                  </button>
                  <button className="padres-logout-top" type="button" onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Cerrar sesion</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {cargando ? (
          <section className="padres-loading padres-flow-loading">
            <Loader2 className="padres-spin" size={30} />
            <p>Cargando información del estudiante...</p>
          </section>
        ) : error ? (
          <Alert className="padres-alert" color="green" radius="md" icon={<AlertCircle size={18} />}>
            {error}
          </Alert>
        ) : (
          <section className="padres-flow-shell">
            <StudentHeader
              estudiante={estudiante}
              nombreCorto={nombreCorto}
              bannerEstudiante={bannerEstudiante}
            />

            <StepperProceso
              onSelect={volverDesdeStepper}
              pasoActivo={pasoActivo}
              pasoMaximo={pasoMaximo}
            />

            <section className="padres-flow-content" aria-live="polite">
              {renderPaso()}
            </section>
          </section>
        )}
      </main>

      {infoProgramaAbierta && programaActual ? (
        <div className="padres-modal-backdrop" role="presentation">
          <section
            className="padres-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="padres-info-title"
          >
            <header className="padres-info-modal-head">
              <div>
                <span>Comunicado para el apoderado</span>
                <h2 id="padres-info-title">{programaActual.programa || programaActual.nombre}</h2>
                <p>Revise los puntos importantes del programa antes de confirmar la inscripción.</p>
              </div>
              <button type="button" onClick={() => setInfoProgramaAbierta(false)} aria-label="Cerrar información">
                <X size={18} />
              </button>
            </header>

            <div className="padres-info-modal-body" ref={comunicadoModalRef} onScroll={marcarComunicadoVistoSiCorresponde}>
              <div className="padres-info-guide">
                <BookOpen size={19} />
                <div>
                  <strong>Lea el comunicado completo</strong>
                  <p>Encontrará costos, beneficios, materiales y datos útiles organizados por tema.</p>
                </div>
              </div>

              <div className="padres-comunicado-box">
                <div className="padres-comunicado-letter">
                  <span>Mensaje del colegio</span>
                {comunicadoPadres.fecha ? <p>{comunicadoPadres.fecha}</p> : null}
                {(() => {
                  const segmentos = [];
                  let grupoActual = null;

                  comunicadoPadres.parrafos.forEach((parrafo) => {
                    const match = parrafo.match(/^([^:]+):\s*(.*)$/);
                    const esKeyValue = match && match[1].length < 35;
                    
                    if (esKeyValue) {
                      if (!grupoActual) {
                        grupoActual = { type: "grid", items: [] };
                        segmentos.push(grupoActual);
                      }
                      grupoActual.items.push({
                        label: match[1].trim(),
                        value: match[2].trim(),
                      });
                    } else {
                      grupoActual = null;
                      segmentos.push({ type: "text", content: parrafo });
                    }
                  });

                  return segmentos.map((segmento, idx) => {
                    if (segmento.type === "grid") {
                      return (
                        <div key={`grid-${idx}`} className="padres-comunicado-details-grid">
                          {segmento.items.map((item, itemIdx) => {
                            const tipo = obtenerTipoCampo(item.label);
                            const Icono = obtenerIconoPorTipo(tipo);
                            const clase = obtenerClasePorTipo(tipo);
                            return (
                              <div key={itemIdx} className={`padres-comunicado-detail-item ${clase}`}>
                                <div className="padres-comunicado-detail-icon">
                                  <Icono size={16} />
                                </div>
                                <div className="padres-comunicado-detail-info">
                                  <span className="padres-comunicado-detail-label">{item.label}</span>
                                  <span className="padres-comunicado-detail-value">{item.value}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <p key={`text-${idx}`} style={{ margin: "12px 0", fontSize: "14.5px", lineHeight: "1.6", color: "#1e293b" }}>
                        {segmento.content}
                      </p>
                    );
                  });
                })()}
                </div>

                <div className="padres-comunicado-section is-family">
                  <div className="padres-comunicado-section-title">
                    <span className="padres-comunicado-section-icon"><ClipboardCheck size={17} /></span>
                    <div>
                      <strong>Indicaciones para la familia</strong>
                      <span>Lo necesario antes de confirmar.</span>
                    </div>
                  </div>
                  <ul className="padres-info-list">
                    {(comunicadoPadres.indicaciones || []).map((indicacion) => (
                      <li key={indicacion}>{indicacion}</li>
                    ))}
                  </ul>
                </div>

                {(comunicadoPadres.detalleFormato || []).map((seccion) => {
                  const { Icono, clase, ayuda } = obtenerMetaSeccionComunicado(seccion.titulo);
                  return (
                    <div className={`padres-comunicado-section ${clase}`} key={seccion.titulo}>
                      <div className="padres-comunicado-section-title">
                        <span className="padres-comunicado-section-icon"><Icono size={17} /></span>
                        <div>
                          <strong>{seccion.titulo}</strong>
                          <span>{ayuda}</span>
                        </div>
                      </div>
                      <ul className="padres-info-list">
                        {seccion.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

                {!comunicadoPadres.ocultarAlmuerzo && !comunicadoPadres.tieneAlmuerzoFormato ? (
                  <div className="padres-comunicado-section padres-lunch-section is-lunch">
                    <div className="padres-comunicado-section-title">
                      <span className="padres-comunicado-section-icon"><Utensils size={17} /></span>
                      <div>
                        <strong>Almuerzo</strong>
                        <span>Recepción y concesionarios autorizados.</span>
                      </div>
                    </div>
                    <p>
                      El colegio cuenta con un área para recibir almuerzos. Deben dejarse de 01:20 a 01:45 p.m.
                      La lonchera debe tener una etiqueta grande con nombre del alumno, grado y sección.
                    </p>
                    <div className="padres-lunch-vendors">
                      <div>
                        <span>Cafetín Los Amigos del recreo</span>
                        <strong>Sra. Rocío</strong>
                        <p>976280197</p>
                      </div>
                      <div>
                        <span>Cafetín Edith</span>
                        <strong>Sra. Deysli</strong>
                        <p>960897529</p>
                      </div>
                    </div>
                    <p>
                      Estos concesionarios están autorizados por la institución y cumplen con los protocolos correspondientes
                      según las disposiciones del MINSA.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="padres-info-modal-footer">
              <label className="padres-info-accept">
                <input
                  type="checkbox"
                  checked={infoProgramaAceptada}
                  disabled={!comunicadoCompletoVisto && !infoProgramaAceptada}
                  onChange={actualizarAceptacionComunicado}
                />
                <span>
                  {invitacionPendiente
                    ? "He leído y acepto la información del programa antes de registrar la inscripción."
                    : "He leído y acepto la información del programa antes de continuar con la matricula."}
                </span>
              </label>
              {!comunicadoCompletoVisto && !infoProgramaAceptada ? (
                <p className="padres-info-read-hint">
                  Deslice el contenido hasta el final para habilitar la aceptación.
                </p>
              ) : null}

              <footer className="padres-info-modal-actions">
                <button className="padres-orange-button" type="button" onClick={continuarDesdeComunicado} disabled={!infoProgramaAceptada || guardando}>
                  {guardando ? <Loader2 className="padres-spin" size={15} /> : <CheckCircle2 size={15} />}
                  {invitacionPendiente || programaAdicional ? "Continuar con la inscripción" : "Continuar con la matricula"}
                </button>
              </footer>
            </div>
          </section>
        </div>
      ) : null}

      {historialPagosAbierto ? (
        <HistorialPagosModal
          estudiante={estudiante}
          nombreCorto={nombreCorto}
          pagoDetalle={pagoDetalle}
          pagosOrdenados={pagosOrdenados}
          setHistorialPagosAbierto={setHistorialPagosAbierto}
          setPagoDetalle={setPagoDetalle}
        />
      ) : null}

      <AsistentePadres
        abierto={asistenteAbierto}
        setAbierto={setAsistenteAbierto}
        mensajes={mensajes}
        consulta={consulta}
        setConsulta={setConsulta}
        preguntar={(texto) => preguntar(texto, contextoAsistente)}
      />
    </div>
  );
}
