import { Alert as MantineAlert, Badge, Group, ActionIcon, Tooltip, TextInput, Select, Button } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconEye as Eye,
  IconLoader2 as Loader2,
  IconPlus as Plus,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconTrash as Trash2,
  IconSchool as School,
  IconTrophy as Trophy,
  IconLanguage as Language,
  IconSun as Sun,
  IconBookmark as Bookmark,
  IconSearch as Search,
  IconX as X,
  IconFilter as Filter,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/coordinacionFormatters";
import { CuposTabla, GradosTabla, HorarioTabla, VigenciaTabla } from "./ProgramTableCells";

const obtenerClaseCategoria = (cat) => {
  const c = String(cat || "").toLowerCase();
  if (c.includes("deport")) return "deportivo";
  if (c.includes("acad") || c.includes("tarea")) return "academico";
  if (c.includes("cambridge") || c.includes("ingles") || c.includes("ingl")) return "ingles";
  if (c.includes("verano")) return "verano";
  return "general";
};

const obtenerIconoCategoria = (cat) => {
  const c = String(cat || "").toLowerCase();
  if (c.includes("deport")) return <Trophy size={18} style={{ color: "#c2410c", marginRight: "8px", flexShrink: 0 }} />;
  if (c.includes("acad") || c.includes("tarea")) return <School size={18} style={{ color: "#0369a1", marginRight: "8px", flexShrink: 0 }} />;
  if (c.includes("cambridge") || c.includes("ingles") || c.includes("ingl")) return <Language size={18} style={{ color: "#6b21a8", marginRight: "8px", flexShrink: 0 }} />;
  if (c.includes("verano")) return <Sun size={18} style={{ color: "#a16207", marginRight: "8px", flexShrink: 0 }} />;
  return <Bookmark size={18} style={{ color: "#475569", marginRight: "8px", flexShrink: 0 }} />;
};

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
}) {
  const limpiarTodosFiltros = () => {
    setBusqueda("");
    setFiltroCategoria("todos");
    setFiltroPeriodo("todos");
    setFiltroEstado("todos");
  };

  const hasActiveFilters = busqueda.trim() !== "" || filtroCategoria !== "todos" || filtroPeriodo !== "todos" || filtroEstado !== "todos";

  return (
    <>
      <header className="coord-topbar">
        <span className="coord-topbar-eyebrow">Gestion academica</span>
        <h1>Programas extracurriculares</h1>
      </header>
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span className="coord-title-icon"><BookOpen size={21} /></span>
              <div>
                <h2>Programas registrados</h2>
                <p>Consulte, cree o administre programas y talleres.</p>
              </div>
            </div>
            <div className="coord-stats-badges" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Badge variant="light" color="blue" size="md">
                {todosLosProgramas.length} en total
              </Badge>
              <Badge variant="light" color="green" size="md">
                {todosLosProgramas.filter(p => p.estado === "Habilitado").length} disponibles
              </Badge>
              {programas.length !== todosLosProgramas.length && (
                <Badge variant="filled" color="orange" size="md">
                  {programas.length} filtrados
                </Badge>
              )}
            </div>
          </div>

          <div className="coord-filtros-card-mantine" style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
            <div className="coord-filtros-row-mantine" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px" }}>
              {/* Buscador */}
              <div className="coord-filter-search" style={{ flex: "2 1 200px" }}>
                <TextInput
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      <Search size={14} style={{ color: "#176c60" }} /> Buscar taller
                    </span>
                  }
                  placeholder="Nombre o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  leftSection={<Search size={16} color="#94a3b8" />}
                  rightSection={
                    busqueda && (
                      <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setBusqueda("")}>
                        <X size={16} />
                      </ActionIcon>
                    )
                  }
                  size="md"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Categorías */}
              <div className="coord-filter-category" style={{ flex: "1 1 140px" }}>
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      <Filter size={14} style={{ color: "#176c60" }} /> Categoría
                    </span>
                  }
                  value={filtroCategoria}
                  onChange={(value) => setFiltroCategoria(value || "todos")}
                  data={[
                    { value: "todos", label: "Todas" },
                    ...categorias.map((cat) => ({ value: cat, label: cat }))
                  ]}
                  size="md"
                  style={{ width: "100%" }}
                  allowDeselect={false}
                />
              </div>

              {/* Periodo */}
              <div className="coord-filter-period" style={{ flex: "1 1 130px" }}>
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      <CalendarDays size={14} style={{ color: "#176c60" }} /> Periodo
                    </span>
                  }
                  value={filtroPeriodo}
                  onChange={(value) => setFiltroPeriodo(value || "todos")}
                  data={[
                    { value: "todos", label: "Todos" },
                    { value: "escolar", label: "Año escolar" },
                    { value: "verano", label: "Ciclo verano" }
                  ]}
                  size="md"
                  style={{ width: "100%" }}
                  allowDeselect={false}
                />
              </div>

              {/* Disponibilidad */}
              <div className="coord-filter-status" style={{ flex: "1 1 130px" }}>
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      <Filter size={14} style={{ color: "#176c60" }} /> Disponibilidad
                    </span>
                  }
                  value={filtroEstado}
                  onChange={(value) => setFiltroEstado(value || "todos")}
                  data={[
                    { value: "todos", label: "Todos" },
                    { value: "disponibles", label: "Solo disponibles" },
                    { value: "deshabilitados", label: "Deshabilitados" },
                    { value: "finalizados", label: "Finalizados" }
                  ]}
                  size="md"
                  style={{ width: "100%" }}
                  allowDeselect={false}
                />
              </div>

              {/* Botón de Registro */}
              {puedeCrearProgramas ? (
                <div style={{ flex: "0 0 auto", height: "42px", display: "flex", alignItems: "flex-end" }}>
                  <Button
                    color="sanrafael"
                    onClick={abrirCrear}
                    leftSection={<Plus size={17} />}
                    size="md"
                    style={{ height: "42px" }}
                  >
                    Nuevo programa
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Filtros Activos Resumen */}
            {hasActiveFilters && (
              <Group gap="xs" style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Filtros activos:</span>
                {busqueda.trim() && (
                  <Badge color="sanrafael" variant="light" rightSection={<X size={12} onClick={() => setBusqueda("")} style={{ cursor: "pointer" }} />}>
                    Búsqueda: {busqueda}
                  </Badge>
                )}
                {filtroCategoria !== "todos" && (
                  <Badge color="sanrafael" variant="light" rightSection={<X size={12} onClick={() => setFiltroCategoria("todos")} style={{ cursor: "pointer" }} />}>
                    Categoría: {filtroCategoria}
                  </Badge>
                )}
                {filtroPeriodo !== "todos" && (
                  <Badge color="sanrafael" variant="light" rightSection={<X size={12} onClick={() => setFiltroPeriodo("todos")} style={{ cursor: "pointer" }} />}>
                    Periodo: {filtroPeriodo === "escolar" ? "Año escolar" : "Ciclo verano"}
                  </Badge>
                )}
                {filtroEstado !== "todos" && (
                  <Badge color="sanrafael" variant="light" rightSection={<X size={12} onClick={() => setFiltroEstado("todos")} style={{ cursor: "pointer" }} />}>
                    Estado: {filtroEstado === "disponibles" ? "Habilitado" : filtroEstado === "deshabilitados" ? "Deshabilitado" : "Finalizado"}
                  </Badge>
                )}
                <Button variant="subtle" size="xs" color="red" onClick={limpiarTodosFiltros} style={{ padding: "0 8px", height: "24px" }}>
                  Limpiar filtros
                </Button>
              </Group>
            )}
          </div>

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

          {cargando ? (
            <div className="coord-loading"><Loader2 className="coord-spin" size={28} /> Cargando programas…</div>
          ) : programas.length === 0 ? (
            <div className="coord-empty"><AlertCircle size={18} /><p>No se encontraron programas.</p></div>
          ) : (
            <div className="coord-program-card-list">
              {programas.map((programa) => (
                <article
                  key={programa.id}
                  className={`coord-program-card-item coord-program-card-${String(programa.estado || "").toLowerCase()} coord-cat-${obtenerClaseCategoria(programa.categoria)}`}
                >
                  <div className="coord-program-card-body">
                    <div className="coord-program-card-header">
                      <div className="coord-program-card-title">
                        <h3 style={{ display: "flex", alignItems: "center" }}>
                          {obtenerIconoCategoria(programa.categoria)}
                          <span>{programa.nombre}</span>
                        </h3>
                        <div className="coord-program-card-meta">
                          <span>{programa.id || "Sin código"}</span>
                          <span className={`coord-badge-cat coord-badge-cat-${obtenerClaseCategoria(programa.categoria)}`}>
                            {programa.categoria || "General"}
                          </span>
                          <span>Tutor: {programa.responsable || "No asignado"}</span>
                        </div>
                      </div>
                      <Badge
                        color={programa.estado === "Habilitado" ? "blue" : programa.estado === "Deshabilitado" ? "red" : "yellow"}
                        variant={programa.estado === "Deshabilitado" ? "filled" : "light"}
                        size="sm"
                      >
                        {programa.estado}
                      </Badge>
                    </div>

                    <div className="coord-program-card-grid">
                      <div className="coord-program-card-detail">
                        <span>Grados</span>
                        <GradosTabla programa={programa} />
                      </div>
                      <div className="coord-program-card-detail coord-program-card-schedule">
                        <span>Días y horario</span>
                        <HorarioTabla programa={programa} />
                      </div>
                      <div className="coord-program-card-detail">
                        <span>Vigencia</span>
                        <VigenciaTabla
                          inicio={programa.fechaInicio}
                          fin={programa.fechaFin}
                          duracion={programa.duracionTaller}
                          avisoDias={programa.duracionAvisoDias}
                        />
                      </div>
                      <div className="coord-program-card-detail">
                        <span>Cupos</span>
                        <CuposTabla programa={programa} />
                      </div>
                      <div className="coord-program-card-detail coord-program-card-cost">
                        <span>Costo</span>
                        <strong>{formatearSoles(programa.costo)}</strong>
                      </div>
                    </div>
                  </div>

                  {tieneAccionesPrograma ? (
                    <div className="coord-program-card-actions" aria-label={`Acciones de ${programa.nombre}`}>
                      <Group gap={6} justify="flex-end">
                        {puedeEditarProgramas ? (
                          <Tooltip label="Editar">
                            <ActionIcon
                              className="coord-program-action coord-program-action-edit"
                              size="sm"
                              color="blue"
                              variant="light"
                              onClick={() => abrirEditar(programa)}
                            >
                              <Edit3 size={15} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                        {puedeVerAlumnos ? (
                          <Tooltip label="Ver alumnos">
                            <ActionIcon
                              className="coord-program-action coord-program-action-view"
                              size="sm"
                              color="cyan"
                              variant="light"
                              onClick={() => verInvitados(programa)}
                            >
                              <Eye size={15} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                        {puedeEditarProgramas && programa.estado !== "Finalizado" && (
                          <Tooltip label={programa.estado === "Habilitado" ? "Deshabilitar" : "Habilitar"}>
                            <ActionIcon
                              className={`coord-program-action ${programa.estado === "Habilitado" ? "coord-program-action-disable" : "coord-program-action-enable"}`}
                              size="sm"
                              color={programa.estado === "Habilitado" ? "orange" : "green"}
                              variant="light"
                              onClick={() => toggleEstado(programa)}
                            >
                              {programa.estado === "Habilitado" ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {puedeEditarProgramas && programa.estado !== "Finalizado" && (
                          <Tooltip label="Finalizar">
                            <ActionIcon
                              className="coord-program-action coord-program-action-finish"
                              size="sm"
                              color="teal"
                              variant="light"
                              onClick={() => finalizarPrograma(programa)}
                            >
                              <CheckCircle2 size={15} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {puedeEditarProgramas ? (
                          <Tooltip label="Eliminar">
                            <ActionIcon
                              className="coord-program-action coord-program-action-delete"
                              size="sm"
                              color="red"
                              variant="light"
                              onClick={() => eliminarCurso(programa)}
                            >
                              <Trash2 size={15} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                      </Group>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default ProgramasView;
