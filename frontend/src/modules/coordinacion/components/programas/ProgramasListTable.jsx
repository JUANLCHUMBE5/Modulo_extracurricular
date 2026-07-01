import React from "react";
import { Badge, Table, Group, Tooltip, ActionIcon } from "@mantine/core";
import {
  IconEye as Eye,
  IconCopy as Copy,
  IconArrowBackUp as ArrowBackUp,
  IconEdit as Edit3,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconCircleCheck as CheckCircle2,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { formatearSoles } from "../../utils/coordinacionFormatters";
import { CuposTabla, GradosTabla, HorarioTabla, VigenciaTabla, AulasTabla } from "./ProgramTableCells";

/**
 * Tabla y listado modular de programas extracurriculares.
 * Si se solicita vista de archivados, muestra una tabla simple.
 * De lo contrario, renderiza tarjetas estructuradas por programa.
 * 
 * @param {Object} props Propiedades del componente.
 * @param {boolean} props.mostrarSoloArchivados Indica si renderiza en modo tabla de histórico/archivo.
 * @param {Array} props.programas Listado completo de programas filtrados.
 * @param {Array} props.programasEscolar Listado filtrado para el año escolar.
 * @param {Array} props.programasVerano Listado filtrado para el ciclo de verano.
 * @param {boolean} props.puedeVerAlumnos Permiso para ver lista de estudiantes del taller.
 * @param {boolean} props.puedeCrearProgramas Permiso para clonar/crear talleres.
 * @param {boolean} props.puedeEditarProgramas Permiso para alterar estados o archivar.
 * @param {boolean} props.tieneAccionesPrograma Indica si el usuario actual posee permisos de acción.
 * @param {Function} props.verInvitados Acción para abrir lista de inscritos.
 * @param {Function} props.clonarPrograma Acción para duplicar taller.
 * @param {Function} props.restaurarPrograma Acción para reactivar taller archivado.
 * @param {Function} props.abrirEditar Acción para abrir formulario de edición.
 * @param {Function} props.toggleEstado Acción para habilitar/deshabilitar taller.
 * @param {Function} props.finalizarPrograma Acción para marcar como finalizado el ciclo.
 * @param {Function} props.eliminarCurso Acción para archivar/eliminar taller.
 * @param {Function} props.obtenerIconoCategoria Helper visual de categorías.
 * @param {Function} props.obtenerClaseCategoria Helper de estilos CSS de categorías.
 */
export default function ProgramasListTable({
  mostrarSoloArchivados,
  programas,
  programasEscolar,
  programasVerano,
  puedeVerAlumnos,
  puedeCrearProgramas,
  puedeEditarProgramas,
  tieneAccionesPrograma,
  verInvitados,
  clonarPrograma,
  restaurarPrograma,
  abrirEditar,
  toggleEstado,
  finalizarPrograma,
  eliminarCurso,
  obtenerIconoCategoria,
  obtenerClaseCategoria,
}) {
  // Renderizado individual de una tarjeta de programa activo
  const renderCard = (programa) => (
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
              <span className={`coord-badge-period coord-badge-period-${String(programa.periodo || "").toLowerCase()}`}>
                {String(programa.periodo || "").toLowerCase() === "verano" ? "Ciclo verano" : "Año escolar"}
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
            <span>Aulas</span>
            <AulasTabla programa={programa} />
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
                {puedeVerAlumnos && (
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
                )}
                {puedeCrearProgramas && clonarPrograma && (
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
                )}
              </>
            ) : (
              <>
                {puedeEditarProgramas && (
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
                )}
                {puedeVerAlumnos && (
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
                )}
                {puedeCrearProgramas && clonarPrograma && (
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
                )}
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
                {puedeEditarProgramas && (
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
                )}
              </>
            )}
          </Group>
        </div>
      ) : null}
    </article>
  );

  // Renderizado en formato de tabla para el Historial/Archivados
  if (mostrarSoloArchivados) {
    return (
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
                  {programa.responsable ? String(programa.responsable).replace(/\s*-\s*/g, ", ").trim() : "No asignado"}
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
    );
  }

  // Renderizado por defecto en formato tarjetas
  const todosOrdenados = [
    ...programasEscolar,
    ...programasVerano,
  ];

  return (
    <div className="coord-program-card-list" style={{ display: "grid", gap: "12px" }}>
      {todosOrdenados.map(renderCard)}
    </div>
  );
}
