import { useEffect, useState } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCircleCheck as CheckCircle2,
  IconLoader2 as Loader2,
  IconX as X,
  IconEdit as Edit3,
} from "@tabler/icons-react";

import SeccionDatosGenerales from "./components/SeccionDatosGenerales";
import SeccionDocumentoOficial from "./components/SeccionDocumentoOficial";
import SeccionFechasHorarios from "./components/SeccionFechasHorarios";
import SeccionPago from "./components/SeccionPago";
import SeccionCambridge from "./components/SeccionCambridge";
import SeccionInscripcionExamenes from "./components/SeccionInscripcionExamenes";
import SeccionComunicadoPadres from "./components/SeccionComunicadoPadres";
import SeccionRequisitosMateriales from "./components/SeccionRequisitosMateriales";
import SeccionAlmuerzo from "./components/SeccionAlmuerzo";

function ProgramaFormModal({
  isInline = false,
  toggleSidebarButton,
  actualizarCategoriaPrograma,
  actualizarCosto,
  actualizarForm,
  actualizarGrupoHorario,
  actualizarInvitacionMasiva,
  actualizarNombrePrograma,
  agregarCategoria,
  agregarGrupoHorario,
  agregarTallerDeportivo,
  alertaConfiguracion,
  cambiarPeriodoFormulario,
  catAEliminar,
  categorias,
  ciclosCambridgeFormulario,
  diasSemana,
  duracionTallerFormulario,
  esDeportivoForm,
  esCambridgeForm,
  esFormularioVerano,
  usaTalleresPorEdad,
  form,
  formDias,
  formGradosAplicables,
  formHorariosPorGrupo,
  formatearCostoFormulario,
  guardar,
  guardando,
  mostrarGestorCategorias,
  mostrarIndumentariaDeportiva,
  modoEditar,
  nivelesGrados,
  nuevaCat,
  puedeGestionarGruposFormulario,
  quitarCategoria,
  quitarGrupoHorario,
  quitarImagenAnuncio,
  quitarTallerDeportivo,
  iniciarEdicionTaller,
  cancelarEdicionTaller,
  indiceTallerEditando,
  seleccionarImagenAnuncio,
  setCatAEliminar,
  setMostrarGestorCategorias,
  setNuevaCat,
  setShowModal,
  show,
  tallerDepForm,
  setTallerDepForm,
  toggleDia,
  toggleGrado,
  toggleGradoGrupo,
}) {
  const [conComunicadoManual, setConComunicadoManual] = useState(false);

  useEffect(() => {
    if (form.incluyeAlmuerzo) {
      const nivelesEncontrados = { Inicial: null, Primaria: null, Secundaria: null };

      (formHorariosPorGrupo || []).forEach(grupo => {
        if (!grupo.almuerzoInicio || !grupo.almuerzoFin) return;
        const grados = grupo.grados || [];
        grados.forEach(gradoStr => {
          const lower = String(gradoStr || "").toLowerCase();
          let nivel = null;
          if (lower.includes("inicial")) nivel = "Inicial";
          else if (lower.includes("primaria")) nivel = "Primaria";
          else if (lower.includes("secundaria")) nivel = "Secundaria";

          if (nivel && !nivelesEncontrados[nivel]) {
            nivelesEncontrados[nivel] = {
              inicio: grupo.almuerzoInicio,
              fin: grupo.almuerzoFin
            };
          }
        });
      });

      const parts = [];
      Object.entries(nivelesEncontrados).forEach(([nivel, times]) => {
        if (times) {
          parts.push(`${nivel}: ${times.inicio} a ${times.fin}`);
        }
      });

      const calculado = parts.join(", ");
      if (calculado && calculado !== form.horarioRecepcionAlmuerzo) {
        actualizarForm("horarioRecepcionAlmuerzo", calculado);
      }
    }
  }, [formHorariosPorGrupo, form.incluyeAlmuerzo, form.horarioRecepcionAlmuerzo, actualizarForm]);

  useEffect(() => {
    if (show) {
      setConComunicadoManual(Boolean(form.comunicado || form.comunicadoCompleto));
    }
  }, [show, form.comunicado, form.comunicadoCompleto]);

  useEffect(() => {
    if (show && duracionTallerFormulario && form.duracionTaller !== duracionTallerFormulario) {
      actualizarForm("duracionTaller", duracionTallerFormulario);
    }
  }, [show, duracionTallerFormulario, form.duracionTaller]);

  useEffect(() => {
    if (!show || !esCambridgeForm) return;
    const defaults = {};
    if (form.tipoComunicado !== "Cambridge") defaults.tipoComunicado = "Cambridge";
    if (form.tipoDocumento !== "Carta") defaults.tipoDocumento = "Carta";
    if (form.numeroDocumento && /^COM-/i.test(form.numeroDocumento)) {
      defaults.numeroDocumento = form.numeroDocumento.replace(/^COM-/i, "CAR-");
    }
    if (form.areaTematica !== "Inglés / Cambridge") defaults.areaTematica = "Inglés / Cambridge";
    if (!form.costo) defaults.costo = "150";
    if (!form.costoCiclo) defaults.costoCiclo = form.costo || "150";
    if (!form.montoPrimerPago) defaults.montoPrimerPago = form.costo || "150";
    if (!form.modalidadCobro) defaults.modalidadCobro = "Unico";
    if (!form.detalleCosto) {
      defaults.detalleCosto = "";
    }
    if (!form.requisitos) {
      defaults.requisitos = "";
    }
    if (Object.keys(defaults).length) {
      actualizarForm(defaults);
    }
  }, [show, esCambridgeForm, form.tipoComunicado]);

  if (!show) return null;

  const catLowerClean = String(form.categoria || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esAcademico = catLowerClean.includes("academico") || catLowerClean.includes("reforzamiento") || catLowerClean.includes("tareas") || catLowerClean === "vacaciones utiles";
  const esNoAcademico = catLowerClean && !esAcademico;
  const esCircularEspecial = form.tipoComunicado && form.tipoComunicado !== "Otro genérico";
  const esMostrarSeccionAlmuerzo = esAcademico ||
    form.tipoComunicado === "Club de Tareas" ||
    form.tipoComunicado === "Reforzamiento (Circular)" ||
    form.tipoComunicado === "Cambridge" ||
    form.tipoComunicado === "Certificación Cambridge";

  const categoriasEscolar = (categorias || []).filter(c => {
    const norm = String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !(
      norm === "vacaciones utiles" ||
      norm === "talleres recreativos" ||
      norm === "talleres deportivos" ||
      norm === "deportivos" ||
      norm === "taller recreativo" ||
      norm === "vacaciones" ||
      norm === "verano"
    );
  });

  const esMaratonForm = String(form.categoria || "").toLowerCase() === "maraton" || String(form.categoria || "").toLowerCase() === "maratón";

  const formElement = (
    <form className="coord-program-form" id="form-programa" onSubmit={guardar}>
      {alertaConfiguracion ? (
        <MantineAlert
          className="coord-message"
          color="orange"
          radius="md"
          icon={<AlertCircle size={18} />}
        >
          {alertaConfiguracion}
        </MantineAlert>
      ) : null}
      <div className="coord-program-form-main">
        <SeccionDatosGenerales
          form={form}
          esFormularioVerano={esFormularioVerano}
          esAcademico={esAcademico}
          esNoAcademico={esNoAcademico}
          esCircularEspecial={esCircularEspecial}
          mostrarGestorCategorias={mostrarGestorCategorias}
          setMostrarGestorCategorias={setMostrarGestorCategorias}
          nuevaCat={nuevaCat}
          setNuevaCat={setNuevaCat}
          agregarCategoria={agregarCategoria}
          catAEliminar={catAEliminar}
          setCatAEliminar={setCatAEliminar}
          quitarCategoria={quitarCategoria}
          categoriasEscolar={categoriasEscolar}
          actualizarNombrePrograma={actualizarNombrePrograma}
          cambiarPeriodoFormulario={cambiarPeriodoFormulario}
          actualizarCategoriaPrograma={actualizarCategoriaPrograma}
          actualizarForm={actualizarForm}
          categorias={categorias}
          usaTalleresPorEdad={usaTalleresPorEdad}
        />

        {form.categoria && (
          <>
            <SeccionDocumentoOficial
              form={form}
              actualizarForm={actualizarForm}
              esCambridgeForm={esCambridgeForm}
            />

            <SeccionFechasHorarios
              form={form}
              esFormularioVerano={esFormularioVerano}
              esMaratonForm={esMaratonForm}
              esCambridgeForm={esCambridgeForm}
              puedeGestionarGruposFormulario={puedeGestionarGruposFormulario}
              usaTalleresPorEdad={usaTalleresPorEdad}
              duracionTallerFormulario={duracionTallerFormulario}
              ciclosCambridgeFormulario={ciclosCambridgeFormulario}
              formHorariosPorGrupo={formHorariosPorGrupo}
              diasSemana={diasSemana}
              esDeportivoForm={esDeportivoForm}
              tallerDepForm={tallerDepForm}
              setTallerDepForm={setTallerDepForm}
              indiceTallerEditando={indiceTallerEditando}
              nivelesGrados={nivelesGrados}
              toggleGrado={toggleGrado}
              actualizarForm={actualizarForm}
              actualizarGrupoHorario={actualizarGrupoHorario}
              agregarGrupoHorario={agregarGrupoHorario}
              quitarGrupoHorario={quitarGrupoHorario}
              agregarTallerDeportivo={agregarTallerDeportivo}
              quitarTallerDeportivo={quitarTallerDeportivo}
              iniciarEdicionTaller={iniciarEdicionTaller}
              cancelarEdicionTaller={cancelarEdicionTaller}
              actualizarInvitacionMasiva={actualizarInvitacionMasiva}
            />

            <SeccionPago
              form={form}
              esFormularioVerano={esFormularioVerano}
              esDeportivoForm={esDeportivoForm}
              mostrarIndumentariaDeportiva={mostrarIndumentariaDeportiva}
              actualizarCosto={actualizarCosto}
              formatearCostoFormulario={formatearCostoFormulario}
              actualizarForm={actualizarForm}
            />

            {/* Si es de Exámenes Internacionales, se oculta la sección de Cambridge regular y se muestra la específica */}
            <SeccionCambridge
              form={form}
              esCambridgeForm={esCambridgeForm && form.tipoComunicado !== "Inscripción Exámenes Internacionales"}
              actualizarForm={actualizarForm}
            />

            <SeccionInscripcionExamenes
              form={form}
              esExamenesForm={form.tipoComunicado === "Inscripción Exámenes Internacionales"}
              actualizarForm={actualizarForm}
            />

            <SeccionComunicadoPadres
              form={form}
              conComunicadoManual={conComunicadoManual}
              setConComunicadoManual={setConComunicadoManual}
              actualizarForm={actualizarForm}
            />

            <SeccionRequisitosMateriales
              form={form}
              actualizarForm={actualizarForm}
            />

            <SeccionAlmuerzo
              form={form}
              esMostrarSeccionAlmuerzo={esMostrarSeccionAlmuerzo}
              actualizarForm={actualizarForm}
            />
          </>
        )}
      </div>
    </form>
  );

  const actionsElement = (
    <div
      className={isInline ? "coord-card-actions" : "coord-modal-actions"}
      style={isInline ? { display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" } : {}}
    >
      <button type="button" className="coord-secondary-button" onClick={() => setShowModal(false)}>
        Cancelar
      </button>
      <button type="submit" form="form-programa" className="coord-register-button" disabled={guardando}>
        {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
        <span>{guardando ? "Guardando" : modoEditar ? "Actualizar" : "Crear programa"}</span>
      </button>
    </div>
  );

  if (isInline) {
    return (
      <>
        <header className="coord-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {toggleSidebarButton}
            <h1>{modoEditar ? "EDITAR PROGRAMA" : "REGISTRAR PROGRAMA"}</h1>
          </div>
        </header>
        <section className="coord-workspace coord-workspace-single">
          <article
            className="coord-card coord-program-form-card"
            style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
          >
            <div className="coord-card-title">
              <span className="coord-title-icon">{modoEditar ? <Edit3 size={20} /> : <BookOpen size={20} />}</span>
              <div>
                <h2>
                  {esFormularioVerano
                    ? modoEditar
                      ? "Editar programa de verano"
                      : "Registrar programa de verano"
                    : modoEditar
                    ? "Editar programa"
                    : "Registrar programa"}
                </h2>
              </div>
            </div>
            {formElement}
            {actionsElement}
          </article>
        </section>
      </>
    );
  }

  return (
    <div className="coord-modal-overlay">
      <div
        className={`coord-modal ${esFormularioVerano ? "coord-modal-verano" : ""}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="coord-modal-header">
          <div className="coord-modal-title">
            <span className="coord-modal-icon">{modoEditar ? <Edit3 size={20} /> : <BookOpen size={20} />}</span>
            <div>
              <h2>
                {esFormularioVerano
                  ? modoEditar
                    ? "Editar programa de verano"
                    : "Registrar programa de verano"
                  : modoEditar
                  ? "Editar programa"
                  : "Registrar programa"}
              </h2>
            </div>
          </div>
          <button className="coord-modal-close" type="button" onClick={() => setShowModal(false)}>
            <X size={20} />
          </button>
        </div>
        {formElement}
        {actionsElement}
      </div>
    </div>
  );
}

export default ProgramaFormModal;
