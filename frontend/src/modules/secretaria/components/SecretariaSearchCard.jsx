import { useState, useEffect } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCalendar as CalendarDays,
  IconId as IdCard,
  IconLoader2 as Loader2,
  IconSearch as Search,
  IconUserPlus as UserPlus,
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
    <article className="secretaria-card secretaria-search-card">
      <div className="secretaria-card-title">
        <span className="secretaria-title-icon">
          <IdCard size={21} />
        </span>
        <div>
          <h2>{modoBusquedaAsistencia ? "Consultar asistencia" : "Buscar estudiante"}</h2>
          <p>
            {modoBusquedaAsistencia
              ? "Ingrese DNI o nombre para ver el registro de asistencia del estudiante."
              : "Ingrese DNI o nombre para iniciar la atencion."}
          </p>
        </div>
      </div>

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

      {resultadosNombre.length ? (
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
          <div className="secretaria-name-results">
            {resultadosFiltrados.map((item) => (
              <button
                type="button"
                key={`${item.dni || item.codigoEstudiante || item.nombres}-${item.programaAsignado || "base"}`}
                onClick={async () => {
                  setDni(item.dni || item.nombres);
                  await aplicarEstudianteEncontrado(item);
                }}
              >
                <strong>{item.nombres}</strong>
                <span>{item.dni ? `DNI ${item.dni}` : "Sin DNI"} · {item.codigoEstudiante || "Sin código"} · {item.grado} {item.seccion} · {item.programaNombre || "Sin programa"}</span>
              </button>
            ))}
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
