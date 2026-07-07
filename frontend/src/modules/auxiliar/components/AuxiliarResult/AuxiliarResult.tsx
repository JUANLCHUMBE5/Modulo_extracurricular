import React from "react";
import {
  IconLoader2 as Loader2,
  IconCircleCheck as CheckCircle2,
  IconQrcode as QrCode,
  IconClock as Clock,
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

      {(kioskState === "autorizado" || kioskState === "tardanza") && (
        <div className={`kiosk-status-card ${kioskState === "tardanza" ? "state-tardanza" : "state-autorizado"}`}>
          <div className="kiosk-status-left">
            <div className="kiosk-status-header-icon success-pop" style={kioskState === "tardanza" ? { color: "#d97706" } : undefined}>
              {kioskState === "tardanza" ? <Clock size={72} /> : <CheckCircle2 size={72} />}
            </div>
            <div className="sparkles-container">
              <span className="sparkle s1">⭐</span>
              <span className="sparkle s2">✨</span>
              <span className="sparkle s3">🎉</span>
            </div>
            {kioskState === "tardanza" ? (
              <span className="kiosk-badge-tag warning">INGRESO TARDIO</span>
            ) : (
              <span className="kiosk-badge-tag success">INGRESO AUTORIZADO</span>
            )}
            <h2 className="student-name">¡Hola, {estudiante?.nombres}! 👋</h2>
          </div>
          <div className="kiosk-status-right">
            <p className="kiosk-status-message" style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 12px 0", color: kioskState === "tardanza" ? "#b45309" : "#065f46" }}>
              {kioskState === "tardanza" ? "El estudiante llega tarde (Ingreso con tardanza)." : "El estudiante esta habilitado para ingresar hoy."}
            </p>
            <div className="kiosk-student-details-box">
              <div className="detail-item">
                <span className="label">TALLER</span>
                <strong className="value">⚽ {estudiante?.programa}</strong>
              </div>
              <div className="detail-item">
                <span className="label">HORARIO</span>
                <strong className="value text-center" style={{ fontSize: "0.82rem", lineHeight: "1.3", wordBreak: "break-word" }}>
                  {(() => {
                    const infoHorario = parsearHorario(estudiante?.horario);
                    return (
                      <>
                        {infoHorario.nivel && <div style={{ fontWeight: 800 }}>{infoHorario.nivel}</div>}
                        {infoHorario.dias && <div style={{ color: "#475569", marginTop: "2px", fontWeight: 700 }}>{infoHorario.dias}</div>}
                        {infoHorario.hora && <div style={{ color: "#0ea5e9", marginTop: "2px", fontWeight: 700 }}>⏰ {infoHorario.hora}</div>}
                        {!infoHorario.nivel && !infoHorario.dias && !infoHorario.hora && <div>{estudiante?.horario || "No registrado"}</div>}
                      </>
                    );
                  })()}
                </strong>
              </div>
              <div className="detail-item">
                <span className="label">ESTADO PAGO</span>
                <strong className="value badge-success">✅ {estudiante?.estadoPago || "Pagado"}</strong>
              </div>
            </div>
            <div className="kiosk-actions-panel" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className={`kiosk-action-btn primary ${kioskState === "tardanza" ? "warning" : "success"}`}
                style={{ flex: 1 }}
                onClick={() => ejecutarRegistro(estudiante)}
                disabled={registrando}
              >
                {registrando ? "Registrando..." : "Registrar Ingreso 📥"}
              </button>
              <button
                type="button"
                className="kiosk-action-btn secondary"
                onClick={limpiarPuesto}
              >
                Cancelar ❌
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
