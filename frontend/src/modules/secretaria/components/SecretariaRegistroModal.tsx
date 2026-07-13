import { useEffect, useRef } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconCircleCheck as CheckCircle2,
  IconPrinter as Printer,
  IconSend as Send,
} from "@tabler/icons-react";
import {
  formatearCuposSecretaria,
  resumirClaseSecretaria,
} from "./SecretariaFields";
import { describirSeleccionCambridge } from "./SecretariaStudentPanelHelpers";
import SecretariaSummerRegistroForm from "./SecretariaSummerRegistroForm";
import SecretariaNormalRegistroForm from "./SecretariaNormalRegistroForm";

export default function SecretariaRegistroModal({
  actualizarFormulario,
  esCicloVerano,
  estudiante,
  formulario,
  guardarInscripción,
  guardando,
  horarioResumenRegistro,
  etiquetaPrograma,
  mensaje,
  modoCursoAdicional = false,
  modoRegistro,
  mostrarSelectorPrograma,
  programaParaRegistro,
  programas,
  programasParaSelector,
  tieneTalleresGradoBase,
  setModoRegistro,
  // Added props
  inscripcion,
  inscripcionesEstudiante = [],
  abrirFichaGenerada,
  imprimiendoFichaRegistro,
  derivarACaja,
  derivandoCaja,
  cursosAdicionalesDisponibles = 0,
  abrirCursoAdicional,
  setModoCursoAdicional,
  limpiarBusquedaEstudiante,
  imprimirFichaDesdeFormulario,
}) {
  const modalRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const obtenerEtiquetaPrograma = etiquetaPrograma || ((programa: any) => programa?.nombre || "");
  const programaUnicoSelector = programasParaSelector.length === 1 ? programasParaSelector[0] : null;
  const programaSeleccionadoEnForm = formulario.programa ? programas.find((p: any) => p.id === formulario.programa) : null;
  const programaRegistroVista = programaSeleccionadoEnForm || programaParaRegistro || programaUnicoSelector;
  const esCambridge = /cambridge/i.test([
    programaRegistroVista?.nombre,
    programaRegistroVista?.programa,
    programaRegistroVista?.plantilla,
  ].filter(Boolean).join(" "));
  const seleccionCambridge = programaRegistroVista?.seleccion || "";
  const ingresoCambridge = describirSeleccionCambridge(seleccionCambridge);
  const nivelCambridge = programaRegistroVista?.nivelCambridge || "";
  const requiereSeleccionPrograma = (esCicloVerano || mostrarSelectorPrograma) && programasParaSelector.length > 1;
  const mostrarDetallePrograma = Boolean(programaRegistroVista) && (
    !requiereSeleccionPrograma || Boolean(formulario.programa)
  );

  const esPagoCompletado = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(
    (est) => String(inscripcion?.estadoPago || "").toLowerCase().includes(est) || String(inscripcion?.estadoInscripcion || "").toLowerCase().includes(est)
  );

  useEffect(() => {
    if (!modoRegistro || !estudiante || typeof window === "undefined") {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      modalRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      formRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [modoRegistro, estudiante?.dni, estudiante?.codigoEstudiante, estudiante?.nombres]);

  const esSoloLectura = Boolean(inscripcion && !modoCursoAdicional);

  return (
    <>
      {modoRegistro && estudiante ? (
        <section
          ref={modalRef}
          className={`secretaria-card secretaria-registration-card secretaria-registration-modal-fused is-inline${esCicloVerano ? " is-summer-registration" : ""}${estudiante.esExterno ? " is-external-registration" : ""}`}
          role="region"
          aria-labelledby="secretaria-registration-title"
        >
          <form ref={formRef} className="secretaria-registration-form-fused" onSubmit={guardarInscripción}>
            
            {/* Title */}
            <div style={{
              fontSize: "12px",
              fontWeight: "750",
              color: "#558b2f",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{ color: "#66bb6a", display: "flex", alignItems: "center" }}>📚</span>
              <span>PROGRAMA Y TALLER</span>
            </div>



            {mensaje && !mensaje.toLowerCase().includes("exito") && !mensaje.toLowerCase().includes("éxito") ? (
              <MantineAlert
                className="secretaria-message secretaria-modal-message secretaria-field-full"
                color="orange"
                radius="md"
                icon={<AlertCircle size={18} />}
              >
                {mensaje}
              </MantineAlert>
            ) : null}

            <fieldset disabled={esSoloLectura} style={{ border: "none", padding: 0, margin: 0, display: "contents" }}>
              {programasParaSelector.length === 0 ? (
                <MantineAlert
                  className="secretaria-message secretaria-modal-message secretaria-field-full"
                  color="orange"
                  radius="md"
                  icon={<AlertCircle size={18} />}
                  styles={{
                    root: { border: "1px solid #ffe3e3", background: "#fff5f5" },
                    title: { color: "#c92a2a", fontWeight: 700 }
                  }}
                  title={tieneTalleresGradoBase ? "TALLERES DISPONIBLES, PERO EL ALUMNO NO TIENE INVITACIÓN" : "NO HAY TALLERES DISPONIBLES"}
                >
                  {tieneTalleresGradoBase
                    ? "El estudiante no cuenta con una invitación activa para los talleres disponibles de su grado. Favor consultar con Coordinación Académica para poder habilitar o enviarle una invitación."
                    : esCicloVerano
                      ? "Coordinación Académica debe registrar o habilitar un programa de ciclo verano disponible para el grado del estudiante."
                      : "Coordinación Académica debe crear o habilitar un taller compatible para el grado del alumno."}
                </MantineAlert>
              ) : (
                <>
                  {esCicloVerano ? (
                    <SecretariaSummerRegistroForm
                      estudiante={estudiante}
                      formulario={formulario}
                      actualizarFormulario={actualizarFormulario}
                      programasParaSelector={programasParaSelector}
                      obtenerEtiquetaPrograma={obtenerEtiquetaPrograma}
                      programaRegistroVista={programaRegistroVista}
                      mostrarDetallePrograma={mostrarDetallePrograma}
                      horarioResumenRegistro={horarioResumenRegistro}
                      inscripcionesEstudiante={inscripcionesEstudiante}
                    />
                  ) : (
                    <SecretariaNormalRegistroForm
                      estudiante={estudiante}
                      formulario={formulario}
                      actualizarFormulario={actualizarFormulario}
                      programasParaSelector={programasParaSelector}
                      programaRegistroVista={programaRegistroVista}
                      mostrarDetallePrograma={mostrarDetallePrograma}
                      horarioResumenRegistro={horarioResumenRegistro}
                      esCambridge={esCambridge}
                      ingresoCambridge={ingresoCambridge}
                      nivelCambridge={nivelCambridge}
                      esCicloVerano={esCicloVerano}
                      inscripcionesEstudiante={inscripcionesEstudiante}
                    />
                  )}

                  {/* Términos y condiciones */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    margin: "8px 0 10px",
                    background: "#f8fafc",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <input
                      type="checkbox"
                      id="termsCheck"
                      checked={formulario.aceptaCondiciones || esSoloLectura}
                      onChange={(event) => actualizarFormulario("aceptaCondiciones", event.target.checked)}
                      style={{ width: "18px", height: "18px", accentColor: "#64748b", cursor: "pointer" }}
                    />
                    <label htmlFor="termsCheck" style={{ fontSize: "12.5px", fontWeight: "500", color: "#334155", cursor: "pointer" }}>
                      El padre/apoderado acepta las condiciones del programa.
                    </label>
                  </div>
                </>
              )}
            </fieldset>

            {/* Acciones */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              {esSoloLectura ? (
                <>
                  <button
                    className="secretaria-btn-secondary-fused"
                    type="button"
                    onClick={limpiarBusquedaEstudiante}
                  >
                    Buscar otro estudiante
                  </button>

                  {cursosAdicionalesDisponibles > 0 && (
                    <button
                      className="secretaria-btn-secondary-fused"
                      type="button"
                      onClick={abrirCursoAdicional}
                      style={{
                        borderColor: "#a5d6a7",
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <ClipboardCheck size={16} />
                      <span>Registrar curso adicional</span>
                    </button>
                  )}

                  <button
                    className="secretaria-btn-primary-fused"
                    type="button"
                    disabled={imprimiendoFichaRegistro}
                    onClick={abrirFichaGenerada}
                    style={{
                      background: "#0d9488",
                      border: "none",
                      color: "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {imprimiendoFichaRegistro ? (
                      <Loader2 className="secretaria-spin" size={17} />
                    ) : (
                      <Printer size={17} />
                    )}
                    <span>Imprimir Ficha</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="secretaria-btn-secondary-fused"
                    type="button"
                    onClick={() => {
                      if (modoCursoAdicional) {
                        setModoCursoAdicional?.(false);
                      } else {
                        limpiarBusquedaEstudiante?.();
                      }
                    }}
                  >
                    Cancelar
                  </button>
                  {programasParaSelector.length > 0 && (
                    (() => {
                      const tieneProgramaValido = requiereSeleccionPrograma
                        ? Boolean(formulario.programa)
                        : Boolean(programaRegistroVista);
                      return (
                        <>
                          <button
                            className="secretaria-btn-primary-fused"
                            type="button"
                            disabled={imprimiendoFichaRegistro || !tieneProgramaValido}
                            onClick={imprimirFichaDesdeFormulario}
                            style={{
                              background: "#0d9488",
                              border: "none",
                              color: "#ffffff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            {imprimiendoFichaRegistro ? (
                              <Loader2 className="secretaria-spin" size={17} />
                            ) : (
                              <Printer size={17} />
                            )}
                            <span>Imprimir Ficha</span>
                          </button>

                          <button
                            className="secretaria-btn-primary-fused"
                            type="submit"
                            disabled={guardando || !tieneProgramaValido || !formulario.aceptaCondiciones}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            {guardando ? (
                              <Loader2 className="secretaria-spin" size={17} />
                            ) : (
                              <ClipboardCheck size={17} />
                            )}
                            <span>{guardando ? "Guardando..." : "Confirmar Inscripción"}</span>
                          </button>
                        </>
                      );
                    })()
                  )}
                </>
              )}
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
