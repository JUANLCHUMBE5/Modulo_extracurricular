import { useState, useEffect } from "react";
import { Alert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconReceipt as Receipt,
  IconX as X,
  IconBook2 as BookOpen,
  IconClipboardCheck as ClipboardCheck,
  IconCircleCheck as CheckCircle2,
  IconToolsKitchen2 as Utensils,
  IconBell as Megaphone,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
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
import usePortalPadres, {
  obtenerMetaSeccionComunicado,
  obtenerIconoPorTipo,
  obtenerClasePorTipo,
} from "../hooks/usePortalPadres";
import { obtenerTipoCampo, formatearHorarioDetalle } from "../utils/padresTextUtils";
import "../Padres.css";

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

export default function Padres({ user, onLogout }) {
  const padresHook = usePadres(user);

  const {
    actualizar,
    asistenteAbierto,
    bannerEstudiante,
    cargando,
    cargandoProgramas,
    consulta,
    error,
    estudiante,
    form,
    guardando,
    infoProgramaAbierta,
    infoProgramaAceptada,
    comunicadoLeidoEnSesion,
    iniciales,
    inscripcion,
    invitacion,
    mensajes,
    mostrarCatalogoProgramas,
    nombreCorto,
    preguntar,
    pagoConfirmado,
    programasDisponibles,
    programaSeleccionadoId,
    setAsistenteAbierto,
    setConsulta,
    setInfoProgramaAbierta,
    setInfoProgramaAceptada,
    solicitarInscripcionPadres,
    programa,
    programaChatId,
    setProgramaChatId,
    programasAsociados,
  } = padresHook;

  const {
    menuUsuarioAbierto,
    setMenuUsuarioAbierto,
    historialPagosAbierto,
    setHistorialPagosAbierto,
    pagoDetalle,
    setPagoDetalle,
    pasoActivo,
    setPasoActivo,
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
    comunicadoCompletoVisto,
    comunicadoModalRef,
    programaActual,
    programaAdicional,
    inscripcionPago,
    comunicadoPadres,
    invitacionPendiente,
    requiereCaja,
    anuncioPadres,
    datosConfirmados,
    contextoAsistente,
    pagosOrdenados,
    pasoMaximo,
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
  } = usePortalPadres({ user, padresHook });

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!anuncioPadres || !Array.isArray(anuncioPadres) || anuncioPadres.length <= 1 || anuncioCerrado) {
      return;
    }
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % anuncioPadres.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [anuncioPadres, anuncioCerrado]);

  useEffect(() => {
    setSlideIndex(0);
  }, [anuncioPadres]);

  function renderPaso() {
    if (pasoActivo === 1) {
      return (
        <ComunicadoStep
          comunicadoPadres={comunicadoPadres}
          infoProgramaAceptada={infoProgramaAceptada}
          comunicadoLeidoEnSesion={comunicadoLeidoEnSesion}
          programa={programaActual}
          setInfoProgramaAbierta={setInfoProgramaAbierta}
          setPasoActivo={setPasoActivo}
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
          setPasoActivo={setPasoActivo}
        />
      );
    }

    if (pasoActivo === 3) {
      const PagoStepComponent = PagoStep as any;
      return (
        <PagoStepComponent
          datosConfirmados={datosConfirmados}
          guardando={guardando}
          infoProgramaAceptada={infoProgramaAceptada}
          inscripcion={inscripcionPago}
          invitacionPendiente={invitacionPendiente}
          manejarAccionPago={manejarAccionPago}
          pagoConfirmado={pagoConfirmado}
          programa={programaActual}
          requiereCaja={requiereCaja}
          setPasoActivo={setPasoActivo}
          onFinalizarPago={manejarFinalizarPago}
          onReservarCupoCaja={manejarReservaCaja}
        />
      );
    }

    return (
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
        setPasoActivo={setPasoActivo}
        solicitarInscripcionPadres={solicitarInscripcionPadres}
        onInscribirCursoAdicional={manejarInscribirCursoAdicional}
        onInscribirProgramaPrincipal={manejarInscribirProgramaPrincipal}
      />
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
                    const segmentos: any[] = [];
                    let grupoActual: any = null;

                    comunicadoPadres.parrafos.forEach((parrafo: string) => {
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
                        return null;
                      }
                      return (
                        <p key={`text-${idx}`} style={{ margin: "12px 0", fontSize: "14.5px", lineHeight: "1.6", color: "#334155", textAlign: "justify", textJustify: "inter-word", wordBreak: "break-word" }}>
                          {segmento.content}
                        </p>
                      );
                    });
                  })()}
                </div>

                {(comunicadoPadres.indicaciones || []).length ? (
                  <div className="padres-comunicado-section is-family">
                    <div className="padres-comunicado-section-title">
                      <span className="padres-comunicado-section-icon"><ClipboardCheck size={17} /></span>
                      <div>
                        <strong>Indicaciones para la familia</strong>
                        <span>Lo necesario antes de confirmar.</span>
                      </div>
                    </div>
                    <ul className="padres-info-list">
                      {(comunicadoPadres.indicaciones || []).map((indicacion: string) => (
                        <li key={indicacion}>{indicacion}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {(comunicadoPadres.detalleFormato || []).map((seccion: any) => {
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
                        {seccion.items.map((item: string) => (
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

      {Array.isArray(anuncioPadres) && anuncioPadres.length > 0 && !anuncioCerrado && (
        <div className="padres-modal-backdrop" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.6)" }}>
          <section
            className="padres-info-modal"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: "min(95vw, 450px)", width: "fit-content", padding: "16px", borderRadius: "12px", background: "#ffffff", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", position: "relative" }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Megaphone size={20} style={{ color: "#0c8569" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 850, color: "#111827" }}>
                  {anuncioPadres.length > 1 
                    ? `Anuncio Oficial (${slideIndex + 1} de ${anuncioPadres.length})`
                    : "Anuncio Oficial"
                  }
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnuncioCerrado(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </header>

            {/* Slider Content Wrapper */}
            <div style={{ position: "relative", textAlign: "center", padding: "4px 0", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Left Arrow (only if multiple announcements) */}
              {anuncioPadres.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSlideIndex((prev) => (prev === 0 ? anuncioPadres.length - 1 : prev - 1))}
                  style={{
                    position: "absolute",
                    left: "-12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: "#475569",
                    zIndex: 2,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#0c8569"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.color = "#475569"; }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Current Active Announcement Image */}
              <div style={{ width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <img
                  src={anuncioPadres[slideIndex]?.imagen}
                  alt={anuncioPadres[slideIndex]?.nombre || "Anuncio"}
                  style={{ width: "100%", borderRadius: "8px", maxHeight: "65vh", objectFit: "contain", display: "block", transition: "opacity 0.3s ease" }}
                />
              </div>

              {/* Right Arrow (only if multiple announcements) */}
              {anuncioPadres.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSlideIndex((prev) => (prev + 1) % anuncioPadres.length)}
                  style={{
                    position: "absolute",
                    right: "-12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: "#475569",
                    zIndex: 2,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#0c8569"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.color = "#475569"; }}
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Bottom dots for multiple slides */}
            {anuncioPadres.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", margin: "4px 0" }}>
                {anuncioPadres.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideIndex(idx)}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      padding: 0,
                      border: "none",
                      backgroundColor: idx === slideIndex ? "#0c8569" : "#cbd5e1",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    aria-label={`Ir al anuncio ${idx + 1}`}
                  />
                ))}
              </div>
            )}
            
          </section>
        </div>
      )}

      <AsistentePadres
        abierto={asistenteAbierto}
        setAbierto={setAsistenteAbierto}
        mensajes={mensajes}
        consulta={consulta}
        setConsulta={setConsulta}
        preguntar={(texto) => preguntar(texto, contextoAsistente)}
        programasAsociados={programasAsociados}
        programaChatId={programaChatId}
        onSeleccionarProgramaChat={setProgramaChatId as any}
        programa={programa}
      />
    </div>
  );
}
