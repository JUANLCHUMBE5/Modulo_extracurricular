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
  IconXboxX as XCircle
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
      mostrarMsg(`Ingrese un ${modoValidacion === "DNI" ? "DNI" : "codigo QR"} valido.`);
      return;
    }

    if (modoValidacion === "DNI" && !/^\d{8}$/.test(valor)) {
      mostrarMsg("Por seguridad, el DNI debe contener exactamente 8 numeros.");
      return;
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

  const estadoAcceso = ultimoEvento?.estado === "registrado"
    ? "registrado"
    : estudiante?.estadoAcceso || ultimoEvento?.estado || "esperando";

  const tituloEstado = ultimoEvento?.estado === "registrado"
    ? "Ingreso registrado"
    : estadoAcceso === "pagado"
      ? "Pago validado"
      : estadoAcceso === "pendiente"
        ? "Pago pendiente"
        : estadoAcceso === "no_registrado" || ultimoEvento?.estado === "observado"
          ? "No registrado"
        : "Esperando escaneo";

  const estadoResultado = estudiante?.estadoAcceso || "";
  const resultadoPermitido = estadoResultado === "pagado";
  const resultadoPendiente = estadoResultado === "pendiente";
  const resultadoTitulo = resultadoPermitido
    ? "Pago validado - acceso permitido"
    : resultadoPendiente
      ? "Pago pendiente"
      : "No registrado";
  const resultadoIcono = resultadoPermitido
    ? <CheckCircle2 size={22} />
    : resultadoPendiente
      ? <AlertCircle size={22} />
      : <XCircle size={22} />;
  const badgeEstado = resultadoPermitido ? "ok" : resultadoPendiente ? "warning" : "error";
  const iconoEstadoPrincipal = estadoAcceso === "pagado" || estadoAcceso === "registrado"
    ? <CheckCircle2 size={36} />
    : estadoAcceso === "pendiente"
      ? <AlertCircle size={36} />
      : estadoAcceso === "no_registrado" || estadoAcceso === "observado"
        ? <XCircle size={36} />
        : <QrCode size={36} />;
  const textoEstadoPrincipal = ultimoEvento?.detalle
    || estudiante?.accion
    || (modo === "DNI" ? "Ingrese el DNI de respaldo." : "Escanee el QR con lector fisico o camara.");

  return (
    <div className={`auxiliar-page state-${estadoAcceso}`}>
      <header className="auxiliar-topbar">
        <div>
          <span>Auxiliar de ingreso</span>
          <strong>Validacion QR / DNI</strong>
        </div>
        <button className="auxiliar-logout" type="button" onClick={onLogout}>
          <LogOut size={17} /> Salir
        </button>
      </header>

      <main className="auxiliar-kiosk">
        <section className={`auxiliar-status-hero ${estadoAcceso}`}>
          <span className="auxiliar-status-icon">{iconoEstadoPrincipal}</span>
          <div>
            <span className="auxiliar-status-kicker">{new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
            <h1>{tituloEstado}</h1>
            <p>{textoEstadoPrincipal}</p>
          </div>
        </section>

        <section className="auxiliar-scan-console">
          <div className="auxiliar-mode-tabs" role="tablist" aria-label="Modo de validacion">
            <button type="button" className={modo === "QR" ? "active" : ""} onClick={cambiarModoQr}>
              <QrCode size={20} /> QR
            </button>
            <button type="button" className={modo === "DNI" ? "active" : ""} onClick={cambiarModoDni}>
              <Search size={20} /> DNI
            </button>
          </div>

          {modo === "QR" ? (
            <>
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
                    <Scan size={58} />
                    <strong>Listo para escanear</strong>
                    <span>El lector escribira el codigo aqui.</span>
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
                  {entrada === "camara" ? "Lector" : "Camara"}
                </button>
              </div>

              {entrada === "camara" && (
                <div className="auxiliar-camera-controls">
                  <span><Scan size={17} /> {camaraMensaje}</span>
                  {camaraActiva ? (
                    <button type="button" onClick={detenerCamara}>
                      <VideoOff size={18} /> Detener
                    </button>
                  ) : (
                    <button type="button" onClick={iniciarCamara} disabled={cargando || registrando}>
                      <Camera size={18} /> Activar
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="auxiliar-dni-panel">
              <Search size={52} />
              <strong>Busqueda por DNI</strong>
              <span>Solo para respaldo cuando el QR no pueda leerse.</span>
            </div>
          )}

          <form className="auxiliar-input-form" onSubmit={handleBuscar}>
            <label htmlFor="auxiliar-codigo">{modo === "DNI" ? "DNI" : "Codigo QR"}</label>
            <div>
              <input
                id="auxiliar-codigo"
                ref={inputRef}
                inputMode={modo === "DNI" ? "numeric" : "text"}
                placeholder={modo === "DNI" ? "DNI del estudiante" : "Escanee o pegue el codigo"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" disabled={cargando || registrando}>
                {cargando ? <Loader2 className="auxiliar-spin" size={22} /> : <Search size={22} />}
                Validar
              </button>
            </div>
          </form>
        </section>

        {(estudiante || ultimoEvento) && (
        <section className={`auxiliar-result ${estudiante ? `status-${estudiante.estadoAcceso}` : "empty"}`}>
          {estudiante ? (
            <>
              <div className="auxiliar-result-main">
                <span>{resultadoIcono}</span>
                <div>
                  <strong>{resultadoTitulo}</strong>
                  <p>{estudiante.accion}</p>
                </div>
              </div>

              <div className="auxiliar-student-line">
                <strong>{estudiante.nombres}</strong>
                <span>{estudiante.dni || "Sin DNI"} {estudiante.codigoEstudiante ? `- ${estudiante.codigoEstudiante}` : ""}</span>
              </div>

              <div className="auxiliar-result-grid">
                <div>
                  <span>Programa</span>
                  <strong>{estudiante.programa}</strong>
                </div>
                <div>
                  <span>Horario</span>
                  <strong>{estudiante.horario}</strong>
                </div>
                <div>
                  <span>Pago</span>
                  <strong className={`status-badge ${badgeEstado}`}>{estudiante.estadoPago}</strong>
                </div>
              </div>

              <div className="auxiliar-result-actions">
                <button type="button" onClick={limpiarPuesto}>
                  Nuevo escaneo
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() => ejecutarRegistro()}
                  disabled={registrando || !estudiante.accesoPermitido}
                >
                  {registrando ? <Loader2 className="auxiliar-spin" size={20} /> : <CheckCircle2 size={20} />}
                  Registrar ingreso
                </button>
              </div>
            </>
          ) : (
            <div className="auxiliar-result-empty">
              <QrCode size={34} />
              <strong>Sin lectura</strong>
              <span>Escanee un QR o ingrese DNI.</span>
            </div>
          )}
        </section>
        )}
      </main>
    </div>
  );
}
