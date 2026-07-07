import React from "react";
import {
  IconCamera as Camera,
  IconKeyboard as Keyboard,
  IconLoader2 as Loader2,
  IconQrcode as QrCode,
  IconScan as Scan,
  IconSearch as Search,
  IconVideoOff as VideoOff,
} from "@tabler/icons-react";

export default function AuxiliarConsole({
  modo,
  entrada,
  inputValue,
  setInputValue,
  cargando,
  registrando,
  camaraActiva,
  camaraMensaje,
  videoRef,
  inputRef,
  programas,
  programaSeleccionado,
  setProgramaSeleccionado,
  resultadosBusqueda,
  setResultadosBusqueda,
  cambiarModoQr,
  cambiarModoDni,
  iniciarCamara,
  detenerCamara,
  activarLector,
  handleBuscar,
  seleccionarEstudiante,
}) {
  return (
    <div className="auxiliar-console-card">
      <h3 className="console-card-title">Escaneo de Acceso</h3>

      <div className="auxiliar-mode-tabs" role="tablist" aria-label="Modo de validacion">
        <button type="button" className={modo === "QR" ? "active" : ""} onClick={cambiarModoQr}>
          <QrCode size={20} /> Modo QR
        </button>
        <button type="button" className={modo === "DNI" ? "active" : ""} onClick={cambiarModoDni}>
          <Search size={20} /> DNI / Nombre
        </button>
      </div>

      {modo === "QR" && (
        <div className="qr-scanner-wrapper">
          <div className={`auxiliar-scanner ${entrada === "camara" ? "camera" : "reader"} ${camaraActiva ? "is-active" : ""}`}>
            {entrada === "camara" ? (
              <>
                <video ref={videoRef} muted playsInline aria-label="Vista de camara para escanear QR" />
                {!camaraActiva && (
                  <div className="auxiliar-scanner-placeholder">
                    <Camera size={48} />
                    <strong>Camara apagada</strong>
                    <span>{camaraMensaje}</span>
                  </div>
                )}
                <div className="auxiliar-scan-frame" />
              </>
            ) : (
              <div className="auxiliar-scanner-placeholder">
                <div className="cute-scan-illustration">
                  <Scan size={58} className="scan-icon-animate" />
                  <span className="cute-bubble">🎒</span>
                  <span className="cute-pencil">✏️</span>
                </div>
                <strong>¡Listo para escanear!</strong>
                <span>Apunta el lector físico al código QR</span>
                <div className="auxiliar-scan-frame inline" />
              </div>
            )}

            <button
              className="auxiliar-camera-mini"
              type="button"
              onClick={entrada === "camara" ? activarLector : iniciarCamara}
              disabled={cargando || registrando}
              title={entrada === "camara" ? "Usar lector QR" : "Usar camara PC"}
            >
              {entrada === "camara" ? <Keyboard size={18} /> : <Camera size={18} />}
              {entrada === "camara" ? "Lector Físico" : "Cámara Web"}
            </button>
          </div>

          {entrada === "camara" && (
            <div className="auxiliar-camera-controls">
              <span><Scan size={17} /> {camaraMensaje}</span>
              {camaraActiva ? (
                <button type="button" className="btn-stop-cam" onClick={detenerCamara}>
                  <VideoOff size={18} /> Apagar Cámara
                </button>
              ) : (
                <button type="button" className="btn-start-cam" onClick={iniciarCamara} disabled={cargando || registrando}>
                  <Camera size={18} /> Encender Cámara
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <form className="auxiliar-input-form" onSubmit={handleBuscar}>
        {modo !== "DNI" && (
          <label htmlFor="auxiliar-codigo">
            Código QR (Lectura Manual)
          </label>
        )}

        <div className="input-group">
          <input
            id="auxiliar-codigo"
            ref={inputRef}
            inputMode="text"
            placeholder={modo === "DNI" ? "Escribe el DNI o nombre del alumno..." : "Código QR escaneado..."}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (resultadosBusqueda) setResultadosBusqueda(null);
            }}
          />
          <button type="submit" className="btn-validate" disabled={cargando || registrando}>
            {cargando ? <Loader2 className="auxiliar-spin" size={22} /> : <Search size={22} />}
            Validar
          </button>
        </div>
      </form>

      {resultadosBusqueda && resultadosBusqueda.length > 0 && (
        <div className="search-results-list" style={{ marginTop: "15px", borderTop: "1px dashed #cbd5e1", paddingTop: "12px", maxHeight: "250px", overflowY: "auto" }}>
          <strong style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "8px" }}>
            Alumnos encontrados ({resultadosBusqueda.length})
          </strong>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {resultadosBusqueda.map((est) => {
              const esPermitido = est.accesoPermitido;
              const badgeColor = esPermitido ? "#10b981" : "#ef4444";

              return (
                <button
                  key={`${est.dni}-${est.programaId || "sin-programa"}`}
                  type="button"
                  onClick={() => seleccionarEstudiante(est)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "2.5px solid #bae6fd",
                    backgroundColor: "#f0f9ff",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0ea5e9";
                    e.currentTarget.style.backgroundColor = "#e0f2fe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#bae6fd";
                    e.currentTarget.style.backgroundColor = "#f0f9ff";
                  }}
                >
                  <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                    {est.nombres}
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                    🏫 {est.grado} {est.seccion}
                  </span>
                  {est.programa && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: "4px", fontSize: "0.78rem" }}>
                      <span style={{ color: "#0ea5e9", fontWeight: 700 }}>
                        ⚽ {est.programa}
                      </span>
                      <span style={{ color: badgeColor, fontWeight: 800 }}>
                        {est.estadoPago}
                      </span>
                    </div>
                  )}
                  {!est.programa && (
                    <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>
                      ❌ Sin Matricula Activa
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
