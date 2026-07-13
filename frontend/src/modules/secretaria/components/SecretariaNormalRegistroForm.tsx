import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconUsers as Users,
  IconCalendar as Calendar,
  IconClock as Clock,
  IconCoffee as Coffee,
  IconBookmark as Bookmark,
} from "@tabler/icons-react";
import {
  CampoTexto,
  formatearCuposSecretaria,
} from "./SecretariaFields";
import SecretariaCambridgeIngreso from "./SecretariaCambridgeIngreso";
import SecretariaUniformeSelector from "./SecretariaUniformeSelector";
import SecretariaApoderadoForm from "./SecretariaApoderadoForm";

export default function SecretariaNormalRegistroForm({
  estudiante,
  formulario,
  actualizarFormulario,
  programasParaSelector,
  programaRegistroVista,
  mostrarDetallePrograma,
  horarioResumenRegistro,
  esCambridge,
  ingresoCambridge,
  nivelCambridge,
  inscripcionesEstudiante = [],
}) {
  if (programasParaSelector.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {estudiante.esExterno ? (
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

      <div className="secretaria-registration-section secretaria-registration-program secretaria-field-full">
        <div className="secretaria-field-full" style={{ marginBottom: "8px" }}>
          <label style={{ fontWeight: "700", color: "#344054", fontSize: "12.5px", display: "block", marginBottom: "6px" }}>
            Talleres disponibles para el grado del alumno (Seleccione uno)
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" }}>
            {programasParaSelector.map((programa: any) => {
              const estaRegistrado = Array.isArray(inscripcionesEstudiante) && inscripcionesEstudiante.some((ins: any) => ins.programaId === programa.id);
              const isSelected = !estaRegistrado && (formulario.programa === programa.id || (programasParaSelector.length === 1 && !formulario.programa));
              const cupos = formatearCuposSecretaria(programa);
              return (
                <div
                  key={programa.id}
                  onClick={() => {
                    if (estaRegistrado) return;
                    if (formulario.programa === programa.id) {
                      actualizarFormulario("programa", "");
                    } else {
                      actualizarFormulario("programa", programa.id);
                    }
                  }}
                  style={{
                    border: isSelected ? "2px solid #0c8569" : "1.5px solid #cbd5e1",
                    background: isSelected ? "#e6fcf5" : estaRegistrado ? "#f8fafc" : "#ffffff",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    cursor: estaRegistrado ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease-in-out",
                    boxShadow: isSelected ? "0 4px 12px rgba(12, 133, 105, 0.08)" : "none",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "4px",
                    opacity: estaRegistrado ? 0.6 : 1,
                  }}
                  className={`secretaria-program-option-card ${isSelected ? "is-active" : ""}`}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "9px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: isSelected ? "#0c8569" : estaRegistrado ? "#475569" : "#4b5563",
                        background: isSelected ? "#c3fae8" : estaRegistrado ? "#e2e8f0" : "#f3f4f6",
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
                      {estaRegistrado && (
                        <span style={{
                          color: "#b45309",
                          fontSize: "9px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          background: "#fef3c7",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid #fde68a"
                        }}>
                          YA MATRICULADO
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
      </div>



      {mostrarDetallePrograma && programaRegistroVista ? (
        <div className="secretaria-add-course-summary secretaria-field-full" style={{
          display: "block",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 14px",
          margin: "10px 0"
        }}>
          <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1e293b", marginBottom: "2px", display: "flex", alignContent: "center", alignItems: "center", gap: "6px" }}>
            <Bookmark size={15} style={{ color: "#64748b" }} />
            {estudiante.tieneInvitacion ? "Taller asignado" : "Taller seleccionado"}
          </div>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
            {programaRegistroVista.nombre}
          </div>

          {/* White dashboard cards grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: "10px" }}>
              <span style={{ fontSize: "9.5px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Costo Referencial</span>
              <strong style={{ fontSize: "13.5px", color: "#1e293b", fontWeight: "800" }}>S/ {Number(programaRegistroVista.costo || 0).toFixed(2)}</strong>
            </div>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: "10px" }}>
              <span style={{ fontSize: "9.5px", fontWeight: "500", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Cupos Disponibles</span>
              <strong style={{ fontSize: "13.5px", color: "#1e293b", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}>
                <Users size={15} style={{ color: "#64748b" }} />
                {formatearCuposSecretaria(programaRegistroVista)}
              </strong>
            </div>
          </div>

          {/* Dashed divider */}
          <div style={{ borderTop: "1px dashed #e2e8f0", margin: "8px 0 6px" }} />

          {/* Bottom horizontal pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              padding: "3px 10px",
              fontSize: "11.5px",
              fontWeight: "600",
              color: "#334155"
            }}>
              <Clock size={13} style={{ color: "#64748b" }} />
              <span>{horarioResumenRegistro.clase || "—"}</span>
            </div>

            {programaRegistroVista.incluyeAlmuerzo && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: "600",
                color: "#334155"
              }}>
                <Coffee size={13} style={{ color: "#64748b" }} />
                <span>Almuerzo: {horarioResumenRegistro.almuerzo || "—"}</span>
              </div>
            )}

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              padding: "3px 10px",
              fontSize: "11.5px",
              fontWeight: "600",
              color: "#334155"
            }}>
              <Calendar size={13} style={{ color: "#64748b" }} />
              <span>{horarioResumenRegistro.dia || "—"}</span>
            </div>
          </div>

          <SecretariaCambridgeIngreso
            esCambridge={esCambridge}
            ingresoCambridge={ingresoCambridge}
            nivelCambridge={nivelCambridge}
          />
        </div>
      ) : null}

      <SecretariaUniformeSelector
        requiereUniforme={Boolean(programaRegistroVista?.requiereUniforme)}
        requiereIndumentaria={Boolean(programaRegistroVista?.requiereIndumentaria)}
        formulario={formulario}
        actualizarFormulario={actualizarFormulario}
      />

      <SecretariaApoderadoForm
        formulario={formulario}
        actualizarFormulario={actualizarFormulario}
      />
    </>
  );
}
