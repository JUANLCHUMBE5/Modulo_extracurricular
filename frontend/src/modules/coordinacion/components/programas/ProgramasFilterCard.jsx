import React from "react";
import { Badge, Group, ActionIcon, TextInput, Select, Button } from "@mantine/core";
import {
  IconSearch as Search,
  IconX as X,
  IconFilter as Filter,
  IconCalendar as CalendarDays,
  IconPlus as Plus,
} from "@tabler/icons-react";

/**
 * Tarjeta que contiene los filtros de búsqueda y la barra de herramientas
 * para el listado de programas extracurriculares.
 * 
 * @param {Object} props Propiedades del componente.
 * @param {boolean} props.mostrarSoloArchivados Indica si se muestra la pestaña de programas archivados.
 * @param {Array} props.todosLosProgramas Listado de todos los programas cargados de BD.
 * @param {Array} props.programas Listado de programas actualmente filtrados.
 * @param {string} props.busqueda Texto ingresado en el buscador.
 * @param {Function} props.setBusqueda Setea el texto del buscador.
 * @param {string} props.filtroCategoria Categoría de filtro activa.
 * @param {Function} props.setFiltroCategoria Setea la categoría activa.
 * @param {Array} props.categoriasFiltradasOptions Opciones formateadas de categorías según el periodo escolar.
 * @param {string} props.filtroPeriodo Periodo de filtro activo.
 * @param {Function} props.setFiltroPeriodo Setea el periodo activo.
 * @param {string} props.filtroEstado Estado de disponibilidad activo.
 * @param {Function} props.setFiltroEstado Setea el estado activo.
 * @param {boolean} props.puedeCrearProgramas Indica si el rol actual permite crear nuevos talleres.
 * @param {Function} props.abrirCrear Abre el modal de creación de programa.
 * @param {boolean} props.hasActiveFilters Indica si hay algún filtro de búsqueda activo.
 * @param {Function} props.limpiarTodosFiltros Restablece todos los filtros de búsqueda a sus valores iniciales.
 */
export default function ProgramasFilterCard({
  mostrarSoloArchivados,
  todosLosProgramas,
  programas,
  busqueda,
  setBusqueda,
  filtroCategoria,
  setFiltroCategoria,
  categoriasFiltradasOptions,
  filtroPeriodo,
  setFiltroPeriodo,
  filtroEstado,
  setFiltroEstado,
  puedeCrearProgramas,
  abrirCrear,
  hasActiveFilters,
  limpiarTodosFiltros,
}) {
  return (
    <article className="coord-card coord-search-card">
      {/* Sección superior con las insignias de conteo estadístico */}
      <div className="coord-card-title coord-programs-clean-title" style={{ justifyContent: "flex-end" }}>
        <div className="coord-stats-badges coord-programs-clean-badges">
          {mostrarSoloArchivados ? (
            <>
              <Badge variant="light" color="blue" size="md">
                {todosLosProgramas.filter((p) => p.estado === "Archivado").length} archivados
              </Badge>
              {programas.length !== todosLosProgramas.filter((p) => p.estado === "Archivado").length && (
                <Badge variant="filled" color="orange" size="md">
                  {programas.length} filtrados
                </Badge>
              )}
            </>
          ) : (
            <>
              <Badge variant="light" color="blue" size="md">
                {todosLosProgramas.filter((p) => p.estado !== "Archivado").length} en total
              </Badge>
              <Badge variant="light" color="green" size="md">
                {todosLosProgramas.filter((p) => p.estado === "Habilitado").length} disponibles
              </Badge>
              {programas.length !== todosLosProgramas.filter((p) => p.estado !== "Archivado").length && (
                <Badge variant="filled" color="orange" size="md">
                  {programas.length} filtrados
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inputs y Selects de filtrado */}
      <div className="coord-filtros-card-mantine coord-programs-clean-filters">
        <div className="coord-filtros-row-mantine coord-programs-clean-filter-row">
          {/* Buscador de texto */}
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

          {/* Filtro por Categorías */}
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
                ...categoriasFiltradasOptions,
              ]}
              size="sm"
              allowDeselect={false}
            />
          </div>

          {/* Filtro por Periodo */}
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
                { value: "verano", label: "Ciclo verano" },
              ]}
              size="sm"
              allowDeselect={false}
            />
          </div>

          {/* Filtro por Disponibilidad / Estado */}
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
                  { value: "finalizados", label: "Finalizados" },
                ]}
                size="sm"
                allowDeselect={false}
              />
            </div>
          )}

          {/* Botón de Registro de Nuevo Programa */}
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

        {/* Resumen de Filtros Activos y botón de limpieza */}
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
            {!mostrarSoloArchivados && filtroEstado !== "todos" && (
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
    </article>
  );
}
