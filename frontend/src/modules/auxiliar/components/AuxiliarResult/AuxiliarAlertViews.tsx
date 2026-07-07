import React from "react";
import {
  IconX as XIcon,
  IconClock as Clock,
  IconAlertTriangle as AlertTriangle,
  IconSchool as School,
  IconCircleX as XCircle,
} from "@tabler/icons-react";
import { parsearHorario } from "../../utils/auxiliarFormatters";
import { verificarLlegadaTemprano } from "../../utils/auxiliarAnalytics";

interface AuxiliarAlertViewsProps {
  kioskState: string;
  estudiante: any;
  ultimoEvento: any;
  limpiarPuesto: () => void;
}

export default function AuxiliarAlertViews({
  kioskState,
  estudiante,
  ultimoEvento,
  limpiarPuesto,
}: AuxiliarAlertViewsProps) {
  if (kioskState === "observado") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <AlertTriangle size={72} />
          </div>
          <span className="kiosk-badge-tag error">ATENCIÓN</span>
          <h2 className="student-name">{ultimoEvento?.estudiante || estudiante?.nombres || "Estudiante"} ⚠️</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>{ultimoEvento?.detalle || "No se pudo completar el registro."}</strong></p>
            <p className="sub-msg">
              Si necesita ayuda, consulte con el personal de Caja o Asistente.
            </p>
          </div>

          {estudiante && (
            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">📚 {estudiante.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">ESTADO</span>
                <strong className="value badge-error">⚠️ Observado</strong>
              </div>
            </div>
          )}

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "temprano") {
    return (
      <div className="kiosk-status-card state-temprano">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon warning-shake">
            <Clock size={72} />
          </div>
          <span className="kiosk-badge-tag warning">ESPERE POR FAVOR</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! 👋</h2>
        </div>
        <div className="kiosk-status-right">
          <p className="kiosk-status-message-highlight" style={{ color: "#d97706" }}>
            Espere por favor, ingreso permitido a las {verificarLlegadaTemprano(estudiante.horario).horaInicio}.
            {(() => {
              const info = verificarLlegadaTemprano(estudiante.horario);
              if (info.minutosFaltantes > 0) {
                return (
                  <span style={{ display: "block", marginTop: "8px", fontSize: "0.95rem", fontWeight: "normal" }}>
                    Faltan aproximadamente <strong>{info.minutosFaltantes} minutos</strong> para habilitar el ingreso.
                  </span>
                );
              }
              return null;
            })()}
          </p>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">TALLER</span>
              <strong className="value">🎨 {estudiante.programa}</strong>
            </div>
            <div className="detail-item">
              <span className="label">HORARIO</span>
              <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3", wordBreak: "break-word" }}>
                {(() => {
                  const infoHorario = parsearHorario(estudiante.horario);
                  return (
                    <>
                      {infoHorario.nivel && <div style={{ fontWeight: 800 }}>{infoHorario.nivel}</div>}
                      {infoHorario.dias && <div style={{ color: "#475569", marginTop: "2px", fontWeight: 700 }}>{infoHorario.dias}</div>}
                      {infoHorario.hora && <div style={{ color: "#0ea5e9", marginTop: "2px", fontWeight: 700 }}>⏰ {infoHorario.hora}</div>}
                      {!infoHorario.nivel && !infoHorario.dias && !infoHorario.hora && <div>{estudiante.horario || "No registrado"}</div>}
                    </>
                  );
                })()}
              </strong>
            </div>
            <div className="detail-item">
              <span className="label">ESTADO PAGO</span>
              <strong className="value badge-success">✅ {estudiante.estadoPago}</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Limpiar / Nuevo Escaneo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "tarde") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <Clock size={72} />
          </div>
          <span className="kiosk-badge-tag error">TALLER FINALIZADO</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! 👋</h2>
        </div>
        <div className="kiosk-status-right">
          <p className="kiosk-status-message-highlight" style={{ color: "#e11d48" }}>
            El taller ya finalizo. El horario de clase era de {verificarLlegadaTemprano(estudiante.horario).horaInicio} a {verificarLlegadaTemprano(estudiante.horario).horaFin}.
          </p>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">TALLER</span>
              <strong className="value">🎨 {estudiante.programa}</strong>
            </div>
            <div className="detail-item">
              <span className="label">HORARIO</span>
              <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3", wordBreak: "break-word" }}>
                {(() => {
                  const infoHorario = parsearHorario(estudiante.horario);
                  return (
                    <>
                      {infoHorario.nivel && <div style={{ fontWeight: 800 }}>{infoHorario.nivel}</div>}
                      {infoHorario.dias && <div style={{ color: "#475569", marginTop: "2px", fontWeight: 700 }}>{infoHorario.dias}</div>}
                      {infoHorario.hora && <div style={{ color: "#0ea5e9", marginTop: "2px", fontWeight: 700 }}>⏰ {infoHorario.hora}</div>}
                      {!infoHorario.nivel && !infoHorario.dias && !infoHorario.hora && <div>{estudiante.horario || "No registrado"}</div>}
                    </>
                  );
                })()}
              </strong>
            </div>
            <div className="detail-item">
              <span className="label">ESTADO PAGO</span>
              <strong className="value badge-success">✅ {estudiante.estadoPago}</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Limpiar / Nuevo Escaneo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "ya-registrado") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <Clock size={72} />
          </div>
          <span className="kiosk-badge-tag error">YA REGISTRADO</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! 👋</h2>
        </div>
        <div className="kiosk-status-right">
          <p className="kiosk-status-message-highlight" style={{ color: "#e11d48" }}>
            {estudiante.accion || "Este estudiante ya registro su ingreso hace poco. Espere 15 minutos para volver a registrarse."}
          </p>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">TALLER</span>
              <strong className="value">🎨 {estudiante.programa}</strong>
            </div>
            <div className="detail-item">
              <span className="label">HORARIO</span>
              <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3", wordBreak: "break-word" }}>
                {(() => {
                  const infoHorario = parsearHorario(estudiante.horario);
                  return (
                    <>
                      {infoHorario.nivel && <div style={{ fontWeight: 800 }}>{infoHorario.nivel}</div>}
                      {infoHorario.dias && <div style={{ color: "#475569", marginTop: "2px", fontWeight: 700 }}>{infoHorario.dias}</div>}
                      {infoHorario.hora && <div style={{ color: "#0ea5e9", marginTop: "2px", fontWeight: 700 }}>⏰ {infoHorario.hora}</div>}
                      {!infoHorario.nivel && !infoHorario.dias && !infoHorario.hora && <div>{estudiante.horario || "No registrado"}</div>}
                    </>
                  );
                })()}
              </strong>
            </div>
            <div className="detail-item">
              <span className="label">ESTADO PAGO</span>
              <strong className="value badge-success">✅ {estudiante.estadoPago}</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Limpiar / Nuevo Escaneo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "dia-incorrecto") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <XCircle size={72} />
          </div>
          <span className="kiosk-badge-tag error">DIA INCORRECTO</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! 📅</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>{estudiante.mensajeAcceso || "Hoy no le toca este taller."}</strong></p>
            <p className="sub-msg">
              {estudiante.accion || "El alumno esta matriculado en este taller, pero las clases corresponden a otros dias de la semana segun el horario establecido."}
            </p>
          </div>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">TALLER</span>
              <strong className="value">🎨 {estudiante.programa}</strong>
            </div>
            <div className="detail-item">
              <span className="label">HORARIO</span>
              <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3", wordBreak: "break-word" }}>
                {(() => {
                  const infoHorario = parsearHorario(estudiante.horario);
                  return (
                    <>
                      {infoHorario.nivel && <div style={{ fontWeight: 800 }}>{infoHorario.nivel}</div>}
                      {infoHorario.dias && <div style={{ color: "#475569", marginTop: "2px", fontWeight: 700 }}>{infoHorario.dias}</div>}
                      {infoHorario.hora && <div style={{ color: "#0ea5e9", marginTop: "2px", fontWeight: 700 }}>⏰ {infoHorario.hora}</div>}
                      {!infoHorario.nivel && !infoHorario.dias && !infoHorario.hora && <div>{estudiante.horario || "No registrado"}</div>}
                    </>
                  );
                })()}
              </strong>
            </div>
            <div className="detail-item">
              <span className="label">ESTADO PAGO</span>
              <strong className="value badge-success">✅ {estudiante.estadoPago}</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "pendiente") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <XCircle size={72} />
          </div>
          <span className="kiosk-badge-tag error">FALTA PAGAR</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! ⏳</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>El alumno tiene pagos pendientes o en proceso de verificación.</strong></p>
            <p className="sub-msg">
              Para poder ingresar al taller, el apoderado debe acercarse a Caja para regularizar o aprobar el pago y permitir el ingreso.
            </p>
          </div>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">TALLER</span>
              <strong className="value">📚 {estudiante.programa}</strong>
            </div>
            <div className="detail-item">
              <span className="label">ESTADO PAGO</span>
              <strong className="value badge-error">❌ {estudiante.estadoPago}</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "anulado") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <XCircle size={72} />
          </div>
          <span className="kiosk-badge-tag error">REGISTRO ANULADO</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! ⚠️</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>{estudiante.accion || "Registro anulado en el sistema."}</strong></p>
            <p className="sub-msg">
              El pago o matrícula de este estudiante ha sido anulado. Por favor, regularizar en Caja o Asistente.
            </p>
          </div>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">TALLER</span>
              <strong className="value">📚 {estudiante.programa}</strong>
            </div>
            <div className="detail-item">
              <span className="label">ESTADO PAGO</span>
              <strong className="value badge-error">❌ {estudiante.estadoPago}</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "pre-inscrito") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <School size={72} />
          </div>
          <span className="kiosk-badge-tag error">PRE-INSCRITO</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! 🏫</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>No está inscrito. Acercarse a Caja o Asistente para proceder con la matrícula.</strong></p>
            <p className="sub-msg">
              El alumno figura como pre-inscrito en el taller <strong>{estudiante.programa}</strong>, pero aún no tiene una matrícula activa ni registro de pago.
            </p>
          </div>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">GRADO</span>
              <strong className="value">🏫 {estudiante.grado}</strong>
            </div>
            <div className="detail-item">
              <span className="label">TALLER ASOCIADO</span>
              <strong className="value badge-error">❌ Sin Matrícula Activa</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "no-matriculado") {
    return (
      <div className="kiosk-status-card state-pendiente">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <School size={72} />
          </div>
          <span className="kiosk-badge-tag error">NO MATRICULADO</span>
          <h2 className="student-name">¡Hola, {estudiante.nombres}! 🏫</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>No está matriculado a ninguno de los cursos / No está asignado a ningún taller.</strong></p>
            <p className="sub-msg">
              El alumno no registra ninguna matrícula activa en los talleres del programa extracurricular.
            </p>
          </div>

          <div className="kiosk-student-details-box">
            <div className="detail-item">
              <span className="label">GRADO</span>
              <strong className="value">🏫 {estudiante.grado}</strong>
            </div>
            <div className="detail-item">
              <span className="label">TALLER ASOCIADO</span>
              <strong className="value badge-error">❌ Sin Matrícula Activa</strong>
            </div>
          </div>

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kioskState === "no-registrado") {
    return (
      <div className="kiosk-status-card state-no-registrado">
        <div className="kiosk-status-left">
          <div className="kiosk-status-header-icon error-shake">
            <XCircle size={72} />
          </div>
          <span className="kiosk-badge-tag error">NO REGISTRADO</span>
          <h2 className="student-name">Código no reconocido ❌</h2>
        </div>
        <div className="kiosk-status-right">
          <div className="kiosk-alert-explanation">
            <p><strong>Este código QR o DNI no figura en el sistema del colegio.</strong></p>
            <p className="sub-msg">
              No se ha encontrado ninguna inscripción o registro de alumno. Por favor, consulta con el auxiliar o acércate a Asistente.
            </p>
          </div>

          {estudiante?.nombres && estudiante.nombres !== "Codigo no registrado" && (
            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">CÓDIGO EVALUADO</span>
                <strong className="value">{estudiante.nombres}</strong>
              </div>
            </div>
          )}

          <div className="kiosk-actions-panel">
            <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
              Siguiente Estudiante 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
