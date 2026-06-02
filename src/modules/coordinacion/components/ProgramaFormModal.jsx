import {
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconCurrencyDollar as DollarSign,
  IconLoader2 as Loader2,
  IconPhoto as Photo,
  IconPlus as Plus,
  IconTrash as Trash2,
  IconUpload as Upload,
  IconUsers as Users,
  IconX as X,
} from "@tabler/icons-react";
import GradeSelector from "./GradeSelector";
import { formatearHora12 } from "../utils/coordinacionFormatters";
import {
  formatearPesoArchivo,
  normalizarPeriodoVista,
  obtenerGradosDeportivos,
  resumenGrados,
} from "../utils/coordinacionProgramUtils";

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
  show,
  tallerDepCustom,
  tallerDepDeporte,
  tallerDepDia,
  tallerDepHoraFin,
  tallerDepHoraInicio,
  tallerDepMaxEdad,
  tallerDepMinEdad,
  tallerDepCupos,
  toggleDia,
  toggleGrado,
  toggleGradoGrupo,
}) {
  if (!show) return null;

  return (
    <div className="coord-modal-overlay">
                <div className={`coord-modal ${esFormularioVerano ? "coord-modal-verano" : ""}`} onClick={e => e.stopPropagation()}>
                  <div className="coord-modal-header">
                    <div className="coord-modal-title">
                      <span className="coord-modal-icon"><Plus size={20} /></span>
                      <div>
                        <h2>{esFormularioVerano ? (modoEditar ? "Editar programa de verano" : "Registrar programa de verano") : (modoEditar ? "Editar programa" : "Registrar programa")}</h2>
                        <p>
                          {esFormularioVerano
                            ? "Complete los datos del programa antes de habilitarlo."
                            : "Complete la configuracion del taller antes de habilitarlo."}
                        </p>
                      </div>
                    </div>
                    <button className="coord-modal-close" type="button" onClick={() => setShowModal(false)}><X size={20} /></button>
                  </div>
                  <form className="coord-program-form" id="form-programa" onSubmit={guardar}>
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
                            <input value={form.nombre} onChange={e => actualizarNombrePrograma(e.target.value)} placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelacion"} />
                          </div>
                          <div className="coord-field"><label>Periodo *</label>
                            <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
                              <option value="escolar">Año escolar</option><option value="verano">Ciclo verano</option>
                            </select>
                          </div>
                          <div className="coord-field coord-category-field">
                            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                              <span>Categoría *</span>
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
                          {esFormularioVerano ? (
                            <div className="coord-age-range-row coord-field-full">
                              <div className="coord-field">
                                <label>Desde edad *</label>
                                <select value={form.edadMinima} onChange={e => actualizarForm("edadMinima", e.target.value)}>
                                  <option value="">Seleccione</option>
                                  {Array.from({ length: 14 }, (_, index) => String(index + 3)).map((edad) => (
                                    <option key={edad} value={edad}>{edad} años</option>
                                  ))}
                                </select>
                              </div>
                              <div className="coord-field">
                                <label>Hasta edad *</label>
                                <select value={form.edadMaxima} onChange={e => actualizarForm("edadMaxima", e.target.value)}>
                                  <option value="">Seleccione</option>
                                  {Array.from({ length: 14 }, (_, index) => String(index + 3)).map((edad) => (
                                    <option key={edad} value={edad}>{edad} años</option>
                                  ))}
                                </select>
                              </div>
                              <p className="coord-field-hint">
                                Seleccione el rango de edad permitido para este programa de verano.
                              </p>
                              {form.grupoEtario ? (
                                <p className="coord-field-hint coord-field-full">
                                  Grupo etario: {form.grupoEtario}
                                </p>
                              ) : null}
                            </div>
                          ) : esDeportivoForm ? (
                            <div className="coord-field coord-field-full">
                              <label>Grados habilitados</label>
                              <p className="coord-field-hint" style={{ marginTop: "4px" }}>
                                Los grados escolares aplicables se calculan automáticamente a partir de los rangos de edad de los talleres de abajo.
                              </p>
                              {form.talleresDeportivos?.length > 0 && (
                                <div className="coord-deportivo-grados-summary" style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <strong>Equivalente en Grados:</strong> <span style={{ color: "#006b5b", fontWeight: 700 }}>{resumenGrados(obtenerGradosDeportivos(form.talleresDeportivos)) || "Sin grados calculados"}</span>
                                </div>
                              )}
                            </div>
                          ) : esCambridgeForm ? (
                            <div className="coord-field coord-field-full">
                              <label>Grados aplicables</label>
                              <div className="coord-readonly-field">Asignados desde la lista Excel</div>
                              <p className="coord-field-hint">
                                Para Ingles/Cambridge no seleccione grados del programa. Coordinacion los cargara por alumno en el Excel de invitados.
                              </p>
                            </div>
                          ) : (
                            <div className="coord-field coord-field-full">
                              <label>Grados aplicables *</label>
                              <GradeSelector
                                niveles={nivelesGrados}
                                seleccionados={formGradosAplicables}
                                onToggle={toggleGrado}
                              />
                              <p className="coord-field-hint">
                                {formGradosAplicables.length
                                  ? resumenGrados(formGradosAplicables)
                                  : "Seleccione nivel y grados del programa."}
                              </p>
                            </div>
                          )}
                        </div>
                      </section>
    
                      <section className="coord-form-section">
                        <div className="coord-section-heading">
                          <CalendarDays size={18} />
                          <div>
                            <h3>{esFormularioVerano ? "Fechas y turno de verano" : esDeportivoForm ? "Fechas y talleres deportivos" : "Horario y grupos de atención"}</h3>
                          </div>
                        </div>
                        <div className="coord-section-grid">
                          {esDeportivoForm ?
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
                                <h4 className="coord-block-title">Configuración del horario</h4>
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
                                </div>
                                
                                <div className="coord-schedule-flow-row">
                                  <div className="coord-schedule-mini-title">Clases</div>
                                  <div className="coord-field">
                                    <label>Hora inicio *</label>
                                    <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Hora fin *</label>
                                    <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
                                  </div>
                                </div>

                                <div className="coord-schedule-flow-row">
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

                          {esDeportivoForm && (
                            <div className="coord-field coord-field-full">
                              <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
                                <strong>Configuración de Deportes por Edades y Horarios</strong>
                                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#667085" }}>
                                  Agregue cada taller deportivo detallando la disciplina, edad y horario específico (según el afiche).
                                </p>
                              </div>
                              
                              <div className="coord-deportivo-fields-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                                <div className="coord-field">
                                  <label>Deporte *</label>
                                  <select value={tallerDepDeporte} onChange={e => setTallerDepDeporte(e.target.value)}>
                                    <option value="Vóley">Vóley</option>
                                    <option value="Fútbol">Fútbol</option>
                                    <option value="Básquet">Básquet</option>
                                    <option value="Otro">Otro deporte...</option>
                                  </select>
                                  {tallerDepDeporte === "Otro" && (
                                    <input 
                                      style={{ marginTop: "6px" }}
                                      placeholder="Escriba el deporte" 
                                      value={tallerDepCustom} 
                                      onChange={e => setTallerDepCustom(e.target.value)} 
                                    />
                                  )}
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
                                          <th style={{ padding: "8px" }}>Deporte</th>
                                          <th style={{ padding: "8px" }}>Edades</th>
                                          <th style={{ padding: "8px" }}>Día y Horario</th>
                                          <th style={{ padding: "8px" }}>Cupos</th>
                                          <th style={{ padding: "8px", textAlign: "right" }}>Acción</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {form.talleresDeportivos.map((taller, idx) => (
                                          <tr key={idx} style={{ borderBottom: "1px solid #e2ece9" }}>
                                            <td style={{ padding: "8px", fontWeight: "bold" }}>{taller.deporte}</td>
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
                                    Aún no se han configurado talleres deportivos. Agregue uno usando el formulario de arriba.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
    
                          {puedeGestionarGruposFormulario && !esFormularioVerano && !esDeportivoForm ? (
                            <div className="coord-field coord-field-full">
                              <div className="coord-group-schedule-head">
                                <div>
                                  <strong>{esFormularioVerano ? "Turnos de verano" : "Turnos del mismo curso"}</strong>
                                  <p>
                                    {esFormularioVerano
                                      ? "Use turnos si Secretaría debe ofrecer horarios distintos por grado o grupo."
                                      : "Separe los grados por día sin crear otro curso. Ejemplo: 4to, 5to y 1ro secundaria el jueves; 6to grado el viernes."}
                                  </p>
                                </div>
                                <button type="button" className="coord-template-autofill" onClick={agregarGrupoHorario}>
                                  <Plus size={14} />
                                  {esFormularioVerano ? "Añadir turno" : "Añadir día para otros grados"}
                                </button>
                              </div>
                              {formHorariosPorGrupo.length ? (
                                <div className="coord-group-schedule-list">
                                  {formHorariosPorGrupo.map((grupo, index) => (
                                    <div className="coord-group-schedule" key={grupo.id || index}>
                                      <div className="coord-group-schedule-title">
                                        <strong>Grupo {index + 1}</strong>
                                        <button type="button" onClick={() => quitarGrupoHorario(index)} aria-label="Quitar grupo">
                                          <X size={14} />
                                        </button>
                                      </div>
                                      <GradeSelector
                                        niveles={nivelesGrados}
                                        seleccionados={grupo.grados || []}
                                        onToggle={(valor) => toggleGradoGrupo(index, valor)}
                                      />
                                      <div className="coord-group-schedule-grid">
                                        <div className="coord-field">
                                          <label>Días del turno *</label>
                                          <div className="coord-day-list coord-day-list-sm">
                                            {diasSemana.map((dia) => {
                                              const diasSeleccionados = String(grupo.dia || "").split(",").map(d => d.trim()).filter(Boolean);
                                              const isSelected = diasSeleccionados.includes(dia);
                                              return (
                                                <label
                                                  className={`coord-day-chip coord-day-chip-sm ${isSelected ? "is-selected" : ""}`}
                                                  key={dia}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                      const nuevosDias = isSelected
                                                        ? diasSeleccionados.filter((d) => d !== dia)
                                                        : [...diasSeleccionados, dia];
                                                      const diasOrdenados = diasSemana.filter(d => nuevosDias.includes(d));
                                                      actualizarGrupoHorario(index, "dia", diasOrdenados.join(", "));
                                                    }}
                                                  />
                                                  <span title={dia}>{dia.substring(0, 2)}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <div className="coord-field">
                                          <label>Aula</label>
                                          <input value={grupo.aula || ""} onChange={(event) => actualizarGrupoHorario(index, "aula", event.target.value)} placeholder="Ej: A-204" />
                                        </div>
                                        <div className="coord-field">
                                          <label>Clase inicio</label>
                                          <input type="time" value={grupo.horaInicio || "15:20"} onChange={(event) => actualizarGrupoHorario(index, "horaInicio", event.target.value)} />
                                        </div>
                                        <div className="coord-field">
                                          <label>Clase fin</label>
                                          <input type="time" value={grupo.horaFin || "17:20"} onChange={(event) => actualizarGrupoHorario(index, "horaFin", event.target.value)} />
                                        </div>
                                        <div className="coord-field">
                                          <label>Almuerzo inicio</label>
                                          <input type="time" value={grupo.almuerzoInicio || "14:20"} onChange={(event) => actualizarGrupoHorario(index, "almuerzoInicio", event.target.value)} />
                                        </div>
                                        <div className="coord-field">
                                          <label>Almuerzo fin</label>
                                          <input type="time" value={grupo.almuerzoFin || "15:10"} onChange={(event) => actualizarGrupoHorario(index, "almuerzoFin", event.target.value)} />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="coord-field-hint"></p>
                              )}
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
                            {esDeportivoForm ? (
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
                                <input type="checkbox" checked={form.invitacionMasiva} onChange={e => actualizarInvitacionMasiva(e.target.checked)} />
                                Invitación masiva en Padres
                              </span>
                              <small>El curso aparecerá en el portal de padres sin cargar Excel de invitados, según el alcance seleccionado.</small>
                            </label>
                            {form.invitacionMasiva ? (
                              <div className="coord-field coord-field-full">
                                <label>Alcance de la invitación masiva</label>
                                <select
                                  value={form.alcanceInvitacionMasiva || "colegio"}
                                  onChange={e => actualizarForm("alcanceInvitacionMasiva", e.target.value)}
                                >
                                  <option value="colegio">Todo el colegio</option>
                                  <option value="primaria">Solo nivel Primaria</option>
                                  <option value="secundaria">Solo nivel Secundaria</option>
                                  <option value="grados">Solo grados habilitados arriba</option>
                                </select>
                                <small>
                                  Use Primaria o Secundaria cuando el anuncio sea masivo para un nivel completo; use grados habilitados si debe respetar la selección del formulario.
                                </small>
                              </div>
                            ) : null}
                            {form.invitacionMasiva ? (
                              <div className="coord-announcement-image-field">
                                <div className="coord-announcement-copy">
                                  <Photo size={18} />
                                  <div>
                                    <strong>Imagen de anuncio para Padres</strong>
                                    
                                  </div>
                                </div>
                                {form.anuncioImagen ? (
                                  <div className="coord-announcement-preview">
                                    <img src={form.anuncioImagen} alt="Anuncio para portal de padres" />
                                    <div>
                                      <strong>{form.anuncioImagenNombre || "Imagen de anuncio"}</strong>
                                      <span>
                                        {formatearPesoArchivo(form.anuncioImagenTamano)}
                                        {form.anuncioImagenComprimida ? " · comprimida" : ""}
                                      </span>
                                      <button type="button" onClick={quitarImagenAnuncio}>
                                        Quitar imagen
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="coord-announcement-upload">
                                    <input type="file" accept="image/*" onChange={seleccionarImagenAnuncio} />
                                    <Upload size={18} />
                                    <span>Agregar imagen</span>
                                  </label>
                                )}
                              </div>
                            ) : null}
                          </div>
                          ) : (
                            <div className="coord-summer-payment-note coord-field-full">
                              <CheckCircle2 size={16} />
                              <span>Secretaría verá este programa como opción de ciclo verano y registrará el tipo de alumno al momento de la inscripción.</span>
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
