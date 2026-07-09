import React from "react";
import { Badge, Group, ActionIcon, Tooltip, Menu } from "@mantine/core";
import {
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconEye as Eye,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconTrash as Trash2,
  IconCopy as Copy,
  IconDotsVertical as DotsVertical,
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
  const tieneAccionesExtra = (
    mostrarSoloArchivados
      ? !!(puedeCrearProgramas && clonarPrograma)
      : !!(
          (puedeCrearProgramas && clonarPrograma) ||
          (puedeEditarProgramas && programa.estado !== "Finalizado") ||
          puedeEditarProgramas
        )
  );

  const accionesMarkup = tieneAccionesPrograma ? (
    <div className="coord-program-card-actions" aria-label={`Acciones de ${programa.nombre}`} style={{ minWidth: "auto" }}>
      <Group gap={6} justify="flex-end">
        {puedeEditarProgramas && !mostrarSoloArchivados ? (
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
          <Tooltip label={mostrarSoloArchivados ? "Ver alumnos (Historial)" : "Ver alumnos"}>
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
        {tieneAccionesExtra ? (
          <Menu shadow="md" width={180} position="bottom-end">
            <Menu.Target>
              <Tooltip label="Más acciones">
                <ActionIcon
                  className="coord-program-action"
                  size="sm"
                  color="gray"
                  variant="light"
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569" }}
                >
                  <DotsVertical size={15} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>

            <Menu.Dropdown>
              {mostrarSoloArchivados ? (
                <>
                  {puedeCrearProgramas && clonarPrograma && (
                    <Menu.Item
                      leftSection={<Copy size={14} />}
                      onClick={() => clonarPrograma(programa)}
                    >
                      Clonar para nuevo ciclo
                    </Menu.Item>
                  )}
                </>
              ) : (
                <>
                  {puedeCrearProgramas && clonarPrograma && (
                    <Menu.Item
                      leftSection={<Copy size={14} />}
                      onClick={() => clonarPrograma(programa)}
                    >
                      Clonar taller
                    </Menu.Item>
                  )}
                  {puedeEditarProgramas && programa.estado !== "Finalizado" && (
                    <Menu.Item
                      leftSection={programa.estado === "Habilitado" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      onClick={() => toggleEstado(programa)}
                    >
                      {programa.estado === "Habilitado" ? "Deshabilitar" : "Habilitar"}
                    </Menu.Item>
                  )}
                  {puedeEditarProgramas && programa.estado !== "Finalizado" && (
                    <Menu.Item
                      leftSection={<CheckCircle2 size={14} />}
                      onClick={() => finalizarPrograma(programa)}
                    >
                      Finalizar taller
                    </Menu.Item>
                  )}
                  {puedeEditarProgramas && (
                    <Menu.Item
                      color="red"
                      leftSection={<Trash2 size={14} />}
                      onClick={() => eliminarCurso(programa)}
                    >
                      Archivar taller
                    </Menu.Item>
                  )}
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        ) : null}
      </Group>
    </div>
  ) : null;

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
              <span>
                {(() => {
                  if (!programa.responsable) return "Tutor: No asignado";
                  const clean = String(programa.responsable).trim();
                  if (!clean || clean.toLowerCase() === "no asignado") return "Tutor: No asignado";
                  const count = clean
                    .split(/\s*(?:·|,|-|\by\b)\s*/)
                    .map(n => n.trim())
                    .filter(Boolean).length;
                  return count <= 1 ? "Tutor: 1" : `Tutores: ${count}`;
                })()}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Badge
              color={programa.estado === "Habilitado" ? "blue" : programa.estado === "Deshabilitado" ? "red" : programa.estado === "Archivado" ? "gray" : "yellow"}
              variant={programa.estado === "Deshabilitado" || programa.estado === "Archivado" ? "filled" : "light"}
              size="sm"
            >
              {programa.estado}
            </Badge>
            {accionesMarkup}
          </div>
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

    </article>
  );
}
