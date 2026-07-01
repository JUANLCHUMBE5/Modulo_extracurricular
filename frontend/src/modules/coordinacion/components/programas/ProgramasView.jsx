import React from "react";
import { Alert as MantineAlert, Badge, Button } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCircleCheck as CheckCircle2,
  IconLoader2 as Loader2,
  IconSchool as School,
  IconTrophy as Trophy,
  IconLanguage as Language,
  IconSun as Sun,
  IconBookmark as Bookmark,
} from "@tabler/icons-react";
import ProgramasFilterCard from "./ProgramasFilterCard";
import ProgramasListTable from "./ProgramasListTable";
import { normalizarPeriodoVista } from "../../utils/coordinacionProgramUtils";

const obtenerClaseCategoria = (cat) => {
  const c = String(cat || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (c.includes("deport")) return "deportivo";
  if (c.includes("acad") || c.includes("tarea") || c.includes("utiles")) return "academico";
  if (c.includes("cambridge") || c.includes("ingles")) return "ingles";
  if (c.includes("verano") || c.includes("recreativ")) return "verano";
  return "general";
};

const obtenerIconoCategoria = (cat) => {
  const c = String(cat || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (c.includes("deport")) return <Trophy size={18} style={{ color: "#c2410c", marginRight: "8px", flexShrink: 0 }} />;
  if (c.includes("acad") || c.includes("tarea") || c.includes("utiles")) return <School size={18} style={{ color: "#0369a1", marginRight: "8px", flexShrink: 0 }} />;
  if (c.includes("cambridge") || c.includes("ingles")) return <Language size={18} style={{ color: "#6b21a8", marginRight: "8px", flexShrink: 0 }} />;
  if (c.includes("verano") || c.includes("recreativ")) return <Sun size={18} style={{ color: "#a16207", marginRight: "8px", flexShrink: 0 }} />;
  return <Bookmark size={18} style={{ color: "#475569", marginRight: "8px", flexShrink: 0 }} />;
};

/**
 * Vista contenedora para el listado de talleres extracurriculares en Coordinación.
 */
function ProgramasView({
  abrirCrear,
  abrirEditar,
  cargando,
  eliminarCurso,
  filtroPeriodo,
  finalizarPrograma,
  mensaje,
  programas,
  puedeCrearProgramas,
  puedeEditarProgramas,
  puedeVerAlumnos,
  setFiltroPeriodo,
  tieneAccionesPrograma,
  tipoMsg,
  toggleEstado,
  verInvitados,
  busqueda,
  setBusqueda,
  categorias,
  filtroCategoria,
  setFiltroCategoria,
  filtroEstado,
  setFiltroEstado,
  todosLosProgramas = [],
  toggleSidebarButton,
  mostrarSoloArchivados = false,
  clonarPrograma,
  restaurarPrograma,
}) {
  const programasEscolar = programas.filter(p => String(p.periodo || "").toLowerCase() !== "verano");
  const programasVerano = programas.filter(p => String(p.periodo || "").toLowerCase() === "verano");

  /**
   * Resetea todos los filtros a sus estados por defecto.
   */
  const limpiarTodosFiltros = () => {
    setBusqueda("");
    setFiltroCategoria("todos");
    setFiltroPeriodo("todos");
    if (!mostrarSoloArchivados) {
      setFiltroEstado("todos");
    }
  };

  const listadoVerano = ["Vacaciones Útiles", "Talleres Recreativos", "Talleres Deportivos"];
  const listadoEscolar = (categorias || []).filter(c => {
    const normCat = String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return ![
      "vacaciones utiles",
      "talleres recreativos",
      "talleres deportivos",
      "deportivos",
      "taller recreativo",
      "vacaciones"
    ].includes(normCat);
  });

  // Genera opciones dinámicas de categorías según el periodo escolar activo
  const categoriasFiltradasOptions = (() => {
    if (filtroPeriodo === "escolar") {
      return listadoEscolar.map(c => {
        let label = c;
        if (c === "Academico") label = "Académico";
        if (c === "Maraton") label = "Maratón";
        return { value: c, label };
      });
    }
    if (filtroPeriodo === "verano") {
      return listadoVerano.map(c => ({ value: c, label: c }));
    }
    const unicos = new Set([...listadoEscolar, ...listadoVerano]);
    return Array.from(unicos).map(c => {
      let label = c;
      if (c === "Academico") label = "Académico";
      if (c === "Maraton") label = "Maratón";
      return { value: c, label };
    });
  })();

  const hasActiveFilters = busqueda.trim() !== "" || filtroCategoria !== "todos" || filtroPeriodo !== "todos" || (!mostrarSoloArchivados && filtroEstado !== "todos");

  return (
    <>
      {/* Cabecera superior con barra de herramientas */}
      <header className="coord-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {toggleSidebarButton}
          <div>
            <span className="coord-topbar-eyebrow">Gestión académica</span>
            <h1>{mostrarSoloArchivados ? "Historial de Programas" : "Programas extracurriculares"}</h1>
          </div>
        </div>
      </header>

      {/* Panel principal de espacio de trabajo */}
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <ProgramasFilterCard
            mostrarSoloArchivados={mostrarSoloArchivados}
            todosLosProgramas={todosLosProgramas}
            programas={programas}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            categoriasFiltradasOptions={categoriasFiltradasOptions}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={setFiltroPeriodo}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            puedeCrearProgramas={puedeCrearProgramas}
            abrirCrear={abrirCrear}
            hasActiveFilters={hasActiveFilters}
            limpiarTodosFiltros={limpiarTodosFiltros}
          />

          {/* Banner de mensajes de estado */}
          {mensaje && (
            <MantineAlert
              className="coord-message"
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            >
              {mensaje}
            </MantineAlert>
          )}

          {/* Renderizado condicional según estado de carga y filtros */}
          {cargando ? (
            <div className="coord-loading">
              <Loader2 className="coord-spin" size={28} /> Cargando programas…
            </div>
          ) : programas.length === 0 ? (
            <div className="coord-empty-clean">
              <div className="coord-empty-clean-icon-container">
                <div className="coord-empty-clean-icon-bg"></div>
                <div className="coord-empty-clean-icon">
                  <BookOpen size={24} />
                </div>
              </div>
              <h3>No se encontraron programas</h3>
              {hasActiveFilters && (
                <>
                  <p>No hay programas registrados que coincidan con los filtros de búsqueda seleccionados. Intente cambiar la búsqueda o limpiar los filtros activos.</p>
                  <Button
                    className="coord-empty-clean-btn"
                    variant="subtle"
                    color="sanrafael"
                    size="sm"
                    onClick={limpiarTodosFiltros}
                  >
                    Limpiar todos los filtros
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ProgramasListTable
              mostrarSoloArchivados={mostrarSoloArchivados}
              programas={programas}
              programasEscolar={programasEscolar}
              programasVerano={programasVerano}
              puedeVerAlumnos={puedeVerAlumnos}
              puedeCrearProgramas={puedeCrearProgramas}
              puedeEditarProgramas={puedeEditarProgramas}
              tieneAccionesPrograma={tieneAccionesPrograma}
              verInvitados={verInvitados}
              clonarPrograma={clonarPrograma}
              restaurarPrograma={restaurarPrograma}
              abrirEditar={abrirEditar}
              toggleEstado={toggleEstado}
              finalizarPrograma={finalizarPrograma}
              eliminarCurso={eliminarCurso}
              obtenerIconoCategoria={obtenerIconoCategoria}
              obtenerClaseCategoria={obtenerClaseCategoria}
            />
          )}
        </article>
      </section>
    </>
  );
}

export default ProgramasView;
