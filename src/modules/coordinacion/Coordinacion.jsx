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
import ProgramaFormModal from "./components/ProgramaFormModal";
import ProgramasView from "./components/ProgramasView";
import AsistenciasView from "./components/AsistenciasView";
import useCoordinacion from "./hooks/useCoordinacion";
import "./Coordinacion.css";

const vistasNav = [
  { id: "programas", label: "Gestion de Programas", icon: BookOpen, permissions: ["programas.crear", "programas.editar", "alumnos.historial.ver"] },
  { id: "carga", label: "Importar/Exportar Excel y PDF", icon: Upload, permissions: ["grupos.crear", "grupos.editar"] },
  { id: "documentos", label: "Importar Formato Taller", icon: FileText, permissions: ["programas.crear", "programas.editar"] },
  { id: "asistencias", label: "Asistencia y Control", icon: UserCheck, permissions: ["programas.crear", "programas.editar", "alumnos.historial.ver"] },
];

function Coordinacion({
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
              seleccionarImagenAnuncio={state.seleccionarImagenAnuncio}
              setCatAEliminar={state.setCatAEliminar}
              setMostrarGestorCategorias={state.setMostrarGestorCategorias}
              setNuevaCat={state.setNuevaCat}
              setTallerDepMaxEdad={state.setTallerDepMaxEdad}
              setTallerDepMinEdad={state.setTallerDepMinEdad}
              setTallerDepCupos={state.setTallerDepCupos}
              setTallerDepNivel={state.setTallerDepNivel}
              setTallerDepDocente={state.setTallerDepDocente}
              setShowModal={(visible) => {
                if (!visible) state.setAlertaConfiguracion("");
                state.setShowModal(visible);
              }}
              setTallerDepCustom={state.setTallerDepCustom}
              setTallerDepDeporte={state.setTallerDepDeporte}
              setTallerDepDia={state.setTallerDepDia}
              setTallerDepHoraFin={state.setTallerDepHoraFin}
              setTallerDepHoraInicio={state.setTallerDepHoraInicio}
              show={state.showModal}
              tallerDepCustom={state.tallerDepCustom}
              tallerDepDeporte={state.tallerDepDeporte}
              tallerDepDia={state.tallerDepDia}
              tallerDepHoraFin={state.tallerDepHoraFin}
              tallerDepHoraInicio={state.tallerDepHoraInicio}
              tallerDepMaxEdad={state.tallerDepMaxEdad}
              tallerDepMinEdad={state.tallerDepMinEdad}
              tallerDepCupos={state.tallerDepCupos}
              tallerDepNivel={state.tallerDepNivel}
              tallerDepDocente={state.tallerDepDocente}
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
          </>
        )}
      </main>
    </div>
  );
}

export default Coordinacion;
