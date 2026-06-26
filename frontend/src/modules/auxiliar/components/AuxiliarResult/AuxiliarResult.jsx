import React from "react";
import {
  IconLoader2 as Loader2,
  IconCircleCheck as CheckCircle2,
  IconQrcode as QrCode,
  IconXboxX as XCircle,
  IconSchool as School,
  IconClock as Clock,
  IconAlertTriangle as AlertTriangle
} from "@tabler/icons-react";
import { parsearHorario } from "../../utils/auxiliarFormatters";
import { verificarLlegadaTemprano } from "../../utils/auxiliarAnalytics";

export default function AuxiliarResult({
  kioskState,
  estudiante,
  ultimoEvento,
  observacion,
  setObservacion,
  registrando,
  ejecutarRegistro,
  limpiarPuesto,
}) {
  const esInscritoNoMatriculado = estudiante && estudiante.estadoAcceso === "inscrito_no_matriculado";

  return (
    <>
      {kioskState === "esperando" && (
        <div className="kiosk-status-card state-esperando">
          <div className="kiosk-status-left">
            <div className="kiosk-status-illustration">
              <span className="floating-emoji">🎒</span>
              <span className="floating-emoji second">✨</span>
              <div className="kiosk-pulse-target">
                <QrCode size={72} />
              </div>
            </div>
          </div>
          <div className="kiosk-status-right">
            <h2>¡Hola! Bienvenidos 🏫</h2>
            <p className="kiosk-status-message">
              Por favor, acerca tu código QR al lector o cámara para validar tu ingreso al taller.
            </p>
            <div className="kiosk-friendly-tips">
              <span>💡 Auxiliar: También puede buscar digitando el DNI del alumno.</span>
            </div>
          </div>
        </div>
      )}

      {(kioskState === "cargando" || kioskState === "registrando") && (
        <div className="kiosk-status-card state-cargando">
          <div className="kiosk-loader-wrapper">
            <Loader2 size={64} className="kiosk-spin" />
            <span className="loader-emoji">🎒</span>
          </div>
          <h2>{registrando ? "Registrando ingreso..." : "Buscando en el sistema..."}</h2>
          <p className="kiosk-status-message">
            {registrando
              ? "Guardando la asistencia del estudiante para su taller."
              : "Verificando estado de matrícula y reportes de pagos en Cajera."}
          </p>
        </div>
      )}

      {kioskState === "registrado-exito" && (
        <div className="kiosk-status-card state-registrado-exito">
          <div className="kiosk-status-left">
            <div className="kiosk-status-header-icon success-pop">
              <CheckCircle2 size={72} />
            </div>
            <div className="sparkles-container">
              <span className="sparkle s1">⭐</span>
              <span className="sparkle s2">✨</span>
              <span className="sparkle s3">🎉</span>
            </div>
            <span className="kiosk-badge-tag success">¡INGRESO REGISTRADO!</span>
            <h2 className="student-name">¡Lindo día, {ultimoEvento?.estudiante}! 😊</h2>
          </div>
          <div className="kiosk-status-right">
            <p className="success-footer-msg" style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 12px 0", color: "#065f46" }}>¡Tu ingreso ha sido registrado de manera correcta!</p>
            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">⚽ {ultimoEvento?.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORA REGISTRO</span>
                <strong className="value">⏰ {ultimoEvento?.hora}</strong>
              </div>
            </div>
            <div className="kiosk-actions-panel">
              <button type="button" className="kiosk-action-btn primary success" onClick={limpiarPuesto}>
                Siguiente Estudiante 🔄
              </button>
            </div>
          </div>
        </div>
      )}

      {kioskState === "observado" && (
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
      )}

      {kioskState === "autorizado" && (
        <div className="kiosk-status-card state-autorizado">
          <div className="kiosk-status-left">
            <div className="kiosk-status-header-icon success-pop">
              <CheckCircle2 size={72} />
            </div>
            <div className="sparkles-container">
              <span className="sparkle s1">⭐</span>
              <span className="sparkle s2">✨</span>
              <span className="sparkle s3">🌟</span>
            </div>
            <span className="kiosk-badge-tag success">BIENVENIDO / ACEPTADO</span>
            <h2 className="student-name">¡Hola, {estudiante.nombres}! 👋</h2>
          </div>
          <div className="kiosk-status-right">
            <p className="kiosk-status-message-highlight">
              ¡Tu pago está al día y tu matrícula activa! Que tengas una excelente clase.
            </p>

            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">🎨 {estudiante.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORARIO</span>
                <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3" }}>
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
              <button
                className="kiosk-action-btn pulse-button success-btn"
                type="button"
                onClick={() => ejecutarRegistro()}
                disabled={registrando}
              >
                {registrando ? <Loader2 className="kiosk-spin" size={24} /> : "REGISTRAR INGRESO 🚀"}
              </button>
              <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
                Limpiar / Nuevo Escaneo
              </button>
            </div>
          </div>
        </div>
      )}

      {kioskState === "temprano" && (
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
            </p>

            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">🎨 {estudiante.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORARIO</span>
                <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3" }}>
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
      )}

      {kioskState === "tarde" && (
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
              El taller ya finalizó. El horario de clase era de {verificarLlegadaTemprano(estudiante.horario).horaInicio} a {verificarLlegadaTemprano(estudiante.horario).horaFin}.
            </p>

            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">🎨 {estudiante.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORARIO</span>
                <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3" }}>
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
      )}

      {kioskState === "ya-registrado" && (
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
              {estudiante.accion || "Este estudiante ya registró su ingreso hace poco. Espere 15 minutos para volver a registrarse."}
            </p>

            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">🎨 {estudiante.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORARIO</span>
                <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3" }}>
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
      )}

      {kioskState === "dia-incorrecto" && (
        <div className="kiosk-status-card state-pendiente">
          <div className="kiosk-status-left">
            <div className="kiosk-status-header-icon error-shake">
              <XCircle size={72} />
            </div>
            <span className="kiosk-badge-tag error">DÍA INCORRECTO</span>
            <h2 className="student-name">¡Hola, {estudiante.nombres}! 📅</h2>
          </div>
          <div className="kiosk-status-right">
            <div className="kiosk-alert-explanation">
              <p><strong>{estudiante.mensajeAcceso || "Hoy no le toca este taller."}</strong></p>
              <p className="sub-msg">
                {estudiante.accion || "El alumno está matriculado en este taller, pero las clases corresponden a otros días de la semana según el horario establecido."}
              </p>
            </div>

            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">🎨 {estudiante.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORARIO</span>
                <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3" }}>
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
      )}

      {kioskState === "pendiente" && (
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
      )}

      {kioskState === "anulado" && (
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
      )}

      {kioskState === "pre-inscrito" && (
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
      )}

      {kioskState === "no-matriculado" && (
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
      )}

      {kioskState === "no-registrado" && (
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
      )}
    </>
  );
}
