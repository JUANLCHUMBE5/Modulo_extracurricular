import {
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconSearch as Search,
  IconSend as Send,
} from "@tabler/icons-react";
import { resumirClaseSecretaria } from "./SecretariaFields";

function SecretariaStudentPanel({
  abrirFichaGenerada,
  abrirRegistro,
  derivarACaja,
  derivandoCaja,
  esCicloVerano,
  estudiante,
  imprimiendoFichaRegistro,
  inscripcion,
  limpiarBusquedaEstudiante,
  nombreProgramaAMostrar,
  programas,
  tieneInvitacionOperativa,
  tipoAlumnoMostrado,
}) {
  if (!estudiante) return null;

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
          <dd>{estudiante.periodo}</dd>
        </div>
        {!esCicloVerano ? (
          <div className="secretaria-data-status secretaria-data-process">
            <dt>Invitacion</dt>
            <dd>
              <span className={`secretaria-pill ${tieneInvitacionOperativa ? "secretaria-pill-success" : "secretaria-pill-warning"}`}>
                <CheckCircle2 size={13} />
                {tieneInvitacionOperativa ? "Registrada" : "Sin invitación"}
              </span>
            </dd>
          </div>
        ) : null}
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Estado inscripción</dt>
          <dd>
            <span className="secretaria-pill secretaria-pill-info">
              {estudiante.estadoInscripción}
            </span>
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

      <div className="secretaria-info-box">
        <CheckCircle2 size={19} />
        {inscripcion && programas.length > 0 ? (
          <p>
            El estudiante ya tiene una inscripción. Secretaría puede registrar
            un curso adicional de invitación masiva si aplica a su grado y no cruza con su horario.
          </p>
        ) : inscripcion ? (
          <p>
            Inscripcion registrada. Derivar a Caja para validar el pago.
          </p>
        ) : esCicloVerano && programas.length > 0 ? (
          <p>
            Ciclo verano no usa invitación. Secretaría debe seleccionar el programa de verano al registrar.
          </p>
        ) : esCicloVerano ? (
          <p>
            Coordinación debe registrar y habilitar un programa de ciclo verano disponible para el estudiante.
          </p>
        ) : tieneInvitacionOperativa ? (
          <p>
            El estudiante tiene invitación registrada. Secretaria solo
            podrá inscribirlo en el programa asignado por Coordinación.
          </p>
        ) : programas.length > 0 ? (
          <p>
            No tiene invitación individual. Secretaría puede registrarlo
            en los programas marcados por Coordinación como invitación masiva.
          </p>
        ) : (
          <p>
            No tiene invitación registrada. Coordinación debe habilitar una
            invitación masiva o registrar una invitación individual.
          </p>
        )}
      </div>

      {!inscripcion || programas.length > 0 ? (
        <button
          className="secretaria-register-button"
          type="button"
          onClick={abrirRegistro}
        >
          <ClipboardCheck size={17} />
          <span>{inscripcion ? "Registrar curso adicional" : "Registrar inscripcion"}</span>
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
            disabled={derivandoCaja || inscripcion.derivadoCaja}
          >
            {derivandoCaja ? <Loader2 className="secretaria-spin" size={17} /> : <Send size={17} />}
            <span>
              {inscripcion.derivadoCaja
                ? "Derivado a Caja"
                : derivandoCaja
                  ? "Derivando"
                  : "Derivar a Caja"}
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

export default SecretariaStudentPanel;
