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
  IconToolsKitchen2 as Utensils,
} from "@tabler/icons-react";
import ProgramaGrupoHorarioModal from "./ProgramaGrupoHorarioModal";
import GradeSelector from "./GradeSelector";
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
  isInline = false,
  toggleSidebarButton,
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
  iniciarEdicionTaller,
  cancelarEdicionTaller,
  indiceTallerEditando,
  seleccionarImagenAnuncio,
  setCatAEliminar,
  setMostrarGestorCategorias,
  setNuevaCat,
  setShowModal,
  show,
  tallerDepForm,
  setTallerDepForm,
  toggleDia,
  toggleGrado,
  toggleGradoGrupo,
}) {
  const [mostrarGrupoModal, setMostrarGrupoModal] = useState(false);
  const [grupoDraft, setGrupoDraft] = useState(grupoHorarioDraftInicial);
  const [grupoDraftError, setGrupoDraftError] = useState("");
  const [grupoDraftErrorTick, setGrupoDraftErrorTick] = useState(0);
  const [indiceGrupoEditando, setIndiceGrupoEditando] = useState(null);
  const [formTab, setFormTab] = useState("general"); // general, horarios, cobros
  const usaFormularioPorBloques = true;
  const esMaratonForm = String(form.categoria || "").toLowerCase() === "maraton" || String(form.categoria || "").toLowerCase() === "maratón";
  const [conComunicadoManual, setConComunicadoManual] = useState(false);
  const [popoverAbierto, setPopoverAbierto] = useState(null);

  useEffect(() => {
    if (form.incluyeAlmuerzo) {
      const nivelesEncontrados = { Inicial: null, Primaria: null, Secundaria: null };

      (formHorariosPorGrupo || []).forEach(grupo => {
        if (!grupo.almuerzoInicio || !grupo.almuerzoFin) return;
        const grados = grupo.grados || [];
        grados.forEach(gradoStr => {
          const lower = String(gradoStr || "").toLowerCase();
          let nivel = null;
          if (lower.includes("inicial")) nivel = "Inicial";
          else if (lower.includes("primaria")) nivel = "Primaria";
          else if (lower.includes("secundaria")) nivel = "Secundaria";

          if (nivel && !nivelesEncontrados[nivel]) {
            nivelesEncontrados[nivel] = {
              inicio: grupo.almuerzoInicio,
              fin: grupo.almuerzoFin
            };
          }
        });
      });

      const parts = [];
      Object.entries(nivelesEncontrados).forEach(([nivel, times]) => {
        if (times) {
          parts.push(`${nivel}: ${times.inicio} a ${times.fin}`);
        }
      });

      const calculado = parts.join(", ");
      if (calculado && calculado !== form.horarioRecepcionAlmuerzo) {
        actualizarForm("horarioRecepcionAlmuerzo", calculado);
      }
    }
  }, [formHorariosPorGrupo, form.incluyeAlmuerzo, form.horarioRecepcionAlmuerzo, actualizarForm]);

  const catLowerClean = String(form.categoria || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esAcademico = catLowerClean === "academico" || catLowerClean === "vacaciones utiles";
  const esNoAcademico = catLowerClean && catLowerClean !== "academico" && catLowerClean !== "vacaciones utiles";
  const esCircularEspecial = form.tipoComunicado && form.tipoComunicado !== "Otro genérico";
  const esMostrarSeccionAlmuerzo = esAcademico ||
    form.tipoComunicado === "Club de Tareas" ||
    form.tipoComunicado === "Reforzamiento (Circular)" ||
    form.tipoComunicado === "Certificación Cambridge";

  const categoriasEscolar = (categorias || []).filter(c => {
    const norm = String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !(
      norm === "vacaciones utiles" ||
      norm === "talleres recreativos" ||
      norm === "talleres deportivos" ||
      norm === "deportivos" ||
      norm === "taller recreativo" ||
      norm === "vacaciones"
    );
  });

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

  const formElement = (
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
          <div className={`coord-section-grid coord-general-grid ${esAcademico ? "is-academico" : ""}`}>
            <div className="coord-field coord-program-name-field"><label>{esFormularioVerano ? "Nombre del programa de verano *" : "Nombre del programa *"}</label>
              <input value={form.nombre} onChange={e => actualizarNombrePrograma(e.target.value)} placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelación"} />
            </div>

            <div className="coord-field coord-period-field"><label>Periodo *</label>
              <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
                <option value="escolar">Año escolar</option><option value="verano">Ciclo verano</option>
              </select>
            </div>

            <div className="coord-field coord-category-field">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "4px" }}>
                <span style={{ whiteSpace: "nowrap" }}>Categoría *</span>
                <button
                  type="button"
                  className="coord-category-toggle-btn"
                  onClick={() => setMostrarGestorCategorias(!mostrarGestorCategorias)}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {mostrarGestorCategorias ? "Ocultar" : "Gestionar"}
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
                {esFormularioVerano ? (
                  <>
                    <option value="Vacaciones Útiles">Vacaciones Útiles</option>
                    <option value="Talleres Recreativos">Talleres Recreativos</option>
                    <option value="Talleres Deportivos">Talleres Deportivos</option>
                  </>
                ) : (
                  categoriasEscolar.map(c => {
                    let label = c;
                    if (c === "Academico") label = "Académico";
                    if (c === "Maraton") label = "Maratón";
                    return <option key={c} value={c}>{label}</option>;
                  })
                )}
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
                        {categoriasEscolar.map(c => {
                          let label = c;
                          if (c === "Academico") label = "Académico";
                          if (c === "Maraton") label = "Maratón";
                          return <option key={c} value={c}>{label}</option>;
                        })}
                      </select>
                      <button type="button" className="coord-mini-btn coord-mini-danger-btn" onClick={quitarCategoria}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {esAcademico && (
              <div className="coord-field coord-tipo-comunicado-field">
                <label style={{ fontWeight: "700", color: "#1e3a8a" }}>Tipo de comunicado / Circular escolar *</label>
                <select
                  value={form.tipoComunicado || "Otro genérico"}
                  disabled={esNoAcademico}
                  onChange={e => {
                    const nuevoTipo = e.target.value;

                    const templates = {
                      "Club de Tareas": {
                        comunicado: "Club de Tareas está diseñado para brindar a nuestros estudiantes un espacio guiado y estructurado para la resolución y presentación oportuna de sus tareas escolares, fortaleciendo sus hábitos de estudio, autonomía y organization bajo el acompañamiento de docentes especialistas.",
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
                        areaTematica: "Matemática",
                        nombreCiclo: "Ciclo I",
                        duracionTaller: "",
                        tablaHorariosNivel: [],
                        incluyeAlmuerzo: false,
                        horarioRecepcionAlmuerzo: "",
                        nivelCambridge: "",
                        modalidadesCambridge: [],
                        montoPrimerPago: "",
                        comunicado: "",
                        comunicadoCompleto: "",
                        requisitos: "",
                        fechaInicio: "",
                        fechaFin: "",
                        duracionAvisoDias: "7",
                        cupos: "",
                        costo: "",
                        modalidadCobro: "Mensual",
                        invitacionMasiva: false,
                        horariosPorGrupo: [],
                        gradosAplicables: [],
                        dias: [],
                        horaInicio: "",
                        horaFin: "",
                      };
                    } else if (nuevoTipo === "Certificación Cambridge") {
                      reseteos = {
                        incluyeAlmuerzo: false,
                        horarioRecepcionAlmuerzo: "",
                        areaTematica: "Matemática",
                      };
                    } else {
                      reseteos = {
                        nivelCambridge: "",
                        modalidadesCambridge: [],
                        areaTematica: "Matemática",
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
            )}
            {usaTalleresPorEdad && esFormularioVerano && form.talleresDeportivos?.length > 0 ? (
              <div className="coord-field coord-field-full">
                <div className="coord-deportivo-grados-summary" style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <strong>Talleres configurados:</strong>{" "}
                  <span style={{ color: "#006b5b", fontWeight: 700 }}>
                    {form.talleresDeportivos.map(t => `${t.deporte} (${t.edadMinima}-${t.edadMaxima} años)`).join(", ")}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {form.categoria && (
          <>
            {/* SECCIÓN CONDICIONAL: DATOS DEL DOCUMENTO */}
            {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" && (
              <section className="coord-form-section" style={{ borderLeft: "4px solid #3b82f6", paddingLeft: "12px" }}>
                <div className="coord-section-heading">
                  <BookOpen size={18} style={{ color: "#3b82f6" }} />
                  <div>
                    <h3 style={{ color: "#1e3a8a" }}>Datos del documento oficial</h3>
                  </div>
                </div>
                <div className="coord-section-grid coord-doc-fields-grid">
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
                      value={form.areaTematica || "Matemática"}
                      onChange={e => actualizarForm("areaTematica", e.target.value)}
                    >
                      <option value="Matemática">Matemática</option>
                      <option value="Comunicación">Comunicación</option>
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
                  <div className="coord-time-fields-grid" style={{ gridColumn: "1 / -1" }}>
                    <div className="coord-field">
                      <label>Inicio *</label>
                      <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                    </div>
                    <div className="coord-field">
                      <label>Fin *</label>
                      <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                    </div>
                    <div className="coord-field">
                      <label>Duración</label>
                      {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" ? (
                        <input
                          value={form.duracionTaller || ""}
                          onChange={e => actualizarForm("duracionTaller", e.target.value)}
                          placeholder="Ej: 4 semanas"
                          style={{
                            width: "100%",
                            padding: "8px 12px"
                          }}
                        />
                      ) : (
                        <div className="coord-readonly-field">
                          {duracionTallerFormulario || "Seleccione fechas"}
                        </div>
                      )}
                    </div>
                    <div className="coord-field">
                      <label>Aviso (días) *</label>
                      <input
                        type="number"
                        min="1"
                        max="7"
                        value={form.duracionAvisoDias}
                        onChange={e => actualizarForm("duracionAvisoDias", e.target.value)}
                        placeholder="Máx 7 días"
                      />
                    </div>

                    {form.tipoComunicado && form.tipoComunicado !== "Otro genérico" && !puedeGestionarGruposFormulario && !usaTalleresPorEdad && (
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

                    {usaFormularioPorBloques && puedeGestionarGruposFormulario && !usaTalleresPorEdad && (
                      <div className="coord-field">
                        <label>Horarios</label>
                        <button
                          type="button"
                          className="coord-template-autofill"
                          style={{
                            height: "40px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "750",
                            background: "#eefaf5",
                            color: "#1f8f73",
                            border: "1px solid #b8d4c8",
                            borderRadius: "8px",
                            cursor: "pointer",
                            width: "100%",
                            gap: "6px"
                          }}
                          onClick={() => {
                            setIndiceGrupoEditando(null);
                            setGrupoDraft(grupoHorarioDraftInicial);
                            setMostrarGrupoModal(true);
                          }}
                        >
                          <Plus size={14} /> Añadir bloque
                        </button>
                      </div>
                    )}
                  </div>

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
                    // BLOCK SCHEDULER FOR CIRCULARS
                    <>
                      {usaFormularioPorBloques && puedeGestionarGruposFormulario && !usaTalleresPorEdad && (
                        <div className="coord-field coord-field-full coord-block-form-panel" style={{ marginTop: "12px" }}>
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
                                    <p>{formatearHora12(grupo.almuerzoInicio || "14:20")} a {formatearHora12(grupo.almuerzoFin || "15:10")}</p>
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




                    </>
                  ) : (
                    // ORIGINAL GENERIC WORKSHOPS BUILDER / BLOCK SCHEDULER
                    <>
                      {usaTalleresPorEdad && (
                        <div className="coord-field coord-field-full">
                          <div className="coord-deportivo-builder-heading" style={{ marginBottom: "14px", borderTop: "1px dashed #e2ece9", paddingTop: "14px" }}>
                            <strong>{esFormularioVerano ? "Configuración de talleres específicos de verano por edades y horarios" : "Configuración de Deportes por Edades y Horarios"}</strong>
                          </div>
                          <div className={`coord-taller-builder-grid ${indiceTallerEditando !== null ? "is-editing" : ""}`}>
                            {/* Fila 1 */}
                            <div className="coord-field coord-taller-col-4">
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
                              <div className="coord-field coord-taller-col-3">
                                <label>Nivel</label>
                                <select value={tallerDepForm.nivel} onChange={e => setTallerDepForm(prev => ({ ...prev, nivel: e.target.value }))}>
                                  <option value="Formativo">Formativo</option>
                                  <option value="Competitivo">Competitivo</option>
                                </select>
                              </div>
                            )}

                            <div className="coord-field coord-taller-col-5">
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

                            {/* Fila 2 */}
                            <div className="coord-field coord-taller-col-3">
                              <label>Días de atención</label>
                              <div className="coord-day-list coord-day-list-sm" style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                                {diasSemana.map((dia) => {
                                  const diasSeleccionados = Array.isArray(tallerDepForm.dias) ? tallerDepForm.dias : [];
                                  const isSelected = diasSeleccionados.includes(dia);
                                  return (
                                    <label className={`coord-day-chip coord-day-chip-sm ${isSelected ? "is-selected" : ""}`} key={dia} style={{ minWidth: "36px", textAlign: "center", cursor: "pointer" }}>
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

                            <div className="coord-field coord-taller-col-2">
                              <label>Tutor / Docente</label>
                              <input type="text" value={tallerDepForm.docente} onChange={e => setTallerDepForm(prev => ({ ...prev, docente: e.target.value }))} placeholder="Ej: Prof. Juan" />
                            </div>

                            <div className="coord-field coord-taller-col-2" style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                              <button type="button" className="coord-add-taller-btn" onClick={agregarTallerDeportivo} style={{ flex: 1 }}>
                                {indiceTallerEditando !== null ? (
                                  <>Guardar</>
                                ) : (
                                  <><Plus size={14} /> Añadir taller</>
                                )}
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
                                          <span style={{ background: "#e8f7ef", color: "#006b5b", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginRight: "6px" }}>{taller.dia}</span>
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
                                    <span>Días</span>
                                    <p>{grupo.dia || "Sin día"}</p>
                                  </div>
                                  <div className="coord-group-schedule-cell">
                                    <span>Almuerzo</span>
                                    <p>{formatearHora12(grupo.almuerzoInicio || "14:20")} a {formatearHora12(grupo.almuerzoFin || "15:10")}</p>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "12px 16px" }}>
                  {/* Fila 1 */}
                  <div className="coord-field coord-taller-col-5">
                    <label>Fecha (Inicio / Fin) *</label>
                    <div className="coord-flex-range">
                      <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                      <span className="coord-flex-range-separator">a</span>
                      <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                    </div>
                  </div>

                  <div className="coord-field coord-taller-col-4">
                    <label>Horario (Inicio / Fin) *</label>
                    <div className="coord-flex-range">
                      <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
                      <span className="coord-flex-range-separator">a</span>
                      <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
                    </div>
                  </div>

                  <div className="coord-field coord-taller-col-3">
                    <label>Duración</label>
                    <div className="coord-readonly-field" style={{ height: "34px", display: "flex", alignItems: "center" }}>
                      {duracionTallerFormulario || "Seleccione fechas"}
                    </div>
                  </div>

                  {/* Fila 2 */}
                  <div className="coord-field coord-taller-col-4">
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

                  <div className="coord-field coord-taller-col-4">
                    <label>Hora límite de aviso *</label>
                    <input
                      type="time"
                      value={form.horaLimiteAviso || "23:59"}
                      onChange={e => actualizarForm("horaLimiteAviso", e.target.value)}
                    />
                  </div>

                  <div className="coord-field coord-taller-col-4">
                    <label>Cupos *</label>
                    <input
                      type="number"
                      min="1"
                      value={form.cupos}
                      onChange={e => actualizarForm("cupos", e.target.value)}
                      placeholder="Ej: 50"
                    />
                  </div>

                  <div className="coord-field coord-taller-col-12">
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
                    <label className="coord-spacer-label">&nbsp;</label>
                    <label className="coord-check-label coord-check-label-stacked">
                      <span>
                        <input
                          type="checkbox"
                          checked={form.invitacionMasiva}
                          onChange={e => {
                            actualizarInvitacionMasiva(e.target.checked);
                          }}
                        />
                        Invitación masiva en Padres
                      </span>
                    </label>
                  </div>
                ) : null}
                {!esFormularioVerano && form.invitacionMasiva ? (
                  <div className="coord-field">
                    <label>Alcance de la invitación masiva</label>
                    <select
                      value={form.alcanceInvitacionMasiva || "colegio"}
                      onChange={e => actualizarForm("alcanceInvitacionMasiva", e.target.value)}
                    >
                      <option value="colegio">Todo el colegio</option>
                      <option value="inicial">Solo nivel Inicial</option>
                      <option value="primaria">Solo nivel Primaria</option>
                      <option value="secundaria">Solo nivel Secundaria</option>
                    </select>
                    <p className="coord-field-hint" style={{ fontSize: "11px", marginTop: "2px" }}>

                    </p>
                  </div>
                ) : null}
                {mostrarIndumentariaDeportiva ? (
                  <div className="coord-field coord-payment-invite-field">
                    <label className="coord-spacer-label">&nbsp;</label>
                    <label className="coord-check-label coord-check-label-stacked">
                      <span>
                        <input
                          type="checkbox"
                          checked={Boolean(form.requiereIndumentaria)}
                          onChange={e => actualizarForm("requiereIndumentaria", e.target.checked)}
                        />
                        Registrar tallas para kit deportivo (Polo y Short)
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>

              {esFormularioVerano ? (
                <div className="coord-summer-payment-note coord-field-full" style={{ marginTop: "12px" }}>
                  <CheckCircle2 size={16} />
                  <span>Asistente verá este programa como opción de ciclo verano y registrará el tipo de alumno al momento de la inscripción.</span>
                </div>
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
                          resize: "vertical"
                        }}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}



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
                      resize: "vertical"
                    }}
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN: CONFIGURACIÓN DE ALMUERZO */}
            {esMostrarSeccionAlmuerzo && (
              <section className="coord-form-section" style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }}>
                <div className="coord-section-heading">
                  <Utensils size={18} style={{ color: "#f59e0b" }} />
                  <div>
                    <h3 style={{ color: "#78350f" }}>Configuración de Almuerzo</h3>
                  </div>
                </div>
                <div className="coord-section-grid">
                  <div className="coord-field coord-field-full" style={{ margin: 0 }}>
                    <label className="coord-check-label" style={{ cursor: "pointer", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.incluyeAlmuerzo)}
                        onChange={e => {
                          const val = e.target.checked;
                          actualizarForm("incluyeAlmuerzo", val);
                          if (val) {
                            if (!form.detalleAlmuerzo) {
                              actualizarForm("detalleAlmuerzo", "Contamos con un área para la recepción de los almuerzos, donde se deberá dejar bajo el siguiente horario: De 01:20 a 01:45 p.m.\nIndicando claramente una etiqueta grande en la lonchera, con NOMBRE DEL ALUMNO, GRADO Y SECCIÓN.");
                            }
                            if (!form.concesionarios) {
                              actualizarForm("concesionarios", "Si deseara coordinar el servicio de Delivery le indicamos los siguientes contactos de nuestros 2 concesionarios para desayunos, loncheras, almuerzos:\nCafetín Los Amigos del recreo (Sra. Rocío) - 976280197\nCafetín Edith (Sra. Deysli) - 960897529\nque son concesionarias autorizadas de nuestra Institución y que cumplen con todo el protocolo que corresponde de acuerdo a las disposiciones del MINSA.");
                            }
                          }
                        }}
                      />
                      <span>Incluye recepción de almuerzo</span>
                    </label>

                    {form.incluyeAlmuerzo && (
                      <div style={{ marginTop: "16px" }}>
                        <div style={{
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          marginBottom: "16px",
                          color: "#78350f"
                        }}>
                          <strong style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "#b45309" }}>
                            ⏰ Horario de recepción de almuerzo (calculado automáticamente del horario de almuerzo de arriba):
                          </strong>
                          {form.horarioRecepcionAlmuerzo ? (
                            <span style={{ fontSize: "14px", fontWeight: "600" }}>
                              {form.horarioRecepcionAlmuerzo.split(", ").map(part => {
                                const match = part.match(/(Inicial|Primaria|Secundaria)\s*:\s*(\d{2}:\d{2})\s*a\s*(\d{2}:\d{2})/i);
                                if (match) {
                                  const level = match[1];
                                  const t1 = formatearHora12(match[2]);
                                  const t2 = formatearHora12(match[3]);
                                  return `${level}: de ${t1} a ${t2}`;
                                }
                                return part;
                              }).join(" · ")}
                            </span>
                          ) : (
                            <span style={{ fontSize: "13px", color: "#b45309", fontStyle: "italic" }}>
                              Configure al menos un bloque con horario de almuerzo arriba para calcular el horario de recepción.
                            </span>
                          )}
                        </div>

                        <div style={{ marginTop: "12px" }}>
                          <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                            Detalle / Indicaciones de almuerzo *
                          </label>
                          <textarea
                            value={form.detalleAlmuerzo || ""}
                            onChange={e => actualizarForm("detalleAlmuerzo", e.target.value)}
                            placeholder="Ej: Contamos con un área para la recepción de los almuerzos..."
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              fontSize: "13px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              resize: "vertical",
                              fontFamily: "inherit"
                            }}
                          />
                        </div>

                        <div style={{ marginTop: "12px" }}>
                          <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                            Concesionarios autorizados *
                          </label>
                          <textarea
                            value={form.concesionarios || ""}
                            onChange={e => actualizarForm("concesionarios", e.target.value)}
                            placeholder="Ej: Cafetín Los Amigos del recreo (Sra. Rocío) - 976280197..."
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              fontSize: "13px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              resize: "vertical",
                              fontFamily: "inherit"
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </form>
  );

  const actionsElement = (
    <div className={isInline ? "coord-card-actions" : "coord-modal-actions"} style={isInline ? { display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" } : {}}>
      <button type="button" className="coord-secondary-button" onClick={() => setShowModal(false)}>Cancelar</button>
      <button type="submit" form="form-programa" className="coord-register-button" disabled={guardando}>
        {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
        <span>{guardando ? "Guardando" : modoEditar ? "Actualizar" : "Crear programa"}</span>
      </button>
    </div>
  );

  if (isInline) {
    return (
      <>
        <header className="coord-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {toggleSidebarButton}
            <h1>{modoEditar ? "EDITAR PROGRAMA" : "REGISTRAR PROGRAMA"}</h1>
          </div>
        </header>
        <section className="coord-workspace coord-workspace-single">
          <article className="coord-card coord-program-form-card" style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
            <div className="coord-card-title">
              <span className="coord-title-icon">
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
            {formElement}
            {actionsElement}
          </article>
        </section>
      </>
    );
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
        {formElement}
        {actionsElement}
      </div>
    </div>
  );
}

export default ProgramaFormModal;






