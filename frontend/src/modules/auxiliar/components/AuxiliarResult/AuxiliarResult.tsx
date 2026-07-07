import React from "react";
import {
  IconLoader2 as Loader2,
  IconCircleCheck as CheckCircle2,
  IconQrcode as QrCode,
} from "@tabler/icons-react";
import { parsearHorario } from "../../utils/auxiliarFormatters";
import AuxiliarAlertViews from "./AuxiliarAlertViews";

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

      <AuxiliarAlertViews
        kioskState={kioskState}
        estudiante={estudiante}
        ultimoEvento={ultimoEvento}
        limpiarPuesto={limpiarPuesto}
      />
    </>
  );
}
