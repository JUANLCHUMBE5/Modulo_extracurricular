import React, { useRef, useEffect } from "react";
import {
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconLoader2 as Loader2,
  IconCalendar as CalendarDays,
  IconHourglass as Hourglass,
  IconCheck as Check,
  IconPencil as Pencil,
} from "@tabler/icons-react";
import {
  calcularPrimerDiaClase,
  obtenerEstadoPagoPadres,
} from "./ProgramDetailsCard";
import {
  formatearSoles,
} from "../hooks/usePadres";

export default function CatalogoProgramas({
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
}: any) {
  const carruselRef = useRef<HTMLDivElement>(null);
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

  const moverCarrusel = (direccion: number) => {
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
              : "Coordinación Académica publica aquí los cursos habilitados para el grado del estudiante."}
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
          {programasDisponibles.map((prog: any) => {
            const registrando = guardando && programaSeleccionadoId === prog.id;
            const sinCupos = !prog.registrado && Number(prog.cuposDisponibles || 0) <= 0;
            const estadoPago = obtenerEstadoPagoPadres(prog.inscripcionRegistrada);
            const pagoValidado = estadoPago === "pagado";
            const pagoEnRevision = estadoPago === "verificando";
            const pagoPendienteCaja = estadoPago === "pendiente_caja";
            const noIniciado = !prog.registrado && prog.ventanaInscripcion?.noIniciada === true;
            const cerrado = !prog.registrado && prog.ventanaInscripcion?.permitida === false && !noIniciado;
            const puedeContinuarPago = prog.registrado && !pagoValidado && !pagoEnRevision && !pagoPendienteCaja;
            const botonDeshabilitado = registrando || sinCupos || cerrado || noIniciado || (prog.registrado && !puedeContinuarPago);
            const textoAccion = sinCupos
              ? "Sin cupos"
              : noIniciado
                ? "Próximamente"
                : cerrado
                  ? "Inscripciones cerradas"
                  : pagoValidado
                    ? "Pago exitoso"
                    : pagoEnRevision
                      ? "Pago en proceso"
                      : pagoPendienteCaja
                        ? "Reserva pendiente"
                        : puedeContinuarPago
                          ? "Continuar al pago"
                          : "Inscribir";
            const tieneTalleres = Array.isArray(prog.talleresDeportivos) && prog.talleresDeportivos.length > 0;
            const deportesUnicos = tieneTalleres
              ? [...new Set(prog.talleresDeportivos.map((t: any) => t.deporte).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b))
              : [];
            const nivelesTalleres = tieneTalleres
              ? [...new Set(prog.talleresDeportivos.map((t: any) => t.nivel).filter(Boolean))]
              : [];
            const tituloCard = prog.nombre;

            const categoriaLabel = prog.categoria === "Talleres Deportivos" || prog.categoria === "Deportivo"
              ? "DEPORTIVO"
              : (prog.categoria || "CURSO").toUpperCase();

            const fechaInicioRaw = calcularPrimerDiaClase(prog.fechaInicio, prog.horario);
            const fechaInicioFormatted = fechaInicioRaw.replace(/\/2026$/, "").replace(/\/2027$/, "");

            const fechaLimiteFormatted = prog.ventanaInscripcion?.fechaLimite
              ? prog.ventanaInscripcion.fechaLimite
              : (prog.duracionAvisoDias ? `${prog.duracionAvisoDias} días` : "7 días");

            return (
              <article className="padres-flow-course-card custom-compact-card" key={prog.id}>
                <div className="custom-compact-head">
                  <h3 className="custom-compact-title">{tituloCard}</h3>
                  <span className="custom-compact-badge">{categoriaLabel}</span>
                </div>
                {nivelesTalleres.length > 0 ? (
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", marginTop: "-1px", marginBottom: "4px", textTransform: "uppercase" }}>
                    Modalidad: {nivelesTalleres.join(", ")}
                  </div>
                ) : null}
                {deportesUnicos.length > 0 ? (
                  <div style={{ fontSize: "11px", color: "#059669", fontWeight: "700", marginTop: "0px", marginBottom: "8px", textTransform: "uppercase" }}>
                    DISPONIBLES: {deportesUnicos.join(", ")}
                  </div>
                ) : null}

                <div className="custom-compact-dates-row">
                  <div className="custom-compact-date-item">
                    <CalendarDays size={14} />
                    <span>Inicio: {fechaInicioFormatted}</span>
                  </div>
                  <div className="custom-compact-date-item">
                    <Hourglass size={14} />
                    <span>Límite: {fechaLimiteFormatted}</span>
                  </div>
                </div>

                <div className="custom-compact-footer">
                  <span className="custom-compact-price">{formatearSoles(prog.costo)}</span>
                  <button
                    className="custom-compact-btn"
                    type="button"
                    disabled={botonDeshabilitado}
                    onClick={() => {
                      if (botonDeshabilitado) return;
                      onInscribirCursoAdicional(prog);
                    }}
                  >
                    {registrando ? (
                      <Loader2 className="padres-spin" size={14} />
                    ) : (textoAccion === "Inscribir" || textoAccion === "Continuar al pago") ? (
                      <Pencil size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>{textoAccion}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
