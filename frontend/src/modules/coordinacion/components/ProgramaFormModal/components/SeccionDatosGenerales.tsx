import { IconBook as BookOpen, IconPlus as Plus, IconTrash as Trash2 } from "@tabler/icons-react";
import { normalizarPeriodoVista } from "../../../utils/coordinacionProgramUtils";

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
  const defaultSummerCatsNormalized = [
    "vacaciones utiles",
    "vacaciones útiles",
    "talleres recreativos",
    "talleres deportivos",
    "deportivos",
    "taller recreativo",
    "vacaciones",
    "verano",
    "academico",
    "académico",
    "deportivo",
    "maraton",
    "maratón",
    "reforzamiento"
  ];

  const customSummerCategories = (categorias || []).filter(c => {
    const norm = String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !defaultSummerCatsNormalized.includes(norm);
  });

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
          <label>{esFormularioVerano ? "Nombre del programa de verano" : "Nombre del programa"}</label>
          <input
            value={form.nombre}
            onChange={e => actualizarNombrePrograma(e.target.value)}
            placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelación"}
          />
        </div>

        <div className="coord-field coord-period-field">
          <label>Periodo</label>
          <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
            <option value="escolar">Año escolar</option>
            <option value="verano">Ciclo verano</option>
          </select>
        </div>

        <div className="coord-field coord-category-field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "4px" }}>
            <span style={{ whiteSpace: "nowrap" }}>Categoría</span>
            {mostrarGestorCategorias && (
              <button
                type="button"
                className="coord-category-toggle-btn"
                onClick={() => setMostrarGestorCategorias(false)}
                style={{ whiteSpace: "nowrap" }}
              >
                Ocultar
              </button>
            )}
          </label>
          <select
            value={form.categoria}
            disabled={esCircularEspecial}
            onChange={e => {
              const val = e.target.value;
              if (val === "Otro taller (Añadir)" || val === "Otro") {
                setMostrarGestorCategorias(true);
                actualizarCategoriaPrograma("");
              } else {
                actualizarCategoriaPrograma(val);
                setMostrarGestorCategorias(false);
              }
            }}
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
                <option value="Arte">Otro taller (Añadir)</option>
              </>
            ) : (
              <>
                {categoriasEscolar.map(c => {
                  let label = c;
                  if (c === "Academico") label = "Académico";
                  if (c === "Maraton") label = "Maratón";
                  return <option key={c} value={c}>{label}</option>;
                })}
                <option value="Otro taller (Añadir)">Otro taller (Añadir)</option>
              </>
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
                    {esFormularioVerano ? (
                      null
                    ) : (
                      categoriasEscolar.map(c => {
                        let label = c;
                        if (c === "Academico") label = "Académico";
                        if (c === "Maraton") label = "Maratón";
                        return <option key={c} value={c}>{label}</option>;
                      })
                    )}
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
            <label style={{ fontWeight: "700", color: "#1e3a8a" }}>Tipo de comunicado / Circular escolar</label>
            <select
              value={form.tipoComunicado || "Otro genérico"}
              disabled={esNoAcademico}
              onChange={e => {
                const nuevoTipo = e.target.value;

                const templates = {
                  "Club de Tareas": { comunicado: "", requisitos: "" },
                  "Reforzamiento (Circular)": { comunicado: "", requisitos: "" },
                  "Cambridge": { comunicado: "", requisitos: "" },
                  "Selección (Circular)": { comunicado: "", requisitos: "" },
                  "Maratón (Circular)": { comunicado: "", requisitos: "" },
                  "Otro genérico": { comunicado: "", requisitos: "" },
                  "Inscripción Exámenes Internacionales": { comunicado: "", requisitos: "" }
                };

                const template = templates[nuevoTipo] || { comunicado: "", requisitos: "" };
                const tipoDocSugerido = (nuevoTipo === "Cambridge" || nuevoTipo === "Certificación Cambridge" || nuevoTipo === "Inscripción Exámenes Internacionales") ? "Carta" : "Comunicado";
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
                } else if (nuevoTipo === "Inscripción Exámenes Internacionales") {
                  reseteos = {
                    incluyeAlmuerzo: false,
                    horarioRecepcionAlmuerzo: "",
                    areaTematica: "Inglés / Cambridge",
                    costo: "315.00",
                    modalidadCobro: "Unico",
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
                  comunicado: "",
                  comunicadoCompleto: "",
                  requisitos: "",
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
              <option value="Selección (Circular)">Selección (Circular)</option>
              <option value="Maratón (Circular)">Maratón (Circular)</option>
              <option value="Cambridge">Cambridge (Clases)</option>
              <option value="Inscripción Exámenes Internacionales">Inscripción Exámenes Internacionales</option>
              {form.tipoComunicado === "Certificación Cambridge" && (
                <option value="Certificación Cambridge" style={{ display: "none" }}>Certificación Cambridge</option>
              )}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}

export default SeccionDatosGenerales;
