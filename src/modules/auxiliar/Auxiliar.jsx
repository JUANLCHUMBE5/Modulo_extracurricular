import { useEffect, useRef, useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconQrcode as QrCode,
  IconRefresh as Refresh,
  IconSearch as Search,
  IconUserCheck as UserCheck,
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
  const [autoRegistro, setAutoRegistro] = useState(true);
  const [ultimoEvento, setUltimoEvento] = useState(null);
  const [historial, setHistorial] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [modo, estudiante, cargando, registrando]);

  const mostrarMsg = (texto, tipo = "error") => {
    if (tipo === "success") {
      toast.success("Asistencia", { description: texto });
      return;
    }
    toast.warning("Atencion", { description: texto });
  };

  const agregarHistorial = (data, estado, detalle = "") => {
    const evento = {
      id: `${Date.now()}-${data?.dni || "sin-dni"}`,
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

    if (data.estadoPago !== "Validado") {
      const detalle = "Pago pendiente de validacion por Caja.";
      agregarHistorial(data, "bloqueado", detalle);
      mostrarMsg("No se puede registrar el ingreso. El pago no esta validado por Caja.");
      return;
    }

    setRegistrando(true);
    try {
      await registrarAsistencia(data.dni, observacion);
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

  const handleBuscar = async (e) => {
    e.preventDefault();
    const valor = inputValue.trim();

    if (!valor) {
      mostrarMsg(`Ingrese un ${modo === "DNI" ? "DNI" : "codigo QR"} valido.`);
      return;
    }

    if (modo === "DNI" && !/^\d{8}$/.test(valor)) {
      mostrarMsg("Por seguridad, el DNI debe contener exactamente 8 numeros.");
      return;
    }

    setCargando(true);
    setEstudiante(null);
    setObservacion("");

    try {
      const data = modo === "DNI" ? await validarDni(valor) : await validarQR(valor);
      setEstudiante(data);
      setUltimoEvento(null);

      if (modo === "QR" && autoRegistro) {
        await ejecutarRegistro(data);
      } else {
        mostrarMsg("Datos del estudiante recuperados.", "success");
      }
    } catch (err) {
      setUltimoEvento({
        id: `${Date.now()}-error`,
        hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
        estudiante: "Codigo no reconocido",
        programa: "Revise el QR o busque por DNI",
        estado: "observado",
        detalle: err.message
      });
      mostrarMsg(err.message);
    } finally {
      setCargando(false);
    }
  };

  const estadoAcceso = estudiante?.estadoPago === "Validado"
    ? "permitido"
    : estudiante
      ? "bloqueado"
      : ultimoEvento?.estado || "esperando";

  const tituloEstado = ultimoEvento?.estado === "registrado"
    ? "Ingreso registrado"
    : estadoAcceso === "permitido"
      ? "Listo para registrar"
      : estadoAcceso === "bloqueado" || ultimoEvento?.estado === "observado"
        ? "Revisar antes de ingresar"
        : "Esperando escaneo";

  return (
    <div className="auxiliar-page">
      <main className="auxiliar-shell">
        <header className="auxiliar-header">
          <div>
            <span>Panel de Auxiliar</span>
            <h1>Control de ingreso por QR</h1>
            <p>Escanee el codigo del alumno, valide su acceso y registre la asistencia al instante.</p>
          </div>
          <button className="auxiliar-logout" type="button" onClick={onLogout}>
            <LogOut size={16} /> Cerrar sesion
          </button>
        </header>

        <section className="auxiliar-workspace" data-state={estadoAcceso}>
          <article className="auxiliar-scan-panel">
            <div className="auxiliar-card-title">
              <span className="auxiliar-title-icon"><UserCheck size={24} /></span>
              <div>
                <h2>Puesto de escaneo</h2>
                <p>El campo queda listo para recibir el lector QR. Use DNI solo como respaldo.</p>
              </div>
            </div>

            <div className="auxiliar-tabs" role="tablist" aria-label="Modo de validacion">
              <button type="button" className={`auxiliar-tab ${modo === "QR" ? "active" : ""}`} onClick={() => setModo("QR")}>
                <QrCode size={18} /> Escanear QR
              </button>
              <button type="button" className={`auxiliar-tab ${modo === "DNI" ? "active" : ""}`} onClick={() => setModo("DNI")}>
                <Search size={18} /> Buscar por DNI
              </button>
            </div>

            <form className="auxiliar-form" onSubmit={handleBuscar}>
              <div className="auxiliar-field">
                <label htmlFor="auxiliar-codigo">{modo === "DNI" ? "DNI del estudiante" : "Codigo QR del estudiante"}</label>
                <div className="auxiliar-input-group">
                  <input
                    id="auxiliar-codigo"
                    ref={inputRef}
                    inputMode={modo === "DNI" ? "numeric" : "text"}
                    placeholder={modo === "DNI" ? "Ej: 12345678" : "Escanee el QR aqui"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <button type="submit" className="auxiliar-primary-button" disabled={cargando || registrando}>
                    {cargando ? <Loader2 className="auxiliar-spin" size={20} /> : <Search size={20} />}
                    Validar
                  </button>
                </div>
              </div>
            </form>

            <div className="auxiliar-options">
              <label className="auxiliar-switch">
                <input
                  type="checkbox"
                  checked={autoRegistro}
                  onChange={(e) => setAutoRegistro(e.target.checked)}
                  disabled={modo !== "QR"}
                />
                <span>Registrar automaticamente al leer QR</span>
              </label>
              <button type="button" className="auxiliar-secondary-button" onClick={limpiarPuesto}>
                <Refresh size={18} /> Limpiar
              </button>
            </div>

            {estudiante && (
              <div className={`auxiliar-result-box ${estudiante.estadoPago === "Validado" ? "status-valid" : "status-invalid"}`}>
                <h3>
                  {estudiante.estadoPago === "Validado" ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  {estudiante.estadoPago === "Validado" ? "Acceso permitido" : "Acceso bloqueado"}
                </h3>
                <div className="auxiliar-info-grid">
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Estudiante</span>
                    <span className="auxiliar-info-value">{estudiante.nombres}</span>
                  </div>
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Programa</span>
                    <span className="auxiliar-info-value">{estudiante.programa}</span>
                  </div>
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Horario</span>
                    <span className="auxiliar-info-value">{estudiante.horario}</span>
                  </div>
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Estado de pago</span>
                    <span className={`status-badge ${estudiante.estadoPago === "Validado" ? "ok" : "error"}`}>
                      {estudiante.estadoPago}
                    </span>
                  </div>
                </div>

                <div className="auxiliar-field">
                  <label htmlFor="auxiliar-observacion">Observacion</label>
                  <textarea
                    id="auxiliar-observacion"
                    placeholder="Ej: ingreso tarde, cambio de puerta, incidencia..."
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    rows={2}
                  />
                </div>

                <button
                  className="auxiliar-success-button"
                  type="button"
                  onClick={() => ejecutarRegistro()}
                  disabled={registrando || estudiante.estadoPago !== "Validado"}
                >
                  {registrando ? <Loader2 className="auxiliar-spin" size={20} /> : <CheckCircle2 size={20} />}
                  Registrar ingreso
                </button>
              </div>
            )}
          </article>

          <aside className="auxiliar-status-panel">
            <div className={`auxiliar-access-state ${estadoAcceso}`}>
              <span className="auxiliar-access-icon">
                {estadoAcceso === "permitido" || ultimoEvento?.estado === "registrado" ? (
                  <CheckCircle2 size={36} />
                ) : estadoAcceso === "bloqueado" || ultimoEvento?.estado === "observado" ? (
                  <AlertCircle size={36} />
                ) : (
                  <QrCode size={36} />
                )}
              </span>
              <strong>{tituloEstado}</strong>
              <p>{ultimoEvento?.detalle || "Mantenga el cursor en el campo de QR para atender al siguiente alumno."}</p>
            </div>

            <div className="auxiliar-history">
              <h2>Ultimos ingresos</h2>
              {historial.length === 0 ? (
                <p className="auxiliar-empty">Aun no hay registros en esta sesion.</p>
              ) : (
                <ul>
                  {historial.map((item) => (
                    <li key={item.id} className={`auxiliar-history-item ${item.estado}`}>
                      <span>{item.hora}</span>
                      <div>
                        <strong>{item.estudiante}</strong>
                        <small>{item.programa}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
