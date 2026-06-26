import { IconBook as BookOpen, IconPlus as Plus, IconTrash as Trash2 } from "@tabler/icons-react";
import { normalizarPeriodoVista } from "../../utils/coordinacionProgramUtils";

function SeccionDatosGenerales({
  form,
  esFormularioVerano,
  esAcademico,
  esNoAcademico,
  esCircularEspecial,
  mostrarGestorCategorias,
  setMostrarGestorCategorias,
  nuevaCat,
  setNuevaCat,
  agregarCategoria,
  catAEliminar,
  setCatAEliminar,
  quitarCategoria,
  categoriasEscolar,
  actualizarNombrePrograma,
  cambiarPeriodoFormulario,
  actualizarCategoriaPrograma,
  actualizarForm,
  categorias,
  usaTalleresPorEdad,
}) {
  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <BookOpen size={18} />
        <div>
          <h3>{esFormularioVerano ? "Datos del programa de verano" : "Datos generales"}</h3>
        </div>
      </div>
      <div className={`coord-section-grid coord-general-grid ${esAcademico ? "is-academico" : ""}`}>
        <div className="coord-field coord-program-name-field">
          <label>{esFormularioVerano ? "Nombre del programa de verano *" : "Nombre del programa *"}</label>
          <input
            value={form.nombre}
            onChange={e => actualizarNombrePrograma(e.target.value)}
            placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelación"}
          />
        </div>

        <div className="coord-field coord-period-field">
          <label>Periodo *</label>
          <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
            <option value="escolar">Año escolar</option>
            <option value="verano">Ciclo verano</option>
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
        </div>

        {mostrarGestorCategorias ? (
          <div className="coord-category-manager-container coord-field-full">
            <div className="coord-category-manager-inner">
              <div className="coord-field">
                <label>Nueva categoría</label>
                <div className="coord-inline-field">
                  <input
                    placeholder="Ej: Arte, verano, alto rendimiento"
                    value={nuevaCat}
                    onChange={e => setNuevaCat(e.target.value)}
                  />
                  <button type="button" className="coord-mini-btn" onClick={agregarCategoria}>
                    <Plus size={14} />
                  </button>
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
                  <button type="button" className="coord-mini-btn coord-mini-danger-btn" onClick={quitarCategoria}>
                    <Trash2 size={14} />
                  </button>
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
                  "Cambridge": {
                    comunicado: "La preparación para la Certificación Internacional de Cambridge English brinda a nuestros alumnos la oportunidad de certificar oficialmente su nivel de dominio del idioma inglés bajo el Marco Común Europeo de Referencia para las Lenguas (MCER), potenciando su perfil académico global.",
                    requisitos: "Libro de preparación oficial Cambridge (según el nivel asignado), cuaderno A4 cuadriculado para apuntes, cartuchera personal completa, y auriculares con conexión auxiliar de 3.5mm para las prácticas de Listening."
                  },
                  "Otro genérico": {
                    comunicado: "",
                    requisitos: ""
                  }
                };

                const template = templates[nuevoTipo] || { comunicado: "", requisitos: "" };
                const tipoDocSugerido = (nuevoTipo === "Cambridge" || nuevoTipo === "Certificación Cambridge") ? "Carta" : "Comunicado";
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
                } else if (nuevoTipo === "Cambridge" || nuevoTipo === "Certificación Cambridge") {
                  reseteos = {
                    incluyeAlmuerzo: false,
                    horarioRecepcionAlmuerzo: "",
                    areaTematica: "Inglés / Cambridge",
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
              <option value="Cambridge">Cambridge</option>
              {form.tipoComunicado === "Certificación Cambridge" && (
                <option value="Certificación Cambridge" style={{ display: "none" }}>Certificación Cambridge</option>
              )}
            </select>
          </div>
        )}
        {usaTalleresPorEdad && esFormularioVerano && form.talleresDeportivos?.length > 0 ? (
          <div className="coord-field coord-field-full">
            <div
              className="coord-deportivo-grados-summary"
              style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}
            >
              <strong>Talleres configurados:</strong>{" "}
              <span style={{ color: "#006b5b", fontWeight: 700 }}>
                {form.talleresDeportivos.map(t => `${t.deporte} (${t.edadMinima}-${t.edadMaxima} años)`).join(", ")}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SeccionDatosGenerales;
