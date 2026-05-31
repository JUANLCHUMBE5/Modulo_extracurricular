import { Alert as MantineAlert, Badge, Group, ActionIcon, Tooltip } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconEye as Eye,
  IconLoader2 as Loader2,
  IconPlus as Plus,
  IconSearch as Search,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { formatearSoles } from "../utils/coordinacionFormatters";
import { CuposTabla, GradosTabla, HorarioTabla, VigenciaTabla } from "./ProgramTableCells";

function ProgramasView({
  abrirCrear,
  abrirEditar,
  busqueda,
  cargando,
  eliminarCurso,
  filtroPeriodo,
  finalizarPrograma,
  mensaje,
  programas,
  puedeCrearProgramas,
  puedeEditarProgramas,
  puedeVerAlumnos,
  setBusqueda,
  setFiltroPeriodo,
  tieneAccionesPrograma,
  tipoMsg,
  toggleEstado,
  verInvitados,
}) {
  return (
    <>
      <header className="coord-topbar">
        <span className="coord-topbar-eyebrow">Gestion academica</span>
        <h1>Programas extracurriculares</h1>
      </header>
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title">
            <span className="coord-title-icon"><BookOpen size={21} /></span>
            <div>
              <h2>Programas registrados</h2>
              <p>Consulte, cree o administre programas y talleres.</p>
            </div>
          </div>

          <div className="coord-form">
            <div className="coord-filtros-row">
              <div className="coord-field">
                <label><Search size={14} /> Buscar</label>
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre o código del programa"
                />
              </div>

              <div className="coord-field">
                <label><CalendarDays size={14} /> Periodo</label>
                <select value={filtroPeriodo} onChange={(event) => setFiltroPeriodo(event.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="escolar">Año escolar</option>
                  <option value="verano">Ciclo verano</option>
                </select>
              </div>

              {puedeCrearProgramas ? (
                <button className="coord-register-button" type="button" onClick={abrirCrear}>
                  <Plus size={17} /><span>Nuevo programa</span>
                </button>
              ) : null}
            </div>
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
                  className={`coord-program-card-item coord-program-card-${String(programa.estado || "").toLowerCase()}`}
                >
                  <div className="coord-program-card-body">
                    <div className="coord-program-card-header">
                      <div className="coord-program-card-title">
                        <h3>{programa.nombre}</h3>
                        <div className="coord-program-card-meta">
                          <span>{programa.id || "Sin código"}</span>
                          <span>{programa.categoria || "Sin categoría"}</span>
                          <span>Tutor: {programa.responsable || "No asignado"}</span>
                        </div>
                      </div>
                      <Badge
                        color={programa.estado === "Habilitado" ? "blue" : programa.estado === "Deshabilitado" ? "gray" : "yellow"}
                        variant="light"
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
                            <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => abrirEditar(programa)}>
                              <Edit3 size={15} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                        {puedeVerAlumnos ? (
                          <Tooltip label="Ver alumnos">
                            <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => verInvitados(programa)}>
                              <Eye size={15} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                        {puedeEditarProgramas && programa.estado !== "Finalizado" && (
                          <Tooltip label={programa.estado === "Habilitado" ? "Deshabilitar" : "Habilitar"}>
                            <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => toggleEstado(programa)}>
                              {programa.estado === "Habilitado" ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {puedeEditarProgramas && programa.estado !== "Finalizado" && (
                          <Tooltip label="Finalizar">
                            <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => finalizarPrograma(programa)}>
                              <CheckCircle2 size={15} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {puedeEditarProgramas ? (
                          <Tooltip label="Eliminar">
                            <ActionIcon size="sm" color="red" variant="subtle" onClick={() => eliminarCurso(programa)}>
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
