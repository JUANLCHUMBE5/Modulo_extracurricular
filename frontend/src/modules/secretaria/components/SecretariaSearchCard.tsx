import { useState, useEffect } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCalendar as CalendarDays,
  IconId as IdCard,
  IconLoader2 as Loader2,
  IconSearch as Search,
  IconUserPlus as UserPlus,
  IconChevronLeft as ChevronLeft,
  IconUserCheck as UserCheck,
} from "@tabler/icons-react";

function SecretariaSearchCard({
  aplicarEstudianteEncontrado,
  abrirRegistroAlumnoExterno,
  buscando,
  buscarEstudiante,
  children,
  dni,
  estudiante,
  mensaje,
  periodo,
  resultadosNombre = [],
  setDni,
  setPeriodo,
  modoBusquedaAsistencia = false,
  limpiarBusquedaEstudiante,
  modoRegistro = false,
}) {
  const [filtroNivel, setFiltroNivel] = useState("");

  useEffect(() => {
    setFiltroNivel("");
  }, [resultadosNombre]);

  const obtenerNivelAlumno = (item) => {
    if (item.nivel) {
      const n = item.nivel.trim().toLowerCase();
      if (n.includes("inicial")) return "Inicial";
      if (n.includes("primaria")) return "Primaria";
      if (n.includes("secundaria")) return "Secundaria";
    }
    if (item.grado) {
      const g = item.grado.toLowerCase();
      if (g.includes("inicial")) return "Inicial";
      if (g.includes("primaria")) return "Primaria";
      if (g.includes("secundaria")) return "Secundaria";
    }
    return "Otro";
  };

  const nivelesDisponibles = Array.from(
    new Set(resultadosNombre.map(obtenerNivelAlumno).filter(Boolean))
  ).sort();

  const resultadosFiltrados = filtroNivel
    ? resultadosNombre.filter((item) => obtenerNivelAlumno(item) === filtroNivel)
    : resultadosNombre;
  return (
    <article className={`secretaria-card secretaria-search-card${estudiante ? " has-student" : ""}${modoRegistro ? " is-register-active" : ""}`}>
      <div className="secretaria-card-title" style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
        {estudiante && modoRegistro ? (
          <>
            <button
              type="button"
              className="secretaria-back-arrow-btn"
              onClick={limpiarBusquedaEstudiante}
              style={{
                background: "#e8f5e9",
                border: "1px solid #a5d6a7",
                cursor: "pointer",
                padding: "6px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1b5e20",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                transition: "all 0.2s ease",
              }}
              title="Volver a la búsqueda"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="secretaria-title-icon" style={{ color: "#388e3c", display: "flex", alignItems: "center" }}>
              <UserPlus size={22} />
            </span>
            <div>
              <h2 style={{ color: "#1b5e20", margin: 0, fontSize: "18px", fontWeight: "800" }}>Registrar inscripción</h2>
            </div>
            <div className="secretaria-gestion-alumnos-btn">
              <UserCheck size={16} />
              <span>Gestión de alumnos</span>
            </div>
          </>
        ) : (
          <>
            {estudiante && (
              <button
                type="button"
                className="secretaria-back-arrow-btn"
                onClick={limpiarBusquedaEstudiante}
                style={{
                  background: "#e6fcf5",
                  border: "1px solid #c3fae8",
                  cursor: "pointer",
                  padding: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0c8569",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  transition: "all 0.2s ease",
                }}
                title="Volver a la búsqueda"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <span className="secretaria-title-icon">
              <IdCard size={21} />
            </span>
            <div>
              <h2>{estudiante ? "Registrar inscripción" : (modoBusquedaAsistencia ? "Consultar asistencia" : "Buscar estudiante")}</h2>
              <p>
                {estudiante
                  ? "Complete el formulario para confirmar la inscripción del alumno."
                  : (modoBusquedaAsistencia
                    ? "Ingrese DNI o nombre para ver el registro de asistencia del estudiante."
                    : "Ingrese DNI o nombre para iniciar la atencion.")}
              </p>
            </div>
          </>
        )}
      </div>

      {!estudiante && (
        <form onSubmit={buscarEstudiante} className="secretaria-form secretaria-search-form-compact">
          <div className="secretaria-field">
            <label htmlFor="periodo">
              <CalendarDays size={15} />
              Periodo
            </label>
            <select
              id="periodo"
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
            >
              <option value="escolar">Año escolar</option>
              <option value="verano">Ciclo verano</option>
            </select>
          </div>

          <div className="secretaria-search-row">
            <div className="secretaria-input-wrap">
              <Search size={18} />
              <input
                aria-label="DNI o nombre del estudiante"
                placeholder="Ingrese DNI o nombre del estudiante"
                value={dni}
                onChange={(event) => setDni(event.target.value)}
              />
            </div>
            <button
              className="secretaria-primary-button"
              type="submit"
              disabled={buscando}
            >
              {buscando ? (
                <Loader2 className="secretaria-spin" size={17} />
              ) : (
                <Search size={17} />
              )}
              <span>{buscando ? "Buscando" : "Buscar"}</span>
            </button>
            {periodo === "verano" && !modoBusquedaAsistencia ? (
              <button
                className="secretaria-secondary-button secretaria-new-summer-student"
                type="button"
                onClick={() => abrirRegistroAlumnoExterno()}
              >
                <UserPlus size={17} />
                <span>Nuevo estudiante de verano</span>
              </button>
            ) : null}
          </div>
        </form>
      )}

      {resultadosNombre.length && !estudiante ? (
        <div className="secretaria-name-results-container">
          {nivelesDisponibles.length > 1 && (
            <div className="secretaria-nivel-filter-bar">
              <div className="secretaria-nivel-filter-group">
                <label htmlFor="filtro-nivel" className="secretaria-nivel-filter-label">
                  Filtrar por nivel:
                </label>
                <select
                  id="filtro-nivel"
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="secretaria-nivel-filter-select"
                >
                  <option value="">Todos los niveles</option>
                  {nivelesDisponibles.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {resultadosFiltrados.length > 0 && (
            <div className="secretaria-table-header">
              <span className="col-nombre">Estudiante</span>
              <span className="col-documentos">DNI / Código</span>
              <span className="col-nivel">Nivel</span>
              <span className="col-grado">Grado</span>
              <span className="col-seccion">Sección</span>
              <span className="col-programa">Estado Taller</span>
              <span className="col-acciones">Acciones</span>
            </div>
          )}
          <div className="secretaria-name-results-grid">
            {resultadosFiltrados.map((item) => {
              const gradoLimpio = String(item.grado || "")
                .replace(/inicial|primaria|secundaria/gi, "")
                .trim();
              return (
                <div
                  className="secretaria-student-result-card"
                  key={`${item.dni || item.codigoEstudiante || item.nombres}-${item.programaAsignado || "base"}`}
                >
                  <div className="col-nombre table-cell-name">
                    <strong>{item.nombres}</strong>
                  </div>
                  <div className="col-documentos table-cell-stacked">
                    <span className="doc-dni">{item.dni ? `DNI: ${item.dni}` : "Sin DNI"}</span>
                    <span className="doc-cod">{item.codigoEstudiante ? `Cód: ${item.codigoEstudiante}` : "Sin código"}</span>
                  </div>
                  <div className="col-nivel">
                    <span>{item.nivel || "—"}</span>
                  </div>
                  <div className="col-grado">
                    <span>{gradoLimpio || "—"}</span>
                  </div>
                  <div className="col-seccion">
                    <span>{item.seccion || "—"}</span>
                  </div>
                  <div className="col-programa">
                    <span className={`badge-programa ${item.programaNombre ? "has-program" : "no-program"}`}>
                      {item.programaNombre || "Sin programa"}
                    </span>
                  </div>
                  <div className="col-acciones secretaria-result-card-actions">
                    {modoBusquedaAsistencia ? (
                      <button
                        className="secretaria-action-btn view-btn"
                        title="Ver asistencia"
                        type="button"
                        onClick={async () => {
                          setDni(item.dni || item.nombres);
                          await aplicarEstudianteEncontrado(item, false, true);
                        }}
                      >
                        <UserCheck size={15} />
                        <span>Ver asistencia</span>
                      </button>
                    ) : (
                      <button
                        className="secretaria-action-btn register-btn"
                        title="Registrar inscripción"
                        type="button"
                        onClick={async () => {
                          setDni(item.dni || item.nombres);
                          await aplicarEstudianteEncontrado(item, true, true);
                        }}
                      >
                        <UserPlus size={15} />
                        <span>Inscribir</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {resultadosFiltrados.length === 0 && (
              <p className="secretaria-empty-results-text">
                No hay estudiantes en el grado seleccionado.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {mensaje ? (
        <MantineAlert className="secretaria-message" color="orange" radius="md" icon={<AlertCircle size={18} />}>
          {mensaje}
        </MantineAlert>
      ) : null}

      {!estudiante && !mensaje && !resultadosNombre.length ? (
        <div className="secretaria-search-empty">
          <div className="secretaria-search-empty-icon">
            <Search size={28} />
          </div>
          <div>
            <strong>{modoBusquedaAsistencia ? "Consulta de Asistencia" : "Lista para iniciar"}</strong>
            <span>
              {modoBusquedaAsistencia
                ? "Seleccione el período y busque al estudiante para consultar sus asistencias."
                : "Seleccione el período y busque al estudiante para continuar con el registro."}
            </span>
          </div>
        </div>
      ) : null}

      {children}
    </article>
  );
}

export default SecretariaSearchCard;
