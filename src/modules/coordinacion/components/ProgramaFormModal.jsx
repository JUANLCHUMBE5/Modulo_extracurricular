import { useEffect, useState } from "react";
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
  IconCopy as CopyIcon,
} from "@tabler/icons-react";
import ProgramaGrupoHorarioModal from "./ProgramaGrupoHorarioModal";
import GradeSelector from "./GradeSelector";
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
  cupos: 20,
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
  ciclosCambridgeFormulario,
  diasSemana,
  duracionTallerFormulario,
  esDeportivoForm,
  esCambridgeForm,
  esFormularioVerano,
  usaTalleresPorEdad,
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
  setTallerDepDocente,
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
  tallerDepDocente,
  toggleDia,
  toggleGrado,
  toggleGradoGrupo,
}) {
  const [mostrarGrupoModal, setMostrarGrupoModal] = useState(false);
  const [mostrarInvitacionModal, setMostrarInvitacionModal] = useState(false);
  const [grupoDraft, setGrupoDraft] = useState(grupoHorarioDraftInicial);
  const [grupoDraftError, setGrupoDraftError] = useState("");
  const [grupoDraftErrorTick, setGrupoDraftErrorTick] = useState(0);
  const [indiceGrupoEditando, setIndiceGrupoEditando] = useState(null);
  const [formTab, setFormTab] = useState("general"); // general, horarios, cobros
  const usaFormularioPorBloques = true;
  const esMaratonForm = String(form.categoria || "").toLowerCase() === "maraton" || String(form.categoria || "").toLowerCase() === "maratón";

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
    setIndiceGrupoEditando(null);
  }

  function guardarGrupoDraft() {
    const grados = Array.isArray(grupoDraft.grados) ? grupoDraft.grados.filter(Boolean) : [];
    const dias = String(grupoDraft.dia || "").split(",").map(d => d.trim()).filter(Boolean);

    if ((!esCambridgeForm && !grados.length) || !dias.length || !grupoDraft.horaInicio || !grupoDraft.horaFin) {
      setGrupoDraftError(esCambridgeForm ? "Faltan días u horario del bloque." : "Faltan grados, días u horario del bloque.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }

    if (grupoDraft.horaInicio >= grupoDraft.horaFin) {
      setGrupoDraftError("La hora de inicio de clase debe ser menor a la hora de fin.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }
    if ((grupoDraft.almuerzoInicio && !grupoDraft.almuerzoFin) || (!grupoDraft.almuerzoInicio && grupoDraft.almuerzoFin)) {
      setGrupoDraftError("Complete hora de inicio y fin del almuerzo.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
    }
    if (grupoDraft.almuerzoInicio && grupoDraft.almuerzoFin && grupoDraft.almuerzoInicio >= grupoDraft.almuerzoFin) {
      setGrupoDraftError("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
      setGrupoDraftErrorTick((actual) => actual + 1);
      return;
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

    if (indiceGrupoEditando !== null) {
      actualizarGrupoHorario(indiceGrupoEditando, grupoDraft);
    } else {
      agregarGrupoHorario({ ...grupoDraft, id: grupoDraft.id || `grupo-${Date.now()}` });
    }
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
                {usaTalleresPorEdad && esFormularioVerano ? (
                  <div className="coord-field">
                    <label>Talleres habilitados</label>
                    <p className="coord-field-hint" style={{ marginTop: "4px" }}>
                      Configure abajo cada taller de verano con edad, día, horario y cupos. Asistente registrará a los alumnos.
                    </p>
                    {form.talleresDeportivos?.length > 0 && (
                      <div className="coord-deportivo-grados-summary" style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                        <strong>Talleres configurados:</strong>{" "}
                        <span style={{ color: "#006b5b", fontWeight: 700 }}>
                          {`${form.talleresDeportivos.length} taller(es)`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            {!esMaratonForm ? (
              <section className="coord-form-section">
                <div className="coord-section-heading">
                  <CalendarDays size={18} />
                  <div>
                    <h3>{esFormularioVerano ? "Fechas y horario de verano" : esDeportivoForm ? "Fechas y talleres deportivos" : "Grados y horarios de atención"}</h3>
                  </div>
                </div>
                <div className="coord-section-grid">
                  {usaTalleresPorEdad ?
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
                    null
                  }

                  {esCambridgeForm ? (
                    <div className="coord-field coord-field-full">
                      <div className="coord-section-grid">
                        <div className="coord-field">
                          <label>Ciclo I para carta Cambridge</label>
                          <div className="coord-readonly-field">
                            {ciclosCambridgeFormulario?.cicloI || "No aplica segun fechas"}
                          </div>
                        </div>
                        <div className="coord-field">
                          <label>Ciclo II para carta Cambridge</label>
                          <div className="coord-readonly-field">
                            {ciclosCambridgeFormulario?.cicloII || "No aplica segun fechas"}
                          </div>
                        </div>
                      </div>
                      <p className="coord-field-hint">
                        Se calculan automaticamente segun la fecha de inicio y fin del programa.
                      </p>
                    </div>
                  ) : null}

                  {usaTalleresPorEdad && (
                    <div className="coord-field coord-field-full">
                      <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
                        <strong>{esFormularioVerano ? "Configuración de talleres específicos de verano por edades y horarios" : "Configuración de Deportes por Edades y Horarios"}</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#667085" }}>
                          {esFormularioVerano
                            ? "Agregue cada taller o actividad detallando la disciplina, edad y horario específico (según el afiche)."
                            : ""}
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

                        <div className="coord-field">
                          <label>Tutor / Docente *</label>
                          <input
                            type="text"
                            value={tallerDepDocente}
                            onChange={e => setTallerDepDocente(e.target.value)}
                            placeholder="Ej: Prof. Juan"
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
                                      <span style={{ background: "#e8f7ef", color: "#006b5b", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginRight: "6px" }}>{taller.dia}</span>
                                      {formatearHora12(taller.horaInicio)} a {formatearHora12(taller.horaFin)}
                                    </td>
                                    <td style={{ padding: "8px" }}>{taller.docente || "-"}</td>
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

                  {usaFormularioPorBloques && puedeGestionarGruposFormulario && !usaTalleresPorEdad ? (
                    <div className="coord-field coord-field-full coord-block-form-panel">
                      <div className="coord-group-schedule-head">
                        <div>
                          <strong>Horarios por grado/bloque/docente</strong>
                          <p></p>
                        </div>
                        <button
                          type="button"
                          className="coord-template-autofill"
                          onClick={() => {
                            setIndiceGrupoEditando(null);
                            setGrupoDraft(grupoHorarioDraftInicial);
                            setMostrarGrupoModal(true);
                          }}
                        >
                          <Plus size={14} />
                          Añadir bloque
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
                                <p>{grupo.dia || "Sin día"} · Almuerzo {formatearHora12(grupo.almuerzoInicio || "14:20")} a {formatearHora12(grupo.almuerzoFin || "15:10")} · Clase {formatearHora12(grupo.horaInicio || "15:20")} a {formatearHora12(grupo.horaFin || "17:20")}</p>
                              </div>
                              <div className="coord-group-schedule-cell">
                                <span>Docente / aula</span>
                                <p>
                                  {[grupo.responsable, grupo.tutora, grupo.aula ? `Aula: ${grupo.aula}` : ""]
                                    .filter(Boolean)
                                    .join(" · ") || "Sin docente"}
                                </p>
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
                                    const copia = {
                                      ...grupo,
                                      id: `grupo-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
                                    };
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
                        <p className="coord-field-hint"></p>
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
                          esCambridgeForm={esCambridgeForm}
                          nivelesGrados={nivelesGrados}
                          toggleGradoDraft={toggleGradoDraft}
                        />
                      ) : null}
                      <div className="coord-schedule-flow-row coord-schedule-flow-row-wide coord-block-validity-row">
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
                          <label>Duracion del taller</label>
                          <div className="coord-readonly-field">
                            {duracionTallerFormulario || "Seleccione fechas"}
                          </div>
                        </div>
                        <div className="coord-field">
                          <label>Aviso abierto (dias) *</label>
                          <input
                            type="number"
                            min="1"
                            max="7"
                            value={form.duracionAvisoDias}
                            onChange={e => actualizarForm("duracionAvisoDias", e.target.value)}
                            placeholder="Max 7 dias"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : (
              <section className="coord-form-section">
                <div className="coord-section-heading">
                  <CalendarDays size={18} />
                  <div>
                    <h3>Fechas y horario de la maratón</h3>
                  </div>
                </div>
                <div className="coord-section-grid">
                  <div className="coord-field">
                    <label>Fecha inicio *</label>
                    <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                  </div>
                  <div className="coord-field">
                    <label>Fecha fin *</label>
                    <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                  </div>
                  <div className="coord-field">
                    <label>Hora inicio *</label>
                    <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
                  </div>
                  <div className="coord-field">
                    <label>Hora fin *</label>
                    <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
                  </div>
                  <div className="coord-field">
                    <label>Duración</label>
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
                  <div className="coord-field">
                    <label>Hora límite de aviso *</label>
                    <input
                      type="time"
                      value={form.horaLimiteAviso || "23:59"}
                      onChange={e => actualizarForm("horaLimiteAviso", e.target.value)}
                    />
                  </div>
                  <div className="coord-field">
                    <label>Cupos *</label>
                    <input
                      type="number"
                      min="1"
                      value={form.cupos}
                      onChange={e => actualizarForm("cupos", e.target.value)}
                      placeholder="Ej: 50"
                    />
                  </div>
                  <div className="coord-field coord-field-full">
                    <label>Grados habilitados *</label>
                    <GradeSelector niveles={nivelesGrados} seleccionados={form.gradosAplicables || []} onToggle={toggleGrado} />
                  </div>
                </div>
              </section>
            )}

            <section className="coord-form-section">
              <div className="coord-section-heading">
                <DollarSign size={18} />
                <div>
                  <h3>{esFormularioVerano ? "Pago de verano" : esDeportivoForm ? "Cobro e Indumentaria" : "Cobro"}</h3>
                </div>
              </div>
              <div className="coord-section-grid coord-payment-grid">
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
                {mostrarIndumentariaDeportiva ? (
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
                ) : null}
              </div>
            </section>

            {!usaTalleresPorEdad && (!formHorariosPorGrupo || formHorariosPorGrupo.length === 0) ? (
              <section className="coord-form-section">
                <div className="coord-section-heading">
                  <Users size={18} />
                  <div>
                    <h3>Responsable</h3>
                  </div>
                </div>
                <div className="coord-section-grid">
                  <div className="coord-field"><label>Responsable</label>
                    <input value={form.responsable} onChange={e => actualizarForm("responsable", e.target.value)} placeholder="Prof. Ana Torres" />
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






