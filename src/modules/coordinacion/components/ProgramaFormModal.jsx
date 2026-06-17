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
  const [conComunicadoManual, setConComunicadoManual] = useState(false);

  const catLowerClean = String(form.categoria || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esNoAcademico = catLowerClean && catLowerClean !== "academico";
  const esCircularEspecial = form.tipoComunicado && form.tipoComunicado !== "Otro genérico";

  useEffect(() => {
    if (show) {
      setConComunicadoManual(Boolean(form.comunicado || form.comunicadoCompleto));
    }
  }, [show, form.comunicado, form.comunicadoCompleto]);

  useEffect(() => {
    if (show && duracionTallerFormulario && !form.duracionTaller) {
      actualizarForm("duracionTaller", duracionTallerFormulario);
    }
  }, [show, duracionTallerFormulario, form.duracionTaller]);

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
                <div className="coord-field coord-program-name-field" style={{ gridColumn: "span 3" }}>
                  <label style={{ fontWeight: "700", color: "#1e3a8a" }}>Tipo de comunicado / Circular escolar *</label>
                  <select
                    value={form.tipoComunicado || "Otro genérico"}
                    disabled={esNoAcademico}
                    onChange={e => {
                      const nuevoTipo = e.target.value;
                      
                      const templates = {
                        "Club de Tareas": {
                          comunicado: "Club de Tareas está diseñado para brindar a nuestros estudiantes un espacio guiado y estructurado para la resolución y presentación oportuna de sus tareas escolares, fortaleciendo sus hábitos de estudio, autonomía y organización bajo el acompañamiento de docentes especialistas.",
                          requisitos: "Cuaderno de apuntes, cartuchera completa (lápiz, borrador, tajador, regla, colores), agenda escolar física, y los textos/cuadernos de trabajo del colegio correspondientes a las tareas pendientes del día."
                        },
                        "Reforzamiento (Circular)": {
                          comunicado: "El programa de Reforzamiento Académico tiene como objetivo primordial consolidar los aprendizajes del año escolar, brindando un soporte pedagógico personalizado para nivelar competencias y aclarar dudas en las áreas de mayor complejidad cognitiva.",
                          requisitos: "Cuaderno exclusivo del área (cuadriculado para Matemática, rayado para Comunicación), lapiceros azul y rojo, lápiz, borrador, tajador, regla y las fichas o materiales provistos por el docente de reforzamiento."
                        },
                        "Certificación Cambridge": {
                          comunicado: "La preparación para la Certificación Internacional de Cambridge English brinda a nuestros alumnos la oportunidad de certificar oficialmente su nivel de dominio del idioma inglés bajo el Marco Común Europeo de Referencia para las Lenguas (MCER), potenciando su perfil académico global.",
                          requisitos: "Libro de preparación oficial Cambridge (según el nivel asignado), cuaderno A4 cuadriculado para apuntes, cartuchera personal completa, y auriculares con conexión auxiliar de 3.5mm para las prácticas de Listening."
                        },
                        "Otro genérico": {
                          comunicado: "",
                          requisitos: ""
                        }
                      };

                      const template = templates[nuevoTipo] || { comunicado: "", requisitos: "" };
                      const tipoDocSugerido = nuevoTipo === "Certificación Cambridge" ? "Carta" : "Comunicado";
                      const prefix = tipoDocSugerido === "Carta" ? "CAR" : "COM";
                      const anio = new Date().getFullYear();
                      const randomId = Math.floor(Math.random() * 90) + 10;
                      const numDocSugerido = `${prefix}-0${randomId}-${anio}`;

                      let reseteos = {};
                      if (nuevoTipo === "Otro genérico") {
                        reseteos = {
                          tipoDocumento: "Comunicado",
                          numeroDocumento: "",
                          areaTematica: "No aplica",
                          nombreCiclo: "Ciclo I",
                          duracionTaller: "",
                          tablaHorariosNivel: [],
                          incluyeAlmuerzo: false,
                          horarioRecepcionAlmuerzo: "",
                          nivelCambridge: "",
                          modalidadesCambridge: [],
                          montoPrimerPago: "",
                        };
                      } else if (nuevoTipo === "Certificación Cambridge") {
                        reseteos = {
                          incluyeAlmuerzo: false,
                          horarioRecepcionAlmuerzo: "",
                          areaTematica: "Inglés",
                        };
                      } else {
                        reseteos = {
                          nivelCambridge: "",
                          modalidadesCambridge: [],
                          areaTematica: nuevoTipo === "Reforzamiento (Circular)" ? "Mixto" : "No aplica",
                        };
                      }

                      let categoriaSugerida = form.categoria;
                      if (nuevoTipo !== "Otro genérico") {
                        const academica = (categorias || []).find(c => {
                          const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          return normal === "academico";
                        });
                        categoriaSugerida = academica || "Academico";
                      }

                      actualizarForm({
                        tipoComunicado: nuevoTipo,
                        comunicado: template.comunicado,
                        comunicadoCompleto: template.comunicado,
                        requisitos: template.requisitos,
                        tipoDocumento: tipoDocSugerido,
                        numeroDocumento: numDocSugerido,
                        categoria: categoriaSugerida,
                        ...reseteos
                      });
                    }}
                    style={esNoAcademico ? {
                      background: "#e2e8f0",
                      color: "#64748b",
                      cursor: "not-allowed",
                      borderColor: "#cbd5e1"
                    } : {
                      background: "#eff6ff",
                      fontWeight: "bold",
                      borderColor: "#3b82f6"
                    }}
                  >
                    <option value="Otro genérico">Otro genérico (Taller común)</option>
                    <option value="Club de Tareas">Club de Tareas</option>
                    <option value="Reforzamiento (Circular)">Reforzamiento (Circular)</option>
                    <option value="Certificación Cambridge">Certificación Cambridge</option>
                  </select>
                </div>
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
                  <select
                    value={form.categoria}
                    disabled={esCircularEspecial}
                    onChange={e => actualizarCategoriaPrograma(e.target.value)}
                    style={esCircularEspecial ? {
                      background: "#e2e8f0",
                      color: "#64748b",
                      cursor: "not-allowed",
                      borderColor: "#cbd5e1"
                    } : {}}
                  >
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
                          {form.talleresDeportivos.map(t => `${t.deporte} (${t.edadMinima}-${t.edadMaxima} años)`).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            {/* SECCIÓN CONDICIONAL: DATOS DEL DOCUMENTO */}
            {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" && (
              <section className="coord-form-section" style={{ borderLeft: "4px solid #3b82f6", paddingLeft: "12px" }}>
                <div className="coord-section-heading">
                  <BookOpen size={18} style={{ color: "#3b82f6" }} />
                  <div>
                    <h3 style={{ color: "#1e3a8a" }}>Datos del documento oficial</h3>
                  </div>
                </div>
                <div className="coord-section-grid">
                  <div className="coord-field">
                    <label>Tipo de documento *</label>
                    <select
                      value={form.tipoDocumento || "Comunicado"}
                      onChange={e => {
                        const nuevoTipoDoc = e.target.value;
                        actualizarForm("tipoDocumento", nuevoTipoDoc);
                        const prefix = nuevoTipoDoc === "Carta" ? "CAR" : "COM";
                        const currentNum = form.numeroDocumento || "";
                        const anio = new Date().getFullYear();
                        if (currentNum.startsWith("COM-") || currentNum.startsWith("CAR-")) {
                          actualizarForm("numeroDocumento", currentNum.replace(/^(COM|CAR)-/, `${prefix}-`));
                        } else {
                          const randomId = Math.floor(Math.random() * 90) + 10;
                          actualizarForm("numeroDocumento", `${prefix}-0${randomId}-${anio}`);
                        }
                      }}
                    >
                      <option value="Comunicado">Comunicado</option>
                      <option value="Carta">Carta</option>
                    </select>
                  </div>
                  <div className="coord-field">
                    <label>Número de documento (editable) *</label>
                    <input
                      value={form.numeroDocumento || ""}
                      onChange={e => actualizarForm("numeroDocumento", e.target.value)}
                      placeholder="Ej: COM-001-2026"
                    />
                  </div>
                  <div className="coord-field">
                    <label>Área temática *</label>
                    <select
                      value={form.areaTematica || "No aplica"}
                      onChange={e => actualizarForm("areaTematica", e.target.value)}
                    >
                      <option value="No aplica">No aplica</option>
                      <option value="Matemática">Matemática</option>
                      <option value="Comunicación">Comunicación</option>
                      <option value="Inglés">Inglés</option>
                      <option value="Mixto">Mixto (Varios)</option>
                    </select>
                  </div>
                  <div className="coord-field">
                    <label>Nombre del ciclo *</label>
                    <select
                      value={form.nombreCiclo || "Ciclo I"}
                      onChange={e => actualizarForm("nombreCiclo", e.target.value)}
                    >
                      <option value="Ciclo I">Ciclo I</option>
                      <option value="Ciclo II">Ciclo II</option>
                      <option value="Ciclo III">Ciclo III</option>
                      <option value="Ciclo IV">Ciclo IV</option>
                    </select>
                  </div>
                  <div className="coord-field coord-field-full">
                    <label>Cuerpo o justificación del comunicado (editable) *</label>
                    <textarea
                      value={form.comunicado || ""}
                      onChange={e => {
                        actualizarForm("comunicado", e.target.value);
                        actualizarForm("comunicadoCompleto", e.target.value);
                      }}
                      placeholder="Escriba la justificación o cuerpo del comunicado..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        resize: "vertical"
                      }}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* SECCIÓN UNIFICADA: VIGENCIA Y HORARIOS */}
            {!esMaratonForm ? (
              <section className="coord-form-section">
                <div className="coord-section-heading">
                  <CalendarDays size={18} />
                  <div>
                    <h3>{esFormularioVerano ? "Fechas y horario de verano" : "Vigencia y horarios de atención"}</h3>
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
                    <label>Duración del taller</label>
                    {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" ? (
                      <input
                        value={form.duracionTaller || ""}
                        onChange={e => actualizarForm("duracionTaller", e.target.value)}
                        placeholder="Ej: 4 semanas"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontFamily: "inherit",
                          fontSize: "14px"
                        }}
                      />
                    ) : (
                      <div className="coord-readonly-field">
                        {duracionTallerFormulario || "Seleccione fechas"}
                      </div>
                    )}
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
                  {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" && (
                    <div className="coord-field">
                      <label>Cupos *</label>
                      <input
                        type="number"
                        min="1"
                        value={form.cupos || ""}
                        onChange={e => actualizarForm("cupos", e.target.value)}
                        placeholder="Ej: 50"
                      />
                    </div>
                  )}

                  {esCambridgeForm && (
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
                  )}

                  {/* Program Scheduler configuration depending on circular type */}
                  {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" ? (
                    // LEVEL SCHEDULES TABLE FOR CIRCULARS
                    <>
                      <div className="coord-field coord-field-full" style={{ marginTop: "12px" }}>
                        <label style={{ fontWeight: "700", marginBottom: "8px", display: "block" }}>
                          Cronograma de horarios por nivel
                        </label>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                            <thead>
                              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                                <th style={{ padding: "8px", textAlign: "left" }}>Nivel / Grado</th>
                                <th style={{ padding: "8px", textAlign: "left" }}>Día(s)</th>
                                <th style={{ padding: "8px", textAlign: "left" }}>Horario Almuerzo</th>
                                <th style={{ padding: "8px", textAlign: "left" }}>Horario Clase</th>
                                <th style={{ padding: "8px", width: "80px", textAlign: "center" }}>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(form.tablaHorariosNivel) && form.tablaHorariosNivel.length > 0 ? (
                                form.tablaHorariosNivel.map((row, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                    <td style={{ padding: "6px 4px" }}>
                                      <input
                                        value={row.nivel || ""}
                                        onChange={e => {
                                          const nuevaTabla = [...form.tablaHorariosNivel];
                                          nuevaTabla[idx].nivel = e.target.value;
                                          actualizarForm("tablaHorariosNivel", nuevaTabla);
                                        }}
                                        placeholder="Ej: Primaria"
                                        style={{ width: "100%", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 4px" }}>
                                      <input
                                        value={row.dia || ""}
                                        onChange={e => {
                                          const nuevaTabla = [...form.tablaHorariosNivel];
                                          nuevaTabla[idx].dia = e.target.value;
                                          actualizarForm("tablaHorariosNivel", nuevaTabla);
                                        }}
                                        placeholder="Ej: Lunes y Miércoles"
                                        style={{ width: "100%", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 4px" }}>
                                      <input
                                        value={row.horarioAlmuerzo || ""}
                                        onChange={e => {
                                          const nuevaTabla = [...form.tablaHorariosNivel];
                                          nuevaTabla[idx].horarioAlmuerzo = e.target.value;
                                          actualizarForm("tablaHorariosNivel", nuevaTabla);
                                        }}
                                        placeholder="Ej: 14:20 - 15:10"
                                        style={{ width: "100%", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 4px" }}>
                                      <input
                                        value={row.horarioClase || ""}
                                        onChange={e => {
                                          const nuevaTabla = [...form.tablaHorariosNivel];
                                          nuevaTabla[idx].horarioClase = e.target.value;
                                          actualizarForm("tablaHorariosNivel", nuevaTabla);
                                        }}
                                        placeholder="Ej: 15:20 - 17:20"
                                        style={{ width: "100%", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 4px", textAlign: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nuevaTabla = form.tablaHorariosNivel.filter((_, i) => i !== idx);
                                          actualizarForm("tablaHorariosNivel", nuevaTabla);
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#ef4444",
                                          cursor: "pointer",
                                          fontWeight: "bold"
                                        }}
                                      >
                                        Quitar
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} style={{ padding: "12px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                                    Ningún horario configurado. Presione "Añadir fila" para comenzar.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nuevaTabla = [
                              ...(form.tablaHorariosNivel || []),
                              { nivel: "", dia: "", horarioAlmuerzo: "", horarioClase: "" }
                            ];
                            actualizarForm("tablaHorariosNivel", nuevaTabla);
                          }}
                          className="coord-mini-btn"
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#0f766e",
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          <Plus size={14} /> Añadir fila por nivel
                        </button>
                      </div>

                      {/* Grades Selector for circular program */}
                      <div className="coord-field coord-field-full" style={{ marginTop: "12px" }}>
                        <label style={{ fontWeight: "700", marginBottom: "8px", display: "block" }}>Grados habilitados *</label>
                        <GradeSelector niveles={nivelesGrados} seleccionados={form.gradosAplicables || []} onToggle={toggleGrado} />
                      </div>

                      {/* Configuración de Almuerzo */}
                      {(form.tipoComunicado === "Club de Tareas" || form.tipoComunicado === "Reforzamiento (Circular)") && (
                        <div className="coord-field coord-field-full" style={{ marginTop: "16px", borderTop: "1px dashed #cbd5e1", paddingTop: "12px" }}>
                          <label className="coord-check-label" style={{ cursor: "pointer", fontWeight: "700" }}>
                            <input
                              type="checkbox"
                              checked={Boolean(form.incluyeAlmuerzo)}
                              onChange={e => actualizarForm("incluyeAlmuerzo", e.target.checked)}
                            />
                            <span>Incluye recepción de almuerzo</span>
                          </label>
                          {form.incluyeAlmuerzo && (
                            <div style={{ marginTop: "8px" }}>
                              <label style={{ fontSize: "12px", color: "#475569" }}>Horario de recepción de almuerzo (por nivel, si varía) *</label>
                              <input
                                value={form.horarioRecepcionAlmuerzo || ""}
                                onChange={e => actualizarForm("horarioRecepcionAlmuerzo", e.target.value)}
                                placeholder="Ej: Inicial: 14:00, Primaria: 14:20"
                                style={{ width: "100%", marginTop: "4px", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    // ORIGINAL GENERIC WORKSHOPS BUILDER / BLOCK SCHEDULER
                    <>
                      {usaTalleresPorEdad && (
                        <div className="coord-field coord-field-full">
                          <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
                            <strong>{esFormularioVerano ? "Configuración de talleres específicos de verano por edades y horarios" : "Configuración de Deportes por Edades y Horarios"}</strong>
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
                              <input type="number" min="1" value={tallerDepCupos} onChange={e => setTallerDepCupos(e.target.value)} />
                            </div>
                            <div className="coord-field">
                              <label>Tutor / Docente *</label>
                              <input type="text" value={tallerDepDocente} onChange={e => setTallerDepDocente(e.target.value)} placeholder="Ej: Prof. Juan" />
                            </div>
                            <div className="coord-field" style={{ display: "flex", alignItems: "flex-end" }}>
                              <button type="button" className="coord-template-autofill" style={{ width: "100%", height: "38px", display: "flex", justifyContent: "center" }} onClick={agregarTallerDeportivo}>
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
                                          <button type="button" style={{ background: "none", border: "none", color: "#b42318", cursor: "pointer", fontWeight: 700 }} onClick={() => quitarTallerDeportivo(idx)}>
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
                                {esFormularioVerano ? "Aún no se han configurado talleres de verano. Agregue uno usando el formulario de arriba." : "Aún no se han configurado talleres deportivos. Agregue uno usando el formulario de arriba."}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {usaFormularioPorBloques && puedeGestionarGruposFormulario && !usaTalleresPorEdad && (
                        <div className="coord-field coord-field-full coord-block-form-panel">
                          <div className="coord-group-schedule-head">
                            <div>
                              <strong>Horarios por grado/bloque/docente</strong>
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
                              <Plus size={14} /> Añadir bloque
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
                                    <p>{[grupo.responsable, grupo.tutora, grupo.aula ? `Aula: ${grupo.aula}` : ""].filter(Boolean).join(" · ") || "Sin docente"}</p>
                                  </div>
                                  <div className="coord-group-schedule-cell" style={{ maxWidth: "80px" }}>
                                    <span>Cupos</span>
                                    <p>{grupo.cupos || 20}</p>
                                  </div>
                                  <div className="coord-group-actions">
                                    <button type="button" className="coord-duplicate-btn" onClick={() => {
                                      const copia = { ...grupo, id: `grupo-${Date.now()}-${Math.random().toString(16).slice(2, 6)}` };
                                      agregarGrupoHorario(copia);
                                    }} title="Duplicar bloque"><CopyIcon size={14} /></button>
                                    <button type="button" className="coord-edit-btn" onClick={() => {
                                      setIndiceGrupoEditando(index);
                                      setGrupoDraft(grupo);
                                      setMostrarGrupoModal(true);
                                    }} aria-label="Editar grupo"><Edit3 size={14} /></button>
                                    <button type="button" className="coord-delete-btn" onClick={() => quitarGrupoHorario(index)} aria-label="Quitar grupo"><X size={14} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
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
                        </div>
                      )}

                      {!usaTalleresPorEdad && (!formHorariosPorGrupo || formHorariosPorGrupo.length === 0) && (
                        <div className="coord-field coord-field-full">
                          <label>Grados habilitados *</label>
                          <GradeSelector niveles={nivelesGrados} seleccionados={form.gradosAplicables || []} onToggle={toggleGrado} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            ) : (
              // SECCIÓN: FECHAS Y HORARIO DE MARATÓN
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

            {/* SECCIÓN CONDICIONAL: CERTIFICACIÓN CAMBRIDGE */}
            {form.tipoComunicado && form.tipoComunicado === "Certificación Cambridge" && (
              <section className="coord-form-section" style={{ borderLeft: "4px solid #8b5cf6", paddingLeft: "12px" }}>
                <div className="coord-section-heading">
                  <BookOpen size={18} style={{ color: "#8b5cf6" }} />
                  <div>
                    <h3 style={{ color: "#4c1d95" }}>Sección Certificación Cambridge</h3>
                  </div>
                </div>
                <div className="coord-section-grid">
                  <div className="coord-field">
                    <label>Nivel del examen Cambridge *</label>
                    <input
                      value={form.nivelCambridge || ""}
                      onChange={e => actualizarForm("nivelCambridge", e.target.value)}
                      placeholder="Ej: B1 Preliminary for Schools (PET)"
                    />
                  </div>
                  <div className="coord-field">
                    <label>Monto del primer pago (S/) *</label>
                    <input
                      type="number"
                      value={form.montoPrimerPago || ""}
                      onChange={e => actualizarForm("montoPrimerPago", e.target.value)}
                      placeholder="Ej: 180.00"
                    />
                  </div>
                  <div className="coord-field coord-field-full">
                    <label style={{ fontWeight: "700", marginBottom: "6px", display: "block" }}>
                      Modalidades de ingreso *
                    </label>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "4px" }}>
                      {["Certificado Oficial", "Admission Test", "Desempeño Académico"].map((modalidad) => {
                        const lista = Array.isArray(form.modalidadesCambridge) ? form.modalidadesCambridge : [];
                        const check = lista.includes(modalidad);
                        return (
                          <label key={modalidad} className="coord-check-label" style={{ cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={check}
                              onChange={e => {
                                const nuevaLista = e.target.checked
                                  ? [...lista, modalidad]
                                  : lista.filter(x => x !== modalidad);
                                actualizarForm("modalidadesCambridge", nuevaLista);
                              }}
                            />
                            <span>{modalidad}</span>
                          </label>
                        );
                      })}
                    </div>
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
                <div className="coord-field">
                  <label>
                    {form.tipoComunicado === "Certificación Cambridge"
                      ? "Costo total del ciclo (S/) *"
                      : esFormularioVerano
                      ? "Costo de verano (S/)"
                      : "Costo (S/)"}
                  </label>
                  <input inputMode="decimal" value={form.costo} onChange={e => actualizarCosto(e.target.value)} onBlur={formatearCostoFormulario} placeholder="70.00" />
                </div>
                <div className="coord-field">
                  <label>Modalidad de cobro</label>
                  <select value={form.modalidadCobro} onChange={e => actualizarForm("modalidadCobro", e.target.value)} disabled={esFormularioVerano}>
                    <option value="Mensual">Cuota mensual</option>
                    <option value="Unico">Pago único</option>
                  </select>
                </div>
                {!esFormularioVerano ? (
                  <div className="coord-field coord-payment-invite-field">
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
                    </label>
                  </div>
                ) : null}
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

              {!esFormularioVerano && form.invitacionMasiva ? (
                <div className="coord-summer-payment-note coord-field-full" style={{ marginTop: "12px" }}>
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

              {esFormularioVerano ? (
                <div className="coord-summer-payment-note coord-field-full" style={{ marginTop: "12px" }}>
                  <CheckCircle2 size={16} />
                  <span>Asistente verá este programa como opción de ciclo verano y registrará el tipo de alumno al momento de la inscripción.</span>
                </div>
              ) : null}

              {!esFormularioVerano && mostrarInvitacionModal && form.invitacionMasiva ? (
                <ProgramaInvitacionMasivaModal
                  actualizarForm={actualizarForm}
                  form={form}
                  quitarImagenAnuncio={quitarImagenAnuncio}
                  seleccionarImagenAnuncio={seleccionarImagenAnuncio}
                  setMostrarInvitacionModal={setMostrarInvitacionModal}
                />
              ) : null}
            </section>

            {!(form.tipoComunicado && form.tipoComunicado !== "Otro genérico") && (
              <section className="coord-form-section" style={{ paddingBottom: conComunicadoManual ? "16px" : "10px" }}>
                <div className="coord-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: conComunicadoManual ? "12px" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <BookOpen size={18} />
                    <div>
                      <h3 style={{ margin: 0 }}>Descripción o Comunicado para Padres</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`coord-toggle-switch-btn ${conComunicadoManual ? "is-active" : ""}`}
                    style={{ margin: 0 }}
                    onClick={() => {
                      const val = !conComunicadoManual;
                      setConComunicadoManual(val);
                      if (!val) {
                        actualizarForm("comunicado", "");
                        actualizarForm("comunicadoCompleto", "");
                      }
                    }}
                  >
                    <span className="coord-toggle-switch-slider"></span>
                    <div className="coord-toggle-switch-labels">
                      <span className="coord-toggle-switch-label-on">Activo</span>
                      <span className="coord-toggle-switch-label-off">Inactivo</span>
                    </div>
                  </button>
                </div>
                {conComunicadoManual && (
                  <div className="coord-section-grid" style={{ marginTop: "8px" }}>
                    <div className="coord-field coord-field-full">
                      <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>Texto del Comunicado / Descripción *</label>
                      <textarea
                        value={form.comunicado || ""}
                        onChange={e => {
                          actualizarForm("comunicado", e.target.value);
                          actualizarForm("comunicadoCompleto", e.target.value);
                        }}
                        placeholder="Escriba aquí los detalles, indicaciones, o comunicado del programa para los padres..."
                        rows={4}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          resize: "vertical"
                        }}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

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

            {/* NUEVA SECCIÓN: REQUISITOS Y MATERIALES */}
            <section className="coord-form-section">
              <div className="coord-section-heading">
                <BookOpen size={18} />
                <div>
                  <h3>Requisitos y materiales</h3>
                </div>
              </div>
              <div className="coord-section-grid">
                <div className="coord-field coord-field-full">
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>Lista de útiles / requisitos (editable) *</label>
                  <textarea
                    value={form.requisitos || ""}
                    onChange={e => actualizarForm("requisitos", e.target.value)}
                    placeholder="Escriba los materiales, útiles o requisitos necesarios para el programa..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      resize: "vertical"
                    }}
                  />
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






