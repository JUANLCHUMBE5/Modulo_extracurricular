import { useState, useEffect } from "react";
import {
  IconLogout as LogOut,
  IconSearch as Search,
  IconMenu2 as Menu,
  IconUserCheck as UserCheck,
  IconChevronRight as ChevronRight,
  IconChevronDown as ChevronDown,
  IconClipboardList as ClipboardList,
} from "@tabler/icons-react";
import SecretariaRegistroModal from "./components/SecretariaRegistroModal";
import SecretariaSearchCard from "./components/SecretariaSearchCard";
import SecretariaStudentPanel from "./components/SecretariaStudentPanel";
import SecretariaSuccessModal from "./components/SecretariaSuccessModal";
import SecretariaAsistenciaModal from "./components/SecretariaAsistenciaModal";
import { LOGO_COLEGIO_SRC, etiquetaProgramaSecretaria } from "./utils/secretariaRules";
import { useSecretariaState } from "./hooks/useSecretariaState";
import "./Secretaria.css";

function Secretaria({ delegatedContent, moduleSwitcher, onClearDelegatedModule, onLogout }) {
  const {
    periodo,
    setPeriodo,
    vistaActiva,
    setVistaActiva,
    sidebarExpanded,
    toggleSidebar,
    menuAbierto,
    setMenuAbierto,
    dni,
    setDni,
    mensaje,
    estudiante,
    setEstudiante,
    inscripcion,
    inscripcionesEstudiante,
    formulario,
    programas,
    modoRegistro,
    setModoRegistro,
    modalExito,
    setModalExito,
    buscando,
    guardando,
    imprimiendoFichaRegistro,
    derivandoCaja,
    modoCursoAdicional,
    setModoCursoAdicional,
    asistenciaModal,
    setAsistenciaModal,
    resultadosNombre,
    registroDesdeLista,
    esCicloVerano,
    invitacionSinHorario,
    tieneInvitacionOperativa,
    nombreProgramaAMostrar,
    tipoAlumnoMostrado,
    programasCursoAdicional,
    mostrarSelectorPrograma,
    programaParaRegistro,
    horarioResumenRegistro,
    programasParaSelector,
    tieneTalleresGradoBase,
    buscarEstudiante,
    abrirRegistroAlumnoExterno,
    aplicarEstudianteEncontrado,
    limpiarBusquedaEstudiante,
    guardarInscripción,
    abrirRegistro,
    abrirCursoAdicional,
    abrirFichaGenerada,
    derivarACaja,
    actualizarFormulario,
  } = useSecretariaState({ onClearDelegatedModule });

  const mostrarVistaDelegada = Boolean(delegatedContent);

  useEffect(() => {
    if (mostrarVistaDelegada) {
      setMenuAbierto(false);
    }
  }, [mostrarVistaDelegada, setMenuAbierto]);

  useEffect(() => {
    const handleCollapse = () => setMenuAbierto(false);
    window.addEventListener("collapse-current-sidebar-group", handleCollapse);
    return () => {
      window.removeEventListener("collapse-current-sidebar-group", handleCollapse);
    };
  }, [setMenuAbierto]);

  return (
    <div className={`secretaria-layout ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {/* Backdrop overlay — closes sidebar on click */}
      {sidebarExpanded && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <aside className="secretaria-sidebar">
        <div className="secretaria-sidebar-brand-row">
          <button className="secretaria-menu-toggle-btn" type="button" onClick={toggleSidebar} aria-label="Alternar barra lateral">
            <Menu size={20} />
          </button>
          {sidebarExpanded && (
            <div className="secretaria-sidebar-brand" aria-label="Colegio San Rafael">
              <img src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
              <div>
                <span>Asistente</span>
              </div>
            </div>
          )}
        </div>
        {sidebarExpanded ? (
          <div className="module-switcher-group sec-sidebar-menu-card">
            <button
              onClick={() => {
                const nextVal = !menuAbierto;
                setMenuAbierto(nextVal);
                if (nextVal) {
                  window.dispatchEvent(new CustomEvent("collapse-all-module-switcher-groups"));
                }
              }}
              className="module-switcher-header"
              type="button"
            >
              <div className="module-switcher-header-left">
                <ClipboardList className="module-switcher-header-main-icon" size={18} />
                <span className="module-switcher-header-title">Módulo Asistente</span>
              </div>
              <div className="module-switcher-header-right">
                <span className="module-switcher-header-icon">
                  {menuAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              </div>
            </button>
            {menuAbierto && (
              <nav className="module-switcher-content coord-nav">
                <button
                  className={`coord-nav-item ${!mostrarVistaDelegada && vistaActiva === "inscripcion" ? "coord-nav-item-active" : ""}`}
                  type="button"
                  onClick={() => {
                    onClearDelegatedModule?.();
                    setVistaActiva("inscripcion");
                    limpiarBusquedaEstudiante();
                  }}
                  title="Inscripción presencial"
                >
                  <span>Inscripción presencial</span>
                </button>
                <button
                  className={`coord-nav-item ${!mostrarVistaDelegada && vistaActiva === "asistencias" ? "coord-nav-item-active" : ""}`}
                  type="button"
                  onClick={() => {
                    onClearDelegatedModule?.();
                    setVistaActiva("asistencias");
                    limpiarBusquedaEstudiante();
                  }}
                  title="Ver Asistencias"
                >
                  <span>Ver Asistencias</span>
                </button>
              </nav>
            )}
          </div>
        ) : (
          <nav className="secretaria-nav" aria-label="Menu del modulo asistente">
            <button
              className={`secretaria-nav-item ${!mostrarVistaDelegada && vistaActiva === "inscripcion" ? "secretaria-nav-item-active" : ""}`}
              type="button"
              onClick={() => {
                onClearDelegatedModule?.();
                setVistaActiva("inscripcion");
                limpiarBusquedaEstudiante();
              }}
              title="Inscripción presencial"
            >
              <Search size={18} />
            </button>
            <button
              className={`secretaria-nav-item ${!mostrarVistaDelegada && vistaActiva === "asistencias" ? "secretaria-nav-item-active" : ""}`}
              type="button"
              onClick={() => {
                onClearDelegatedModule?.();
                setVistaActiva("asistencias");
                limpiarBusquedaEstudiante();
              }}
              title="Ver Asistencias"
            >
              <UserCheck size={18} />
            </button>
          </nav>
        )}

        {moduleSwitcher && sidebarExpanded ? (
          <div>
            {moduleSwitcher}
          </div>
        ) : null}

        <div className="secretaria-sidebar-footer">
          <button className="secretaria-logout" onClick={onLogout} title="Cerrar sesion">
            <LogOut size={18} />
            {sidebarExpanded && <span>Cerrar sesion</span>}
          </button>
        </div>
      </aside>

      <main className={`secretaria-main${modoRegistro ? " secretaria-main-registro-active" : ""}`}>
        {!sidebarExpanded && (
          <button
            className="sidebar-floating-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={20} />
          </button>
        )}
        {mostrarVistaDelegada ? (
          delegatedContent
        ) : (
          <>
            <section className={`secretaria-workspace secretaria-workspace-system${modoRegistro ? " secretaria-registro-layout-active" : ""}`}>
              <SecretariaSearchCard
                aplicarEstudianteEncontrado={aplicarEstudianteEncontrado}
                abrirRegistroAlumnoExterno={abrirRegistroAlumnoExterno}
                buscando={buscando}
                buscarEstudiante={buscarEstudiante}
                dni={dni}
                estudiante={estudiante}
                mensaje={mensaje}
                periodo={periodo}
                resultadosNombre={resultadosNombre}
                setDni={setDni}
                setPeriodo={setPeriodo}
                modoBusquedaAsistencia={vistaActiva === "asistencias"}
                limpiarBusquedaEstudiante={limpiarBusquedaEstudiante}
                modoRegistro={modoRegistro}
              >
                {estudiante && (
                  <div className={modoRegistro ? "secretaria-fused-grid-layout" : "secretaria-fused-workspace"}>
                    <SecretariaStudentPanel
                      abrirCursoAdicional={abrirCursoAdicional}
                      abrirFichaGenerada={abrirFichaGenerada}
                      abrirRegistro={abrirRegistro}
                      cursosAdicionalesDisponibles={programasCursoAdicional.length}
                      derivarACaja={derivarACaja}
                      derivandoCaja={derivandoCaja}
                      esCicloVerano={esCicloVerano}
                      estudiante={estudiante}
                      imprimiendoFichaRegistro={imprimiendoFichaRegistro}
                      inscripcion={inscripcion}
                      invitacionSinHorario={invitacionSinHorario}
                      limpiarBusquedaEstudiante={limpiarBusquedaEstudiante}
                      nombreProgramaAMostrar={nombreProgramaAMostrar}
                      programas={programas}
                      tieneInvitacionOperativa={tieneInvitacionOperativa}
                      tipoAlumnoMostrado={tipoAlumnoMostrado}
                      inscripcionesEstudiante={inscripcionesEstudiante}
                      onVerAsistencia={(ins) => setAsistenciaModal({ open: true, inscripcion: ins })}
                      modoBusquedaAsistencia={vistaActiva === "asistencias"}
                      modoRegistro={modoRegistro}
                      noProgramasDisponibles={programasParaSelector.length === 0}
                    />

                    {(modoRegistro || vistaActiva === "inscripcion") && (
                      <SecretariaRegistroModal
                        actualizarFormulario={actualizarFormulario}
                        esCicloVerano={esCicloVerano}
                        estudiante={estudiante}
                        formulario={formulario}
                        guardarInscripción={guardarInscripción}
                        guardando={guardando}
                        horarioResumenRegistro={horarioResumenRegistro}
                        etiquetaPrograma={etiquetaProgramaSecretaria}
                        mensaje={mensaje}
                        modoCursoAdicional={modoCursoAdicional}
                        modoRegistro={modoRegistro || vistaActiva === "inscripcion"}
                        mostrarSelectorPrograma={mostrarSelectorPrograma}
                        programaParaRegistro={programaParaRegistro}
                        programas={programas}
                        programasParaSelector={programasParaSelector}
                        tieneTalleresGradoBase={tieneTalleresGradoBase}
                        setModoRegistro={(valor) => {
                          setModoRegistro(valor);
                          if (!valor) {
                            setModoCursoAdicional(false);
                            if (registroDesdeLista) {
                              setEstudiante(null);
                              setRegistroDesdeLista(false);
                            }
                          }
                        }}
                        inscripcion={inscripcion}
                        abrirFichaGenerada={abrirFichaGenerada}
                        imprimiendoFichaRegistro={imprimiendoFichaRegistro}
                        derivarACaja={derivarACaja}
                        derivandoCaja={derivandoCaja}
                        cursosAdicionalesDisponibles={programasCursoAdicional.length}
                        abrirCursoAdicional={abrirCursoAdicional}
                        setModoCursoAdicional={setModoCursoAdicional}
                        limpiarBusquedaEstudiante={limpiarBusquedaEstudiante}
                      />
                    )}
                  </div>
                )}
              </SecretariaSearchCard>
            </section>
            {modalExito ? (
              <SecretariaSuccessModal
                imprimiendo={imprimiendoFichaRegistro}
                inscripcion={inscripcion}
                onClose={() => setModalExito(false)}
                onPrint={abrirFichaGenerada}
              />
            ) : null}
            <SecretariaAsistenciaModal
              open={asistenciaModal.open}
              onClose={() => setAsistenciaModal({ open: false, inscripcion: null })}
              inscripcion={asistenciaModal.inscripcion}
              estudiante={estudiante}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default Secretaria;
