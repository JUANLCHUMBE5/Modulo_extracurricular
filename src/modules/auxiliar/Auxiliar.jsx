import { useEffect, useRef, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconCamera as Camera,
  IconCircleCheck as CheckCircle2,
  IconKeyboard as Keyboard,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconQrcode as QrCode,
  IconScan as Scan,
  IconSearch as Search,
  IconVideoOff as VideoOff,
  IconXboxX as XCircle,
  IconSchool as School,
  IconClock as Clock,
  IconUser as User,
  IconAlertTriangle as AlertTriangle
} from "@tabler/icons-react";
import { toast } from "sonner";
import { registrarAsistencia, validarDni, validarQR } from "./auxiliarService";
import "./Auxiliar.css";

export default function Auxiliar({ onLogout }) {
  const [modo, setModo] = useState("QR");
  const [inputValue, setInputValue] = useState("");
  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [observacion, setObservacion] = useState("");
  const autoRegistro = false;
  const [entrada, setEntrada] = useState("lector");
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [camaraMensaje, setCamaraMensaje] = useState("Camara lista.");
  const [ultimoEvento, setUltimoEvento] = useState(null);
  const [historial, setHistorial] = useState([]);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const procesandoCamaraRef = useRef(false);

  const detenerCamara = () => {
    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    procesandoCamaraRef.current = false;
    setCamaraActiva(false);
    setCamaraMensaje("Camara detenida.");
  };

  useEffect(() => {
    if (entrada === "lector" || modo === "DNI") {
      inputRef.current?.focus();
    }
  }, [modo, entrada, estudiante, cargando, registrando]);

  useEffect(() => () => detenerCamara(), []);

  const mostrarMsg = (texto, tipo = "error") => {
    if (tipo === "success") {
      toast.success("Asistencia", { description: texto });
      return;
    }
    toast.warning("Atencion", { description: texto });
  };

  const agregarHistorial = (data, estado, detalle = "") => {
    const evento = {
      id: `${Date.now()}-${data?.dni || data?.codigoEstudiante || "sin-dni"}`,
      hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      estudiante: data?.nombres || "Estudiante no identificado",
      programa: data?.programa || "Sin programa",
      estado,
      detalle
    };

    setUltimoEvento(evento);
    setHistorial((actual) => [evento, ...actual].slice(0, 6));
  };

  const limpiarPuesto = () => {
    setInputValue("");
    setEstudiante(null);
    setObservacion("");
    setUltimoEvento(null);
    inputRef.current?.focus();
  };

  const ejecutarRegistro = async (data = estudiante) => {
    if (!data) return;

    if (!data.accesoPermitido) {
      const detalle = data.accion || "No se puede registrar el ingreso. Verifique el estado del estudiante.";
      agregarHistorial(data, data.estadoAcceso || "no_registrado", detalle);
      mostrarMsg(detalle);
      return;
    }

    setRegistrando(true);
    try {
      await registrarAsistencia(data, observacion);
      agregarHistorial(data, "registrado", "Ingreso registrado correctamente.");
      mostrarMsg(`Ingreso registrado para ${data.nombres}.`, "success");
      setInputValue("");
      setObservacion("");
    } catch (err) {
      agregarHistorial(data, "observado", err.message);
      mostrarMsg(err.message);
    } finally {
      setRegistrando(false);
    }
  };

  const procesarValidacion = async (valorEntrada, modoValidacion = modo) => {
    const valor = String(valorEntrada || "").trim();

    if (!valor) {
      mostrarMsg(`Ingrese un ${modoValidacion === "DNI" ? "DNI o nombre" : "codigo QR"} valido.`);
      return;
    }

    if (modoValidacion === "DNI") {
      if (/^\d+$/.test(valor)) {
        if (valor.length !== 8) {
          mostrarMsg("Por seguridad, el DNI debe contener exactamente 8 numeros.");
          return;
        }
      } else {
        if (valor.length < 3) {
          mostrarMsg("El nombre a buscar debe tener al menos 3 letras.");
          return;
        }
      }
    }

    setCargando(true);
    setEstudiante(null);
    setObservacion("");

    try {
      const data = modoValidacion === "DNI" ? await validarDni(valor) : await validarQR(valor);
      setEstudiante(data);
      setUltimoEvento(null);

      if (modoValidacion === "QR" && autoRegistro) {
        await ejecutarRegistro(data);
      } else {
        mostrarMsg(
          data.accesoPermitido ? "Pago validado. Puede registrar el ingreso." : data.accion,
          data.accesoPermitido ? "success" : "warning"
        );
      }
    } catch (err) {
      setUltimoEvento({
        id: `${Date.now()}-error`,
        hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
        estudiante: "Codigo no reconocido",
        programa: "Revise el QR o busque por DNI",
        estado: "no_registrado",
        detalle: err.message
      });
      mostrarMsg(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    await procesarValidacion(inputValue, modo);
  };

  const iniciarCamara = async () => {
    setEntrada("camara");
    setModo("QR");

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEntrada("lector");
      setCamaraMensaje("Este equipo no permite abrir la camara desde el navegador.");
      mostrarMsg("No se pudo acceder a la camara. Use el lector QR o busque por DNI.");
      return;
    }

    if (!("BarcodeDetector" in window)) {
      setEntrada("lector");
      setCamaraMensaje("El navegador no soporta lectura QR por camara. Use Chrome o Edge actualizado.");
      mostrarMsg("Este navegador no puede leer QR automaticamente. Use lector QR o busque por DNI.");
      return;
    }

    try {
      detenerCamara();
      const formatos = await window.BarcodeDetector.getSupportedFormats?.();
      if (Array.isArray(formatos) && !formatos.includes("qr_code")) {
        throw new Error("El navegador no tiene soporte QR en BarcodeDetector.");
      }

      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCamaraActiva(true);
      setCamaraMensaje("Apunte la camara al QR del estudiante.");

      scanLoopRef.current = window.setInterval(async () => {
        if (procesandoCamaraRef.current || !videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState < 2) return;

        procesandoCamaraRef.current = true;
        try {
          const codigos = await detectorRef.current.detect(videoRef.current);
          const codigoDetectado = codigos?.[0]?.rawValue || "";
          if (codigoDetectado) {
            detenerCamara();
            setInputValue(codigoDetectado);
            setCamaraMensaje("Codigo detectado. Validando...");
            await procesarValidacion(codigoDetectado, "QR");
            return;
          }
        } catch {
          setCamaraMensaje("No se pudo leer el QR. Acerque el codigo o mejore la luz.");
        } finally {
          procesandoCamaraRef.current = false;
        }
      }, 520);
    } catch (err) {
      detenerCamara();
      setEntrada("lector");
      setCamaraMensaje("No se pudo iniciar la camara.");
      mostrarMsg(err.message || "No se pudo iniciar la camara.");
    }
  };

  const activarLector = () => {
    setEntrada("lector");
    detenerCamara();
    inputRef.current?.focus();
  };

  const cambiarModoQr = () => {
    setModo("QR");
    setEntrada("lector");
    detenerCamara();
    setInputValue("");
    inputRef.current?.focus();
  };

  const cambiarModoDni = () => {
    setModo("DNI");
    setEntrada("lector");
    detenerCamara();
    setInputValue("");
  };

  const esInscritoNoMatriculado = estudiante &&
    estudiante.estadoAcceso === "no_registrado" &&
    estudiante.nombres &&
    estudiante.nombres !== "Codigo no registrado" &&
    estudiante.nombres !== estudiante.dni &&
    !estudiante.inscripcionId;

  const getKioskState = () => {
    if (registrando) return "registrando";
    if (cargando) return "cargando";
    if (ultimoEvento?.estado === "registrado") return "registrado-exito";
    if (!estudiante) return "esperando";
    if (estudiante.estadoAcceso === "pagado") return "autorizado";
    if (estudiante.estadoAcceso === "pendiente") return "pendiente";
    if (esInscritoNoMatriculado) return "no-matriculado";
    return "no-registrado";
  };

  const kioskState = getKioskState();

  return (
    <div className={`auxiliar-page kiosk-state-${kioskState}`}>
      <header className="auxiliar-topbar">
        <div className="auxiliar-brand">
          <span className="auxiliar-school-icon">🏫</span>
          <div>
            <span className="auxiliar-kicker">Colegio San Rafael</span>
            <strong className="auxiliar-title">Portal de Ingreso Taller 🎒</strong>
          </div>
        </div>
        <div className="auxiliar-header-actions">
          <div className="auxiliar-clock">
            ⏰ {new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <button className="auxiliar-logout" type="button" onClick={onLogout}>
            <LogOut size={17} /> Salir
          </button>
        </div>
      </header>

      <main className="auxiliar-kiosk">
        {/* COLUMNA IZQUIERDA: ESCÁNER Y ENTRADA */}
        <section className="auxiliar-console-col">
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

            {modo === "QR" ? (
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
            ) : (
              <div className="auxiliar-dni-panel">
                <div className="cute-search-illustration">
                  <User size={52} className="user-icon-animate" />
                  <span className="cute-star">⭐</span>
                </div>
                <strong>Búsqueda por DNI / Nombre</strong>
                <span>Ingresa el DNI o nombre del alumno para buscar su estado de pago.</span>
              </div>
            )}

            <form className="auxiliar-input-form" onSubmit={handleBuscar}>
              <label htmlFor="auxiliar-codigo">
                {modo === "DNI" ? "DNI o Nombre del Alumno" : "Código QR (Lectura Manual)"}
              </label>
              <div className="input-group">
                <input
                  id="auxiliar-codigo"
                  ref={inputRef}
                  inputMode="text"
                  placeholder={modo === "DNI" ? "Escribe el DNI o nombre del alumno..." : "Código QR escaneado..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button type="submit" className="btn-validate" disabled={cargando || registrando}>
                  {cargando ? <Loader2 className="auxiliar-spin" size={22} /> : <Search size={22} />}
                  Validar
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* COLUMNA DERECHA: RESULTADO EN TIEMPO REAL */}
        <section className="auxiliar-result-col">
          {kioskState === "esperando" && (
            <div className="kiosk-status-card state-esperando">
              <div className="kiosk-status-illustration">
                <span className="floating-emoji">🎒</span>
                <span className="floating-emoji second">✨</span>
                <div className="kiosk-pulse-target">
                  <QrCode size={72} />
                </div>
              </div>
              <h2>¡Hola! Bienvenidos 🏫</h2>
              <p className="kiosk-status-message">
                Por favor, acerca tu código QR al lector o cámara para validar tu ingreso al taller.
              </p>
              <div className="kiosk-friendly-tips">
                <span>💡 Auxiliar: También puede buscar digitando el DNI del alumno.</span>
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
              <p className="success-footer-msg">¡Tu ingreso ha sido registrado de manera correcta!</p>
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
          )}

          {kioskState === "autorizado" && (
            <div className="kiosk-status-card state-autorizado">
              <div className="kiosk-status-header-icon success-pop">
                <CheckCircle2 size={72} />
              </div>
              <div className="sparkles-container">
                <span className="sparkle s1">⭐</span>
                <span className="sparkle s2">✨</span>
                <span className="sparkle s3">🌟</span>
              </div>
              <span className="kiosk-badge-tag success">ACCESO PERMITIDO</span>
              <h2 className="student-name">¡Hola, {estudiante.nombres}! 👋</h2>
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
                  <strong className="value">⏰ {estudiante.horario}</strong>
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
          )}

          {kioskState === "pendiente" && (
            <div className="kiosk-status-card state-pendiente">
              <div className="kiosk-status-header-icon warning-shake">
                <AlertTriangle size={72} />
              </div>
              <span className="kiosk-badge-tag warning">PAGO PENDIENTE</span>
              <h2 className="student-name">¡Hola, {estudiante.nombres}! ⏳</h2>
              
              <div className="kiosk-alert-explanation">
                <p><strong>Usted o el alumno no ha realizado el pago.</strong></p>
                <p className="sub-msg">
                  Para poder ingresar a la clase del taller, el apoderado debe regularizar el pago pendiente (en Cajera o Web).
                </p>
              </div>

              <div className="kiosk-student-details-box">
                <div className="detail-item">
                  <span className="label">TALLER</span>
                  <strong className="value">📚 {estudiante.programa}</strong>
                </div>
                <div className="detail-item">
                  <span className="label">ESTADO PAGO</span>
                  <strong className="value badge-warning">⚠️ {estudiante.estadoPago}</strong>
                </div>
              </div>

              <div className="kiosk-actions-panel">
                <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
                  Siguiente Estudiante 🔄
                </button>
              </div>
            </div>
          )}

          {kioskState === "no-matriculado" && (
            <div className="kiosk-status-card state-no-matriculado">
              <div className="kiosk-status-header-icon info-bounce">
                <School size={72} />
              </div>
              <span className="kiosk-badge-tag info">INSCRITO NO MATRICULADO</span>
              <h2 className="student-name">¡Hola, {estudiante.nombres}! 🏫</h2>
              
              <div className="kiosk-alert-explanation">
                <p><strong>Estás inscrito en el colegio, pero no matriculado en este taller.</strong></p>
                <p className="sub-msg">
                  Por favor, acércate con tu apoderado a Asistente para regularizar la matrícula en este programa.
                </p>
              </div>

              <div className="kiosk-student-details-box">
                <div className="detail-item">
                  <span className="label">GRADO / SECCIÓN</span>
                  <strong className="value">🏫 {estudiante.grado} "{estudiante.seccion}"</strong>
                </div>
                <div className="detail-item">
                  <span className="label">TALLER ASOCIADO</span>
                  <strong className="value text-rose-500">❌ Sin Matrícula Activa</strong>
                </div>
              </div>

              <div className="kiosk-actions-panel">
                <button type="button" className="kiosk-action-btn secondary" onClick={limpiarPuesto}>
                  Siguiente Estudiante 🔄
                </button>
              </div>
            </div>
          )}

          {kioskState === "no-registrado" && (
            <div className="kiosk-status-card state-no-registrado">
              <div className="kiosk-status-header-icon error-shake">
                <XCircle size={72} />
              </div>
              <span className="kiosk-badge-tag error">NO REGISTRADO</span>
              <h2 className="student-name">Código no reconocido ❌</h2>
              
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
          )}
        </section>
      </main>

      {/* FOOTER: HISTORIAL RECIENTE */}
      <footer className="auxiliar-footer">
        <div className="auxiliar-footer-header">
          <h3>Últimos Ingresos Registrados ⏰</h3>
          <span className="badge-count">{historial.length} hoy</span>
        </div>
        
        {historial.length > 0 ? (
          <div className="historial-cards-container">
            {historial.map((ev) => {
              const histState = ev.estado === "registrado" 
                ? "success" 
                : ev.estado === "pendiente" 
                  ? "warning" 
                  : "error";
              
              return (
                <div key={ev.id} className={`historial-bubble-card border-${histState}`}>
                  <div className={`historial-badge-icon bg-${histState}`}>
                    {histState === "success" ? "✅" : histState === "warning" ? "⏳" : "❌"}
                  </div>
                  <div className="historial-card-info">
                    <strong className="student-name-small">{ev.estudiante}</strong>
                    <span className="student-detail-small">
                      ⚽ {ev.programa} • ⏰ {ev.hora}
                    </span>
                    <span className={`historial-status-text text-${histState}`}>
                      {ev.estado === "registrado" ? "Ingresó" : ev.estado === "pendiente" ? "Pago Pendiente" : "No Autorizado"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="historial-empty">
            <p>Aún no se registran ingresos en esta sesión. ¡Listo para comenzar! 🌟</p>
          </div>
        )}
      </footer>
    </div>
  );
}
