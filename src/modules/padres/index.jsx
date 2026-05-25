import { Alert } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCheck as Check,
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconCreditCard as CreditCard,
  IconFileText as FileText,
  IconHome as Home,
  IconInfoCircle as Info,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconSchool as School,
  IconUserCircle as UserRound,
  IconX as X,
} from "@tabler/icons-react";
import AsistentePadres from "./components/AsistentePadres";
import Campo from "./components/Campo";
import HorarioProgramaPadres from "./components/HorarioProgramaPadres";
import usePadres, { formatearSoles } from "./hooks/usePadres";
import { formatearRangoFechasPadres, prepararComunicadoPadres } from "./utils/padresTextUtils";
import "./Padres.css";

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

const pasosPortal = [
  {
    titulo: "Inicio",
    detalle: "Programa",
    icon: Home,
  },
  {
    titulo: "Comunicado",
    detalle: "Leer y aceptar",
    icon: FileText,
  },
  {
    titulo: "Datos",
    detalle: "Apoderado",
    icon: UserRound,
  },
  {
    titulo: "Pago",
    detalle: "Caja",
    icon: CreditCard,
  },
];

function cn(...items) {
  return items.filter(Boolean).join(" ");
}

function PortalBadge({ children, tone = "green" }) {
  return <span className={`padres-flow-badge is-${tone}`}>{children}</span>;
}

function InfoTile({ icon: Icon, label, value, children }) {
  return (
    <div className="padres-flow-info-tile">
      {Icon ? (
        <span className="padres-flow-info-icon">
          <Icon size={17} />
        </span>
      ) : null}
      <div>
        <span>{label}</span>
        {children || <strong>{value || "No registrado"}</strong>}
      </div>
    </div>
  );
}

function PortalStepper({ pasoActivo, pasoMaximo, onSelect }) {
  return (
    <nav className="padres-flow-stepper" aria-label="Pasos del portal de padres">
      {pasosPortal.map(({ titulo, detalle, icon: Icon }, index) => {
        const activo = pasoActivo === index;
        const completo = index < pasoActivo && index <= pasoMaximo;
        const bloqueado = index > pasoMaximo;

        return (
          <button
            key={titulo}
            type="button"
            className={cn("padres-flow-step", activo && "is-active", completo && "is-done")}
            disabled={bloqueado}
            onClick={() => onSelect(index)}
          >
            <span className="padres-flow-step-icon">
              {completo ? <Check size={15} /> : <Icon size={17} />}
            </span>
            <span>
              <strong>{titulo}</strong>
              <small>{detalle}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function StudentHero({ estudiante, iniciales, nombreCorto, bannerEstudiante }) {
  return (
    <section className="padres-flow-student-card">
      <div className="padres-flow-student-copy">
        <div className="padres-flow-avatar">{iniciales}</div>
        <div>
          <span>Familia de {nombreCorto}</span>
          <h1>{estudiante?.nombres || nombreCorto}</h1>
          <p>
            {estudiante?.grado || "Grado por registrar"} - Seccion {estudiante?.seccion || "-"}
          </p>
        </div>
      </div>

      {bannerEstudiante ? (
        <div className="padres-flow-student-art-wrap">
          <img className="padres-flow-student-art" src={bannerEstudiante} alt="" aria-hidden="true" />
        </div>
      ) : null}
    </section>
  );
}

function ProgramaPrincipal({ programa, inscripcion, invitacionPendiente, setInfoProgramaAbierta }) {
  if (!programa) {
    return (
      <article className="padres-flow-panel padres-flow-empty-program">
        <AlertCircle size={24} />
        <div>
          <h2>Sin programa asignado</h2>
          <p>Cuando Coordinacion habilite una invitacion o un curso disponible, aparecera en este portal.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="padres-flow-panel padres-flow-program-card">
      <div className="padres-flow-program-head">
        <span className="padres-flow-program-icon">
          <BookOpen size={25} />
        </span>
        <div>
          <PortalBadge tone={inscripcion ? "green" : "orange"}>
            {inscripcion ? "Registrado" : "Programa asignado"}
          </PortalBadge>
          <h2>{programa.programa}</h2>
        </div>
      </div>

      <div className="padres-flow-program-grid">
        <InfoTile icon={UserRound} label="Profesor(a)" value={programa.docente || programa.responsable || "Por definir"} />
        <InfoTile icon={CalendarDays} label="Horario">
          <HorarioProgramaPadres horario={programa.horario || "Por confirmar"} />
        </InfoTile>
        <InfoTile icon={CalendarDays} label="Vigencia" value={formatearRangoFechasPadres(programa.fechaInicio, programa.fechaFin)} />
        <InfoTile icon={School} label="Grupo" value={programa.periodo || "Escolar"} />
      </div>

      <div className="padres-flow-program-note">
        <button className="padres-flow-link-button" type="button" onClick={() => setInfoProgramaAbierta(true)}>
          <Info size={15} />
          {invitacionPendiente ? "Comunicado" : "Más información"}
        </button>
      </div>
    </article>
  );
}

function CatalogoProgramas({
  cargandoProgramas,
  datosConfirmados,
  guardando,
  mostrarCatalogoProgramas,
  programa,
  programaSeleccionadoId,
  programasDisponibles,
  setPasoActivo,
  solicitarInscripcionPadres,
}) {
  if (!mostrarCatalogoProgramas) return null;
  if (!cargandoProgramas && programasDisponibles.length === 0) return null;

  return (
    <article className="padres-flow-panel padres-flow-catalog">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="orange">Invitacion masiva</PortalBadge>
          <h2>{programa ? "Cursos adicionales disponibles" : "Cursos disponibles para solicitar"}</h2>
          <p>
            {programa
              ? "Puede registrar otro curso si aplica al grado del estudiante y no cruza con su horario."
              : "Coordinacion publica aqui los cursos habilitados para el grado del estudiante."}
          </p>
        </div>
      </div>

      {cargandoProgramas ? (
        <div className="padres-flow-inline-loading">
          <Loader2 className="padres-spin" size={22} />
          <span>Cargando cursos disponibles...</span>
        </div>
      ) : programasDisponibles.length > 0 ? (
        <div className="padres-flow-courses">
          {programasDisponibles.map((prog) => {
            const registrando = guardando && programaSeleccionadoId === prog.id;
            return (
              <article className="padres-flow-course-card" key={prog.id}>
                <div className="padres-flow-course-head">
                  <h3>{prog.nombre}</h3>
                  <PortalBadge tone="green">Disponible</PortalBadge>
                </div>

                <div className="padres-flow-course-grid">
                  <InfoTile label="Categoria" value={prog.categoria || "N/A"} />
                  <InfoTile label="Horario">
                    <HorarioProgramaPadres horario={prog.horario} />
                  </InfoTile>
                  <InfoTile label="Cupos" value={`${prog.cuposDisponibles} / ${prog.cupos}`} />
                  <InfoTile label="Monto" value={formatearSoles(prog.costo)} />
                  <InfoTile label="Responsable" value={prog.responsable || "Por definir"} />
                </div>

                <button
                  className="padres-flow-primary-button"
                  type="button"
                  disabled={registrando}
                  onClick={() => {
                    if (!datosConfirmados) {
                      setPasoActivo(2);
                      return;
                    }
                    solicitarInscripcionPadres(prog.id);
                  }}
                >
                  {registrando ? <Loader2 className="padres-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {datosConfirmados ? "Registrarse" : "Completar datos"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function ComunicadoStep({
  comunicadoPadres,
  infoProgramaAceptada,
  programa,
  setInfoProgramaAbierta,
  setInfoProgramaAceptada,
  setPasoActivo,
}) {
  if (!programa) {
    return (
      <article className="padres-flow-panel padres-flow-empty-inline">
        <AlertCircle size={24} />
        <strong>Sin comunicado disponible</strong>
        <p>Primero Coordinacion debe asignar o publicar un programa.</p>
      </article>
    );
  }

  return (
    <article className="padres-flow-panel padres-flow-step-panel">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="orange">Comunicado oficial</PortalBadge>
          <h2>Revise la información del programa</h2>
          <p>La familia debe leer y aceptar el comunicado antes de confirmar datos y pasar al pago.</p>
        </div>
      </div>

      <div className="padres-flow-letter">
        {comunicadoPadres.fecha ? <p>{comunicadoPadres.fecha}</p> : null}
        {comunicadoPadres.parrafos.map((parrafo, index) => (
          <p key={`${index}-${parrafo}`}>{parrafo}</p>
        ))}
      </div>

      <div className="padres-flow-requirements">
        <h3>Indicaciones principales</h3>
        <ul>
          <li>El estudiante debe asistir de forma continua y puntual al horario indicado.</li>
          <li>Debe mantener orden y disciplina durante el programa.</li>
          <li>Debe llevar los materiales solicitados por el docente.</li>
          <li>Si lleva almuerzo, la lonchera debe estar rotulada.</li>
        </ul>
      </div>

      <label className="padres-flow-check">
        <input
          type="checkbox"
          checked={infoProgramaAceptada}
          onChange={(event) => setInfoProgramaAceptada(event.target.checked)}
        />
        <span>He leído y acepto la información del programa.</span>
      </label>

      <div className="padres-flow-actions">
        <button className="padres-flow-secondary-button" type="button" onClick={() => setInfoProgramaAbierta(true)}>
          <FileText size={16} />
          Ver comunicado completo
        </button>
        <button
          className="padres-flow-primary-button"
          type="button"
          disabled={!infoProgramaAceptada}
          onClick={() => setPasoActivo(2)}
        >
          Continuar a datos
        </button>
      </div>
    </article>
  );
}

function DatosStep({
  actualizar,
  apoderadoBloqueado,
  form,
  guardando,
  guardarDatos,
  pasoDespuesDeGuardar = 3,
  setPasoActivo,
}) {
  async function manejarGuardarDatos(event) {
    const guardado = await guardarDatos(event);
    if (guardado) setPasoActivo(pasoDespuesDeGuardar);
  }

  return (
    <form className="padres-flow-panel padres-flow-step-panel" onSubmit={manejarGuardarDatos}>
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="blue">Datos del apoderado</PortalBadge>
          <h2>Confirme sus datos</h2>
          <p>Estos datos se usaran para la ficha, comunicacion y validacion del registro.</p>
        </div>
      </div>

      <div className="padres-flow-form-grid">
        <Campo
          label="Padre o apoderado"
          value={form.apoderado}
          onChange={(value) => actualizar("apoderado", value)}
          placeholder="Nombre completo"
          disabled={apoderadoBloqueado}
        />
        <Campo
          label="Teléfono de contacto"
          value={form.telefono}
          onChange={(value) => actualizar("telefono", value.replace(/\D/g, "").slice(0, 9))}
          placeholder="987654321"
          inputMode="numeric"
        />
        <Campo
          label="Correo para recibir el PDF (opcional)"
          value={form.correo}
          onChange={(value) => actualizar("correo", value)}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <label className="padres-flow-check">
        <input
          type="checkbox"
          checked={form.acepta}
          onChange={(event) => actualizar("acepta", event.target.checked)}
        />
        <span>Confirmo que los datos son correctos.</span>
      </label>

      <label className="padres-flow-check is-muted">
        <input
          type="checkbox"
          checked={Boolean(form.correo.trim()) && form.enviarPdfCorreo}
          disabled={!form.correo.trim()}
          onChange={(event) => actualizar("enviarPdfCorreo", event.target.checked)}
        />
        <span>
          {form.correo.trim()
            ? "Enviar al correo cuando el pago sea confirmado."
            : "Sin correo registrado: podra descargar el PDF despues del pago."}
        </span>
      </label>

      <div className="padres-flow-actions">
        <button className="padres-flow-secondary-button" type="button" onClick={() => setPasoActivo(1)}>
          Volver al comunicado
        </button>
        <button className="padres-flow-primary-button" type="submit" disabled={guardando}>
          {guardando ? <Loader2 className="padres-spin" size={16} /> : <ClipboardCheck size={16} />}
          Guardar y continuar
        </button>
      </div>
    </form>
  );
}

function PagoStep({
  datosConfirmados,
  guardando,
  infoProgramaAceptada,
  inscripcion,
  invitacionPendiente,
  manejarAccionPago,
  pasoVisible,
  programa,
  requiereCaja,
  setPasoActivo,
}) {
  const monto = programa && (inscripcion || infoProgramaAceptada) ? formatearSoles(programa.costo) : "S/ 0.00";
  const pagoListo = Boolean(programa && infoProgramaAceptada && datosConfirmados);
  const textoBoton = !programa
    ? "Consultar disponibilidad"
    : !infoProgramaAceptada
      ? "Revisar comunicado"
      : !datosConfirmados
        ? "Confirmar datos"
        : requiereCaja
          ? "Ver indicaciones de Caja"
          : invitacionPendiente
            ? "Registrar inscripcion"
            : "Ver indicaciones de pago";

  return (
    <article className="padres-flow-panel padres-flow-payment-step">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="orange">Pago y constancia</PortalBadge>
          <h2>{pasoVisible.titulo}</h2>
          <p>{pasoVisible.detalle}</p>
        </div>
      </div>

      <div className="padres-flow-payment-box">
        <span>Monto referencial</span>
        <strong>{monto}</strong>
        <p>
          {pagoListo
            ? "Ya puede continuar con el registro o revisar las indicaciones de Caja."
            : "Complete los pasos anteriores para habilitar esta accion."}
        </p>
      </div>

      <div className="padres-flow-payment-checks">
        <div className={cn("padres-flow-mini-check", infoProgramaAceptada && "is-ok")}>
          <CheckCircle2 size={17} />
          Comunicado aceptado
        </div>
        <div className={cn("padres-flow-mini-check", datosConfirmados && "is-ok")}>
          <CheckCircle2 size={17} />
          Datos confirmados
        </div>
        <div className={cn("padres-flow-mini-check", inscripcion && "is-ok")}>
          <CheckCircle2 size={17} />
          {inscripcion ? "Inscripcion registrada" : "Pendiente de registro"}
        </div>
      </div>

      <div className="padres-flow-actions">
        {!infoProgramaAceptada ? (
          <button className="padres-flow-secondary-button" type="button" onClick={() => setPasoActivo(1)}>
            Revisar comunicado
          </button>
        ) : null}
        {!datosConfirmados ? (
          <button className="padres-flow-secondary-button" type="button" onClick={() => setPasoActivo(2)}>
            Confirmar datos
          </button>
        ) : null}
        <button className="padres-flow-primary-button" type="button" disabled={guardando} onClick={manejarAccionPago}>
          {guardando ? <Loader2 className="padres-spin" size={16} /> : <CreditCard size={16} />}
          {textoBoton}
        </button>
      </div>
    </article>
  );
}

export default function Padres({ user, onLogout }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [pasoActivo, setPasoActivo] = useState(0);
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
    abrirPago();
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
        <DatosStep
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
          pasoVisible={pasoVisible}
          programa={programa}
          requiereCaja={requiereCaja}
          setPasoActivo={setPasoActivo}
        />
      );
    }

    return (
      <>
        <ProgramaPrincipal
          programa={programa}
          inscripcion={inscripcion}
          invitacionPendiente={invitacionPendiente}
          setInfoProgramaAbierta={setInfoProgramaAbierta}
        />

        <CatalogoProgramas
          cargandoProgramas={cargandoProgramas}
          datosConfirmados={datosConfirmados}
          guardando={guardando}
          mostrarCatalogoProgramas={mostrarCatalogoProgramas}
          programa={programa}
          programaSeleccionadoId={programaSeleccionadoId}
          programasDisponibles={programasDisponibles}
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
            <p>Cargando información del estudiante...</p>
          </section>
        ) : error ? (
          <Alert className="padres-alert" color="orange" radius="md" icon={<AlertCircle size={18} />}>
            {error}
          </Alert>
        ) : (
          <section className="padres-flow-shell">
            <StudentHero
              estudiante={estudiante}
              iniciales={iniciales}
              nombreCorto={nombreCorto}
              bannerEstudiante={bannerEstudiante}
            />

            <PortalStepper pasoActivo={pasoActivo} pasoMaximo={pasoMaximo} onSelect={setPasoActivo} />

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
                  ? "He leído y acepto la información del programa antes de registrar la inscripción."
                  : "He leído y acepto la información del programa antes de continuar con el pago."}
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
