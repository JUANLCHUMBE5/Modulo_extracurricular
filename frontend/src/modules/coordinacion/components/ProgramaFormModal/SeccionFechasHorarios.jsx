import { useState, useEffect } from "react";
import {
  IconCalendar as CalendarDays,
  IconPlus as Plus,
  IconX as X,
  IconEdit as Edit3,
  IconCopy as CopyIcon,
} from "@tabler/icons-react";
import ProgramaGrupoHorarioModal from "../ProgramaGrupoHorarioModal";
import GradeSelector from "../GradeSelector";
import { formatearHora12 } from "../../utils/coordinacionFormatters";
import { resumenGrados } from "../../utils/coordinacionProgramUtils";

const grupoHorarioDraftInicial = {
  grados: [],
  dia: "Jueves",
  aula: "",
  almuerzoInicio: "14:20",
  almuerzoFin: "15:10",
  horaInicio: "15:20",
  horaFin: "17:20",
  responsable: "",
  tutora: "",
  cupos: 20,
};

function SeccionFechasHorarios({
  form,
  esFormularioVerano,
  esMaratonForm,
  esCambridgeForm,
  puedeGestionarGruposFormulario,
  usaTalleresPorEdad,
  duracionTallerFormulario,
  formHorariosPorGrupo,
  diasSemana,
  esDeportivoForm,
  tallerDepForm,
  setTallerDepForm,
  indiceTallerEditando,
  nivelesGrados,
  toggleGrado,
  actualizarForm,
  actualizarGrupoHorario,
  agregarGrupoHorario,
  quitarGrupoHorario,
  agregarTallerDeportivo,
  quitarTallerDeportivo,
  iniciarEdicionTaller,
  cancelarEdicionTaller,
  actualizarInvitacionMasiva,
}) {
  const [mostrarGrupoModal, setMostrarGrupoModal] = useState(false);
  const [grupoDraft, setGrupoDraft] = useState(grupoHorarioDraftInicial);
  const [grupoDraftError, setGrupoDraftError] = useState("");
  const [grupoDraftErrorTick, setGrupoDraftErrorTick] = useState(0);
  const [indiceGrupoEditando, setIndiceGrupoEditando] = useState(null);

  const usaFormularioPorBloques = true;

  function actualizarGrupoDraft(campo, valor) {
    setGrupoDraftError("");
    setGrupoDraft((actual) => ({ ...actual, [campo]: valor }));
  }

  function toggleGradoDraft(valor) {
    setGrupoDraftError("");
    setGrupoDraft((actual) => {
      const grados = Array.isArray(actual.grados) ? actual.grados : [];
      return {
        ...actual,
        grados: grados.includes(valor)
          ? grados.filter((item) => item !== valor)
          : [...grados, valor],
      };
    });
  }

  function cerrarGrupoModal() {
    setMostrarGrupoModal(false);
    setGrupoDraft(grupoHorarioDraftInicial);
    setGrupoDraftError("");
    setIndiceGrupoEditando(null);
  }

  function guardarGrupoDraft() {
    const grados = Array.isArray(grupoDraft.grados) ? grupoDraft.grados.filter(Boolean) : [];
    const dias = String(grupoDraft.dia || "").split(",").map(d => d.trim()).filter(Boolean);

    const targetHoraInicio = grupoDraft.horaInicio || "15:20";
    const targetHoraFin = grupoDraft.horaFin || "17:20";
    const targetAlmInicio = grupoDraft.almuerzoInicio || "";
    const targetAlmFin = grupoDraft.almuerzoFin || "";
    const targetAula = grupoDraft.aula || "";

    if ((!esCambridgeForm && !grados.length) || !dias.length) {
      setGrupoDraftError(esCambridgeForm ? "Faltan días del bloque." : "Faltan grados o días del bloque.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    if (!targetHoraInicio || !targetHoraFin) {
      setGrupoDraftError("Defina las horas de inicio y fin de clase.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }
    if (targetHoraInicio >= targetHoraFin) {
      setGrupoDraftError("La hora de inicio de clase debe ser menor a la hora de fin.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    if (grupoDraft.almuerzoInicio && grupoDraft.almuerzoFin) {
      if (!targetAlmInicio || !targetAlmFin) {
        setGrupoDraftError("Complete las horas de inicio y fin de almuerzo.");
        setGrupoDraftErrorTick((actual) => actual + 1);
        return;
      }
      if (targetAlmInicio >= targetAlmFin) {
        setGrupoDraftError("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
        setGrupoDraftErrorTick((actual) => actual + 1);
        return;
      }
    }

    if (!String(grupoDraft.responsable || "").trim()) {
      setGrupoDraftError("Ingrese el docente o tutor responsable del bloque.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    const cuposVal = Number(grupoDraft.cupos);
    if (grupoDraft.cupos === "" || Number.isNaN(cuposVal) || cuposVal <= 0) {
      setGrupoDraftError("Ingrese un número de cupos válido para el bloque (mínimo 1).");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    const grupoCompleto = {
      ...grupoDraft,
      horaInicio: targetHoraInicio,
      horaFin: targetHoraFin,
      almuerzoInicio: targetAlmInicio,
      almuerzoFin: targetAlmFin,
      aula: targetAula,
    };

    if (indiceGrupoEditando !== null) {
      actualizarGrupoHorario(indiceGrupoEditando, grupoCompleto);
    } else {
      agregarGrupoHorario({ ...grupoCompleto, id: grupoDraft.id || `grupo-${Date.now()}` });
    }
    cerrarGrupoModal();
  }

  if (esMaratonForm) {
    return (
      <section className="coord-form-section">
        <div className="coord-section-heading">
          <CalendarDays size={18} />
          <div>
            <h3>Fechas y horario de la maratón</h3>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Fila 1: Vigencia */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Fecha de inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Fecha de fin</label>
              <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Duración</label>
              <div className="coord-readonly-field" style={{ height: "38px", display: "flex", alignItems: "center", background: "#f8fafc", padding: "0 12px", borderRadius: "6px", border: "1px solid #cbd5e1", color: "#475569" }}>
                {duracionTallerFormulario || "Seleccione fechas"}
              </div>
            </div>
          </div>

          {/* Fila 2: Horario Maratón */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Hora inicio clase</label>
              <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Hora fin clase</label>
              <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Cupos máximos</label>
              <input
                type="number"
                min="1"
                value={form.cupos}
                onChange={e => actualizarForm("cupos", e.target.value)}
                placeholder="Ej: 50"
              />
            </div>
          </div>

          {/* Fila 3: Publicación e Inscripción */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Fecha de publicación</label>
              <input
                type="date"
                value={form.fechaAperturaInscripcion || ""}
                onChange={e => actualizarForm("fechaAperturaInscripcion", e.target.value)}
              />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Hora de apertura</label>
              <input
                type="time"
                value={form.horaAperturaInscripcion || ""}
                onChange={e => actualizarForm("horaAperturaInscripcion", e.target.value)}
              />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Fecha límite de inscripción</label>
              <input
                type="date"
                value={form.fechaLimiteInscripcion || ""}
                onChange={e => actualizarForm("fechaLimiteInscripcion", e.target.value)}
              />
            </div>
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054" }}>Hora límite</label>
              <input
                type="time"
                value={form.horaLimiteInscripcion || "23:59"}
                onChange={e => actualizarForm("horaLimiteInscripcion", e.target.value)}
              />
            </div>
          </div>

          <div className="coord-field coord-field-full">
            <label style={{ fontWeight: "600", color: "#344054" }}>Grados habilitados</label>
            <GradeSelector niveles={nivelesGrados} seleccionados={form.gradosAplicables || []} onToggle={toggleGrado} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <CalendarDays size={18} />
        <div>
          <h3>{esFormularioVerano ? "Fechas y horario de verano" : "Vigencia y horarios de atención"}</h3>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          background: "#ffffff",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1"
        }}>
          {/* 1. FECHA DE INICIO DE TALLER */}
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Fecha de inicio de taller</label>
            <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
          </div>

          {/* 2. FECHA DE FIN DE TALLER */}
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Fecha de fin de taller</label>
            <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
          </div>

          {/* Duración (ReadOnly útil para el usuario) */}
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Duración</label>
            <div className="coord-readonly-field" style={{ height: "38px", display: "flex", alignItems: "center", background: "#f8fafc", padding: "0 12px", borderRadius: "6px", border: "1px solid #cbd5e1", color: "#475569", fontWeight: "600" }}>
              {duracionTallerFormulario || "Seleccione fechas"}
            </div>
          </div>

          {/* Invitación masiva en Padres */}
          {!esFormularioVerano ? (
            <div className="coord-field">
              <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Invitación masiva</label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: form.invitacionMasiva ? "#eef2ff" : "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.invitacionMasiva}
                  onChange={e => actualizarInvitacionMasiva(e.target.checked)}
                  style={{ accentColor: "#4f46e5", width: "15px", height: "15px" }}
                />
                <span style={{ fontSize: "12.5px", fontWeight: "500", color: form.invitacionMasiva ? "#3730a3" : "#64748b", whiteSpace: "nowrap" }}>
                  {form.invitacionMasiva ? "Activada" : "Desactivada"}
                </span>
              </label>
              {form.invitacionMasiva && (
                <select
                  value={form.alcanceInvitacionMasiva || "colegio"}
                  onChange={e => actualizarForm("alcanceInvitacionMasiva", e.target.value)}
                  style={{ marginTop: "6px", fontSize: "12px", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", padding: "0 8px", background: "#fff" }}
                >
                  <option value="colegio">Todo el colegio</option>
                  <option value="inicial">Solo Inicial</option>
                  <option value="primaria">Solo Primaria</option>
                  <option value="secundaria">Solo Secundaria</option>
                </select>
              )}
            </div>
          ) : <div></div>}

          {/* 4. FECHA Y HORA DE PUBLICACION */}
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Fecha de publicación</label>
            <input
              type="date"
              value={form.fechaAperturaInscripcion || ""}
              onChange={e => actualizarForm("fechaAperturaInscripcion", e.target.value)}
            />
          </div>
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Hora de apertura</label>
            <input
              type="time"
              value={form.horaAperturaInscripcion || ""}
              onChange={e => actualizarForm("horaAperturaInscripcion", e.target.value)}
            />
          </div>

          {/* 3. FECHA LIMITE DE INSCRIPCION (DIA Y HORA) */}
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Dia límite de inscripción</label>
            <input
              type="date"
              value={form.fechaLimiteInscripcion || ""}
              onChange={e => actualizarForm("fechaLimiteInscripcion", e.target.value)}
            />
          </div>
          <div className="coord-field">
            <label style={{ fontWeight: "600", color: "#344054", fontSize: "13px" }}>Hora límite</label>
            <input
              type="time"
              value={form.horaLimiteInscripcion || "23:59"}
              onChange={e => actualizarForm("horaLimiteInscripcion", e.target.value)}
            />
          </div>
        </div>

        {/* Fila 3: Horarios (Botón Añadir Bloque) */}
        {usaFormularioPorBloques && !usaTalleresPorEdad && !esCambridgeForm && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #cbd5e1", paddingTop: "16px", paddingBottom: "4px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#102035" }}>Bloques de Horarios</h4>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Agregue grupos, aulas y docentes para este taller.</p>
            </div>
            <button
              type="button"
              className="coord-template-autofill"
              style={{
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                background: "#1f8f73",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                padding: "0 16px",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(31, 143, 115, 0.15)"
              }}
              onClick={() => {
                setIndiceGrupoEditando(null);
                setGrupoDraft(grupoHorarioDraftInicial);
                setMostrarGrupoModal(true);
              }}
            >
              <Plus size={16} /> Añadir bloque
            </button>
          </div>
        )}

        {/* Talleres deportivos por edades */}
        {usaTalleresPorEdad && (
          <div className="coord-field coord-field-full" style={{ marginTop: "8px" }}>
            <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
              <strong>{esFormularioVerano ? "Configuración de talleres específicos de verano por edades y horarios" : "Configuración de Deportes por Edades y Horarios"}</strong>
            </div>
            <div className={`coord-taller-builder-grid ${indiceTallerEditando !== null ? "is-editing" : ""}`}>
              <div className={`coord-field ${esDeportivoForm ? "coord-taller-col-3" : "coord-taller-col-4"}`}>
                <label>{esFormularioVerano ? "Taller específico" : "Deporte"}</label>
                <select value={tallerDepForm.deporte} onChange={e => setTallerDepForm(prev => ({ ...prev, deporte: e.target.value }))}>
                  {esFormularioVerano ? (
                    form.categoria === "Talleres Deportivos" ? (
                      <>
                        <option value="Fútbol">Fútbol</option>
                        <option value="Vóley">Vóley</option>
                        <option value="Básquet">Básquet</option>
                        <option value="Otro">Otro deporte...</option>
                      </>
                    ) : (
                      <>
                        <option value="Danza">Danza</option>
                        <option value="Mini Chef">Mini Chef</option>
                        <option value="Pintura">Pintura</option>
                        <option value="Teatro">Teatro</option>
                        <option value="Inglés">Inglés</option>
                        <option value="Zancos">Zancos</option>
                        <option value="Artes plásticas">Artes plásticas</option>
                        <option value="Otro">Otro taller...</option>
                      </>
                    )
                  ) : (
                    <>
                      <option value="Vóley">Vóley</option>
                      <option value="Fútbol">Fútbol</option>
                      <option value="Básquet">Básquet</option>
                      <option value="Otro">Otro deporte...</option>
                    </>
                  )}
                </select>
                {tallerDepForm.deporte === "Otro" && (
                  <input
                    style={{ marginTop: "6px" }}
                    placeholder={esFormularioVerano ? "Escriba el nombre del taller" : "Escriba el deporte"}
                    value={tallerDepForm.custom}
                    onChange={e => setTallerDepForm(prev => ({ ...prev, custom: e.target.value }))}
                  />
                )}
              </div>

              {esDeportivoForm && (
                <div className="coord-field coord-taller-col-2">
                  <label>Nivel</label>
                  <select value={tallerDepForm.nivel} onChange={e => setTallerDepForm(prev => ({ ...prev, nivel: e.target.value }))}>
                    <option value="Formativo">Formativo</option>
                    <option value="Competitivo">Competitivo</option>
                  </select>
                </div>
              )}

              <div className={`coord-field ${esDeportivoForm ? "coord-taller-col-3" : "coord-taller-col-4"}`}>
                <label>Edad (Mín / Máx)</label>
                <div className="coord-flex-range">
                  <select value={tallerDepForm.minEdad} onChange={e => setTallerDepForm(prev => ({ ...prev, minEdad: e.target.value }))}>
                    {Array.from({ length: 15 }, (_, index) => String(index + 3)).map(edad => (
                      <option key={edad} value={edad}>{edad} años</option>
                    ))}
                  </select>
                  <span className="coord-flex-range-separator">a</span>
                  <select value={tallerDepForm.maxEdad} onChange={e => setTallerDepForm(prev => ({ ...prev, maxEdad: e.target.value }))}>
                    {Array.from({ length: 15 }, (_, index) => String(index + 3)).map(edad => (
                      <option key={edad} value={edad}>{edad} años</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="coord-field coord-taller-col-4">
                <label>Días de atención</label>
                <div className="coord-day-list coord-day-list-sm" style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                  {diasSemana.map((dia) => {
                    const diasSeleccionados = Array.isArray(tallerDepForm.dias) ? tallerDepForm.dias : [];
                    const isSelected = diasSeleccionados.includes(dia);
                    return (
                      <label
                        className={`coord-day-chip coord-day-chip-sm ${isSelected ? "is-selected" : ""}`}
                        key={dia}
                        style={{ minWidth: "36px", textAlign: "center", cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const nuevosDias = isSelected
                              ? diasSeleccionados.filter((d) => d !== dia)
                              : [...diasSeleccionados, dia];
                            const diasOrdenados = diasSemana.filter(d => nuevosDias.includes(d));
                            setTallerDepForm(prev => ({ ...prev, dias: diasOrdenados }));
                          }}
                        />
                        <span title={dia}>{dia.substring(0, 2)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="coord-field coord-taller-col-3">
                <label>Horario (Inicio / Fin)</label>
                <div className="coord-flex-range">
                  <input type="time" value={tallerDepForm.horaInicio} onChange={e => setTallerDepForm(prev => ({ ...prev, horaInicio: e.target.value }))} />
                  <span className="coord-flex-range-separator">a</span>
                  <input type="time" value={tallerDepForm.horaFin} onChange={e => setTallerDepForm(prev => ({ ...prev, horaFin: e.target.value }))} />
                </div>
              </div>

              <div className="coord-field coord-taller-col-2">
                <label>Cupos</label>
                <input type="number" min="1" value={tallerDepForm.cupos} onChange={e => setTallerDepForm(prev => ({ ...prev, cupos: e.target.value }))} />
              </div>

              <div className="coord-field coord-taller-col-3">
                <label>Tutor / Docente</label>
                <input
                  type="text"
                  value={tallerDepForm.docente}
                  onChange={e => setTallerDepForm(prev => ({ ...prev, docente: e.target.value }))}
                  placeholder="Ej: Prof. Juan"
                />
              </div>

              <div className="coord-field coord-taller-col-4" style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <button type="button" className="coord-add-taller-btn" onClick={agregarTallerDeportivo} style={{ flex: 1 }}>
                  {indiceTallerEditando !== null ? <>Guardar</> : <><Plus size={14} /> Añadir taller</>}
                </button>
                {indiceTallerEditando !== null && (
                  <button type="button" className="coord-cancel-taller-btn" onClick={cancelarEdicionTaller} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            <div className="coord-deportivo-workshops-list">
              <strong style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#102035" }}>Talleres Agregados:</strong>
              {form.talleresDeportivos?.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2ece9", color: "#475467" }}>
                        <th style={{ padding: "8px" }}>{esFormularioVerano ? "Taller específico" : "Deporte"}</th>
                        <th style={{ padding: "8px" }}>Edades</th>
                        <th style={{ padding: "8px" }}>Día y Horario</th>
                        <th style={{ padding: "8px" }}>Docente / Tutor</th>
                        <th style={{ padding: "8px" }}>Cupos</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.talleresDeportivos.map((taller, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2ece9" }}>
                          <td style={{ padding: "8px", fontWeight: "bold" }}>
                            {taller.deporte} {taller.nivel ? <span style={{ fontSize: "11.5px", fontWeight: "normal", color: "#475569", marginLeft: "4px" }}>({taller.nivel})</span> : ""}
                          </td>
                          <td style={{ padding: "8px" }}>{taller.edadMinima} a {taller.edadMaxima} años</td>
                          <td style={{ padding: "8px" }}>
                            <span
                              style={{
                                background: "#e8f7ef",
                                color: "#006b5b",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                marginRight: "6px"
                              }}
                            >
                              {taller.dia}
                            </span>
                            {formatearHora12(taller.horaInicio)} a {formatearHora12(taller.horaFin)}
                          </td>
                          <td style={{ padding: "8px" }}>{taller.docente || "-"}</td>
                          <td style={{ padding: "8px", fontWeight: "bold" }}>{taller.cupos || 20}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center" }}>
                              <button
                                type="button"
                                className="coord-taller-edit-action-btn"
                                onClick={() => iniciarEdicionTaller(idx)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="coord-taller-delete-action-btn"
                                onClick={() => quitarTallerDeportivo(idx)}
                              >
                                Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: "20px",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    color: "#667085",
                    textAlign: "center",
                    background: "#f8fafc"
                  }}
                >
                  {esFormularioVerano
                    ? "Aún no se han configurado talleres de verano. Agregue uno usando el formulario de arriba."
                    : "Aún no se han configurado talleres deportivos. Agregue uno usando el formulario de arriba."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Listado de bloques de horarios */}
        {usaFormularioPorBloques && !usaTalleresPorEdad && !esCambridgeForm && (
          <div className="coord-field coord-field-full coord-block-form-panel" style={{ marginTop: "4px" }}>
            <div className="coord-group-schedule-head" style={{ marginBottom: "12px" }}>
              <strong>Horarios por grado/bloque/docente</strong>
            </div>
            {formHorariosPorGrupo.length ? (
              <div className="coord-group-schedule-list coord-group-schedule-list-compact">
                {formHorariosPorGrupo.map((grupo, index) => (
                  <div className="coord-group-schedule coord-group-schedule-compact" key={grupo.id || index}>
                    <strong className="coord-group-schedule-badge">Grupo {index + 1}</strong>
                    <div className="coord-group-schedule-cell">
                      <span>Grados</span>
                      <p>{resumenGrados(grupo.grados || []) || "Sin grados"}</p>
                    </div>
                    <div className="coord-group-schedule-cell">
                      <span>Días</span>
                      <p>{grupo.dia || "Sin día"}</p>
                    </div>
                    <div className="coord-group-schedule-cell">
                      <span>Almuerzo</span>
                      <p>{grupo.almuerzoInicio && grupo.almuerzoFin ? `${formatearHora12(grupo.almuerzoInicio)} a ${formatearHora12(grupo.almuerzoFin)}` : "No incluye"}</p>
                    </div>
                    <div className="coord-group-schedule-cell">
                      <span>Clase</span>
                      <p>{formatearHora12(grupo.horaInicio || "15:20")} a {formatearHora12(grupo.horaFin || "17:20")}</p>
                    </div>
                    <div className="coord-group-schedule-cell">
                      <span>Docente / aula</span>
                      <p>{[grupo.responsable, grupo.tutora, grupo.aula ? `Aula: ${grupo.aula}` : ""].filter(Boolean).join(" · ") || "Sin docente"}</p>
                    </div>
                    <div className="coord-group-schedule-cell" style={{ maxWidth: "80px" }}>
                      <span>Cupos</span>
                      <p>{grupo.cupos || 20}</p>
                    </div>
                    <div className="coord-group-actions">
                      <button
                        type="button"
                        className="coord-duplicate-btn"
                        onClick={() => {
                          const copia = { ...grupo, id: `grupo-${Date.now()}-${Math.random().toString(16).slice(2, 6)}` };
                          agregarGrupoHorario(copia);
                        }}
                        title="Duplicar bloque"
                      >
                        <CopyIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className="coord-edit-btn"
                        onClick={() => {
                          setIndiceGrupoEditando(index);
                          setGrupoDraft(grupo);
                          setMostrarGrupoModal(true);
                        }}
                        aria-label="Editar grupo"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        className="coord-delete-btn"
                        onClick={() => quitarGrupoHorario(index)}
                        aria-label="Quitar grupo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "20px",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  color: "#667085",
                  textAlign: "center",
                  background: "#f8fafc"
                }}
              >
                Aún no se han configurado bloques de horarios. Agregue uno usando el botón "+ Añadir bloque" de arriba.
              </div>
            )}
          </div>
        )}

        {/* Modal de edición/adición de bloque */}
        {mostrarGrupoModal && (
          <ProgramaGrupoHorarioModal
            actualizarGrupoDraft={actualizarGrupoDraft}
            cerrarGrupoModal={cerrarGrupoModal}
            diasSemana={diasSemana}
            grupoDraft={grupoDraft}
            grupoDraftError={grupoDraftError}
            grupoDraftErrorTick={grupoDraftErrorTick}
            guardarGrupoDraft={guardarGrupoDraft}
            esCambridgeForm={esCambridgeForm}
            nivelesGrados={nivelesGrados}
            toggleGradoDraft={toggleGradoDraft}
          />
        )}
      </div>
    </section>
  );
}

export default SeccionFechasHorarios;
