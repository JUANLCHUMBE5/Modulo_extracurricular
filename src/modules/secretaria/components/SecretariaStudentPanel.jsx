import {
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconSearch as Search,
  IconSend as Send,
  IconAlertTriangle as AlertTriangle,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";
import { resumirClaseSecretaria } from "./SecretariaFields";

function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Promovido por certificado oficial",
  };
  return opciones[seleccion] || "Pendiente de definir en Coordinación Académica";
}

function obtenerPillEstadoInscripcion(estado = "") {
  const est = String(estado).trim().toLowerCase();
  if (est.includes("no inscrito") || est.includes("anulada")) {
    return {
      clase: "secretaria-pill-danger",
      Icono: AlertTriangle,
    };
  }
  if (est.includes("pago validado") || est.includes("inscrito")) {
    return {
      clase: "secretaria-pill-success",
      Icono: CheckCircle2,
    };
  }
  if (est.includes("pendiente") || est.includes("derivado")) {
    return {
      clase: "secretaria-pill-warning",
      Icono: AlertTriangle,
    };
  }
  return {
    clase: "secretaria-pill-info",
    Icono: InfoCircle,
  };
}

function obtenerInfoBoxConfig({ inscripcion, programas, esCicloVerano, invitacionSinHorario, tieneInvitacionOperativa }) {
  if (inscripcion?.derivadoCaja) {
    return {
      clase: "secretaria-info-box-success",
      Icono: CheckCircle2,
    };
  }
  if (inscripcion) {
    return {
      clase: "secretaria-info-box-info",
      Icono: InfoCircle,
    };
  }
  if (esCicloVerano) {
    if (programas.length > 0) {
      return {
        clase: "secretaria-info-box-info",
        Icono: InfoCircle,
      };
    } else {
      return {
        clase: "secretaria-info-box-danger",
        Icono: AlertTriangle,
      };
    }
  }
  if (invitacionSinHorario) {
    return {
      clase: "secretaria-info-box-warning",
      Icono: AlertTriangle,
    };
  }
  if (tieneInvitacionOperativa) {
    return {
      clase: "secretaria-info-box-success",
      Icono: CheckCircle2,
    };
  }
  if (programas.length > 0) {
    return {
      clase: "secretaria-info-box-info",
      Icono: InfoCircle,
    };
  }
  return {
    clase: "secretaria-info-box-danger",
    Icono: AlertTriangle,
  };
}

function SecretariaStudentPanel({
  abrirFichaGenerada,
  abrirCursoAdicional,
  abrirRegistro,
  cursosAdicionalesDisponibles = 0,
  derivarACaja,
  derivandoCaja,
  esCicloVerano,
  estudiante,
  imprimiendoFichaRegistro,
  inscripcion,
  invitacionSinHorario,
  limpiarBusquedaEstudiante,
  nombreProgramaAMostrar,
  programas,
  tieneInvitacionOperativa,
  tipoAlumnoMostrado,
}) {
  if (!estudiante) return null;
  const esCambridge = /cambridge/i.test([
    nombreProgramaAMostrar,
    estudiante.programaNombre,
    estudiante.plantilla,
    inscripcion?.programa,
  ].filter(Boolean).join(" "));
  const seleccionCambridge = inscripcion?.seleccion || estudiante.seleccion || "";
  const nivelCambridge = inscripcion?.nivelCambridge || estudiante.nivelCambridge || "";
  const esPagoCompletado = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(
    (est) => String(inscripcion?.estadoPago || "").toLowerCase().includes(est) || String(inscripcion?.estadoInscripcion || "").toLowerCase().includes(est)
  );

  return (
    <section className="secretaria-student-panel">
      <div className="secretaria-student-summary">
        <div className="secretaria-avatar">
          {estudiante.nombres
            .split(" ")
            .slice(0, 2)
            .map((name) => name[0])
            .join("")}
        </div>
        <div>
          <span className="secretaria-overline">Estudiante encontrado</span>
          <strong>{estudiante.nombres}</strong>
          <span>{estudiante.dni ? `DNI ${estudiante.dni}` : "Sin DNI registrado"} · {estudiante.codigoEstudiante || "Sin código"}</span>
        </div>
        <button className="secretaria-secondary-button secretaria-new-search-button" type="button" onClick={limpiarBusquedaEstudiante}>
          <Search size={15} />
          Buscar otro estudiante
        </button>
      </div>

      <dl className="secretaria-student-data" aria-label="Datos del estudiante">
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Código</dt>
          <dd>{estudiante.codigoEstudiante || "No registrado"}</dd>
        </div>
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Grado</dt>
          <dd>{estudiante.grado}</dd>
        </div>
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Sección</dt>
          <dd>{estudiante.seccion}</dd>
        </div>
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Tipo de alumno</dt>
          <dd>{tipoAlumnoMostrado}</dd>
        </div>
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Periodo</dt>
          <dd>
            {(() => {
              const normalizar = (p) => String(p || "").toLowerCase().includes("verano") ? "Ciclo verano" : "Año escolar";
              if (inscripcion?.periodo) return normalizar(inscripcion.periodo);
              if (estudiante?.programaPeriodo) return normalizar(estudiante.programaPeriodo);
              if (estudiante?.periodo) return normalizar(estudiante.periodo);
              return esCicloVerano ? "Ciclo verano" : "Año escolar";
            })()}
          </dd>
        </div>
        {!esCicloVerano ? (
          <div className="secretaria-data-status secretaria-data-process">
            <dt>Invitacion</dt>
            <dd>
              {(() => {
                let pillClass = "secretaria-pill-danger";
                let Icon = AlertTriangle;
                let text = "Sin invitación";
                
                if (tieneInvitacionOperativa && !invitacionSinHorario) {
                  pillClass = "secretaria-pill-success";
                  Icon = CheckCircle2;
                  text = "Registrada";
                } else if (invitacionSinHorario) {
                  pillClass = "secretaria-pill-warning";
                  Icon = AlertTriangle;
                  text = "Falta horario";
                }
                
                return (
                  <span className={`secretaria-pill ${pillClass}`}>
                    <Icon size={13} />
                    {text}
                  </span>
                );
              })()}
            </dd>
          </div>
        ) : null}
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Estado inscripción</dt>
          <dd>
            {(() => {
              const { clase, Icono } = obtenerPillEstadoInscripcion(estudiante.estadoInscripción);
              return (
                <span className={`secretaria-pill ${clase}`}>
                  <Icono size={13} />
                  {estudiante.estadoInscripción}
                </span>
              );
            })()}
          </dd>
        </div>
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Estado pago</dt>
          <dd>{estudiante.estadoPago || "Sin pago"}</dd>
        </div>
        <div className="secretaria-data-wide secretaria-data-program">
          <dt>{tieneInvitacionOperativa ? "Programa asignado" : esCicloVerano ? "Programa de verano" : "Programa"}</dt>
          <dd>{nombreProgramaAMostrar || "Se seleccionara al registrar"}</dd>
        </div>
        {esCambridge ? (
          <>
            <div className="secretaria-data-program">
              <dt>Modalidad Cambridge A/B/C</dt>
              <dd>{describirSeleccionCambridge(seleccionCambridge)}</dd>
            </div>
            {nivelCambridge ? (
              <div className="secretaria-data-program">
                <dt>Nivel Cambridge</dt>
                <dd>{nivelCambridge}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {inscripcion ? (
          <>
            <div className="secretaria-data-program">
              <dt>Horario</dt>
              <dd>{resumirClaseSecretaria(inscripcion.horario)}</dd>
            </div>
            <div className="secretaria-data-program">
              <dt>Costo referencial</dt>
              <dd>S/ {Number(inscripcion.costo).toFixed(2)}</dd>
            </div>
            <div className="secretaria-data-program">
              <dt>Uniforme requerido</dt>
              <dd>{inscripcion.requiereUniforme ? "Sí" : "No"}</dd>
            </div>
            <div className="secretaria-data-contact">
              <dt>Nombre del padre</dt>
              <dd>{inscripcion.apoderado}</dd>
            </div>
            <div className="secretaria-data-contact">
              <dt>Teléfono</dt>
              <dd>{inscripcion.telefono}</dd>
            </div>
            <div className="secretaria-data-contact">
              <dt>Estado pago</dt>
              <dd>{inscripcion.estadoPago}</dd>
            </div>
          </>
        ) : null}
      </dl>

      {(() => {
        const config = obtenerInfoBoxConfig({
          inscripcion,
          programas,
          esCicloVerano,
          invitacionSinHorario,
          tieneInvitacionOperativa,
        });
        const IconoBox = config.Icono;
        return (
          <div className={`secretaria-info-box ${config.clase}`}>
            <IconoBox size={19} />
            {inscripcion?.derivadoCaja ? (
              <p>
                Derivado exitosamente a Cajera: {inscripcion.programa || "taller seleccionado"}. Este mismo taller ya no se puede derivar otra vez.
                {cursosAdicionalesDisponibles > 0
                  ? " Si necesita otro cobro, registre un curso adicional."
                  : " No hay cursos adicionales disponibles para este grado."}
              </p>
            ) : inscripcion && programas.length > 0 ? (
              <p>
                Taller actual para Cajera: {inscripcion.programa || "No definido"}. Asistente puede registrar
                un curso adicional si corresponde, cuidando no derivar otro taller por error.
              </p>
            ) : inscripcion ? (
              <p>
                Inscripcion registrada para {inscripcion.programa || "este taller"}. Derivar a Cajera para validar el pago.
              </p>
            ) : esCicloVerano && programas.length > 0 ? (
              <p>
                Ciclo verano no usa invitación. Asistente debe seleccionar el programa de verano al registrar.
              </p>
            ) : esCicloVerano ? (
              <p>
                Coordinación Académica debe registrar y habilitar un programa de ciclo verano disponible para el estudiante.
              </p>
            ) : invitacionSinHorario ? (
              <p>
                El estudiante si esta cargado por Coordinación Académica, pero falta configurar un horario para su grado antes de inscribirlo.
              </p>
            ) : tieneInvitacionOperativa ? (
              <p>
                El estudiante tiene invitación registrada. Asistente solo
                podrá inscribirlo en el programa asignado por Coordinación Académica.
              </p>
            ) : programas.length > 0 ? (
              <p>
                No tiene invitación individual. Asistente puede registrarlo
                en los programas marcados por Coordinación Académica como invitación masiva.
              </p>
            ) : (
              <p>
                No tiene invitación registrada. Coordinación Académica debe habilitar una
                invitación masiva o registrar una invitación individual.
              </p>
            )}
          </div>
        );
      })()}

      {!inscripcion ? (
        <button
          className="secretaria-register-button"
          type="button"
          onClick={abrirRegistro}
          disabled={invitacionSinHorario && !inscripcion}
        >
          <ClipboardCheck size={17} />
          <span>{invitacionSinHorario ? "Falta horario en Coordinación Académica" : "Registrar inscripcion"}</span>
        </button>
      ) : (
        <div className="secretaria-final-actions">
          <button
            className="secretaria-primary-button"
            type="button"
            onClick={abrirFichaGenerada}
            disabled={imprimiendoFichaRegistro}
          >
            {imprimiendoFichaRegistro ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
            <span>{imprimiendoFichaRegistro ? "Preparando ficha" : "Imprimir ficha de registro"}</span>
          </button>
          <button
            className="secretaria-register-button"
            type="button"
            onClick={derivarACaja}
            disabled={derivandoCaja || inscripcion.derivadoCaja || esPagoCompletado}
          >
            {derivandoCaja ? (
              <Loader2 className="secretaria-spin" size={17} />
            ) : esPagoCompletado ? (
              <CheckCircle2 size={17} />
            ) : (
              <Send size={17} />
            )}
            <span>
              {inscripcion.derivadoCaja
                ? "Derivado exitosamente"
                : esPagoCompletado
                  ? "Pago completado"
                  : derivandoCaja
                    ? "Derivando"
                  : `Derivar: ${inscripcion.programa || "Cajera"}`}
            </span>
          </button>
          {cursosAdicionalesDisponibles > 0 ? (
            <button
              className="secretaria-secondary-button"
              type="button"
              onClick={abrirCursoAdicional}
            >
              <ClipboardCheck size={17} />
              <span>Registrar curso adicional</span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default SecretariaStudentPanel;
