import { useState } from "react";
import { toast } from "sonner";
import { crearCategoria, eliminarCategoria, listarCategorias } from "../../../services/coordinacionService";
import {
  IconCalendar as CalendarDays,
  IconPlus as Plus,
  IconX as X,
  IconEdit as Edit3,
  IconCopy as CopyIcon,
} from "@tabler/icons-react";
import ProgramaGrupoHorarioModal from "../../ProgramaGrupoHorarioModal";
import GradeSelector from "../../GradeSelector";
import { formatearHora12 } from "../../../utils/coordinacionFormatters";
import { resumenGrados } from "../../../utils/coordinacionProgramUtils";
import useSeccionFechasHorarios from "../../../hooks/forms/useSeccionFechasHorarios";
import GrupoHorariosList from "./GrupoHorariosList";

export default function SeccionFechasHorarios({
  form,
  categorias,
  setCategorias,
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
  const {
    mostrarGrupoModal,
    grupoDraft,
    grupoDraftError,
    grupoDraftErrorTick,
    actualizarGrupoDraft,
    toggleGradoDraft,
    cerrarGrupoModal,
    guardarGrupoDraft,
    iniciarEdicionGrupo,
    iniciarAdicionGrupo,
  } = useSeccionFechasHorarios({
    esCambridgeForm,
    actualizarGrupoHorario,
    agregarGrupoHorario,
  });

  const defaultSummerWorkshops = ["Danza", "Mini Chef", "Pintura", "Teatro", "Inglés", "Zancos", "Artes plásticas"];

  const dbSummerWorkshops = (categorias || [])
    .filter((c: any) => String(c).startsWith("TALLER_VERANO:"))
    .map((c: any) => String(c).substring("TALLER_VERANO:".length));

  const deletedSummerWorkshops = (categorias || [])
    .filter((c: any) => String(c).startsWith("DELETED_TALLER_VERANO:"))
    .map((c: any) => String(c).substring("DELETED_TALLER_VERANO:".length));

  const customSummerWorkshops = dbSummerWorkshops.filter((c: any) => !defaultSummerWorkshops.includes(c));

  const listadoTalleresEspecificos = [
    ...defaultSummerWorkshops.filter(t => !deletedSummerWorkshops.includes(t)),
    ...customSummerWorkshops.filter(t => !deletedSummerWorkshops.includes(t)),
  ];

  const [modalDialog, setModalDialog] = useState<{
    show: boolean;
    type: "prompt" | "confirm";
    title: string;
    message: string;
    value?: string;
    onConfirm: (val?: string) => void;
  } | null>(null);

  const handleAgregarTallerPrompt = () => {
    setModalDialog({
      show: true,
      type: "prompt",
      title: "Agregar Nuevo Taller",
      message: "Escriba el nombre del nuevo taller específico (ej: Robótica, Ajedrez):",
      value: "",
      onConfirm: async (nombre) => {
        if (!nombre || !nombre.trim()) return;
        const nombreNormal = nombre.trim();
        const wasDeletedDefault = deletedSummerWorkshops.includes(nombreNormal);
        const nameWithPrefix = wasDeletedDefault
          ? "DELETED_TALLER_VERANO:" + nombreNormal
          : "TALLER_VERANO:" + nombreNormal;

        try {
          if (wasDeletedDefault) {
            await eliminarCategoria(nameWithPrefix);
          } else {
            await crearCategoria(nameWithPrefix);
          }
          const cats = await listarCategorias();
          setCategorias(cats);
          setTallerDepForm(prev => ({ ...prev, deporte: nombreNormal }));
          toast.success("Taller agregado", { description: `"${nombreNormal}" se agregó a las opciones.` });
        } catch (err: any) {
          toast.error("Error", { description: err.message || "No se pudo agregar el taller." });
        }
      }
    });
  };

  const handleQuitarTallerSelect = () => {
    const seleccionado = tallerDepForm.deporte;
    if (!seleccionado || seleccionado === "Otro") return;

    setModalDialog({
      show: true,
      type: "confirm",
      title: "Eliminar Opción",
      message: `¿Eliminar la opción "${seleccionado}" de la lista de opciones?`,
      onConfirm: async () => {
        try {
          const isDefault = defaultSummerWorkshops.includes(seleccionado);
          if (isDefault) {
            await crearCategoria("DELETED_TALLER_VERANO:" + seleccionado);
          } else {
            await eliminarCategoria("TALLER_VERANO:" + seleccionado);
          }
          
          const cats = await listarCategorias();
          setCategorias(cats);
          
          const remaining = listadoTalleresEspecificos.filter(t => t !== seleccionado);
          setTallerDepForm(prev => ({ ...prev, deporte: remaining[0] || "Danza" }));
          toast.success("Taller eliminado", { description: `"${seleccionado}" se eliminó de las opciones.` });
        } catch (err: any) {
          toast.error("Error", { description: err.message || "No se pudo quitar el taller." });
        }
      }
    });
  };

  const usaFormularioPorBloques = true;

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
              <div
                className="coord-readonly-field"
                style={{
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  background: "#f8fafc",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  color: duracionTallerFormulario ? "#475569" : "#94a3b8",
                  fontWeight: duracionTallerFormulario ? "600" : "normal",
                  fontStyle: duracionTallerFormulario ? "normal" : "italic",
                }}
              >
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
          border: "1px solid #cbd5e1",
          alignItems: "start"
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
            <div
              className="coord-readonly-field"
              style={{
                height: "38px",
                display: "flex",
                alignItems: "center",
                background: "#f8fafc",
                padding: "0 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                color: duracionTallerFormulario ? "#475569" : "#94a3b8",
                fontWeight: duracionTallerFormulario ? "600" : "normal",
                fontStyle: duracionTallerFormulario ? "normal" : "italic",
              }}
            >
              {duracionTallerFormulario || "Seleccione fechas"}
            </div>
          </div>

          {/* Invitación masiva en Padres */}
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

        {(() => {
          const catLower = String(form.categoria || "").toLowerCase();
          const permiteToggleModo = esFormularioVerano && (
            catLower !== "academico" &&
            catLower !== "académico" &&
            catLower !== "vacaciones utiles" &&
            catLower !== "vacaciones útiles"
          );

          if (!permiteToggleModo) return null;

          return (
            <div className="coord-field-full" style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "16px",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "8px"
            }}>
              <strong style={{ fontSize: "14px", color: "#166534" }}>Modalidad de horarios para talleres específicos</strong>
              <div style={{ display: "flex", gap: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", color: "#1e293b", fontWeight: "600" }}>
                  <input
                    type="radio"
                    name="usaBloquesHorario"
                    checked={!form.usaBloquesHorario}
                    onChange={() => actualizarForm("usaBloquesHorario", false)}
                    style={{ accentColor: "#166534", width: "17px", height: "17px" }}
                  />
                  Configurar por Edades y Horarios
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", color: "#1e293b", fontWeight: "600" }}>
                  <input
                    type="radio"
                    name="usaBloquesHorario"
                    checked={Boolean(form.usaBloquesHorario)}
                    onChange={() => actualizarForm("usaBloquesHorario", true)}
                    style={{ accentColor: "#166534", width: "17px", height: "17px" }}
                  />
                  Configurar por Grados y Bloques (Aulas/Docentes)
                </label>
              </div>
            </div>
          );
        })()}

        {/* Fila 3: Horarios (Botón Añadir Bloque) */}
        {usaFormularioPorBloques && !usaTalleresPorEdad && !esCambridgeForm && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #cbd5e1", paddingTop: "16px", paddingBottom: "4px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#102035" }}>Bloques de Horarios</h4>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Agregue grupos, aulas y docentes para este taller.</p>
            </div>
            <button
              type="button"
              className="coord-add-block-btn"
              style={{
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                padding: "0 16px",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(31, 143, 115, 0.15)"
              }}
              onClick={iniciarAdicionGrupo}
            >
              <Plus size={16} /> Añadir bloque
            </button>
          </div>
        )}

        {/* Talleres deportivos por edades */}
        {usaTalleresPorEdad && (
          <div className="coord-field coord-field-full" style={{ marginTop: "8px" }}>
            <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
              <strong>{esFormularioVerano ? "Configuración de talleres específicos por edades y horarios" : "Configuración de Deportes por Edades y Horarios"}</strong>
            </div>
            <div className={`coord-taller-builder-grid ${indiceTallerEditando !== null ? "is-editing" : ""}`}>
              <div className={`coord-field ${esDeportivoForm ? "coord-taller-col-3" : "coord-taller-col-4"}`} style={{ alignContent: "start" }}>
                <label>{esFormularioVerano ? "Taller específico" : "Deporte"}</label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <select
                    value={tallerDepForm.deporte}
                    onChange={e => setTallerDepForm(prev => ({ ...prev, deporte: e.target.value }))}
                    style={{ flex: 1 }}
                  >
                    {(esFormularioVerano
                      ? (form.categoria === "Talleres Deportivos"
                        ? ["Fútbol", "Vóley", "Básquet", "Otro"]
                        : listadoTalleresEspecificos)
                      : ["Vóley", "Fútbol", "Básquet", "Otro"]
                    ).map((val) => (
                      <option key={val} value={val}>
                        {val === "Otro" ? (esFormularioVerano ? "Otro taller..." : "Otro deporte...") : val}
                      </option>
                    ))}
                  </select>

                  {esFormularioVerano && form.categoria !== "Talleres Deportivos" && (
                    <>
                      <button
                        type="button"
                        className="coord-add-option-btn"
                        onClick={handleAgregarTallerPrompt}
                        title="Agregar nueva opción de taller"
                      >
                        <Plus size={18} />
                      </button>

                      {tallerDepForm.deporte !== "Otro" && (
                        <button
                          type="button"
                          onClick={handleQuitarTallerSelect}
                          title="Eliminar opción seleccionada"
                          style={{
                            height: "38px",
                            width: "38px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>
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
                <div className="coord-field coord-taller-col-2" style={{ alignContent: "start" }}>
                  <label>Nivel</label>
                  <select value={tallerDepForm.nivel} onChange={e => setTallerDepForm(prev => ({ ...prev, nivel: e.target.value }))}>
                    <option value="Formativo">Formativo</option>
                    <option value="Competitivo">Competitivo</option>
                  </select>
                </div>
              )}

              <div className={`coord-field ${esDeportivoForm ? "coord-taller-col-3" : "coord-taller-col-4"}`} style={{ alignContent: "start" }}>
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

              <div className="coord-field coord-taller-col-4" style={{ alignContent: "start" }}>
                <label>Días de clase</label>
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
                        <th style={{ padding: "8px" }}>Día</th>
                        <th style={{ padding: "8px" }}>Horario</th>
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
                                fontWeight: 700
                              }}
                            >
                              {taller.dia}
                            </span>
                          </td>
                          <td style={{ padding: "8px" }}>
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
          <GrupoHorariosList
            formHorariosPorGrupo={formHorariosPorGrupo}
            agregarGrupoHorario={agregarGrupoHorario}
            iniciarEdicionGrupo={iniciarEdicionGrupo}
            quitarGrupoHorario={quitarGrupoHorario}
          />
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

      {modalDialog?.show && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "16px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            width: "100%",
            maxWidth: "400px",
            padding: "24px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxSizing: "border-box"
          }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "sans-serif" }}>
              {modalDialog.title}
            </h4>
            <p style={{ margin: 0, fontSize: "14px", color: "#475569", lineHeight: "1.5", fontFamily: "sans-serif" }}>
              {modalDialog.message}
            </p>
            {modalDialog.type === "prompt" && (
              <input
                autoFocus
                type="text"
                value={modalDialog.value || ""}
                onChange={e => setModalDialog(prev => prev ? { ...prev, value: e.target.value } : null)}
                placeholder="Nombre del taller"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    modalDialog.onConfirm(modalDialog.value);
                    setModalDialog(null);
                  }
                }}
              />
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setModalDialog(null)}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  modalDialog.onConfirm(modalDialog.value);
                  setModalDialog(null);
                }}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: modalDialog.type === "confirm" ? "#ef4444" : "#166534",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {modalDialog.type === "confirm" ? "Eliminar" : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
