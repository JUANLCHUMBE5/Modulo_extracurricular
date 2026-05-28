import { Alert } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconCreditCard as CreditCard,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconX as X,
} from "@tabler/icons-react";
import AsistentePadres from "../components/AsistentePadres";
import ComunicadoStep from "../components/ComunicadoStep";
import DatosApoderadoStep from "../components/DatosApoderadoStep";
import InicioStep from "../components/InicioStep";
import PagoStep from "../components/PagoStep";
import StepperProceso from "../components/StepperProceso";
import StudentHeader from "../components/StudentHeader";
import usePadres from "../hooks/usePadres";
import { prepararComunicadoPadres } from "../utils/padresTextUtils";
import "../Padres.css";

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

export default function Padres({ user, onLogout }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [anuncioCerrado, setAnuncioCerrado] = useState(false);
  const {
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
    apoderadoBloqueado,
    infoProgramaAbierta,
    infoProgramaAceptada,
    iniciales,
    inscripcion,
    invitacion,
    mensajes,
    mostrarCatalogoProgramas,
    nombreCorto,
    preguntar,
    pagarSimuladoPadres,
    pagoConfirmado,
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
  } = usePadres(user);

  const comunicadoPadres = prepararComunicadoPadres(programa, estudiante);
  const invitacionPendiente = Boolean(invitacion && !inscripcion);
  const debeRevisarAntesDePagar = Boolean(inscripcion && !infoProgramaAceptada);
  const requiereCaja = Boolean(!inscripcion && programa?.ventanaInscripcion?.requiereCaja);
  const tieneCursosDisponibles = programasDisponibles.length > 0;
  const programaConAnuncio = programa?.anuncioImagen
    ? programa
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
    form.apoderado.trim() &&
    /^\d{9}$/.test(form.telefono.trim()) &&
    form.acepta
  );
  const pasoVisible = debeRevisarAntesDePagar
    ? {
        titulo: "Informacion pendiente",
        detalle: "Revise y acepte el comunicado del programa para continuar con el proceso.",
      }
    : siguientePaso;
  const pasoMaximo = useMemo(() => {
    if (!programa) return tieneCursosDisponibles ? 2 : 0;
    if (!infoProgramaAceptada) return 1;
    if (!datosConfirmados) return 2;
    return 3;
  }, [datosConfirmados, infoProgramaAceptada, programa, tieneCursosDisponibles]);

  useEffect(() => {
    if (pasoActivo > pasoMaximo) setPasoActivo(pasoMaximo);
  }, [pasoActivo, pasoMaximo]);

  useEffect(() => {
    setAnuncioCerrado(false);
  }, [anuncioPadres?.id]);

  async function manejarAccionPago() {
    if (!programa) {
      consultarRafael("Que programa tiene disponible mi hijo");
      return;
    }
    if (!infoProgramaAceptada) {
      setPasoActivo(1);
      return;
    }
    if (!datosConfirmados) {
      setPasoActivo(2);
      return;
    }
    if (requiereCaja) {
      consultarRafael("Que debo hacer ahora");
      return;
    }
    if (invitacionPendiente) {
      await solicitarInscripcionPadres();
      return;
    }
    await pagarSimuladoPadres();
  }

  function renderPaso() {
    if (pasoActivo === 1) {
      return (
        <ComunicadoStep
          comunicadoPadres={comunicadoPadres}
          infoProgramaAceptada={infoProgramaAceptada}
          programa={programa}
          setInfoProgramaAbierta={setInfoProgramaAbierta}
          setInfoProgramaAceptada={setInfoProgramaAceptada}
          setPasoActivo={setPasoActivo}
        />
      );
    }

    if (pasoActivo === 2) {
      return (
        <DatosApoderadoStep
          actualizar={actualizar}
          apoderadoBloqueado={apoderadoBloqueado}
          form={form}
          guardando={guardando}
          guardarDatos={guardarDatos}
          pasoDespuesDeGuardar={programa ? 3 : 0}
          setPasoActivo={setPasoActivo}
        />
      );
    }

    if (pasoActivo === 3) {
      return (
        <PagoStep
          datosConfirmados={datosConfirmados}
          guardando={guardando}
          infoProgramaAceptada={infoProgramaAceptada}
          inscripcion={inscripcion}
          invitacionPendiente={invitacionPendiente}
          manejarAccionPago={manejarAccionPago}
          pagarSimuladoPadres={pagarSimuladoPadres}
          pagoConfirmado={pagoConfirmado}
          pasoVisible={pasoVisible}
          programa={programa}
          requiereCaja={requiereCaja}
          setPasoActivo={setPasoActivo}
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
          setInfoProgramaAbierta={setInfoProgramaAbierta}
          setPasoActivo={setPasoActivo}
          solicitarInscripcionPadres={solicitarInscripcionPadres}
        />

        <div className="padres-flow-bottom-actions">
          <button
            className="padres-flow-primary-button"
            type="button"
            disabled={!programa && !tieneCursosDisponibles}
            onClick={() => setPasoActivo(programa ? 1 : 2)}
          >
            {programa ? "Iniciar proceso" : "Completar datos"}
          </button>
          <button className="padres-flow-secondary-button" type="button" onClick={() => consultarRafael("Que debo hacer ahora")}>
            Consultar ayuda
          </button>
        </div>
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
            <p>Cargando informaciÃ³n del estudiante...</p>
          </section>
        ) : error ? (
          <Alert className="padres-alert" color="orange" radius="md" icon={<AlertCircle size={18} />}>
            {error}
          </Alert>
        ) : (
          <section className="padres-flow-shell">
            <StudentHeader
              estudiante={estudiante}
              nombreCorto={nombreCorto}
              bannerEstudiante={bannerEstudiante}
            />

            {anuncioPadres && !anuncioCerrado ? (
              <section className="padres-program-announcement" aria-label={`Anuncio de ${anuncioPadres.programa}`}>
                <img src={anuncioPadres.imagen} alt={anuncioPadres.nombre} />
                <button type="button" onClick={() => setAnuncioCerrado(true)} aria-label="Cerrar anuncio">
                  <X size={18} />
                </button>
              </section>
            ) : null}

            <StepperProceso pasoActivo={pasoActivo} pasoMaximo={pasoMaximo} onSelect={setPasoActivo} />

            <section className="padres-flow-content" aria-live="polite">
              {renderPaso()}
            </section>
          </section>
        )}
      </main>

      {infoProgramaAbierta && programa ? (
        <div className="padres-modal-backdrop" role="presentation">
          <section className="padres-info-modal" role="dialog" aria-modal="true" aria-labelledby="padres-info-title">
            <header className="padres-info-modal-head">
              <div>
                <span>Comunicado para el apoderado</span>
                <h2 id="padres-info-title">{programa.programa}</h2>
              </div>
              <button type="button" onClick={() => setInfoProgramaAbierta(false)} aria-label="Cerrar informaciÃ³n">
                <X size={18} />
              </button>
            </header>

            <div className="padres-comunicado-box">
              <div className="padres-comunicado-letter">
                <span>Comunicado</span>
                {comunicadoPadres.fecha ? <p>{comunicadoPadres.fecha}</p> : null}
                {comunicadoPadres.parrafos.map((parrafo, index) => (
                  <p key={`${index}-${parrafo}`}>{parrafo}</p>
                ))}
              </div>

              <div className="padres-comunicado-section">
                <div className="padres-comunicado-section-title">
                  <strong>Indicaciones para la familia</strong>
                  <span>Lo necesario antes de confirmar.</span>
                </div>
                <ul className="padres-info-list">
                  <li>El estudiante debe asistir de forma continua y puntual al horario indicado.</li>
                  <li>Debe mantener el orden y la disciplina durante el programa.</li>
                  <li>Debe llevar los materiales solicitados por el docente.</li>
                  <li>Si lleva almuerzo, la lonchera debe estar rotulada con nombre, grado y seccion.</li>
                </ul>
              </div>

              <div className="padres-comunicado-section padres-lunch-section">
                <div className="padres-comunicado-section-title">
                  <strong>Almuerzo</strong>
                  <span>Recepcion y concesionarios autorizados.</span>
                </div>
                <p>
                  El colegio cuenta con un area para recibir almuerzos. Deben dejarse de 01:20 a 01:45 p.m.
                  La lonchera debe tener una etiqueta grande con nombre del alumno, grado y seccion.
                </p>
                <div className="padres-lunch-vendors">
                  <div>
                    <span>Cafetin Los Amigos del recreo</span>
                    <strong>Sra. Rocio</strong>
                    <p>976280197</p>
                  </div>
                  <div>
                    <span>Cafetin Edith</span>
                    <strong>Sra. Deysli</strong>
                    <p>960897529</p>
                  </div>
                </div>
                <p>
                  Estos concesionarios estan autorizados por la institucion y cumplen con los protocolos correspondientes
                  segun las disposiciones del MINSA.
                </p>
              </div>
            </div>

            <label className="padres-info-accept">
              <input
                type="checkbox"
                checked={infoProgramaAceptada}
                onChange={(event) => setInfoProgramaAceptada(event.target.checked)}
              />
              <span>
                {invitacionPendiente
                  ? "He leÃ­do y acepto la informaciÃ³n del programa antes de registrar la inscripciÃ³n."
                  : "He leÃ­do y acepto la informaciÃ³n del programa antes de continuar con el pago."}
              </span>
            </label>

            <footer className="padres-info-modal-actions">
              <button className="padres-outline-button" type="button" onClick={() => setInfoProgramaAbierta(false)}>
                Revisar luego
              </button>
              <button className="padres-orange-button" type="button" onClick={continuarPago} disabled={!infoProgramaAceptada || guardando}>
                {guardando ? <Loader2 className="padres-spin" size={15} /> : invitacionPendiente ? <CheckCircle2 size={15} /> : <CreditCard size={15} />}
                {invitacionPendiente ? "Registrar inscripcion" : "Continuar al pago"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <AsistentePadres
        abierto={asistenteAbierto}
        setAbierto={setAsistenteAbierto}
        mensajes={mensajes}
        consulta={consulta}
        setConsulta={setConsulta}
        preguntar={preguntar}
      />
    </div>
  );
}
