import { Alert as MantineAlert, Badge, Group, ActionIcon, Tooltip, TextInput, Select, Button, Table } from "@mantine/core";
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
  IconCopy as Copy,
  IconArrowBackUp as ArrowBackUp,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/coordinacionFormatters";
import { CuposTabla, GradosTabla, HorarioTabla, VigenciaTabla } from "./ProgramTableCells";

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
    // "todos"
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
      <header className="coord-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {toggleSidebarButton}
          <div>
            <span className="coord-topbar-eyebrow">Gestion academica</span>
            <h1>{mostrarSoloArchivados ? "Historial de Programas" : "Programas extracurriculares"}</h1>
          </div>
        </div>
      </header>
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title coord-programs-clean-title">
            <div className="coord-programs-clean-heading">
              <span className="coord-title-icon"><BookOpen size={21} /></span>
              <div>
                <h2>{mostrarSoloArchivados ? "Historial y Archivo" : "Programas registrados"}</h2>
                <p>{mostrarSoloArchivados ? "Consulte el historial de talleres pasados o archivados y acceda a sus reportes." : "Consulte, cree o administre programas y talleres."}</p>
              </div>
            </div>
            <div className="coord-stats-badges coord-programs-clean-badges">
              {mostrarSoloArchivados ? (
                <>
                  <Badge variant="light" color="blue" size="md">
                    {todosLosProgramas.filter(p => p.estado === "Archivado").length} archivados
                  </Badge>
                  {programas.length !== todosLosProgramas.filter(p => p.estado === "Archivado").length && (
                    <Badge variant="filled" color="orange" size="md">
                      {programas.length} filtrados
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <Badge variant="light" color="blue" size="md">
                    {todosLosProgramas.filter(p => p.estado !== "Archivado").length} en total
                  </Badge>
                  <Badge variant="light" color="green" size="md">
                    {todosLosProgramas.filter(p => p.estado === "Habilitado").length} disponibles
                  </Badge>
                  {programas.length !== todosLosProgramas.filter(p => p.estado !== "Archivado").length && (
                    <Badge variant="filled" color="orange" size="md">
                      {programas.length} filtrados
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="coord-filtros-card-mantine coord-programs-clean-filters">
            <div className="coord-filtros-row-mantine coord-programs-clean-filter-row">
              {/* Buscador */}
              <div className="coord-filter-search">
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
                />
              </div>

              {/* Categorías */}
              <div className="coord-filter-category">
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
                    ...categoriasFiltradasOptions
                  ]}
                  size="md"
                  allowDeselect={false}
                />
              </div>

              {/* Periodo */}
              <div className="coord-filter-period">
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
                  allowDeselect={false}
                />
              </div>

              {/* Disponibilidad */}
              {!mostrarSoloArchivados && (
                <div className="coord-filter-status">
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
                    allowDeselect={false}
                  />
                </div>
              )}

              {/* Botón de Registro */}
              {puedeCrearProgramas && !mostrarSoloArchivados ? (
                <div className="coord-programs-clean-action">
                  <Button
                    color="sanrafael"
                    onClick={abrirCrear}
                    leftSection={<Plus size={17} />}
                    size="md"
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
          ) : mostrarSoloArchivados ? (
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: "16px" }}>
              <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
                <Table.Thead style={{ background: "#f8fafc" }}>
                  <Table.Tr>
                    <Table.Th style={{ color: "#475569", fontWeight: 700 }}>Taller</Table.Th>
                    <Table.Th style={{ color: "#475569", fontWeight: 700 }}>Periodo</Table.Th>
                    <Table.Th style={{ color: "#475569", fontWeight: 700 }}>Tutor</Table.Th>
                    <Table.Th style={{ color: "#475569", fontWeight: 700 }}>Vigencia</Table.Th>
                    <Table.Th style={{ color: "#475569", fontWeight: 700, textAlign: "center" }}>Cupos</Table.Th>
                    <Table.Th style={{ color: "#475569", fontWeight: 700, textAlign: "center" }}>Costo</Table.Th>
                    <Table.Th style={{ color: "#475569", fontWeight: 700, textAlign: "right" }}>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {programas.map((programa) => (
                    <Table.Tr key={programa.id} style={{ transition: "background 0.15s ease" }}>
                      <Table.Td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            {obtenerIconoCategoria(programa.categoria)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "14.5px" }}>{programa.nombre}</div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{programa.id} • {programa.categoria || "General"}</div>
                          </div>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={String(programa.periodo || "").toLowerCase() === "verano" ? "orange" : "blue"} size="sm">
                          {String(programa.periodo || "").toLowerCase() === "verano" ? "Verano" : "Escolar"}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ fontSize: "13px", color: "#334155" }}>
                        {programa.responsable ? String(programa.responsable).replace(/\s*-\s*/g, ", ").trim() : "No asignado"}
                      </Table.Td>
                      <Table.Td style={{ fontSize: "13px", color: "#334155" }}>
                        <VigenciaTabla
                          inicio={programa.fechaInicio}
                          fin={programa.fechaFin}
                          duracion={programa.duracionTaller}
                          avisoDias={programa.duracionAvisoDias}
                        />
                      </Table.Td>
                      <Table.Td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-block", minWidth: "60px" }}>
                          <CuposTabla programa={programa} />
                        </div>
                      </Table.Td>
                      <Table.Td style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px", textAlign: "center" }}>
                        {formatearSoles(programa.costo)}
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Group gap={6} justify="flex-end" wrap="nowrap">
                          {puedeVerAlumnos && (
                            <Tooltip label="Ver alumnos (Historial)">
                              <ActionIcon
                                className="coord-program-action coord-program-action-view"
                                size="md"
                                color="cyan"
                                variant="light"
                                style={{ borderRadius: "8px" }}
                                onClick={() => verInvitados(programa)}
                              >
                                <Eye size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {puedeCrearProgramas && clonarPrograma && (
                            <Tooltip label="Clonar para nuevo ciclo">
                              <ActionIcon
                                className="coord-program-action coord-program-action-clone"
                                size="md"
                                color="indigo"
                                variant="light"
                                style={{ borderRadius: "8px" }}
                                onClick={() => clonarPrograma(programa)}
                              >
                                <Copy size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {puedeEditarProgramas && restaurarPrograma && (
                            <Tooltip label="Restaurar a activo">
                              <ActionIcon
                                className="coord-program-action coord-program-action-restore"
                                size="md"
                                color="green"
                                variant="light"
                                style={{ borderRadius: "8px" }}
                                onClick={() => restaurarPrograma(programa)}
                              >
                                <ArrowBackUp size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
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
                          <span>Tutor: {programa.responsable ? String(programa.responsable).replace(/\s*-\s*/g, ", ").trim() : "No asignado"}</span>
                        </div>
                      </div>
                      <Badge
                        color={programa.estado === "Habilitado" ? "blue" : programa.estado === "Deshabilitado" ? "red" : programa.estado === "Archivado" ? "gray" : "yellow"}
                        variant={programa.estado === "Deshabilitado" || programa.estado === "Archivado" ? "filled" : "light"}
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
                        {mostrarSoloArchivados ? (
                          <>
                            {puedeVerAlumnos ? (
                              <Tooltip label="Ver alumnos (Historial)">
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
                            {puedeCrearProgramas && clonarPrograma ? (
                              <Tooltip label="Clonar para nuevo ciclo">
                                <ActionIcon
                                  className="coord-program-action coord-program-action-clone"
                                  size="sm"
                                  color="indigo"
                                  variant="light"
                                  onClick={() => clonarPrograma(programa)}
                                >
                                  <Copy size={15} />
                                </ActionIcon>
                              </Tooltip>
                            ) : null}
                          </>
                        ) : (
                          <>
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
                            {puedeCrearProgramas && clonarPrograma ? (
                              <Tooltip label="Clonar taller">
                                <ActionIcon
                                  className="coord-program-action coord-program-action-clone"
                                  size="sm"
                                  color="indigo"
                                  variant="light"
                                  onClick={() => clonarPrograma(programa)}
                                >
                                  <Copy size={15} />
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
                              <Tooltip label="Archivar taller">
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
                          </>
                        )}
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
