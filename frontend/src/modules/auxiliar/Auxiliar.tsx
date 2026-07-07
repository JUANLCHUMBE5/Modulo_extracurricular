import { useEffect, useRef, useState } from "react";
import { IconLogout as LogOut } from "@tabler/icons-react";
import { toast } from "sonner";
import { registrarAsistencia, validarDni, validarQR, obtenerProgramasActivos } from "./auxiliarService";
import { verificarLlegadaTemprano, esDiaCorrecto } from "./utils/auxiliarAnalytics";
import AuxiliarConsole from "./components/AuxiliarConsole/AuxiliarConsole";
import AuxiliarResult from "./components/AuxiliarResult/AuxiliarResult";
import AuxiliarHistory from "./components/AuxiliarHistory/AuxiliarHistory";
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
  const [programas, setProgramas] = useState([]);
  const [programaSeleccionado, setProgramaSeleccionado] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState(null);
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
    const cargarTalleres = async () => {
      try {
        const list = await obtenerProgramasActivos();
        setProgramas(list || []);
      } catch (err) {
        console.error("Error al cargar talleres:", err);
      }
    };
    cargarTalleres();
  }, []);

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
    setResultadosBusqueda(null);
    inputRef.current?.focus();
  };

  const ejecutarRegistro = async (data = estudiante) => {
    if (!data) return;

    if (!data.accesoPermitido) {
      const detalle = data.accion || "No se puede registrar el ingreso. Verifique el estado del estudiante.";
      agregarHistorial(data, data.estadoAcceso || "no_registrado", detalle);
      return;
    }

    setRegistrando(true);
    try {
      await registrarAsistencia(data, observacion);
      agregarHistorial(data, "registrado", "Ingreso registrado correctamente.");
      setInputValue("");
      setObservacion("");
    } catch (err) {
      agregarHistorial(data, "observado", err.message);
    } finally {
      setRegistrando(false);
    }
  };

  const seleccionarEstudiante = (est) => {
    setEstudiante(est);
    setResultadosBusqueda(null);
    setInputValue(est.nombres || est.dni || "");
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
    setResultadosBusqueda(null);

    try {
      const data = modoValidacion === "DNI"
        ? await validarDni(valor, programaSeleccionado)
        : await validarQR(valor);

      if (data && data.isMultiple) {
        setResultadosBusqueda(data.matches || []);
        setEstudiante(null);
      } else {
        setEstudiante(data);
        setResultadosBusqueda(null);
        setUltimoEvento(null);

        if (modoValidacion === "QR" && autoRegistro) {
          await ejecutarRegistro(data);
        }
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
    setProgramaSeleccionado("");
    setResultadosBusqueda(null);
    inputRef.current?.focus();
  };

  const cambiarModoDni = () => {
    setModo("DNI");
    setEntrada("lector");
    detenerCamara();
    setInputValue("");
    setProgramaSeleccionado("");
    setResultadosBusqueda(null);
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
    if (ultimoEvento?.estado === "observado") return "observado";
    if (!estudiante) return "esperando";
    if (estudiante.estadoAcceso === "pre_inscrito") return "pre-inscrito";
    if (estudiante.estadoAcceso === "ya_registrado") return "ya-registrado";
    if (estudiante.estadoAcceso === "anulado") return "anulado";
    if (estudiante.estadoAcceso === "dia-incorrecto" || estudiante.estadoAcceso === "dia_incorrecto") return "dia-incorrecto";
    if (estudiante.estadoAcceso === "tardanza") return "tardanza";
    if (estudiante.estadoAcceso === "pagado") {
      if (!esDiaCorrecto(estudiante.horario)) {
        return "dia-incorrecto";
      }
      const infoTemprano = verificarLlegadaTemprano(estudiante.horario);
      if (infoTemprano.esTemprano) {
        return "temprano";
      }
      if (infoTemprano.esTarde) {
        return "tarde";
      }
      return "autorizado";
    }
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
          <AuxiliarConsole
            modo={modo}
            entrada={entrada}
            inputValue={inputValue}
            setInputValue={setInputValue}
            cargando={cargando}
            registrando={registrando}
            camaraActiva={camaraActiva}
            camaraMensaje={camaraMensaje}
            videoRef={videoRef}
            inputRef={inputRef}
            programas={programas}
            programaSeleccionado={programaSeleccionado}
            setProgramaSeleccionado={setProgramaSeleccionado}
            resultadosBusqueda={resultadosBusqueda}
            setResultadosBusqueda={setResultadosBusqueda}
            cambiarModoQr={cambiarModoQr}
            cambiarModoDni={cambiarModoDni}
            iniciarCamara={iniciarCamara}
            detenerCamara={detenerCamara}
            activarLector={activarLector}
            handleBuscar={handleBuscar}
            seleccionarEstudiante={seleccionarEstudiante}
          />
        </section>

        {/* COLUMNA DERECHA: RESULTADO EN TIEMPO REAL */}
        <section className="auxiliar-result-col">
          <AuxiliarResult
            kioskState={kioskState}
            estudiante={estudiante}
            ultimoEvento={ultimoEvento}
            observacion={observacion}
            setObservacion={setObservacion}
            registrando={registrando}
            ejecutarRegistro={ejecutarRegistro}
            limpiarPuesto={limpiarPuesto}
          />
        </section>
      </main>

      {/* FOOTER: HISTORIAL RECIENTE */}
      <AuxiliarHistory historial={historial} />
    </div>
  );
}
