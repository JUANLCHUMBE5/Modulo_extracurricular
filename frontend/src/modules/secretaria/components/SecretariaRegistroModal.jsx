import { useEffect, useRef } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconPhone as Phone,
  IconX as X,
  IconUsers as Users,
  IconCalendar as Calendar,
  IconClock as Clock,
  IconCoffee as Coffee,
  IconBookmark as Bookmark,
  IconBook as BookOpen,
} from "@tabler/icons-react";
import {
  CampoLectura,
  CampoTexto,
  DatoHorario,
  formatearCuposSecretaria,
} from "./SecretariaFields";

function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeno Academico",
  };
  return opciones[seleccion] || "";
}

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
}) {
  const modalRef = useRef(null);
  const formRef = useRef(null);
  const obtenerEtiquetaPrograma = etiquetaPrograma || ((programa) => programa?.nombre || "");
  const programaUnicoSelector = programasParaSelector.length === 1 ? programasParaSelector[0] : null;
  const programaSeleccionadoEnForm = formulario.programa ? programas.find(p => p.id === formulario.programa) : null;
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
                  <span style={{ color: "#66bb6a", display: "flex", alignItems: "center" }}><BookOpen size={15} /></span>
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
                  <div className="secretaria-summer-flow secretaria-field-full">
                    <section className="secretaria-summer-panel secretaria-summer-student">
                      <div className="secretaria-registration-section-head secretaria-summer-heading">
                        <strong>Datos del estudiante</strong>
                        <span>Información para ciclo verano</span>
                      </div>

                      <CampoTexto
                        label="Colegio de procedencia"
                        className="secretaria-field-full secretaria-summer-colegio"
                        value={formulario.colegioProcedencia}
                        onChange={(value) => actualizarFormulario("colegioProcedencia", value)}
                        placeholder="Ej: Colegio San Rafael"
                      />

                      {estudiante.esExterno ? (
                        <>
                          <CampoTexto
                            label="DNI del alumno"
                            className="secretaria-summer-dni"
                            value={formulario.dniExterno}
                            onChange={(value) => actualizarFormulario("dniExterno", value.replace(/\D/g, "").slice(0, 8))}
                            placeholder="DNI de 8 numeros"
                            maxLength="8"
                          />
                          <CampoTexto
                            label="Nombre y apellidos del estudiante"
                            className="secretaria-summer-name"
                            value={formulario.nombresExterno}
                            onChange={(value) => actualizarFormulario("nombresExterno", value)}
                            placeholder="Nombre completo del estudiante"
                          />
                          <CampoTexto
                            label="Edad"
                            className="secretaria-field-short secretaria-age-field secretaria-summer-age"
                            value={formulario.edadExterno}
                            onChange={(value) => actualizarFormulario("edadExterno", value.replace(/\D/g, "").slice(0, 2))}
                            placeholder="Ej: 9"
                            maxLength="2"
                          />
                          <CampoTexto
                            label="Grado"
                            className="secretaria-summer-grade"
                            value={formulario.gradoExterno}
                            onChange={(value) => actualizarFormulario("gradoExterno", value)}
                            placeholder="Ej: 4 Primaria"
                          />
                          <div className="secretaria-field secretaria-field-short secretaria-summer-sex">
                            <label htmlFor="sexoExterno">Sexo</label>
                            <select
                              id="sexoExterno"
                              value={formulario.sexoExterno}
                              onChange={(event) => actualizarFormulario("sexoExterno", event.target.value)}
                            >
                              <option value="">Seleccione</option>
                              <option value="F">Femenino</option>
                              <option value="M">Masculino</option>
                            </select>
                          </div>
                          <CampoTexto
                            label="Domicilio"
                            className="secretaria-field-full secretaria-summer-address"
                            value={formulario.domicilioExterno}
                            onChange={(value) => actualizarFormulario("domicilioExterno", value)}
                            placeholder="Dirección del estudiante"
                          />
                        </>
                      ) : (
                        <CampoLectura
                          label="Alumno"
                          value={`${estudiante.grado || "Grado no registrado"}${estudiante.seccion ? ` - Sección/Aula ${estudiante.seccion}` : ""}`}
                        />
                      )}
                    </section>

                    <section className="secretaria-summer-panel secretaria-summer-program">
                      <div className="secretaria-registration-section-head secretaria-summer-heading">
                        <strong>Programa</strong>
                        <span>Seleccione el taller de verano</span>
                      </div>

                      {programasParaSelector.length > 1 ? (
                        <div className="secretaria-field secretaria-field-full secretaria-summer-program-select">
                          <label htmlFor="programa">Programa o taller</label>
                          <select
                            id="programa"
                            value={formulario.programa}
                            disabled={programasParaSelector.length === 0}
                            onChange={(event) =>
                              actualizarFormulario("programa", event.target.value)
                            }
                          >
                            <option value="">
                              {programasParaSelector.length ? "Seleccione programa" : "No hay programas de ciclo verano disponibles"}
                            </option>
                            {programasParaSelector.map((programa) => (
                              <option key={programa.id} value={programa.id}>
                                {obtenerEtiquetaPrograma(programa)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <CampoLectura className="secretaria-program-readonly-field" label="Programa / taller" value={programaRegistroVista?.nombre || ""} />
                      )}

                      {programasParaSelector.length === 0 ? (
                        <MantineAlert
                          className="secretaria-message secretaria-modal-message secretaria-field-full secretaria-summer-alert"
                          color="orange"
                          radius="md"
                          icon={<AlertCircle size={18} />}
                        >
                          Coordinación Académica debe registrar y habilitar un programa de ciclo verano disponible para el estudiante.
                        </MantineAlert>
                      ) : mostrarDetallePrograma ? (
                        <div className="secretaria-program-details-card secretaria-field-full">
                          <h4 className="secretaria-details-card-title">Resumen del Taller</h4>
                          <div className="secretaria-schedule-summary">
                            <DatoHorario label="Grupo" value={programaRegistroVista.grupoEtario || programaRegistroVista.grupo} icon={Users} themeClass="is-grupo" />
                            <DatoHorario label="Día" value={horarioResumenRegistro.dia} icon={Calendar} themeClass="is-dia" />
                            <DatoHorario label="Clase" value={horarioResumenRegistro.clase} icon={Clock} themeClass="is-clase" />
                            <DatoHorario label="Almuerzo" value={horarioResumenRegistro.almuerzo} icon={Coffee} themeClass="is-almuerzo" />
                          </div>
                          <div className="secretaria-details-divider" />
                          <div className="secretaria-details-meta-grid">
                            <div className="secretaria-meta-item">
                              <span>Costo Referencial</span>
                              <strong>S/ {Number(programaRegistroVista.costo).toFixed(2)}</strong>
                            </div>
                            <div className="secretaria-meta-item">
                              <span>Cupos Disponibles</span>
                              <strong className="secretaria-highlight-green">{formatearCuposSecretaria(programaRegistroVista)}</strong>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="secretaria-summer-panel secretaria-summer-contact">
                      <div className="secretaria-registration-section-head secretaria-summer-heading">
                        <strong>Padre o apoderado</strong>
                        <span>Datos de contacto</span>
                      </div>

                      <CampoTexto
                        label="Nombre del padre / apoderado"
                        className="secretaria-field-full secretaria-summer-parent"
                        value={formulario.apoderado}
                        onChange={(value) => actualizarFormulario("apoderado", value)}
                        placeholder="Nombre completo del apoderado"
                      />

                      <CampoTexto
                        label="Teléfono del padre"
                        className="secretaria-field-full secretaria-summer-phone"
                        icon={<Phone size={15} />}
                        value={formulario.telefono}
                        onChange={(value) =>
                          actualizarFormulario("telefono", value.replace(/\D/g, ""))
                        }
                        placeholder="987654321"
                        maxLength="9"
                      />

                      <div className="secretaria-field secretaria-field-full secretaria-registration-observation secretaria-summer-observation">
                        <label htmlFor="observacion">Observación</label>
                        <textarea
                          id="observacion"
                          rows="3"
                          placeholder="Observación opcional para el registro"
                          value={formulario.observacion}
                          onChange={(event) =>
                            actualizarFormulario("observacion", event.target.value)
                          }
                        />
                      </div>
                    </section>
                  </div>
                ) : estudiante.esExterno ? (
                  <div className="secretaria-registration-section secretaria-registration-minor secretaria-field-full">
                    <div className="secretaria-registration-section-head">
                      <strong>Datos del menor</strong>
                      <span>Solo se registra como alumno externo en ciclo verano</span>
                    </div>

                    <CampoTexto
                      label="DNI del alumno"
                      value={formulario.dniExterno}
                      onChange={(value) => actualizarFormulario("dniExterno", value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="DNI de 8 numeros"
                      maxLength="8"
                    />
                    <CampoTexto
                      label="Nombre y apellidos del estudiante"
                      value={formulario.nombresExterno}
                      onChange={(value) => actualizarFormulario("nombresExterno", value)}
                      placeholder="Nombre completo del estudiante"
                    />
                    <CampoTexto
                      label="Edad"
                      className="secretaria-field-short secretaria-age-field"
                      value={formulario.edadExterno}
                      onChange={(value) => actualizarFormulario("edadExterno", value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="Ej: 9"
                      maxLength="2"
                    />
                    <CampoTexto
                      label="Domicilio"
                      className="secretaria-field-wide"
                      value={formulario.domicilioExterno}
                      onChange={(value) => actualizarFormulario("domicilioExterno", value)}
                      placeholder="Dirección del estudiante"
                    />
                    <div className="secretaria-field secretaria-field-short">
                      <label htmlFor="sexoExterno">Sexo</label>
                      <select
                        id="sexoExterno"
                        value={formulario.sexoExterno}
                        onChange={(event) => actualizarFormulario("sexoExterno", event.target.value)}
                      >
                        <option value="">Seleccione</option>
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                      </select>
                    </div>
                    <CampoTexto
                      label="Grado"
                      value={formulario.gradoExterno}
                      onChange={(value) => actualizarFormulario("gradoExterno", value)}
                      placeholder="Ej: 4 Primaria"
                    />
                  </div>
                ) : null}

                {!esCicloVerano ? (
                  <>
                    <div className="secretaria-registration-section secretaria-registration-program secretaria-field-full">
                      <div className="secretaria-field-full" style={{ marginBottom: "8px" }}>
                        <label style={{ fontWeight: "700", color: "#344054", fontSize: "12.5px", display: "block", marginBottom: "6px" }}>
                          Talleres disponibles para el grado del alumno (Seleccione uno)
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" }}>
                          {programasParaSelector.map((programa) => {
                            const isSelected = formulario.programa === programa.id || (programasParaSelector.length === 1 && !formulario.programa);
                            const cupos = formatearCuposSecretaria(programa);
                            return (
                              <div
                                key={programa.id}
                                onClick={() => {
                                  if (formulario.programa === programa.id) {
                                    actualizarFormulario("programa", "");
                                  } else {
                                    actualizarFormulario("programa", programa.id);
                                  }
                                }}
                                style={{
                                  border: isSelected ? "2px solid #0c8569" : "1.5px solid #cbd5e1",
                                  background: isSelected ? "#e6fcf5" : "#ffffff",
                                  borderRadius: "10px",
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease-in-out",
                                  boxShadow: isSelected ? "0 4px 12px rgba(12, 133, 105, 0.08)" : "none",
                                  position: "relative",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                  gap: "4px"
                                }}
                                className={`secretaria-program-option-card ${isSelected ? "is-active" : ""}`}
                              >
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <span style={{
                                      fontSize: "9px",
                                      fontWeight: "700",
                                      textTransform: "uppercase",
                                      color: isSelected ? "#0c8569" : "#4b5563",
                                      background: isSelected ? "#c3fae8" : "#f3f4f6",
                                      padding: "2px 8px",
                                      borderRadius: "4px"
                                    }}>
                                      {programa.categoria || "Taller"}
                                    </span>
                                    {isSelected && (
                                      <span style={{
                                        background: "#0c8569",
                                        color: "#ffffff",
                                        borderRadius: "50%",
                                        width: "18px",
                                        height: "18px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "10px",
                                        fontWeight: "bold"
                                      }}>
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <strong style={{ fontSize: "12.5px", color: "#1f2937", display: "block", lineHeight: "1.3" }}>
                                    {programa.nombre}
                                  </strong>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", borderTop: "1px solid #f3f4f6", paddingTop: "3px" }}>
                                  <span>Costo: S/ {Number(programa.costo || 0).toFixed(0)}</span>
                                  <span style={{ color: Number(programa.cupos || 0) > 0 ? "#15803d" : "#b91c1c", fontWeight: "600" }}>
                                    Cupos: {cupos}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {programasParaSelector.length === 0 && (esCicloVerano || !estudiante.tieneInvitacion) ? (
                      <MantineAlert
                        className="secretaria-message secretaria-modal-message secretaria-field-full"
                        color="orange"
                        radius="md"
                        icon={<AlertCircle size={18} />}
                      >
                        {esCicloVerano
                          ? "Coordinación Académica debe registrar y habilitar un programa de ciclo verano disponible para el estudiante."
                          : "Coordinación Académica debe registrar y habilitar un programa disponible para el grado del estudiante."}
                      </MantineAlert>
                    ) : null}

                    {mostrarDetallePrograma && programaRegistroVista ? (
                      <div className="secretaria-add-course-summary secretaria-field-full" style={{
                        display: "block",
                        background: "#f1f8e9",
                        border: "1px solid #c8e6c9",
                        borderRadius: "12px",
                        padding: "10px 14px",
                        margin: "10px 0"
                      }}>
                        {/* Header of summary */}
                        <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1b5e20", marginBottom: "2px", display: "flex", alignContent: "center", alignItems: "center", gap: "6px" }}>
                          <Bookmark size={15} style={{ color: "#388e3c" }} />
                          Taller asignado
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", marginBottom: "8px" }}>
                          {programaRegistroVista.plantilla || "TALLER"} &middot; {programaRegistroVista.nombre}
                        </div>

                        {/* White dashboard cards grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div style={{ background: "#ffffff", border: "1px solid #c8e6c9", padding: "6px 10px", borderRadius: "10px" }}>
                            <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Costo Referencial</span>
                            <strong style={{ fontSize: "13.5px", color: "#1b5e20", fontWeight: "800" }}>S/ {Number(programaRegistroVista.costo || 0).toFixed(2)}</strong>
                          </div>
                          <div style={{ background: "#ffffff", border: "1px solid #c8e6c9", padding: "6px 10px", borderRadius: "10px" }}>
                            <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Cupos Disponibles</span>
                            <strong style={{ fontSize: "13.5px", color: "#2e7d32", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}>
                              <Users size={15} style={{ color: "#388e3c" }} />
                              {formatearCuposSecretaria(programaRegistroVista)}
                            </strong>
                          </div>
                        </div>

                        {/* Dashed divider */}
                        <div style={{ borderTop: "1px dashed #c8e6c9", margin: "8px 0 6px" }} />

                        {/* Bottom horizontal pills */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#ffffff",
                            border: "1px solid #c8e6c9",
                            borderRadius: "20px",
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: "600",
                            color: "#1b5e20"
                          }}>
                            <Clock size={13} style={{ color: "#388e3c" }} />
                            <span>{horarioResumenRegistro.clase || "—"}</span>
                          </div>

                          {programaRegistroVista.incluyeAlmuerzo && (
                            <div style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "#ffffff",
                              border: "1px solid #c8e6c9",
                              borderRadius: "20px",
                              padding: "3px 10px",
                              fontSize: "11.5px",
                              fontWeight: "600",
                              color: "#1b5e20"
                            }}>
                              <Coffee size={13} style={{ color: "#388e3c" }} />
                              <span>Almuerzo: {horarioResumenRegistro.almuerzo || "—"}</span>
                            </div>
                          )}

                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#ffffff",
                            border: "1px solid #c8e6c9",
                            borderRadius: "20px",
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: "600",
                            color: "#1b5e20"
                          }}>
                            <Calendar size={13} style={{ color: "#388e3c" }} />
                            <span>{horarioResumenRegistro.dia || "—"}</span>
                          </div>
                        </div>

                        {esCambridge && ingresoCambridge ? (
                          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", marginTop: "10px" }}>
                            <span style={{ fontSize: "11px", color: "#1e40af", display: "block", marginBottom: "2px" }}>Modalidad Cambridge</span>
                            <strong style={{ fontSize: "13px", color: "#1e3a8a" }}>{ingresoCambridge} {nivelCambridge ? `(${nivelCambridge})` : ""}</strong>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                {programaRegistroVista?.requiereUniforme ? (
                  <div className="secretaria-field" style={{ marginBottom: "16px" }}>
                    <label htmlFor="talla" style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Talla de uniforme</label>
                    <select
                      id="talla"
                      className="secretaria-input-fused"
                      value={formulario.tallaUniforme}
                      onChange={(event) =>
                        actualizarFormulario("tallaUniforme", event.target.value)
                      }
                    >
                      <option value="">Seleccione talla</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                    </select>
                  </div>
                ) : null}

                {programaRegistroVista?.requiereIndumentaria ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px", marginBottom: "16px" }}>
                    <div>
                      <label htmlFor="tallaPolo" style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Talla de polo</label>
                      <select
                        id="tallaPolo"
                        className="secretaria-input-fused"
                        value={formulario.tallaPolo}
                        onChange={(event) =>
                          actualizarFormulario("tallaPolo", event.target.value)
                        }
                      >
                        <option value="">Seleccione talla</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="tallaShort" style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Talla de short</label>
                      <select
                        id="tallaShort"
                        className="secretaria-input-fused"
                        value={formulario.tallaShort}
                        onChange={(event) =>
                          actualizarFormulario("tallaShort", event.target.value)
                        }
                      >
                        <option value="">Seleccione talla</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                </div>

                {/* Padre / Apoderado */}
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1b5e20", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <BookOpen size={16} style={{ color: "#388e3c" }} />
                    Padre / Apoderado
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", margin: "4px 0 6px" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Nombre del padre / apoderado</label>
                      <input
                        className="secretaria-input-fused"
                        type="text"
                        value={formulario.apoderado}
                        onChange={(event) => actualizarFormulario("apoderado", event.target.value)}
                        placeholder="Nombre completo del apoderado"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Teléfono del padre</label>
                      <input
                        className="secretaria-input-fused"
                        type="text"
                        value={formulario.telefono}
                        onChange={(event) => actualizarFormulario("telefono", event.target.value.replace(/\D/g, ""))}
                        placeholder="987654321"
                        maxLength="9"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Observación (opcional)</label>
                      <input
                        className="secretaria-input-fused"
                        type="text"
                        value={formulario.observacion}
                        onChange={(event) => actualizarFormulario("observacion", event.target.value)}
                        placeholder="Observación opcional para el registro"
                      />
                    </div>
                  </div>
                </div>

                </>
                ) : null}

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
                    onClick={() => setModoRegistro(false)}
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
      ) : null}
    </>
  );
}
