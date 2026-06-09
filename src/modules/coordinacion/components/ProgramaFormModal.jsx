import { useState } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconCurrencyDollar as DollarSign,
  IconLoader2 as Loader2,
  IconPhoto as Photo,
  IconPlus as Plus,
  IconTrash as Trash2,
  IconUsers as Users,
  IconX as X,
  IconEdit as Edit3,
} from "@tabler/icons-react";
import GradeSelector from "./GradeSelector";
import ProgramaGrupoHorarioModal from "./ProgramaGrupoHorarioModal";
import ProgramaInvitacionMasivaModal, { obtenerEtiquetaAlcance } from "./ProgramaInvitacionMasivaModal";
import { formatearHora12 } from "../utils/coordinacionFormatters";
import {
  normalizarPeriodoVista,
  obtenerGradosDeportivos,
  resumenGrados,
} from "../utils/coordinacionProgramUtils";

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
};

function ProgramaFormModal({
  actualizarCategoriaPrograma,
  actualizarCosto,
  actualizarForm,
  actualizarGrupoHorario,
  actualizarInvitacionMasiva,
  actualizarNombrePrograma,
  agregarCategoria,
  agregarGrupoHorario,
  agregarTallerDeportivo,
  alertaConfiguracion,
  cambiarPeriodoFormulario,
  catAEliminar,
  categorias,
  diasSemana,
  duracionTallerFormulario,
  esDeportivoForm,
  esCambridgeForm,
  esFormularioVerano,
  form,
  formDias,
  formGradosAplicables,
  formHorariosPorGrupo,
  formatearCostoFormulario,
  guardar,
  guardando,
  mostrarGestorCategorias,
  mostrarIndumentariaDeportiva,
  modoEditar,
  nivelesGrados,
  nuevaCat,
  puedeGestionarGruposFormulario,
  quitarCategoria,
  quitarGrupoHorario,
  quitarImagenAnuncio,
  quitarTallerDeportivo,
  seleccionarImagenAnuncio,
  setCatAEliminar,
  setMostrarGestorCategorias,
  setNuevaCat,
  setShowModal,
  setTallerDepCustom,
  setTallerDepDeporte,
  setTallerDepDia,
  setTallerDepHoraFin,
  setTallerDepHoraInicio,
  setTallerDepMaxEdad,
  setTallerDepMinEdad,
  setTallerDepCupos,
  setTallerDepNivel,
  show,
  tallerDepCustom,
  tallerDepDeporte,
  tallerDepDia,
  tallerDepHoraFin,
  tallerDepHoraInicio,
  tallerDepMaxEdad,
  tallerDepMinEdad,
  tallerDepCupos,
  tallerDepNivel,
  toggleDia,
  toggleGrado,
  toggleGradoGrupo,
}) {
  const [mostrarGrupoModal, setMostrarGrupoModal] = useState(false);
  const [mostrarInvitacionModal, setMostrarInvitacionModal] = useState(false);
  const [grupoDraft, setGrupoDraft] = useState(grupoHorarioDraftInicial);
  const [grupoDraftError, setGrupoDraftError] = useState("");
  const [grupoDraftErrorTick, setGrupoDraftErrorTick] = useState(0);
  const [formTab, setFormTab] = useState("general"); // general, horarios, cobros

  if (!show) return null;

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
  }

  function guardarGrupoDraft() {
    const grados = Array.isArray(grupoDraft.grados) ? grupoDraft.grados.filter(Boolean) : [];
    const dias = String(grupoDraft.dia || "").split(",").map(d => d.trim()).filter(Boolean);

    if (!grados.length || !dias.length || !grupoDraft.horaInicio || !grupoDraft.horaFin) {
      setGrupoDraftError("Faltan grados, días u horario del turno.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    agregarGrupoHorario({ ...grupoDraft, id: `grupo-${Date.now()}` });
    cerrarGrupoModal();
  }

  return (
    <div className="coord-modal-overlay">
                <div className={`coord-modal ${esFormularioVerano ? "coord-modal-verano" : ""}`} onClick={e => e.stopPropagation()}>
                  <div className="coord-modal-header">
                    <div className="coord-modal-title">
                      <span className="coord-modal-icon">
                        {modoEditar ? <Edit3 size={20} /> : <BookOpen size={20} />}
                      </span>
                      <div>
                        <h2>{esFormularioVerano ? (modoEditar ? "Editar programa de verano" : "Registrar programa de verano") : (modoEditar ? "Editar programa" : "Registrar programa")}</h2>
                        <p>
                          {esFormularioVerano
                            ? "Complete los datos del programa antes de habilitarlo."
                            : "Complete la configuración del taller antes de habilitarlo."}
                        </p>
                      </div>
                    </div>
                    <button className="coord-modal-close" type="button" onClick={() => setShowModal(false)}><X size={20} /></button>
                  </div>
                  <form className="coord-program-form" id="form-programa" onSubmit={guardar}>
                    {alertaConfiguracion ? (
                      <MantineAlert
                        className="coord-message"
                        color="orange"
                        radius="md"
                        icon={<AlertCircle size={18} />}
                      >
                        {alertaConfiguracion}
                      </MantineAlert>
                    ) : null}
                    <div className="coord-program-form-main">
                      <section className="coord-form-section">
                        <div className="coord-section-heading">
                          <BookOpen size={18} />
                          <div>
                            <h3>{esFormularioVerano ? "Datos del programa de verano" : "Datos generales"}</h3>
                          </div>
                        </div>
                        <div className="coord-section-grid coord-general-grid">
                          <div className="coord-field coord-program-name-field"><label>{esFormularioVerano ? "Nombre del programa de verano *" : "Nombre del programa *"}</label>
                            <input value={form.nombre} onChange={e => actualizarNombrePrograma(e.target.value)} placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelación"} />
                          </div>
                          <div className="coord-field"><label>Periodo *</label>
                            <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
                              <option value="escolar">Año escolar</option><option value="verano">Ciclo verano</option>
                            </select>
                          </div>
                          <div className="coord-field coord-category-field">
                            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                              <span>{esFormularioVerano ? "Categoría general *" : "Categoría *"}</span>
                              <button
                                type="button"
                                className="coord-category-toggle-btn"
                                onClick={() => setMostrarGestorCategorias(!mostrarGestorCategorias)}
                              >
                                {mostrarGestorCategorias ? "Ocultar gestión" : "Gestionar"}
                              </button>
                            </label>
                            <select value={form.categoria} onChange={e => actualizarCategoriaPrograma(e.target.value)}>
                              <option value="">Seleccione</option>
                              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {esFormularioVerano ? (
                              <p className="coord-field-hint">
                              
                              </p>
                            ) : null}
                          </div>
    
                          {mostrarGestorCategorias ? (
                            <div className="coord-category-manager-container coord-field-full">
                              <div className="coord-category-manager-inner">
                                <div className="coord-field">
                                  <label>Nueva categoría</label>
                                  <div className="coord-inline-field">
                                    <input placeholder="Ej: Arte, verano, alto rendimiento" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
                                    <button type="button" className="coord-mini-btn" onClick={agregarCategoria}><Plus size={14} /></button>
                                  </div>
                                </div>
                                <div className="coord-field">
                                  <label>Quitar categoría</label>
                                  <div className="coord-inline-field">
                                    <select value={catAEliminar} onChange={e => setCatAEliminar(e.target.value)}>
                                      <option value="">Seleccione</option>
                                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button type="button" className="coord-mini-btn coord-mini-danger-btn" onClick={quitarCategoria}><Trash2 size={14} /></button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {esFormularioVerano || esDeportivoForm ? (
                            <div className="coord-field coord-field-full">
                              <label>{esFormularioVerano ? "Talleres habilitados" : "Grados habilitados"}</label>
                              <p className="coord-field-hint" style={{ marginTop: "4px" }}>
                                {esFormularioVerano
                                  ? "Configure abajo cada taller de verano con edad, día, horario y cupos. Asistente registrará a los alumnos."
                                  : "Los grados escolares aplicables se calculan automáticamente a partir de los rangos de edad de los talleres de abajo."}
                              </p>
                              {form.talleresDeportivos?.length > 0 && (
                                <div className="coord-deportivo-grados-summary" style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <strong>{esFormularioVerano ? "Talleres configurados:" : "Equivalente en Grados:"}</strong>{" "}
                                  <span style={{ color: "#006b5b", fontWeight: 700 }}>
                                    {esFormularioVerano
                                      ? `${form.talleresDeportivos.length} taller(es)`
                                      : resumenGrados(obtenerGradosDeportivos(form.talleresDeportivos)) || "Sin grados calculados"}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : esCambridgeForm ? (
                            <div className="coord-field coord-field-full">
                              <label>Grados aplicables</label>
                              <div className="coord-readonly-field">Asignados desde la lista Excel</div>
                              <p className="coord-field-hint">
                                Para Ingles/Cambridge no seleccione grados del programa. Coordinación Académica los cargara por alumno en el Excel de invitados.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </section>
     
                      <section className="coord-form-section">
                        <div className="coord-section-heading">
                          <CalendarDays size={18} />
                          <div>
                            <h3>{esFormularioVerano ? "Fechas y horario de verano" : esDeportivoForm ? "Fechas y talleres deportivos" : "Grados y horarios de atención"}</h3>
                          </div>
                        </div>
                        <div className="coord-section-grid">
                          {(esFormularioVerano || esDeportivoForm) ?
                            <div className="coord-deportivo-schedule-dates coord-field-full">
                              <div className="coord-time-fields-grid">
                                <div className="coord-field">
                                  <label>Fecha inicio *</label>
                                  <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                                </div>
                                <div className="coord-field">
                                  <label>Fecha fin *</label>
                                  <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                                </div>
                                <div className="coord-field">
                                  <label>Duración del taller</label>
                                  <div className="coord-readonly-field">
                                    {duracionTallerFormulario || "Seleccione fechas"}
                                  </div>
                                </div>
                                <div className="coord-field">
                                  <label>Aviso abierto (días) *</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={form.duracionAvisoDias}
                                    onChange={e => actualizarForm("duracionAvisoDias", e.target.value)}
                                    placeholder="Máx 7 días"
                                  />
                                </div>
                              </div>
                            </div>
                          :
                            <div className="coord-schedule-block-grid coord-schedule-unified coord-field-full">
                              <div className="coord-schedule-block-column coord-schedule-block-main">
                                <div className="coord-field coord-field-full">
                                  <label>Horario base: grados aplicables *</label>
                                  <GradeSelector
                                    niveles={nivelesGrados}
                                    seleccionados={formGradosAplicables}
                                    onToggle={toggleGrado}
                                  />
                                  <p className="coord-field-hint">
                                    {formGradosAplicables.length
                                      ? `${resumenGrados(formGradosAplicables)} · Configure abajo el horario que comparten estos grados.`
                                      : "Seleccione los grados que comparten este horario principal."}
                                  </p>
                                </div>

                                <div className="coord-field">
                                  <label>{esFormularioVerano ? "Días de atención *" : "Días del programa / taller *"}</label>
                                  <div className="coord-day-list">
                                    {diasSemana.map(dia => (
                                      <label
                                        className={`coord-day-chip ${formDias.includes(dia) ? "is-selected" : ""}`}
                                        key={dia}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={formDias.includes(dia)}
                                          onChange={() => toggleDia(dia)}
                                        />
                                        {dia}
                                      </label>
                                    ))}
                                  </div>
                                  {esFormularioVerano ? (
                                    <p className="coord-field-hint">
                                      Seleccione 3 días de atención por semana.
                                    </p>
                                  ) : null}
                                </div>
                                
                                <div className="coord-schedule-flow-row coord-schedule-time-meal-row">
                                  <div className="coord-schedule-mini-title">Clases</div>
                                  <div className="coord-field">
                                    <label>Hora inicio *</label>
                                    <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Hora fin *</label>
                                    <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
                                  </div>

                                  <div className="coord-schedule-mini-title">Almuerzo</div>
                                  <div className="coord-field">
                                    <label>Almuerzo inicio</label>
                                    <input type="time" value={form.almuerzoInicio} onChange={e => actualizarForm("almuerzoInicio", e.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Almuerzo fin</label>
                                    <input type="time" value={form.almuerzoFin} onChange={e => actualizarForm("almuerzoFin", e.target.value)} />
                                  </div>
                                </div>

                                <div className="coord-schedule-flow-row coord-schedule-flow-row-wide">
                                  <div className="coord-schedule-mini-title">Vigencia</div>
                                  <div className="coord-field">
                                    <label>Fecha inicio *</label>
                                    <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Fecha fin *</label>
                                    <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Duración del taller</label>
                                    <div className="coord-readonly-field">
                                      {duracionTallerFormulario || "Seleccione fechas"}
                                    </div>
                                  </div>
                                  <div className="coord-field">
                                    <label>Aviso abierto (días) *</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="7"
                                      value={form.duracionAvisoDias}
                                      onChange={e => actualizarForm("duracionAvisoDias", e.target.value)}
                                      placeholder="Máx 7 días"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          }
    
                          {esCambridgeForm ? (
                            <div className="coord-field coord-field-full">
                              <div className="coord-section-grid">
                                <div className="coord-field">
                                  <label>Ciclo I para carta Cambridge</label>
                                  <input
                                    value={form.cicloI || ""}
                                    onChange={e => actualizarForm("cicloI", e.target.value)}
                                    placeholder="Ej: De abril a julio"
                                  />
                                </div>
                                <div className="coord-field">
                                  <label>Ciclo II para carta Cambridge</label>
                                  <input
                                    value={form.cicloII || ""}
                                    onChange={e => actualizarForm("cicloII", e.target.value)}
                                    placeholder="Ej: De agosto a noviembre"
                                  />
                                </div>
                              </div>
                              <p className="coord-field-hint">
                                Estos textos se usan en las variables CICLO_I y CICLO_II del documento Cambridge.
                              </p>
                            </div>
                          ) : null}

                          {(esFormularioVerano || esDeportivoForm) && (
                            <div className="coord-field coord-field-full">
                              <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
                                <strong>{esFormularioVerano ? "Configuración de talleres específicos de verano por edades y horarios" : "Configuración de Deportes por Edades y Horarios"}</strong>
                                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#667085" }}>
                                  {esFormularioVerano 
                                    ? "Agregue cada taller o actividad detallando la disciplina, edad y horario específico (según el afiche)."
                                    : "Agregue cada taller deportivo detallando la disciplina, edad y horario específico (según el afiche)."}
                                </p>
                              </div>
                              
                              <div className="coord-deportivo-fields-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                                <div className="coord-field">
                                  <label>{esFormularioVerano ? "Taller específico *" : "Deporte *"}</label>
                                  <select value={tallerDepDeporte} onChange={e => setTallerDepDeporte(e.target.value)}>
                                    {esFormularioVerano ? (
                                      <>
                                        <option value="Danza">Danza</option>
                                        <option value="Mini Chef">Mini Chef</option>
                                        <option value="Pintura">Pintura</option>
                                        <option value="Teatro">Teatro</option>
                                        <option value="Fútbol">Fútbol</option>
                                        <option value="Vóley">Vóley</option>
                                        <option value="Básquet">Básquet</option>
                                        <option value="Otro">Otro taller...</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="Vóley">Vóley</option>
                                        <option value="Fútbol">Fútbol</option>
                                        <option value="Básquet">Básquet</option>
                                        <option value="Otro">Otro deporte...</option>
                                      </>
                                    )}
                                  </select>
                                  {tallerDepDeporte === "Otro" && (
                                    <input 
                                      style={{ marginTop: "6px" }}
                                      placeholder={esFormularioVerano ? "Escriba el nombre del taller" : "Escriba el deporte"} 
                                      value={tallerDepCustom} 
                                      onChange={e => setTallerDepCustom(e.target.value)} 
                                    />
                                  )}
                                </div>
                                
                                <div className="coord-field">
                                  <label>Nivel *</label>
                                  <select value={tallerDepNivel} onChange={e => setTallerDepNivel(e.target.value)}>
                                    <option value="Formativo">Formativo</option>
                                    <option value="Competitivo">Competitivo</option>
                                  </select>
                                </div>
                                
                                <div className="coord-field">
                                  <label>Edad mínima *</label>
                                  <select value={tallerDepMinEdad} onChange={e => setTallerDepMinEdad(e.target.value)}>
                                    {Array.from({ length: 15 }, (_, index) => String(index + 3)).map(edad => (
                                      <option key={edad} value={edad}>{edad} años</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="coord-field">
                                  <label>Edad máxima *</label>
                                  <select value={tallerDepMaxEdad} onChange={e => setTallerDepMaxEdad(e.target.value)}>
                                    {Array.from({ length: 15 }, (_, index) => String(index + 3)).map(edad => (
                                      <option key={edad} value={edad}>{edad} años</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="coord-field">
                                  <label>Día de atención *</label>
                                  <select value={tallerDepDia} onChange={e => setTallerDepDia(e.target.value)}>
                                    {diasSemana.map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="coord-field">
                                  <label>Clase inicio *</label>
                                  <input type="time" value={tallerDepHoraInicio} onChange={e => setTallerDepHoraInicio(e.target.value)} />
                                </div>
                                
                                <div className="coord-field">
                                  <label>Clase fin *</label>
                                  <input type="time" value={tallerDepHoraFin} onChange={e => setTallerDepHoraFin(e.target.value)} />
                                </div>

                                <div className="coord-field">
                                  <label>Cupos *</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={tallerDepCupos}
                                    onChange={e => setTallerDepCupos(e.target.value)}
                                    placeholder="20"
                                  />
                                </div>
                                
                                <div className="coord-field" style={{ display: "flex", alignItems: "flex-end" }}>
                                  <button 
                                    type="button" 
                                    className="coord-template-autofill" 
                                    style={{ width: "100%", height: "38px", display: "flex", justifyContent: "center" }}
                                    onClick={agregarTallerDeportivo}
                                  >
                                    <Plus size={14} /> Añadir taller
                                  </button>
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
                                              <span style={{ background: "#e8f7ef", color: "#006b5b", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginRight: "6px" }}>{taller.dia}</span>
                                              {formatearHora12(taller.horaInicio)} a {formatearHora12(taller.horaFin)}
                                            </td>
                                            <td style={{ padding: "8px", fontWeight: "bold" }}>{taller.cupos || 20}</td>
                                            <td style={{ padding: "8px", textAlign: "right" }}>
                                              <button 
                                                type="button" 
                                                style={{ background: "none", border: "none", color: "#b42318", cursor: "pointer", fontWeight: 700 }}
                                                onClick={() => quitarTallerDeportivo(idx)}
                                              >
                                                Quitar
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div style={{ padding: "20px", border: "1px dashed #cbd5e1", borderRadius: "8px", color: "#667085", textAlign: "center", background: "#f8fafc" }}>
                                    {esFormularioVerano 
                                      ? "Aún no se han configurado talleres de verano. Agregue uno usando el formulario de arriba."
                                      : "Aún no se han configurado talleres deportivos. Agregue uno usando el formulario de arriba."}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
    
                          {puedeGestionarGruposFormulario && !esFormularioVerano && !esDeportivoForm ? (
                            <div className="coord-field coord-field-full">
                              <div className="coord-group-schedule-head">
                                <div>
                                  <strong>Turnos adicionales por grado</strong>
                                  <p>Úselo solo si algunos grados tienen otro día, aula u horario distinto al horario base.</p>
                                </div>
                                <button type="button" className="coord-template-autofill" onClick={() => setMostrarGrupoModal(true)}>
                                  <Plus size={14} />
                                  Añadir turno
                                </button>
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
                                        <span>Días y hora</span>
                                        <p>{grupo.dia || "Sin día"} · {formatearHora12(grupo.horaInicio || "15:20")} a {formatearHora12(grupo.horaFin || "17:20")}</p>
                                      </div>
                                      <div className="coord-group-schedule-cell">
                                        <span>Responsable / aula</span>
                                        <p>
                                          {[grupo.responsable, grupo.tutora, grupo.aula ? `Aula: ${grupo.aula}` : ""]
                                            .filter(Boolean)
                                            .join(" · ") || "Sin responsable"}
                                        </p>
                                      </div>
                                      <button type="button" onClick={() => quitarGrupoHorario(index)} aria-label="Quitar grupo">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="coord-field-hint">Si todos los grados usan el horario base, deje esta parte vacía.</p>
                              )}
                              {mostrarGrupoModal ? (
                                <ProgramaGrupoHorarioModal
                                  actualizarGrupoDraft={actualizarGrupoDraft}
                                  cerrarGrupoModal={cerrarGrupoModal}
                                  diasSemana={diasSemana}
                                  grupoDraft={grupoDraft}
                                  grupoDraftError={grupoDraftError}
                                  grupoDraftErrorTick={grupoDraftErrorTick}
                                  guardarGrupoDraft={guardarGrupoDraft}
                                  nivelesGrados={nivelesGrados}
                                  toggleGradoDraft={toggleGradoDraft}
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </section>
    
                      <section className="coord-form-section">
                        <div className="coord-section-heading">
                          <DollarSign size={18} />
                          <div>
                            <h3>{esFormularioVerano ? "Vacantes y pago de verano" : "Cupos y cobro"}</h3>
                          </div>
                        </div>
                        <div className="coord-section-grid coord-payment-grid">
                          <div className="coord-field">
                            <label>Cupos</label>
                            {(esFormularioVerano || esDeportivoForm) ? (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <input
                                  type="number"
                                  value={form.cupos}
                                  readOnly
                                  style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                                  title="Se calcula automáticamente sumando los cupos de cada taller deportivo"
                                />
                                <span style={{ fontSize: "11px", color: "#006b5b", fontWeight: 700, whiteSpace: "nowrap" }}>
                                  (Suma de talleres)
                                </span>
                              </div>
                            ) : (
                              <input type="number" min="1" value={form.cupos} onChange={e => actualizarForm("cupos", e.target.value)} placeholder="20" />
                            )}
                          </div>
                          <div className="coord-field"><label>Costo (S/)</label>
                            <input inputMode="decimal" value={form.costo} onChange={e => actualizarCosto(e.target.value)} onBlur={formatearCostoFormulario} placeholder="70.00" />
                          </div>
                          <div className="coord-field"><label>Modalidad de cobro</label>
                            <select value={form.modalidadCobro} onChange={e => actualizarForm("modalidadCobro", e.target.value)} disabled={esFormularioVerano}>
                              <option value="Mensual">Cuota mensual</option><option value="Unico">Pago unico</option>
                            </select>
                          </div>
                          {!esFormularioVerano ? (
                            <div className="coord-field coord-field-full">
                            <label className="coord-check-label coord-check-label-stacked">
                              <span>
                                <input
                                  type="checkbox"
                                  checked={form.invitacionMasiva}
                                  onChange={e => {
                                    actualizarInvitacionMasiva(e.target.checked);
                                    if (e.target.checked) setMostrarInvitacionModal(true);
                                  }}
                                />
                                Invitación masiva en Padres
                              </span>
                              <small>El curso aparecerá en el portal de padres sin cargar Excel de invitados, según el alcance seleccionado.</small>
                            </label>
                            {form.invitacionMasiva ? (
                              <div className="coord-summer-payment-note coord-field-full">
                                <Photo size={16} />
                                <span>
                                  {obtenerEtiquetaAlcance(form.alcanceInvitacionMasiva)}
                                  {form.anuncioImagenNombre ? ` · Imagen: ${form.anuncioImagenNombre}` : " · Sin imagen"}
                                </span>
                                <button
                                  type="button"
                                  className="coord-secondary-button"
                                  onClick={() => setMostrarInvitacionModal(true)}
                                >
                                  Configurar invitación
                                </button>
                              </div>
                            ) : null}
                            {mostrarInvitacionModal && form.invitacionMasiva ? (
                              <ProgramaInvitacionMasivaModal
                                actualizarForm={actualizarForm}
                                form={form}
                                quitarImagenAnuncio={quitarImagenAnuncio}
                                seleccionarImagenAnuncio={seleccionarImagenAnuncio}
                                setMostrarInvitacionModal={setMostrarInvitacionModal}
                              />
                            ) : null}
                          </div>
                          ) : (
                            <div className="coord-summer-payment-note coord-field-full">
                              <CheckCircle2 size={16} />
                              <span>Asistente verá este programa como opción de ciclo verano y registrará el tipo de alumno al momento de la inscripción.</span>
                            </div>
                          )}
                        </div>
                      </section>
    
                      {mostrarIndumentariaDeportiva ? (
                        <section className="coord-form-section coord-sports-kit-section">
                          <div className="coord-section-heading">
                            <Users size={18} />
                            <div>
                              <h3>Indumentaria deportiva</h3>
                              <p>Marque esta opción solo si el taller necesita talla de polo y short para la indumentaria.</p>
                            </div>
                          </div>
                          <div className="coord-section-grid">
                            <div className="coord-field coord-field-full">
                              <label className="coord-check-label coord-check-label-stacked">
                                <span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(form.requiereIndumentaria)}
                                    onChange={e => actualizarForm("requiereIndumentaria", e.target.checked)}
                                  />
                                  Requiere tallas de polo y short para la indumentaria
                                </span>
                                <small>Si se marca, Padres deberá seleccionar ambas tallas antes de continuar con la inscripción.</small>
                              </label>
                            </div>
                          </div>
                        </section>
                      ) : null}
    
                      {!formHorariosPorGrupo || formHorariosPorGrupo.length === 0 ? (
                        <section className="coord-form-section">
                          <div className="coord-section-heading">
                            <Users size={18} />
                            <div>
                              <h3>Responsables</h3>
                            </div>
                          </div>
                          <div className="coord-section-grid">
                            <div className="coord-field"><label>Responsable</label>
                              <input value={form.responsable} onChange={e => actualizarForm("responsable", e.target.value)} placeholder="Prof. Ana Torres" />
                            </div>
                            <div className="coord-field"><label>Tutora / apoyo</label>
                              <input value={form.tutora} onChange={e => actualizarForm("tutora", e.target.value)} placeholder="(Srta. Lucia Vega)" />
                            </div>
                          </div>
                        </section>
                      ) : null}
                    </div>
    
                  </form>
    
                  <div className="coord-modal-actions">
                    <button type="button" className="coord-secondary-button" onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" form="form-programa" className="coord-register-button" disabled={guardando}>
                      {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                      <span>{guardando ? "Guardando" : modoEditar ? "Actualizar" : "Crear programa"}</span>
                    </button>
                  </div>
                </div>
              </div>
  );
}

export default ProgramaFormModal;






