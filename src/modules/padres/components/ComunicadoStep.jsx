import { useState } from "react";
import {
  IconAlertCircle as AlertCircle,
  IconFileText as FileText,
  IconCalendar as CalendarDays,
} from "@tabler/icons-react";
import PortalBadge from "./PortalBadge";
import { describirSeleccionCambridgePadres } from "../utils/padresTextUtils";

const opcionesCambridge = [
  { id: "A", titulo: "A", detalle: "Promovido/a por Certificado Oficial 2025" },
  { id: "B", titulo: "B", detalle: "Ingresante por Admission Test" },
  { id: "C", titulo: "C", detalle: "Ingresante por Desempeno Academico" },
];

function obtenerTalleresEstructurados(programa) {
  if (!programa) return [];

  const categoria = String(programa.categoria || "").toLowerCase();
  const tieneTalleres = Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0;

  if (categoria !== "deportivo" && !tieneTalleres) {
    return [];
  }

  // 1. Si tiene talleresDeportivos (arreglo estructurado)
  if (tieneTalleres) {
    return programa.talleresDeportivos.map(taller => {
      const nivelLabel = taller.nivel ? ` [${taller.nivel}]` : "";
      const label = `${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} a.) (${taller.horaInicio}-${taller.horaFin})`;
      const horarioCompleto = `${taller.dia}: ${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} a.): ${taller.horaInicio}-${taller.horaFin}`;
      return {
        dia: taller.dia,
        deporte: taller.deporte,
        nivel: taller.nivel || "",
        edadMinima: taller.edadMinima,
        edadMaxima: taller.edadMaxima,
        horaInicio: taller.horaInicio,
        horaFin: taller.horaFin,
        horarioCompleto,
        label,
      };
    });
  }

  // 2. Fallback a parsear el texto de horario
  const texto = String(programa.horario || "").trim();
  if (!texto) return [];

  const sessions = texto.split("/").map(s => s.trim()).filter(Boolean);
  const isComplex = sessions.some(s => s.includes(":"));
  if (!isComplex) return [];

  const resultado = [];
  sessions.forEach((session) => {
    const colonIdx = session.indexOf(":");
    let day = "";
    let content = session;
    if (colonIdx > -1) {
      const left = session.substring(0, colonIdx).trim();
      if (!/\d/.test(left)) {
        day = left;
        content = session.substring(colonIdx + 1).trim();
      }
    }

    const activities = content.split(",").map(a => a.trim()).filter(Boolean);
    activities.forEach((act) => {
      const actColonIdx = act.indexOf(":");
      if (actColonIdx > -1) {
        const name = act.substring(0, actColonIdx).trim();
        const time = act.substring(actColonIdx + 1).trim();

        let deporte = name;
        let edadMinima = "";
        let edadMaxima = "";
        const matchEdad = name.match(/^(.+?)\s*\((\d+)-(\d+)\s*a\.\)/);
        if (matchEdad) {
          deporte = matchEdad[1].trim();
          edadMinima = matchEdad[2];
          edadMaxima = matchEdad[3];
        }

        const label = `${name} (${time})`;
        const horarioCompleto = `${day}: ${name}: ${time}`;

        resultado.push({
          dia: day,
          deporte,
          edadMinima,
          edadMaxima,
          horaInicio: time.split("-")[0]?.trim() || "",
          horaFin: time.split("-")[1]?.trim() || "",
          horarioCompleto,
          label,
        });
      }
    });
  });

  return resultado;
}

function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1].trim();
  if (Number.isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 should be 12
  return `${hour}:${minute} ${ampm}`;
}

function obtenerEmojiDeporte(deporte) {
  const d = String(deporte || "").toLowerCase();
  if (d.includes("futbol") || d.includes("fútbol")) return "⚽";
  if (d.includes("basquet") || d.includes("básquet") || d.includes("basketball")) return "🏀";
  if (d.includes("voley") || d.includes("vóley") || d.includes("volleyball")) return "🏐";
  return "🏆";
}

export default function ComunicadoStep({
  comunicadoPadres,
  infoProgramaAceptada,
  programa,
  setInfoProgramaAbierta,
  setPasoActivo,
  horarioSeleccionado,
  setHorarioSeleccionado,
  tallaPolo,
  setTallaPolo,
  tallaShort,
  setTallaShort,
  tallaUniforme,
  setTallaUniforme,
}) {
  if (!programa) {
    return (
      <article className="padres-flow-panel padres-flow-empty-inline">
        <AlertCircle size={24} />
        <strong>Sin comunicado disponible</strong>
        <p>Primero Coordinación debe asignar o publicar un programa.</p>
      </article>
    );
  }

  const talleres = obtenerTalleresEstructurados(programa);
  const tieneOpciones = talleres.length > 0;
  
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    if (horarioSeleccionado && horarioSeleccionado.includes(":")) {
      return horarioSeleccionado.split(":")[0].trim();
    }
    return "";
  });

  const diasDisponibles = Array.from(new Set(talleres.map(t => t.dia).filter(Boolean)));
  const talleresFiltrados = talleres.filter(t => t.dia === diaSeleccionado);

  const manejarCambioDia = (dia) => {
    setDiaSeleccionado(dia);
    setHorarioSeleccionado("");
  };

  const requierePoloYShort = Boolean(programa.requiereIndumentaria);
  const requiereTallaUniforme = Boolean(programa.requiereUniforme);
  const faltanTallas = (requierePoloYShort && (!tallaPolo || !tallaShort)) || (requiereTallaUniforme && !tallaUniforme);

  const continuarDeshabilitado = (tieneOpciones && !horarioSeleccionado) || faltanTallas;

  const esDeportivo = String(programa.categoria || "").toLowerCase() === "deportivo";
  const tieneComunicadoTexto = Boolean(programa.comunicado || programa.comunicadoCompleto);
  const mostrarCarta = !esDeportivo || tieneComunicadoTexto;

  return (
    <article className="padres-flow-panel padres-flow-step-panel">
      {!mostrarCarta ? (
        <div className="padres-flow-section-title">
          <div>
            <PortalBadge tone="orange">Datos de inscripción</PortalBadge>
            <h2>Complete los datos de la inscripción</h2>
            <p>
              {requierePoloYShort || requiereTallaUniforme
                ? "Seleccione el deporte/grupo de edad y las tallas requeridas para continuar."
                : "Seleccione el deporte/grupo de edad para continuar."}
            </p>
          </div>
        </div>
      ) : (
        <div className="padres-flow-section-title">
          <div>
            <PortalBadge tone="orange">Comunicado oficial</PortalBadge>
            <h2>Revise la información del programa</h2>
            <p>La familia debe leer y aceptar el comunicado antes de confirmar datos y pasar al pago.</p>
          </div>
        </div>
      )}

      {mostrarCarta ? (
        <>
          <div className="padres-flow-letter">
            {comunicadoPadres.fecha ? <p>{comunicadoPadres.fecha}</p> : null}
            {(comunicadoPadres.resumenParrafos || comunicadoPadres.parrafos).map((parrafo, index) => (
              <p key={`${index}-${parrafo}`}>{parrafo}</p>
            ))}
          </div>

          {comunicadoPadres.datosCambridge ? (
            <div className="padres-flow-requirements">
              <h3>Resumen Cambridge</h3>
              <div className="padres-cambridge-summary">
                <div className="padres-cambridge-selected">
                  <span>Modalidad asignada</span>
                  <strong>{describirSeleccionCambridgePadres(comunicadoPadres.datosCambridge.seleccion)}</strong>
                  {comunicadoPadres.datosCambridge.nivelCambridge ? (
                    <small>Nivel Cambridge: {comunicadoPadres.datosCambridge.nivelCambridge}</small>
                  ) : null}
                </div>
                <div className="padres-cambridge-options" aria-label="Opciones de modalidad Cambridge">
                  {opcionesCambridge.map((opcion) => {
                    const seleccionada = String(comunicadoPadres.datosCambridge.seleccion || "").trim().toUpperCase() === opcion.id;
                    return (
                      <div className={`padres-cambridge-option ${seleccionada ? "is-selected" : ""}`} key={opcion.id}>
                        <span className="padres-cambridge-check">{seleccionada ? "✓" : ""}</span>
                        <div>
                          <strong>{opcion.titulo}</strong>
                          <small>{opcion.detalle}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tieneOpciones ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
          background: "#f8fafc",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginTop: "12px"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              1. Seleccione el día:
            </label>
            <select
              value={diaSeleccionado}
              onChange={(e) => manejarCambioDia(e.target.value)}
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "14px",
                color: "#1e293b",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <option value="">-- Seleccionar día --</option>
              {diasDisponibles.map((dia) => (
                <option key={dia} value={dia}>
                  Solo disponible el {dia}
                </option>
              ))}
            </select>
          </div>

          {diaSeleccionado ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              <label style={{ fontSize: "13px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                2. Seleccione el deporte y grupo de edad:
              </label>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
                marginTop: "4px"
              }}>
                {talleresFiltrados.map((opc) => {
                  const seleccionado = horarioSeleccionado === opc.horarioCompleto;
                  const emoji = obtenerEmojiDeporte(opc.deporte);

                  const edadTexto = opc.edadMinima && opc.edadMaxima
                    ? `De ${opc.edadMinima} a ${opc.edadMaxima} años`
                    : "Todas las edades";

                  const horaTexto = opc.horaInicio && opc.horaFin
                    ? `${formatTime12h(opc.horaInicio)} a ${formatTime12h(opc.horaFin)}`
                    : opc.label;

                  return (
                    <button
                      key={opc.horarioCompleto}
                      type="button"
                      onClick={() => setHorarioSeleccionado(opc.horarioCompleto)}
                      style={{
                        textAlign: "left",
                        padding: "16px",
                        borderRadius: "14px",
                        border: seleccionado ? "2.5px solid #ea580c" : "1.5px solid #cbd5e1",
                        background: seleccionado ? "#fff7ed" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        transition: "all 0.2s ease",
                        boxShadow: seleccionado ? "0 4px 12px rgba(234, 88, 12, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                        outline: "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>{emoji}</span>
                        <strong style={{ fontSize: "15px", color: seleccionado ? "#ea580c" : "#1e293b", fontWeight: "800" }}>
                          {opc.deporte}{opc.nivel ? ` [${opc.nivel}]` : ""}
                        </strong>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569", fontWeight: "700" }}>
                          <span>👥</span>
                          <span>{edadTexto}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569", fontWeight: "700" }}>
                          <span>⏰</span>
                          <span>{horaTexto}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!horarioSeleccionado ? (
                <span style={{ fontSize: "11px", color: "#f97316", fontWeight: "700", marginTop: "4px" }}>
                  ⚠️ Debe seleccionar un grupo para poder continuar con la inscripción.
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {(requierePoloYShort || requiereTallaUniforme) ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
          background: "#f0f7ff",
          borderRadius: "12px",
          border: "1px solid #bfdbfe",
          marginTop: "12px"
        }}>
          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Tallas Requeridas para la Indumentaria:
          </h4>
          
          {requierePoloYShort ? (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "120px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151" }}>Talla de Polo *</label>
                <select
                  value={tallaPolo}
                  onChange={(e) => setTallaPolo(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "38px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {["4", "6", "8", "10", "12", "14", "16", "S", "M", "L", "XL"].map(t => (
                    <option key={t} value={t}>Talla {t}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "120px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151" }}>Talla de Short *</label>
                <select
                  value={tallaShort}
                  onChange={(e) => setTallaShort(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "38px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {["4", "6", "8", "10", "12", "14", "16", "S", "M", "L", "XL"].map(t => (
                    <option key={t} value={t}>Talla {t}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {requiereTallaUniforme ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151" }}>Talla de Uniforme *</label>
              <select
                value={tallaUniforme}
                onChange={(e) => setTallaUniforme(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "38px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600"
                }}
              >
                <option value="">-- Seleccionar --</option>
                {["4", "6", "8", "10", "12", "14", "16", "S", "M", "L", "XL"].map(t => (
                  <option key={t} value={t}>Talla {t}</option>
                ))}
              </select>
            </div>
          ) : null}

          {faltanTallas ? (
            <span style={{ fontSize: "11px", color: "#b91c1c", fontWeight: "700", marginTop: "4px" }}>
              ⚠️ Debe seleccionar las tallas correspondientes para continuar con la inscripción.
            </span>
          ) : null}
        </div>
      ) : null}


      {mostrarCarta ? (
        <div className={`padres-flow-read-card${infoProgramaAceptada ? " is-accepted" : ""}`}>
          <div>
            <strong>{infoProgramaAceptada ? "Comunicado aceptado" : "Lectura requerida"}</strong>
            <p>
              {infoProgramaAceptada
                ? "La familia ya aceptó la información del programa."
                : "Abra el comunicado completo, revise las condiciones y marque la aceptación al final."}
            </p>
          </div>
          <button className="padres-flow-secondary-button" type="button" onClick={() => setInfoProgramaAbierta(true)}>
            <FileText size={16} />
            {infoProgramaAceptada ? "Ver comunicado" : "Leer comunicado completo"}
          </button>
        </div>
      ) : null}

      <div className="padres-flow-actions">
        <button
          className="padres-flow-primary-button"
          type="button"
          disabled={(mostrarCarta ? !infoProgramaAceptada : false) || continuarDeshabilitado}
          onClick={() => setPasoActivo(2)}
        >
          Continuar a datos
        </button>
      </div>
    </article>
  );
}
