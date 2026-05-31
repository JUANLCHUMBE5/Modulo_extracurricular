import { Alert } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconEye as Eye,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconReceipt as Receipt,
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
const PASO_PAGO_STORAGE_PREFIX = "padres:pasoPago:";

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

function normalizarEstadoPagoPadres(pago = {}) {
  const texto = String(pago.estado || pago.estadoPago || pago.estadoVerificacion || "").toLowerCase();
  if (texto.includes("verif") || texto.includes("pend")) return { texto: "Pendiente", clase: "is-pending" };
  if (texto.includes("pag") || texto.includes("valid") || texto.includes("complet")) return { texto: "Pagado", clase: "is-paid" };
  if (texto.includes("anul") || texto.includes("rech")) return { texto: "Rechazado", clase: "is-rejected" };
  return { texto: "Pendiente", clase: "is-pending" };
}

function formatearMontoPadres(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function formatearPenPadres(valor) {
  return `PEN ${Number(valor || 0).toFixed(2)}`;
}

function formatearFechaPagoPadres(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

function obtenerImportesPagoPadres(pago = {}) {
  const monto = Number(pago.monto || 0);
  const estado = normalizarEstadoPagoPadres(pago);
  const pagado = estado.clase === "is-paid" ? monto : 0;
  return {
    subtotal: monto,
    pagado,
    restante: Math.max(0, monto - pagado),
  };
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
  } = usePadres(user);

  const programaActual = programaAdicional || programa;
  const programaActualKey = programaActual
    ? `${programaActual.programaId || programaActual.id || ""}:${programaActual.programa || programaActual.nombre || ""}`
    : "";

  const comunicadoPadres = prepararComunicadoPadres(programaActual, estudiante);
  const invitacionPendiente = Boolean(invitacion && !inscripcion);
  const requiereCaja = Boolean(!inscripcion && programaActual?.ventanaInscripcion?.requiereCaja);
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
    form.apoderado.trim() &&
    /^\d{9}$/.test(form.telefono.trim()) &&
    form.acepta
  );
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
    setHorarioSeleccionado("");
    setTallaPolo("");
    setTallaShort("");
    setTallaUniforme("");
    setInfoProgramaAceptada(false);
    cambiarPaso(1);
  }

  function manejarInscribirCursoAdicional(prog) {
    setProgramaAdicional(prog);
    setHorarioSeleccionado("");
    setTallaPolo("");
    setTallaShort("");
    setTallaUniforme("");
    setInfoProgramaAceptada(String(prog.categoria || "").toLowerCase() === "deportivo");
    cambiarPaso(1);
  }

  async function guardarDatosYEntrarAPago(event) {
    event?.preventDefault?.();
    setMantenerPasoPago(true);
    setPasoObjetivo(3);
    guardarPasoPago(user?.dni, 3);

    const guardado = await guardarDatos();
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
      if (programaAdicional) {
        setProgramaAdicional(null);
      }
    }

    cambiarPaso(3);
    return { pasoDestino: 3 };
  }

  async function manejarAccionPago(datosPago = null) {
    if (!programaActual) {
      consultarRafael("Que programa tiene disponible mi hijo");
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
      consultarRafael("Que debo hacer ahora");
      return;
    }
    if (invitacionPendiente || programaAdicional) {
      const progId = programaAdicional?.id;
      const registrado = await solicitarInscripcionPadres(progId, horarioSeleccionado, { tallaPolo, tallaShort, tallaUniforme });
      if (registrado && programaAdicional) {
        setProgramaAdicional(null);
      }
      return;
    }
    await enviarPagoVerificacionPadres(datosPago);
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
          apoderadoBloqueado={apoderadoBloqueado}
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
          inscripcion={inscripcion}
          invitacionPendiente={invitacionPendiente}
          manejarAccionPago={manejarAccionPago}
          pagoConfirmado={pagoConfirmado}
          programa={programaActual}
          requiereCaja={requiereCaja}
          setPasoActivo={cambiarPaso}
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
            ref={comunicadoModalRef}
            onScroll={marcarComunicadoVistoSiCorresponde}
          >
            <header className="padres-info-modal-head">
              <div>
                <span>Comunicado para el apoderado</span>
                <h2 id="padres-info-title">{programaActual.programa || programaActual.nombre}</h2>
              </div>
              <button type="button" onClick={() => setInfoProgramaAbierta(false)} aria-label="Cerrar información">
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
                  {(comunicadoPadres.indicaciones || []).map((indicacion) => (
                    <li key={indicacion}>{indicacion}</li>
                  ))}
                </ul>
              </div>

              {(comunicadoPadres.detalleFormato || []).map((seccion) => (
                <div className="padres-comunicado-section" key={seccion.titulo}>
                  <div className="padres-comunicado-section-title">
                    <strong>{seccion.titulo}</strong>
                    <span>Información tomada del formato asignado.</span>
                  </div>
                  <ul className="padres-info-list">
                    {seccion.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}

              {!comunicadoPadres.ocultarAlmuerzo && !comunicadoPadres.tieneAlmuerzoFormato ? (
                <div className="padres-comunicado-section padres-lunch-section">
                  <div className="padres-comunicado-section-title">
                    <strong>Almuerzo</strong>
                    <span>Recepción y concesionarios autorizados.</span>
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
                Desplace el comunicado hasta el final para habilitar la aceptacion.
              </p>
            ) : null}

            <footer className="padres-info-modal-actions">
              <button className="padres-orange-button" type="button" onClick={continuarDesdeComunicado} disabled={!infoProgramaAceptada || guardando}>
                {guardando ? <Loader2 className="padres-spin" size={15} /> : <CheckCircle2 size={15} />}
                {invitacionPendiente || programaAdicional ? "Continuar con la inscripcion" : "Continuar con la matricula"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {historialPagosAbierto ? (
        <div className="padres-modal-backdrop" role="presentation">
          <section className="padres-history-modal" role="dialog" aria-modal="true" aria-labelledby="padres-history-title">
            {pagoDetalle ? (
              <section className="padres-invoice-detail" aria-label="Detalle de la factura">
                <button className="padres-invoice-close" type="button" onClick={() => setPagoDetalle(null)}>
                  <X size={15} />
                  Cerrar detalles de la factura
                </button>
                {(() => {
                  const fecha = formatearFechaPagoPadres(pagoDetalle.fechaPago || pagoDetalle.fecha || pagoDetalle.createdAt);
                  const estado = normalizarEstadoPagoPadres(pagoDetalle);
                  const importes = obtenerImportesPagoPadres(pagoDetalle);
                  const pagado = estado.clase === "is-paid";
                  const programaPago = pagoDetalle.programa || pagoDetalle.programaNombre || "Programa extracurricular";

                  return (
                    <>
                      <h2>{pagado ? `Se pago el ${fecha}` : `Pago enviado el ${fecha}`}</h2>

                      <section className="padres-invoice-section">
                        <h3>Resumen</h3>
                        <dl className="padres-invoice-summary">
                          <div>
                            <dt>Para</dt>
                            <dd>{estudiante?.nombres || nombreCorto}</dd>
                          </div>
                          <div>
                            <dt>De</dt>
                            <dd>Colegio San Rafael</dd>
                          </div>
                          <div>
                            <dt>Factura</dt>
                            <dd>{pagoDetalle.id || "Sin codigo"}</dd>
                          </div>
                          <div>
                            <dt>Operacion</dt>
                            <dd>{pagoDetalle.numeroOperacion || pagoDetalle.referenciaPago || "Sin numero"}</dd>
                          </div>
                        </dl>
                      </section>

                      <section className="padres-invoice-section">
                        <h3>Items</h3>
                        <div className="padres-invoice-item">
                          <span>{fecha.toUpperCase()}</span>
                          <strong>{programaPago}</strong>
                          <small>Cantidad 1</small>
                          <b>{formatearPenPadres(pagoDetalle.monto)}</b>
                        </div>

                        <div className="padres-invoice-line">
                          <strong>Subtotal</strong>
                          <b>{formatearPenPadres(importes.subtotal)}</b>
                        </div>
                        <div className="padres-invoice-line">
                          <strong>Estado</strong>
                          <b>{estado.texto}</b>
                        </div>
                        <div className="padres-invoice-line is-total">
                          <strong>Importe adeudado</strong>
                          <b>{formatearPenPadres(importes.subtotal)}</b>
                        </div>
                        <div className="padres-invoice-line">
                          <strong>Importe pagado</strong>
                          <b>{formatearPenPadres(importes.pagado)}</b>
                        </div>
                        <div className="padres-invoice-line">
                          <strong>Importe restante</strong>
                          <b>{formatearPenPadres(importes.restante)}</b>
                        </div>
                      </section>
                    </>
                  );
                })()}
              </section>
            ) : (
              <>
                <header className="padres-history-head">
                  <div>
                    <span>Perfil del padre</span>
                    <h2 id="padres-history-title">Historial de pagos</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHistorialPagosAbierto(false);
                      setPagoDetalle(null);
                    }}
                    aria-label="Cerrar historial de pagos"
                  >
                    <X size={18} />
                  </button>
                </header>

                {pagosOrdenados.length ? (
                  <div className="padres-history-table" role="table" aria-label="Historial de pagos">
                    {pagosOrdenados.map((pago) => {
                      const estado = normalizarEstadoPagoPadres(pago);
                      const fecha = formatearFechaPagoPadres(pago.fechaPago || pago.fecha || pago.createdAt);
                      return (
                        <div className="padres-history-row" role="row" key={pago.id || `${fecha}-${pago.monto}`}>
                          <span>{fecha}</span>
                          <span>{formatearMontoPadres(pago.monto)}</span>
                          <strong className={`padres-history-status ${estado.clase}`}>{estado.texto}</strong>
                          <button type="button" onClick={() => setPagoDetalle(pago)}>
                            <Eye size={14} />
                            Ver
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="padres-history-empty">
                    <Receipt size={28} />
                    <strong>Sin pagos registrados</strong>
                    <span>Cuando envie o Caja confirme un pago, aparecera aqui.</span>
                  </div>
                )}
              </>
            )}
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
