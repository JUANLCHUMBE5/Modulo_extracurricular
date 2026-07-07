import {
  Alert as MantineAlert,
  Select,
  Button,
  Badge,
  Loader,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import {
  IconCalendar as CalendarDays,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconFileDownload as FileDown,
  IconUserCheck as UserCheck,
  IconAlertCircle as AlertCircle,
  IconSearch as Search,
  IconSchool as School,
} from "@tabler/icons-react";
import useAsistencias from "../hooks/useAsistencias";
import AsistenciaDiariaTable from "./AsistenciaDiariaTable";
import AsistenciaMensualTable from "./AsistenciaMensualTable";

function AsistenciasView({ programas = [], listarAsistenciasPrograma, listarMatriculados, toggleSidebarButton }) {
  const {
    tallerId,
    setTallerId,
    asistencias,
    cargando,
    fechaSeleccionada,
    setFechaSeleccionada,
    mensaje,
    tipoMsg,
    vistaTipo,
    setVistaTipo,
    busqueda,
    setBusqueda,
    gradoSeleccionado,
    setGradoSeleccionado,
    programaSeleccionado,
    fechasColumnas,
    checkMap,
    selectGradosData,
    horarioDeGrado,
    docenteDeGrado,
    gradoLabel,
    matriculadosFiltrados,
    grupoActivo,
    filasGrupoActivoFiltradas,
    indiceActivo,
    gruposFecha,
    irAnterior,
    irSiguiente,
    handleExportExcelDaily,
    handleExportPdfDaily,
    handleExportExcelMonthly,
    handleExportPdfMonthly,
    handleExportPdfIndividual,
    selectProgramasData,
    selectFechasData,
    hasMatriculados,
  } = useAsistencias({
    programas,
    listarAsistenciasPrograma,
    listarMatriculados,
  });

  return (
    <>
      <header className="coord-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {toggleSidebarButton}
          <div>
            <span className="coord-topbar-eyebrow">Gestión académica</span>
            <h1>Asistencia y Control</h1>
          </div>
        </div>
      </header>

      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
            <span className="coord-title-icon" style={{ width: "32px", height: "32px" }}><UserCheck size={18} /></span>
            <div>
              <h2 style={{ fontSize: "15px" }}>Control Central de Asistencias</h2>
              <p style={{ fontSize: "12px", marginTop: "1px" }}>Consulte y descargue reportes diarios de asistencia por cada programa.</p>
            </div>
          </div>

          <div className="coord-filtros-card-mantine" style={{ padding: "0", background: "transparent", border: "none", marginBottom: "8px" }}>
            <div className="coord-filtros-row-mantine" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "8px" }}>
              {/* Taller */}
              <div style={{ flex: "2 1 280px" }}>
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                      <UserCheck size={13} style={{ color: "#176c60" }} /> Seleccionar Taller
                    </span>
                  }
                  placeholder="Elija un programa..."
                  value={tallerId}
                  onChange={(value) => setTallerId(value || "")}
                  data={selectProgramasData}
                  size="sm"
                  searchable
                  clearable
                  style={{ width: "100%" }}
                />
              </div>

              {/* Grado selector */}
              {tallerId && selectGradosData.length > 0 && (
                <div style={{ flex: "1 1 200px" }}>
                  <Select
                    label={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                        <School size={13} style={{ color: "#176c60" }} /> Seleccionar Grado
                      </span>
                    }
                    placeholder="Elija un grado..."
                    value={gradoSeleccionado}
                    onChange={(value) => setGradoSeleccionado(value || "TODOS")}
                    data={selectGradosData}
                    size="sm"
                    searchable
                    clearable
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {/* Fecha selector - visible only in daily mode */}
              {vistaTipo === "diario" && (
                <div style={{ flex: "1 1 240px" }}>
                  <Select
                    label={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#000000" }}>
                        <CalendarDays size={13} style={{ color: "#176c60" }} /> Fecha
                      </span>
                    }
                    placeholder={
                      !tallerId
                        ? "Elija un taller primero"
                        : (selectGradosData.length > 0 && !gradoSeleccionado)
                        ? "Elija un grado primero"
                        : selectFechasData.length
                        ? "Seleccione una fecha..."
                        : "Sin asistencias"
                    }
                    value={fechaSeleccionada}
                    onChange={(value) => setFechaSeleccionada(value || "")}
                    data={selectFechasData}
                    size="sm"
                    disabled={!tallerId || (selectGradosData.length > 0 && !gradoSeleccionado) || !selectFechasData.length}
                    style={{ width: "100%" }}
                    allowDeselect={false}
                  />
                </div>
              )}

              {/* Export Buttons */}
              {tallerId && hasMatriculados && (!selectGradosData.length || gradoSeleccionado) && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
                  {vistaTipo === "diario" && (
                    <>
                      <Button
                        color="sanrafael"
                        onClick={handleExportPdfDaily}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px" }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        color="teal"
                        onClick={handleExportExcelDaily}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px", background: "#f0fdf4" }}
                      >
                        Excel
                      </Button>
                    </>
                  )}
                  {vistaTipo === "mensual" && (
                    <>
                      <Button
                        color="sanrafael"
                        onClick={handleExportPdfMonthly}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px" }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        color="teal"
                        onClick={handleExportExcelMonthly}
                        leftSection={<FileDown size={15} />}
                        size="sm"
                        style={{ height: "34px", background: "#f0fdf4" }}
                      >
                        Excel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {mensaje && (
            <MantineAlert
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={<AlertCircle size={18} />}
              style={{ marginBottom: "16px" }}
            >
              {mensaje}
            </MantineAlert>
          )}

          {/* Schedule Info Card */}
          {tallerId && tallerId !== "TODOS_TALLERES" && gradoSeleccionado && !cargando && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              marginBottom: "10px",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Horario de Grado Resuelto
                  </span>
                  <h3 style={{ margin: "1px 0 0 0", color: "#1e3a8a", fontSize: "15px" }}>
                    {programaSeleccionado?.nombre} - {gradoLabel}
                  </h3>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "9px", color: "#60a5fa", fontWeight: 600 }}>DOCENTE</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>{docenteDeGrado || "No asignado"}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "9px", color: "#60a5fa", fontWeight: 600 }}>HORARIO GENERAL</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>{horarioDeGrado || "No definido"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tallerId && !cargando && (!selectGradosData.length || gradoSeleccionado) && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
              <SegmentedControl
                value={vistaTipo}
                onChange={(val) => setVistaTipo(val)}
                data={[
                  { label: "Asistencia Diaria", value: "diario" },
                  { label: "Consolidado Mensual (Matriz)", value: "mensual" },
                ]}
                color="teal"
                size="xs"
              />

              <TextInput
                placeholder="Buscar por DNI, nombre o código..."
                leftSection={<Search size={14} style={{ color: "#64748b" }} />}
                value={busqueda}
                onChange={(event) => setBusqueda(event.currentTarget.value)}
                style={{ width: "260px" }}
                size="sm"
              />
            </div>
          )}

          {cargando ? (
            <div className="coord-loading" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader color="teal" />
            </div>
          ) : !tallerId ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
              <UserCheck size={36} style={{ color: "#000000", marginBottom: "6px" }} />
              <h3 style={{ color: "#000000", margin: 0, fontSize: "16px", fontWeight: 600 }}>Seleccione un taller</h3>
              <p style={{ color: "#000000", fontSize: "13px", marginTop: "2px", fontWeight: 500 }}>Elija un taller del listado para comenzar a explorar las asistencias.</p>
            </div>
          ) : (selectGradosData.length > 0 && !gradoSeleccionado) ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
              <School size={36} style={{ color: "#000000", marginBottom: "6px" }} />
              <h3 style={{ color: "#000000", margin: 0, fontSize: "16px", fontWeight: 600 }}>Seleccione un grado</h3>
              <p style={{ color: "#000000", fontSize: "13px", marginTop: "2px", fontWeight: 500 }}>Este taller tiene grados habilitados. Seleccione uno para ver el horario y la asistencia.</p>
            </div>
          ) : (asistencias.length === 0 && !hasMatriculados) ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
              <AlertCircle size={36} style={{ color: "#000000", marginBottom: "6px" }} />
              <h3 style={{ color: "#000000", margin: 0, fontSize: "16px", fontWeight: 600 }}>Sin registros de asistencia</h3>
              <p style={{ color: "#000000", fontSize: "13px", marginTop: "2px", fontWeight: 500 }}>Este taller no cuenta con alumnos matriculados ni asistencias registradas.</p>
            </div>
          ) : vistaTipo === "diario" ? (
            (grupoActivo || (asistencias.length === 0 && hasMatriculados)) ? (
              <div style={{ marginTop: "8px" }}>
                {asistencias.length === 0 && (
                  <MantineAlert color="teal" radius="md" style={{ marginBottom: "16px" }}>
                    <strong>Plantilla de asistencia:</strong> Mostrando los estudiantes matriculados. Aún no se han registrado asistencias para este taller. Puede descargar el listado en PDF o Excel.
                  </MantineAlert>
                )}
                {/* Pagination-style Date Picker Bar */}
                {grupoActivo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between", flexWrap: "wrap", padding: "4px 0", background: "transparent", border: "none", borderBottom: "1px dashed #cbd5e1", borderRadius: 0, marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#000000" }}>Navegar Fechas:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={irAnterior}
                        disabled={indiceActivo >= gruposFecha.length - 1}
                        title="Día anterior"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid #d0d5dd",
                          background: "#ffffff",
                          color: "#000000",
                          cursor: indiceActivo >= gruposFecha.length - 1 ? "not-allowed" : "pointer",
                          opacity: indiceActivo >= gruposFecha.length - 1 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#000000", padding: "0 6px" }}>
                        {(grupoActivo as any).titulo}
                      </span>
                      <button
                        type="button"
                        onClick={irSiguiente}
                        disabled={indiceActivo <= 0}
                        title="Día siguiente"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid #d0d5dd",
                          background: "#ffffff",
                          color: "#000000",
                          cursor: indiceActivo <= 0 ? "not-allowed" : "pointer",
                          opacity: indiceActivo <= 0 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <Badge color="sanrafael" size="sm">
                      {filasGrupoActivoFiltradas.length} alumno{filasGrupoActivoFiltradas.length === 1 ? "" : "s"} encontrados
                    </Badge>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", background: "transparent", border: "none", borderBottom: "1px dashed #cbd5e1", borderRadius: 0, marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#000000" }}>Fecha:</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#000000" }}>
                      Plantilla de control físico (Sin registros de asistencia)
                    </span>
                    <Badge color="teal" size="sm">
                      {matriculadosFiltrados.length} alumno{matriculadosFiltrados.length === 1 ? "" : "s"} encontrados
                    </Badge>
                  </div>
                )}

                <AsistenciaDiariaTable
                  grupoActivo={grupoActivo}
                  filasGrupoActivoFiltradas={filasGrupoActivoFiltradas}
                  matriculadosFiltrados={matriculadosFiltrados}
                  handleExportPdfIndividual={handleExportPdfIndividual}
                  programas={programas}
                  tallerId={tallerId}
                />
              </div>
            ) : null
          ) : (
            // Monthly Matrix view (matches physical binder sheet)
            <AsistenciaMensualTable
              hasMatriculados={hasMatriculados}
              asistencias={asistencias}
              fechasColumnas={fechasColumnas}
              matriculadosFiltrados={matriculadosFiltrados}
              checkMap={checkMap}
              handleExportPdfIndividual={handleExportPdfIndividual}
              programas={programas}
              tallerId={tallerId}
            />
          )}
        </article>
      </section>
    </>
  );
}

export default AsistenciasView;
