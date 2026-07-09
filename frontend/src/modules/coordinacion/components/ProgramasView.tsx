import { Alert as MantineAlert, Badge, Group, ActionIcon, Tooltip, TextInput, Select, Button, Table } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCircleCheck as CheckCircle2,
  IconEye as Eye,
  IconLoader2 as Loader2,
  IconPlus as Plus,
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
  IconCalendar as CalendarDays,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/coordinacionFormatters";
import { CuposTabla, GradosTabla, HorarioTabla, VigenciaTabla, AulasTabla } from "./ProgramTableCells";
import ProgramCardItem from "./ProgramCardItem";

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
  const programasEscolar = programas.filter(p => String(p.periodo || "").toLowerCase() !== "verano");
  const programasVerano = programas.filter(p => String(p.periodo || "").toLowerCase() === "verano");

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
            <span className="coord-topbar-eyebrow">Gestión académica</span>
            <h1>{mostrarSoloArchivados ? "Historial de Programas" : "Programas extracurriculares"}</h1>
          </div>
        </div>
      </header>
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title coord-programs-clean-title" style={{ justifyContent: "flex-end" }}>
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
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                      <Search size={13} style={{ color: "#176c60" }} /> Buscar taller
                    </span>
                  }
                  placeholder="Nombre o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  leftSection={<Search size={14} color="#94a3b8" />}
                  rightSection={
                    busqueda && (
                      <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setBusqueda("")}>
                        <X size={14} />
                      </ActionIcon>
                    )
                  }
                  size="sm"
                />
              </div>

              {/* Categorías */}
              <div className="coord-filter-category">
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                      <Filter size={13} style={{ color: "#176c60" }} /> Categoría
                    </span>
                  }
                  value={filtroCategoria}
                  onChange={(value) => setFiltroCategoria(value || "todos")}
                  data={[
                    { value: "todos", label: "Todas" },
                    ...categoriasFiltradasOptions
                  ]}
                  size="sm"
                  allowDeselect={false}
                />
              </div>

              {/* Periodo */}
              <div className="coord-filter-period">
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                      <CalendarDays size={13} style={{ color: "#176c60" }} /> Periodo
                    </span>
                  }
                  value={filtroPeriodo}
                  onChange={(value) => setFiltroPeriodo(value || "todos")}
                  data={[
                    { value: "todos", label: "Todos" },
                    { value: "escolar", label: "Año escolar" },
                    { value: "verano", label: "Ciclo verano" }
                  ]}
                  size="sm"
                  allowDeselect={false}
                />
              </div>

              {/* Disponibilidad */}
              {!mostrarSoloArchivados && (
                <div className="coord-filter-status">
                  <Select
                    label={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                        <Filter size={13} style={{ color: "#176c60" }} /> Disponibilidad
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
                    size="sm"
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
                    leftSection={<Plus size={15} />}
                    size="sm"
                    style={{ height: "34px" }}
                  >
                    Nuevo programa
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Filtros Activos Resumen */}
            {hasActiveFilters && (
              <Group gap="xs" style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#000000" }}>Filtros activos:</span>
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
          ) : mostrarSoloArchivados ? (
            <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: "10px" }}>
              <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead style={{ background: "#f8fafc" }}>
                  <Table.Tr>
                    <Table.Th style={{ color: "#000000", fontWeight: 600 }}>Taller</Table.Th>
                    <Table.Th style={{ color: "#000000", fontWeight: 600 }}>Periodo</Table.Th>
                    <Table.Th style={{ color: "#000000", fontWeight: 600 }}>Tutor</Table.Th>
                    <Table.Th style={{ color: "#000000", fontWeight: 600 }}>Vigencia</Table.Th>
                    <Table.Th style={{ color: "#000000", fontWeight: 600, textAlign: "center" }}>Cupos</Table.Th>
                    <Table.Th style={{ color: "#000000", fontWeight: 600, textAlign: "center" }}>Costo</Table.Th>
                    <Table.Th style={{ color: "#000000", fontWeight: 600, textAlign: "right" }}>Acciones</Table.Th>
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
                            <div style={{ fontWeight: 600, color: "#000000", fontSize: "14px" }}>{programa.nombre}</div>
                            <div style={{ fontSize: "11px", color: "#000000", marginTop: "2px", fontWeight: 500 }}>{programa.id} • {programa.categoria || "General"}</div>
                          </div>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={String(programa.periodo || "").toLowerCase() === "verano" ? "orange" : "blue"} size="sm">
                          {String(programa.periodo || "").toLowerCase() === "verano" ? "Verano" : "Escolar"}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>
                        {(() => {
                          if (!programa.responsable) return "No asignado";
                          const clean = String(programa.responsable).trim();
                          if (!clean || clean.toLowerCase() === "no asignado") return "No asignado";
                          const count = clean
                            .split(/\s*(?:·|,|-|\by\b)\s*/)
                            .map(n => n.trim())
                            .filter(Boolean).length;
                          return count <= 1 ? "Tutor: 1" : `Tutores: ${count}`;
                        })()}
                      </Table.Td>
                      <Table.Td style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>
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
                      <Table.Td style={{ fontWeight: 600, color: "#000000", fontSize: "13.5px", textAlign: "center" }}>
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
            (() => {
              const todosOrdenados = [
                ...programasEscolar,
                ...programasVerano
              ];

              return (
                <div className="coord-program-card-list" style={{ display: "grid", gap: "12px" }}>
                  {todosOrdenados.map((programa) => (
                    <ProgramCardItem
                      key={programa.id}
                      programa={programa}
                      obtenerClaseCategoria={obtenerClaseCategoria}
                      obtenerIconoCategoria={obtenerIconoCategoria}
                      tieneAccionesPrograma={tieneAccionesPrograma}
                      mostrarSoloArchivados={mostrarSoloArchivados}
                      puedeVerAlumnos={puedeVerAlumnos}
                      verInvitados={verInvitados}
                      puedeCrearProgramas={puedeCrearProgramas}
                      clonarPrograma={clonarPrograma}
                      puedeEditarProgramas={puedeEditarProgramas}
                      abrirEditar={abrirEditar}
                      toggleEstado={toggleEstado}
                      finalizarPrograma={finalizarPrograma}
                      eliminarCurso={eliminarCurso}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </article>
      </section>
    </>
  );
}

export default ProgramasView;
