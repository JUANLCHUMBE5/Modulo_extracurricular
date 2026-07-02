import React from "react";
import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconUpload as Upload,
  IconUserCheck as UserCheck,
  IconMenu2 as Menu,
} from "@tabler/icons-react";
import {
  diasSemana,
  nivelesGrados,
  variablesPlantillaAceptadas,
  variablesPlantillaRequeridas,
} from "./constants/coordinacionConstants";
import AlumnosProgramaModal from "./components/AlumnosProgramaModal";
import CargaExcelView from "./components/CargaExcelView";
import CoordinacionSidebar from "./components/CoordinacionSidebar";
import DocumentosView from "./components/DocumentosView";
import FinalizarProgramaModal from "./components/FinalizarProgramaModal";
import ArchivarProgramaModal from "./components/ArchivarProgramaModal";
import ProgramaFormModal from "./components/ProgramaFormModal";
import ProgramasView from "./components/ProgramasView";
import AsistenciasView from "./components/AsistenciasView";
import useCoordinacion from "./hooks/useCoordinacion";
import "./Coordinacion.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "#991b1b", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", margin: "20px", fontFamily: "sans-serif" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Ocurrió un error al cargar el Módulo de Coordinación</h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Detalles del error:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fff", padding: "10px", borderRadius: "4px", border: "1px solid #fee2e2", fontSize: "12px", color: "#b91c1c" }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "8px 16px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "10px" }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function Coordinacion(props) {
  return (
    <ErrorBoundary>
      <CoordinacionInner {...props} />
    </ErrorBoundary>
  );
}

function CoordinacionInner({
  delegatedContent,
  embedded = false,
  initialView = "programas",
  moduleSwitcher,
  onClearDelegatedModule,
  user,
  onLogout,
}) {
  const state = useCoordinacion({
    delegatedContent,
    embedded,
    initialView,
    user,
  });

  const toggleSidebarButton = !state.sidebarAbierta && (
    <button
      className="coord-menu-toggle-btn-header"
      type="button"
      onClick={() => state.setSidebarAbierta(true)}
      aria-label="Mostrar barra lateral"
      title="Mostrar barra lateral"
    >
      <Menu size={22} />
    </button>
  );

  return (
    <div className={embedded ? "coord-embedded" : `coord-layout ${state.esProfesor ? "coord-layout-profesor" : ""} ${state.sidebarAbierta ? "" : "coord-layout-collapsed"}`}>
      {/* ── SIDEBAR ── */}
      {!embedded ? (
        <CoordinacionSidebar
          delegatedContent={delegatedContent}
          esProfesor={state.esProfesor}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={onClearDelegatedModule}
          onLogout={onLogout}
          setMensaje={state.setMensaje}
          setSidebarAbierta={state.setSidebarAbierta}
          setVista={state.setVista}
          sidebarAbierta={state.sidebarAbierta}
          vista={state.vista}
          vistasDisponibles={state.vistasDisponibles}
        />
      ) : null}

      {/* ── MAIN ── */}
      <main className={embedded ? "coord-main coord-main-embedded" : "coord-main"}>
        {!embedded && !state.sidebarAbierta && (
          <button
            className="coord-global-menu-toggle-btn"
            type="button"
            onClick={() => state.setSidebarAbierta(true)}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={22} />
          </button>
        )}
        {delegatedContent ? (
          delegatedContent
        ) : (
          <>
            {state.vista === "registrar-programa" && (
              <ProgramaFormModal
                isInline={true}
                toggleSidebarButton={toggleSidebarButton}
                actualizarCategoriaPrograma={state.actualizarCategoriaPrograma}
                actualizarCosto={state.actualizarCosto}
                actualizarForm={state.actualizarForm}
                actualizarGrupoHorario={state.actualizarGrupoHorario}
                actualizarInvitacionMasiva={state.actualizarInvitacionMasiva}
                actualizarNombrePrograma={state.actualizarNombrePrograma}
                agregarCategoria={state.agregarCategoria}
                agregarGrupoHorario={state.agregarGrupoHorario}
                agregarTallerDeportivo={state.agregarTallerDeportivo}
                alertaConfiguracion={state.alertaConfiguracion}
                cambiarPeriodoFormulario={state.cambiarPeriodoFormulario}
                catAEliminar={state.catAEliminar}
                categorias={state.categorias}
                ciclosCambridgeFormulario={state.ciclosCambridgeFormulario}
                diasSemana={diasSemana}
                duracionTallerFormulario={state.duracionTallerFormulario}
                esDeportivoForm={state.esDeportivoForm}
                esCambridgeForm={state.esCambridgeForm}
                esFormularioVerano={state.esFormularioVerano}
                usaTalleresPorEdad={state.usaTalleresPorEdad}
                form={state.form}
                formHorariosPorGrupo={state.formHorariosPorGrupo}
                formatearCostoFormulario={state.formatearCostoFormulario}
                guardar={state.guardar}
                guardando={state.guardando}
                mostrarGestorCategorias={state.mostrarGestorCategorias}
                mostrarIndumentariaDeportiva={state.mostrarIndumentariaDeportiva}
                modoEditar={state.modoEditar}
                nivelesGrados={nivelesGrados}
                nuevaCat={state.nuevaCat}
                puedeGestionarGruposFormulario={state.puedeGestionarGruposFormulario}
                quitarCategoria={state.quitarCategoria}
                quitarGrupoHorario={state.quitarGrupoHorario}
                quitarImagenAnuncio={state.quitarImagenAnuncio}
                quitarTallerDeportivo={state.quitarTallerDeportivo}
                iniciarEdicionTaller={state.iniciarEdicionTaller}
                cancelarEdicionTaller={state.cancelarEdicionTaller}
                indiceTallerEditando={state.indiceTallerEditando}
                seleccionarImagenAnuncio={state.seleccionarImagenAnuncio}
                setCatAEliminar={state.setCatAEliminar}
                setMostrarGestorCategorias={state.setMostrarGestorCategorias}
                setNuevaCat={state.setNuevaCat}
                tallerDepForm={state.tallerDepForm}
                setTallerDepForm={state.setTallerDepForm}
                setShowModal={(visible) => {
                  if (!visible) {
                    state.setAlertaConfiguracion("");
                    state.setVista("programas");
                  }
                }}
                show={true}
                toggleGradoGrupo={state.toggleGradoGrupo}
                toggleGrado={state.toggleGrado}
                toggleDia={state.toggleDia}
              />
            )}

            {state.vista === "programas" && state.puedeVerProgramasVista && (
              <ProgramasView
                abrirCrear={state.abrirCrear}
                abrirEditar={state.abrirEditar}
                cargando={state.cargando}
                eliminarCurso={state.eliminarCurso}
                filtroPeriodo={state.filtroPeriodo}
                finalizarPrograma={state.finalizarPrograma}
                mensaje={state.mensaje}
                programas={state.programasFiltrados}
                puedeCrearProgramas={state.puedeCrearProgramas}
                puedeEditarProgramas={state.puedeEditarProgramas}
                puedeVerAlumnos={state.puedeVerAlumnos}
                setFiltroPeriodo={state.setFiltroPeriodo}
                tieneAccionesPrograma={state.tieneAccionesPrograma}
                tipoMsg={state.tipoMsg}
                toggleEstado={state.toggleEstado}
                verInvitados={state.verInvitados}
                busqueda={state.busqueda}
                setBusqueda={state.setBusqueda}
                categorias={state.categorias}
                filtroCategoria={state.filtroCategoria}
                setFiltroCategoria={state.setFiltroCategoria}
                filtroEstado={state.filtroEstado}
                setFiltroEstado={state.setFiltroEstado}
                todosLosProgramas={state.programas}
                toggleSidebarButton={toggleSidebarButton}
                clonarPrograma={state.clonarPrograma}
              />
            )}

            {state.vista === "historial" && state.puedeVerProgramasVista && (
              <ProgramasView
                abrirCrear={state.abrirCrear}
                abrirEditar={state.abrirEditar}
                cargando={state.cargando}
                eliminarCurso={state.eliminarCurso}
                filtroPeriodo={state.filtroPeriodo}
                finalizarPrograma={state.finalizarPrograma}
                mensaje={state.mensaje}
                programas={state.programasArchivadosFiltrados}
                puedeCrearProgramas={state.puedeCrearProgramas}
                puedeEditarProgramas={state.puedeEditarProgramas}
                puedeVerAlumnos={state.puedeVerAlumnos}
                setFiltroPeriodo={state.setFiltroPeriodo}
                tieneAccionesPrograma={state.tieneAccionesPrograma}
                tipoMsg={state.tipoMsg}
                toggleEstado={state.toggleEstado}
                verInvitados={state.verInvitados}
                busqueda={state.busqueda}
                setBusqueda={state.setBusqueda}
                categorias={state.categorias}
                filtroCategoria={state.filtroCategoria}
                setFiltroCategoria={state.setFiltroCategoria}
                filtroEstado={state.filtroEstado}
                setFiltroEstado={state.setFiltroEstado}
                todosLosProgramas={state.programas}
                toggleSidebarButton={toggleSidebarButton}
                mostrarSoloArchivados={true}
                clonarPrograma={state.clonarPrograma}
                restaurarPrograma={state.restaurarPrograma}
              />
            )}

            {state.vista === "carga" && state.puedeVerCargaVista && (
              <CargaExcelView
                archivoInputKey={state.archivoInputKey}
                archivosExcel={state.archivosExcel}
                cargandoPreview={state.cargandoPreview}
                cancelarCargaExcel={state.cancelarCargaExcel}
                confirmandoCarga={state.confirmandoCarga}
                confirmarCargaExcel={state.confirmarCargaExcel}
                eliminandoCargaId={state.eliminandoCargaId}
                eliminarCargaExcel={state.eliminarCargaExcel}
                generarPreviewExcel={state.generarPreviewExcel}
                historialCargas={state.historialCargas}
                mensaje={state.mensaje}
                previewCarga={state.previewCarga}
                progresoCarga={state.progresoCarga}
                setArchivosExcel={state.setArchivosExcel}
                setMensaje={state.setMensaje}
                setPreviewCarga={state.setPreviewCarga}
                setProgresoCarga={state.setProgresoCarga}
                tipoMsg={state.tipoMsg}
                modoCargaAlumnos={state.modoCargaAlumnos}
                setModoCargaAlumnos={state.setModoCargaAlumnos}
                alumnoIndividual={state.alumnoIndividual}
                estadoAlumnoIndividual={state.estadoAlumnoIndividual}
                actualizarAlumnoIndividual={state.actualizarAlumnoIndividual}
                guardarAlumnoIndividual={state.guardarAlumnoIndividual}
                guardandoIndividual={state.guardandoIndividual}
                programaCargaId={state.programaCargaId}
                setProgramaCargaId={state.setProgramaCargaId}
                programas={state.programas}
                toggleSidebarButton={toggleSidebarButton}
                ultimoLoteId={state.ultimoLoteId}
                setUltimoLoteId={state.setUltimoLoteId}
              />
            )}

            {state.vista === "documentos" && state.puedeVerDocumentosVista && (
              <DocumentosView
                abrirEditar={state.abrirEditar}
                abrirCrearDesdeDocumento={state.abrirCrearDesdeDocumento}
                autocompletarDesdePlantilla={state.autocompletarDesdePlantilla}
                eliminarPlantillaHistorial={state.eliminarPlantillaHistorial}
                form={state.form}
                guardando={state.guardando}
                guardarDocumentoComoPrograma={state.guardarDocumentoComoPrograma}
                guardarDocumentosPrograma={state.guardarDocumentosPrograma}
                historialPlantillas={state.historialPlantillas}
                lecturaDocumento={state.lecturaDocumento}
                mensaje={state.mensaje}
                plantillaInputKey={state.plantillaInputKey}
                programaDocs={state.programaDocs}
                programas={state.programas}
                quitarPlantilla={state.quitarPlantilla}
                seleccionarPlantilla={state.seleccionarPlantilla}
                setForm={state.setForm}
                tipoMsg={state.tipoMsg}
                usarPlantillaExistente={state.usarPlantillaExistente}
                variablesPlantillaAceptadas={variablesPlantillaAceptadas}
                variablesPlantillaRequeridas={variablesPlantillaRequeridas}
                categorias={state.categorias}
                configInstitucional={state.configInstitucional}
                cargandoConfigInstitucional={state.cargandoConfigInstitucional}
                guardandoConfigInstitucional={state.guardandoConfigInstitucional}
                actualizarConfigInstitucionalImagen={state.actualizarConfigInstitucionalImagen}
                quitarConfigInstitucionalImagen={state.quitarConfigInstitucionalImagen}
                guardarConfigInstitucional={state.guardarConfigInstitucional}
                toggleSidebarButton={toggleSidebarButton}
              />
            )}

            {state.vista === "asistencias" && state.puedeVerAsistenciasVista && (
              <AsistenciasView
                programas={state.programas}
                listarAsistenciasPrograma={state.listarAsistenciasPrograma}
                listarMatriculados={state.listarMatriculados}
                toggleSidebarButton={toggleSidebarButton}
              />
            )}

            {/* ─── MODAL: CREAR / EDITAR PROGRAMA ─── */}
            <ProgramaFormModal
              actualizarCategoriaPrograma={state.actualizarCategoriaPrograma}
              actualizarCosto={state.actualizarCosto}
              actualizarForm={state.actualizarForm}
              actualizarGrupoHorario={state.actualizarGrupoHorario}
              actualizarInvitacionMasiva={state.actualizarInvitacionMasiva}
              actualizarNombrePrograma={state.actualizarNombrePrograma}
              agregarCategoria={state.agregarCategoria}
              agregarGrupoHorario={state.agregarGrupoHorario}
              agregarTallerDeportivo={state.agregarTallerDeportivo}
              alertaConfiguracion={state.alertaConfiguracion}
              cambiarPeriodoFormulario={state.cambiarPeriodoFormulario}
              catAEliminar={state.catAEliminar}
              categorias={state.categorias}
              ciclosCambridgeFormulario={state.ciclosCambridgeFormulario}
              diasSemana={diasSemana}
              duracionTallerFormulario={state.duracionTallerFormulario}
              esDeportivoForm={state.esDeportivoForm}
              esCambridgeForm={state.esCambridgeForm}
              esFormularioVerano={state.esFormularioVerano}
              usaTalleresPorEdad={state.usaTalleresPorEdad}
              form={state.form}
              formHorariosPorGrupo={state.formHorariosPorGrupo}
              formatearCostoFormulario={state.formatearCostoFormulario}
              guardar={state.guardar}
              guardando={state.guardando}
              mostrarGestorCategorias={state.mostrarGestorCategorias}
              mostrarIndumentariaDeportiva={state.mostrarIndumentariaDeportiva}
              modoEditar={state.modoEditar}
              nivelesGrados={nivelesGrados}
              nuevaCat={state.nuevaCat}
              puedeGestionarGruposFormulario={state.puedeGestionarGruposFormulario}
              quitarCategoria={state.quitarCategoria}
              quitarGrupoHorario={state.quitarGrupoHorario}
              quitarImagenAnuncio={state.quitarImagenAnuncio}
              quitarTallerDeportivo={state.quitarTallerDeportivo}
              iniciarEdicionTaller={state.iniciarEdicionTaller}
              cancelarEdicionTaller={state.cancelarEdicionTaller}
              indiceTallerEditando={state.indiceTallerEditando}
              seleccionarImagenAnuncio={state.seleccionarImagenAnuncio}
              setCatAEliminar={state.setCatAEliminar}
              setMostrarGestorCategorias={state.setMostrarGestorCategorias}
              setNuevaCat={state.setNuevaCat}
              tallerDepForm={state.tallerDepForm}
              setTallerDepForm={state.setTallerDepForm}
              setShowModal={(visible) => {
                if (!visible) state.setAlertaConfiguracion("");
                state.setShowModal(visible);
              }}
              show={state.showModal}
              toggleGradoGrupo={state.toggleGradoGrupo}
              toggleGrado={state.toggleGrado}
              toggleDia={state.toggleDia}
            />

            {state.showInvitados && (
              <AlumnosProgramaModal
                asistencias={state.asistenciasPrograma}
                descargarPdfAlumnos={state.descargarPdfAlumnos}
                exportarAExcel={state.exportarAExcel}
                invitados={state.invitados}
                matriculados={state.matriculados}
                onClose={() => state.setShowInvitados(false)}
                programa={state.progSeleccionado}
                setSubVistaAlumnos={state.setSubVistaAlumnos}
                subVistaAlumnos={state.subVistaAlumnos}
              />
            )}

            <FinalizarProgramaModal
              onClose={() => state.setProgramaAFinalizar(null)}
              onConfirm={state.confirmarFinalizar}
              programa={state.programaAFinalizar}
            />

            <ArchivarProgramaModal
              onClose={() => state.setProgramaAArchivar(null)}
              onConfirm={state.confirmarArchivar}
              programa={state.programaAArchivar}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default Coordinacion;
