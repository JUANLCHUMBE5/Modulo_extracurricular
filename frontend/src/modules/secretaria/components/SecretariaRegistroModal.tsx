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
  setModoRegistro,
  // Added props
  inscripcion,
  abrirFichaGenerada,
  imprimiendoFichaRegistro,
  derivarACaja,
  derivandoCaja,
  cursosAdicionalesDisponibles = 0,
  abrirCursoAdicional,
  setModoCursoAdicional,
  limpiarBusquedaEstudiante,
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

  return (
    <>
      {modoRegistro && estudiante ? (
        inscripcion && !modoCursoAdicional ? (
          <section
            ref={modalRef}
            className="secretaria-card secretaria-registration-card secretaria-registration-modal-fused is-inline"
            role="region"
            aria-labelledby="secretaria-registration-title"
          >
            {/* Title */}
            <div style={{
              fontSize: "12px",
              fontWeight: "750",
              color: "#0f766e",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{ color: "#0d9488", display: "flex", alignItems: "center" }}>✅</span>
              <span>INSCRIPCIÓN REGISTRADA</span>
            </div>

            {/* Info Grid */}
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Programa / Taller</span>
                  <div style={{ fontSize: "14.5px", fontWeight: "750", color: "#14532d", marginTop: "2px" }}>
                    {inscripcion.programa}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Horario</span>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#14532d", marginTop: "2px" }}>
                      {resumirClaseSecretaria(inscripcion.horario)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Costo</span>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#14532d", marginTop: "2px" }}>
                      S/ {Number(inscripcion.costo || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Apoderado</span>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#14532d", marginTop: "2px" }}>
                      {inscripcion.apoderado}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Teléfono</span>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#14532d", marginTop: "2px" }}>
                      {inscripcion.telefono}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Estado Pago</span>
                    <div style={{ fontSize: "13px", fontWeight: "750", color: esPagoCompletado ? "#15803d" : "#c2410c", marginTop: "2px" }}>
                      {inscripcion.estadoPago || "Pendiente"}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Uniforme</span>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#14532d", marginTop: "2px" }}>
                      {inscripcion.requiereUniforme ? "Sí" : "No"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="secretaria-btn-primary-fused"
                  type="button"
                  onClick={abrirFichaGenerada}
                  disabled={imprimiendoFichaRegistro}
                  style={{ flex: 1, height: "42px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {imprimiendoFichaRegistro ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
                  <span>{imprimiendoFichaRegistro ? "Preparando ficha" : "Imprimir ficha de registro"}</span>
                </button>

                <button
                  className="secretaria-btn-primary-fused"
                  type="button"
                  onClick={derivarACaja}
                  disabled={derivandoCaja || inscripcion.derivadoCaja || esPagoCompletado}
                  style={{
                    flex: 1,
                    height: "42px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: (inscripcion.derivadoCaja || esPagoCompletado) ? "#e2e8f0" : "#0d9488",
                    border: (inscripcion.derivadoCaja || esPagoCompletado) ? "1px solid #cbd5e1" : "none",
                    color: (inscripcion.derivadoCaja || esPagoCompletado) ? "#64748b" : "#ffffff",
                    cursor: (inscripcion.derivadoCaja || esPagoCompletado) ? "not-allowed" : "pointer"
                  }}
                >
                  {derivandoCaja ? (
                    <Loader2 className="secretaria-spin" size={17} />
                  ) : esPagoCompletado ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <Send size={17} />
                  )}
                  <span>
                    {inscripcion.derivadoCaja
                      ? "Derivado exitosamente"
                      : esPagoCompletado
                        ? "Pago completado"
                        : derivandoCaja
                          ? "Derivando"
                          : "Derivar a caja"}
                  </span>
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  className="secretaria-btn-secondary-fused"
                  type="button"
                  onClick={limpiarBusquedaEstudiante}
                  style={{ flex: 1, height: "38px" }}
                >
                  Buscar otro estudiante
                </button>

                {cursosAdicionalesDisponibles > 0 && (
                  <button
                    className="secretaria-btn-secondary-fused"
                    type="button"
                    onClick={abrirCursoAdicional}
                    style={{
                      flex: 1,
                      height: "38px",
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
              </div>
            </div>
          </section>
        ) : (
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

              {mensaje ? (
                <MantineAlert
                  className="secretaria-message secretaria-modal-message secretaria-field-full"
                  color="orange"
                  radius="md"
                  icon={<AlertCircle size={18} />}
                >
                  {mensaje}
                </MantineAlert>
              ) : null}

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
                />
              )}

              {/* Términos y condiciones */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "8px 0 10px",
                background: "#f1f8e9",
                padding: "8px 12px",
                borderRadius: "12px",
                border: "1px solid #c8e6c9"
              }}>
                <input
                  type="checkbox"
                  id="termsCheck"
                  checked={formulario.aceptaCondiciones}
                  onChange={(event) => actualizarFormulario("aceptaCondiciones", event.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#388e3c", cursor: "pointer" }}
                />
                <label htmlFor="termsCheck" style={{ fontSize: "12.5px", fontWeight: "600", color: "#1b5e20", cursor: "pointer" }}>
                  <strong>El padre/apoderado acepta las condiciones del programa.</strong>
                </label>
              </div>

              {/* Acciones */}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
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
                {(() => {
                  const tieneProgramaValido = requiereSeleccionPrograma
                    ? Boolean(formulario.programa)
                    : Boolean(programaRegistroVista);
                  return (
                    <button
                      className="secretaria-btn-primary-fused"
                      type="submit"
                      disabled={guardando || !tieneProgramaValido || !formulario.aceptaCondiciones}
                    >
                      {guardando ? (
                        <Loader2 className="secretaria-spin" size={17} />
                      ) : (
                        <ClipboardCheck size={17} />
                      )}
                      <span>{guardando ? "Guardando..." : "Confirmar Inscripción"}</span>
                    </button>
                  );
                })()}
              </div>
            </form>
          </section>
        )
      ) : null}
    </>
  );
}
