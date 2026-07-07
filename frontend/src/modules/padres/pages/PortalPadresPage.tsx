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
