import React from "react";
import { Badge, Group, ActionIcon, Tooltip } from "@mantine/core";
import {
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconEye as Eye,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconTrash as Trash2,
  IconCopy as Copy,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/coordinacionFormatters";
import { CuposTabla, GradosTabla, HorarioTabla, VigenciaTabla, AulasTabla } from "./ProgramTableCells";

export default function ProgramCardItem({
  programa,
  obtenerClaseCategoria,
  obtenerIconoCategoria,
  tieneAccionesPrograma,
  mostrarSoloArchivados,
  puedeVerAlumnos,
  verInvitados,
  puedeCrearProgramas,
  clonarPrograma,
  puedeEditarProgramas,
  abrirEditar,
  toggleEstado,
  finalizarPrograma,
  eliminarCurso,
}: any) {
  return (
    <article
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
  );
}
