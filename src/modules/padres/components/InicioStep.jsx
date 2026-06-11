import { useEffect, useRef, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconLoader2 as Loader2,
  IconUserCircle as UserRound,
  IconX as X,
  IconSearch as Search,
} from "@tabler/icons-react";
import { formatearSoles } from "../hooks/usePadres";
import { dividirHorarioPadres, formatearRangoFechasPadres, repararTexto } from "../utils/padresTextUtils";
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

function obtenerEstadoPagoPadres(inscripcion = {}) {
  if (inscripcion?.derivadoCaja || inscripcion?.estadoCaja === "reservado_caja") {
    return "pendiente_caja";
  }
  const registro = inscripcion || {};
  const texto = String(`${registro.estadoPago || ""} ${registro.estadoInscripcion || ""}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["completado", "pagado", "validado", "pago validado", "exitoso"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar", "revision", "proceso", "pendiente_validacion"].some((item) => texto.includes(item))) return "verificando";
  return "pendiente";
}

function obtenerDestinoProgramaPadres(programa = {}) {
  const desdeHorario = dividirHorarioPadres(programa.horario)?.grados || "";
  const normalizar = (valor = "") => {
    const texto = String(valor || "").trim();
    const partes = texto.match(/^(Inicial|Primaria|Secundaria)\s+(.+)$/i);
    return partes ? `${partes[2].trim()} ${partes[1].trim()}` : texto;
  };
  if (desdeHorario) return normalizar(desdeHorario);
  const grado = String(programa.grado || programa.gradoEstudiante || "").trim();
  const nivel = String(programa.nivelEducativo || "").trim();
  if (nivel && grado && !nivel.includes(grado)) return `${grado} ${nivel}`;
  return normalizar(nivel || grado || "");
}

function ProgramaPrincipal({ programa, inscripcion, setPasoActivo, onInscribirProgramaPrincipal }) {
  if (!programa) return null;
  if (!programa) {
    if (tieneCursosDisponibles) return null;

    return (
      <article className="padres-flow-panel padres-flow-empty-program">
        <AlertCircle size={24} />
        <div>
          <h2>Sin programa asignado</h2>
          <p>Cuando Coordinación Académica habilite una invitacion o un curso disponible, aparecera en este portal.</p>
        </div>
      </article>
    );
  }

  // Determine state of the button
  let buttonText = "Inscribir";
  let buttonDisabled = false;
  let buttonAction = onInscribirProgramaPrincipal;
  const duracion = String(programa.duracionTaller || "").trim();
  const mostrarDuracion = duracion && !/por definir/i.test(duracion);
  const nombrePrograma = programa.programa || programa.nombre || "Invitacion disponible";
  const destinoPrograma = obtenerDestinoProgramaPadres(programa);

  if (inscripcion) {
    const estadoPago = obtenerEstadoPagoPadres(inscripcion);
    const esPagado = estadoPago === "pagado";
    const esVerificando = estadoPago === "verificando";
    const esPendienteCaja = estadoPago === "pendiente_caja";

    if (esPagado) {
      buttonText = "Pago exitoso";
      buttonDisabled = true;
    } else if (esVerificando) {
      buttonText = "Pago en proceso";
      buttonDisabled = true;
    } else if (esPendienteCaja) {
      buttonText = "Reserva pendiente";
      buttonDisabled = true;
    } else {
      // Pending payment
      buttonText = "Continuar al pago";
      buttonAction = () => setPasoActivo(3);
    }
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
          <h2>{nombrePrograma}</h2>
          {destinoPrograma ? (
            <p className="padres-flow-program-subtitle">Para {destinoPrograma}</p>
          ) : null}
        </div>
      </div>

      <div className="padres-flow-program-grid">
        <InfoTile icon={CalendarDays} label="Horario">
          <HorarioProgramaPadres horario={programa.horario || "Por confirmar"} />
        </InfoTile>
        <InfoTile icon={CalendarDays} label="Vigencia" value={formatearRangoFechasPadres(programa.fechaInicio, programa.fechaFin)} />
        <InfoTile icon={UserRound} label="Profesor(a)" value={programa.docente || programa.responsable || "Por definir"} />
        <InfoTile icon={BookOpen} label="Costo" value={formatearSoles(programa.costo)} />
        {mostrarDuracion ? (
        <InfoTile
          icon={CalendarDays}
          label="Duración"
          value={duracion}
        />
        ) : null}
      </div>

      <div className="padres-flow-program-note">
        <p>{inscripcion ? "Revise el estado de su registro para continuar." : "Confirme la participacion de su hijo(a) en este programa."}</p>
        <button 
          className="padres-flow-primary-button" 
          type="button" 
          disabled={buttonDisabled}
          onClick={buttonAction}
          style={buttonDisabled ? { background: "#e2e8f0", color: "#64748b", cursor: "not-allowed", border: "1px solid #cbd5e1" } : null}
        >
          {buttonText}
        </button>
      </div>

    </article>
  );
}

function HorarioCompactoPadres({ horario, talleresDeportivos }) {
  const texto = repararTexto(String(horario || "")).trim();

  if (!texto) {
    return (
      <div className="padres-flow-course-schedule">
        <div className="padres-schedule-empty">
          <CalendarDays size={14} />
          <span>Horario por confirmar</span>
        </div>
      </div>
    );
  }

  // Split by slash to handle multi-day or multi-session schedules
  const sessions = texto.split("/").map(s => s.trim()).filter(Boolean);

  // If sessions contain colons, it is likely a complex multi-activity schedule
  const isComplex = sessions.some(s => s.includes(":"));

  if (isComplex) {
    // If we have structured talleresDeportivos, list the sports names
    if (Array.isArray(talleresDeportivos) && talleresDeportivos.length > 0) {
      const deportesUnicos = [...new Set(talleresDeportivos.map(t => t.deporte).filter(Boolean))];
      const etiqueta = deportesUnicos.length > 0
        ? deportesUnicos.join(", ")
        : "Horario por confirmar";
      return (
        <div className="padres-flow-course-schedule is-simplified" style={{ padding: "10px 12px" }}>
          <div className="padres-schedule-item" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarDays size={15} style={{ color: "#0ea5e9" }} />
            <span style={{ fontWeight: 800, color: "#1e293b", fontSize: "13.5px" }}>{etiqueta}</span>
          </div>
          <div className="padres-schedule-item-subtitle" style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, paddingLeft: "23px", marginTop: "1px" }}>
            Para todas las edades (se elige al inscribir)
          </div>
        </div>
      );
    }

    // Fallback: show the raw schedule text without hardcoded sports names
    return (
      <div className="padres-flow-course-schedule is-simple">
        <div className="padres-schedule-item">
          <CalendarDays size={14} />
          <span>{texto}</span>
        </div>
      </div>
    );
  }

  const completo = dividirHorarioPadres(texto);
  const simple = !completo ? texto.match(/^(.+?)\s+clase\s+(.+?)(?:\s+almuerzo\s+(.+))?$/i) : null;

  const dia = completo?.dia || simple?.[1]?.trim();
  const clase = completo?.clase || simple?.[2]?.trim();
  const almuerzo = completo?.almuerzo || simple?.[3]?.trim();

  if (!dia && !clase) {
    return (
      <div className="padres-flow-course-schedule is-simple">
        <div className="padres-schedule-item">
          <CalendarDays size={14} />
          <span>{texto}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="padres-flow-course-schedule is-simple">
      <div className="padres-schedule-item">
        <CalendarDays size={14} />
        <span>{[dia, clase].filter(Boolean).join(" ")}</span>
      </div>
      {almuerzo ? (
        <div className="padres-schedule-item">
          <CalendarDays size={14} />
          <span>Almuerzo: {almuerzo}</span>
        </div>
      ) : null}
    </div>
  );
}

function obtenerOpcionesDeGrupo(programa) {
  if (!programa) return [];

  const categoria = String(programa.categoria || "").toLowerCase();
  const tieneTalleres = Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0;

  if (categoria !== "deportivo" && !tieneTalleres) {
    return [];
  }

  // 1. Si tiene talleresDeportivos (arreglo estructurado)
  if (tieneTalleres) {
    const mapGrupos = new Map(); // key: "Vóley (6-9 a.)" -> list of { day, time }
    programa.talleresDeportivos.forEach((taller) => {
      const nivelLabel = taller.nivel ? ` [${taller.nivel}]` : "";
      const key = `${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} a.)`;
      const time = `${taller.horaInicio}-${taller.horaFin}`;
      if (!mapGrupos.has(key)) {
        mapGrupos.set(key, []);
      }
      mapGrupos.get(key).push({ day: taller.dia, time });
    });
    return Array.from(mapGrupos.entries()).map(([nombre, list]) => {
      const horariosDetallados = list.map(h => `${h.day} ${h.time}`);
      const horarioCompleto = list.map(h => `${h.day}: ${nombre}: ${h.time}`).join(" / ");
      return {
        id: nombre,
        label: nombre,
        horariosDetallados,
        horarioCompleto,
      };
    });
  }

  // 2. Fallback a parsear el texto de horario
  const texto = String(programa.horario || "").trim();
  if (!texto) return [];

  const sessions = texto.split("/").map(s => s.trim()).filter(Boolean);
  const isComplex = sessions.some(s => s.includes(":"));
  if (!isComplex) return [];

  const mapGrupos = new Map(); // key: "Vóley (6-9 a.)" -> list of { day, time }

  sessions.forEach((session) => {
    const colonIdx = session.indexOf(":");
    let day = "";
    let content = session;
    if (colonIdx > -1) {
      const left = session.substring(0, colonIdx).trim();
      if (!/\d/.test(left)) {
        day = left;
        content = session.substring(colonIdx + 1).trim();
      }
    }

    const activities = content.split(",").map(a => a.trim()).filter(Boolean);
    activities.forEach((act) => {
      const actColonIdx = act.indexOf(":");
      if (actColonIdx > -1) {
        const name = act.substring(0, actColonIdx).trim();
        const time = act.substring(actColonIdx + 1).trim();

        const key = name; // e.g. "Vóley (6-9 a.)"
        
        if (!mapGrupos.has(key)) {
          mapGrupos.set(key, []);
        }
        mapGrupos.get(key).push({ day, time });
      }
    });
  });

  return Array.from(mapGrupos.entries()).map(([nombre, list]) => {
    const horariosDetallados = list.map(h => `${h.day} ${h.time}`);
    const horarioCompleto = list.map(h => `${h.day}: ${nombre}: ${h.time}`).join(" / ");
    return {
      id: nombre,
      label: nombre,
      horariosDetallados,
      horarioCompleto,
    };
  });
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
  setLightboxImagen,
  onInscribirCursoAdicional,
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
              : "Coordinación Académica publica aqui los cursos habilitados para el grado del estudiante."}
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
            const sinCupos = !prog.registrado && Number(prog.cuposDisponibles || 0) <= 0;
            const estadoPago = obtenerEstadoPagoPadres(prog.inscripcionRegistrada);
            const pagoValidado = estadoPago === "pagado";
            const pagoEnRevision = estadoPago === "verificando";
            const pagoPendienteCaja = estadoPago === "pendiente_caja";
            const puedeContinuarPago = prog.registrado && !pagoValidado && !pagoEnRevision && !pagoPendienteCaja;
            const botonDeshabilitado = registrando || sinCupos || (prog.registrado && !puedeContinuarPago);
            const textoAccion = sinCupos
              ? "Sin cupos"
              : pagoValidado
                ? "Pago exitoso"
                : pagoEnRevision
                  ? "Pago en proceso"
                  : pagoPendienteCaja
                    ? "Reserva pendiente"
                    : puedeContinuarPago
                      ? "Continuar al pago"
                      : "Inscribir";
            return (
              <article className="padres-flow-course-card" key={prog.id}>

                <div className="padres-flow-course-head">
                  <div className="padres-flow-course-badge-row">
                    <span className="padres-flow-course-category">{prog.categoria || "Curso"}</span>
                  </div>
                  <div className="padres-flow-course-name">
                    <BookOpen size={16} />
                    <h3>{prog.nombre}</h3>
                  </div>
                </div>

                <HorarioCompactoPadres horario={prog.horario} talleresDeportivos={prog.talleresDeportivos} />

                <div className="padres-flow-course-details-grid">
                  <div className="padres-course-detail-item">
                    <span className="detail-label">Cupos</span>
                    <strong className="detail-value">{prog.cuposDisponibles} / {prog.cupos}</strong>
                  </div>
                  <div className="padres-course-detail-item">
                    <span className="detail-label">Límite Aviso</span>
                    <strong className="detail-value">
                      {prog.ventanaInscripcion?.fechaLimite ? (
                        `${prog.ventanaInscripcion.fechaLimite}${prog.ventanaInscripcion.horaLimite ? ` a las ${prog.ventanaInscripcion.horaLimite}` : ""}`
                      ) : (
                        `${prog.duracionAvisoDias || 7} días`
                      )}
                    </strong>
                  </div>
                  <div className="padres-course-detail-item is-price">
                    <span className="detail-label">Inversión</span>
                    <strong className="detail-value">{formatearSoles(prog.costo)}</strong>
                  </div>
                </div>

                <button
                  className={`padres-flow-primary-button${sinCupos ? " is-empty" : ""}`}
                  type="button"
                  disabled={botonDeshabilitado}
                  onClick={() => {
                    if (botonDeshabilitado) return;
                    onInscribirCursoAdicional(prog);
                  }}
                >
                  {registrando ? <Loader2 className="padres-spin" size={16} /> : null}
                  {textoAccion}
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
  mostrarCatalogoProgramas,
  programa,
  programaSeleccionadoId,
  programasDisponibles,
  setPasoActivo,
  solicitarInscripcionPadres,
  onInscribirCursoAdicional,
  onInscribirProgramaPrincipal,
}) {
  const [lightboxImagen, setLightboxImagen] = useState(null);

  return (
    <>
        <ProgramaPrincipal
          programa={programa}
          inscripcion={inscripcion}
          setPasoActivo={setPasoActivo}
          onInscribirProgramaPrincipal={onInscribirProgramaPrincipal}
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
        setLightboxImagen={setLightboxImagen}
        onInscribirCursoAdicional={onInscribirCursoAdicional}
      />

      {lightboxImagen ? (
        <div className="padres-lightbox-overlay" onClick={() => setLightboxImagen(null)} role="presentation">
          <div className="padres-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button className="padres-lightbox-close" type="button" onClick={() => setLightboxImagen(null)} aria-label="Cerrar afiche">
              <X size={20} />
            </button>
            <div className="padres-lightbox-body">
              <img src={lightboxImagen.src} alt={lightboxImagen.alt} className="padres-lightbox-img" />
            </div>
            {lightboxImagen.title ? <div className="padres-lightbox-caption">{lightboxImagen.title}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

