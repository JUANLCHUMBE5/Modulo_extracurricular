import { useEffect, useRef } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconInfoCircle as Info,
  IconLoader2 as Loader2,
  IconSchool as School,
  IconUserCircle as UserRound,
} from "@tabler/icons-react";
import { formatearSoles } from "../hooks/usePadres";
import { dividirHorarioPadres, formatearRangoFechasPadres } from "../utils/padresTextUtils";
import HorarioProgramaPadres from "./HorarioProgramaPadres";
import PortalBadge from "./PortalBadge";

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
            Invitacion
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
        <InfoTile
          icon={CalendarDays}
          label="Duración"
          value={programa.duracionTaller || "Por definir"}
        />
        <InfoTile
          icon={CalendarDays}
          label="Aviso"
          value={programa.ventanaInscripcion?.fechaLimite ? `Hasta ${programa.ventanaInscripcion.fechaLimite}` : "Por definir"}
        />
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

function HorarioCompactoPadres({ horario }) {
  const completo = dividirHorarioPadres(horario);
  const texto = String(horario || "").trim();
  const simple = !completo ? texto.match(/^(.+?)\s+clase\s+(.+?)(?:\s+almuerzo\s+(.+))?$/i) : null;

  const dia = completo?.dia || simple?.[1]?.trim();
  const clase = completo?.clase || simple?.[2]?.trim();
  const almuerzo = completo?.almuerzo || simple?.[3]?.trim();

  if (!dia && !clase) {
    return (
      <div className="padres-flow-course-lines">
        <span><CalendarDays size={14} />{texto || "Horario por confirmar"}</span>
      </div>
    );
  }

  return (
    <div className="padres-flow-course-lines">
      <span><CalendarDays size={14} />{[dia, clase].filter(Boolean).join(" ")}</span>
      {almuerzo ? <span><CalendarDays size={14} />Almuerzo {almuerzo}</span> : null}
    </div>
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
  const carruselRef = useRef(null);
  const carruselActivo = programasDisponibles.length > 3;

  const obtenerPasoCarrusel = () => {
    const carrusel = carruselRef.current;
    const tarjeta = carrusel?.querySelector(".padres-flow-course-card");
    if (!carrusel || !tarjeta) return 0;

    const estilos = window.getComputedStyle(carrusel);
    const espacio = parseFloat(estilos.columnGap || estilos.gap || "0") || 0;
    return tarjeta.getBoundingClientRect().width + espacio;
  };

  useEffect(() => {
    if (!carruselActivo || cargandoProgramas) return undefined;

    const intervalo = window.setInterval(() => {
      const carrusel = carruselRef.current;
      if (!carrusel) return;

      const paso = obtenerPasoCarrusel();
      if (!paso) return;

      const llegoAlFinal = carrusel.scrollLeft + carrusel.clientWidth >= carrusel.scrollWidth - 12;
      if (llegoAlFinal) {
        carrusel.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      carrusel.scrollBy({ left: paso, behavior: "smooth" });
    }, 5500);

    return () => window.clearInterval(intervalo);
  }, [cargandoProgramas, carruselActivo, programasDisponibles.length]);

  const moverCarrusel = (direccion) => {
    const carrusel = carruselRef.current;
    if (!carrusel) return;
    const paso = obtenerPasoCarrusel();
    carrusel.scrollBy({ left: direccion * (paso || carrusel.clientWidth), behavior: "smooth" });
  };

  if (!mostrarCatalogoProgramas) return null;
  if (!cargandoProgramas && programasDisponibles.length === 0) return null;

  return (
    <article className="padres-flow-panel padres-flow-catalog">
      <div className="padres-flow-section-title">
        <div>
          <h2 className="padres-flow-catalog-title">
            <span aria-hidden="true">✦</span>
            {programa ? "Cursos adicionales disponibles" : "Cursos disponibles para solicitar"}
          </h2>
          <p>
            {programa
              ? "Puede inscribir a su hijo si aplica a su grado y no cruza el horario."
              : "Coordinacion publica aqui los cursos habilitados para el grado del estudiante."}
          </p>
        </div>
        {carruselActivo && !cargandoProgramas ? (
          <div className="padres-flow-carousel-actions" aria-label="Cambiar cursos disponibles">
            <button type="button" aria-label="Ver cursos anteriores" onClick={() => moverCarrusel(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Ver cursos siguientes" onClick={() => moverCarrusel(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </div>

      {cargandoProgramas ? (
        <div className="padres-flow-inline-loading">
          <Loader2 className="padres-spin" size={22} />
          <span>Cargando cursos disponibles...</span>
        </div>
      ) : programasDisponibles.length > 0 ? (
        <div
          className={`padres-flow-courses${carruselActivo ? " is-carousel" : ""}`}
          ref={carruselRef}
        >
          {programasDisponibles.map((prog) => {
            const registrando = guardando && programaSeleccionadoId === prog.id;
            const sinCupos = Number(prog.cuposDisponibles || 0) <= 0;
            return (
              <article className="padres-flow-course-card" key={prog.id}>
                <div className="padres-flow-course-head">
                  <div className="padres-flow-course-name">
                    <BookOpen size={18} />
                    <h3>{prog.nombre}</h3>
                  </div>
                  <span className="padres-flow-course-category">{prog.categoria || "Curso"}</span>
                </div>

                <HorarioCompactoPadres horario={prog.horario} />

                <div className="padres-flow-course-summary">
                  <span>Cupos: {prog.cuposDisponibles}/{prog.cupos}</span>
                  <span>Aviso: {prog.ventanaInscripcion?.fechaLimite || `${prog.duracionAvisoDias || 7} días`}</span>
                  <strong>{formatearSoles(prog.costo)}</strong>
                </div>

                <button
                  className={`padres-flow-primary-button${sinCupos ? " is-empty" : ""}`}
                  type="button"
                  disabled={registrando || prog.registrado || sinCupos}
                  onClick={() => {
                    if (prog.registrado || sinCupos) return;
                    if (!datosConfirmados) {
                      setPasoActivo(2);
                      return;
                    }
                    solicitarInscripcionPadres(prog.id);
                  }}
                >
                  {registrando ? <Loader2 className="padres-spin" size={16} /> : null}
                  {sinCupos ? "Sin cupos" : prog.registrado ? "Registrado" : "Inscribir"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

export default function InicioStep({
  cargandoProgramas,
  datosConfirmados,
  guardando,
  inscripcion,
  invitacionPendiente,
  mostrarCatalogoProgramas,
  programa,
  programaSeleccionadoId,
  programasDisponibles,
  setInfoProgramaAbierta,
  setPasoActivo,
  solicitarInscripcionPadres,
}) {
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
    </>
  );
}
