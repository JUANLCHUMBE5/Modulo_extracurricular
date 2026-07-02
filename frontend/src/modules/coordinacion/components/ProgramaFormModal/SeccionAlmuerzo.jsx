import { useState, useEffect, useRef } from "react";
import {
  IconToolsKitchen2 as Utensils,
  IconPlus as Plus,
  IconTrash as Trash,
  IconCheckbox as CheckboxIcon,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";
import { formatearHora12 } from "../../utils/coordinacionFormatters";

function parseLines(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      return line
        .replace(/^•\t*/, "")
        .replace(/^•\s*/, "")
        .replace(/^-\t*/, "")
        .replace(/^-\s*/, "")
        .replace(/^\d+[.)\s\t]*/, "")
        .replace(/^[a-z]\)[.)\s\t]*/i, "")
        .trim();
    })
    .filter(Boolean);
}

export function reemplazarAlmuerzoEnTexto(textoOriginal, nuevosAlmuerzos, nuevosConcesionarios) {
  if (!textoOriginal) return "";
  let lineas = textoOriginal.split("\n");
  
  const idxAlmuerzo = lineas.findIndex(l => {
    const normal = l.toLowerCase().trim();
    return normal.startsWith("el almuerzo:") || normal === "el almuerzo" || normal.startsWith("almuerzo:");
  });

  const idxConcesionarios = lineas.findIndex(l => {
    const normal = l.toLowerCase().trim();
    return normal.startsWith("si deseara coordinar") || normal.startsWith("concesionarios:") || normal.includes("concesionarios autorizados");
  });

  const idxAcepto = lineas.findIndex(l => {
    const normal = l.toLowerCase().trim();
    return normal.startsWith("acepto:") || normal.startsWith("entregar este formato") || normal.startsWith("atentamente");
  });

  const lineasAlmuerzo = nuevosAlmuerzos.length > 0 ? [
    "EL ALMUERZO:",
    ...nuevosAlmuerzos.map(item => `•\t${item}`)
  ] : [];

  const lineasConcesionarios = nuevosConcesionarios.length > 0 ? [
    "Si deseara coordinar el servicio de Delivery le indicamos los siguientes contactos de nuestros concesionarios:",
    ...nuevosConcesionarios.map(item => `•\t${item}`)
  ] : [];

  if (idxAlmuerzo !== -1) {
    let finAlmuerzo = idxConcesionarios !== -1 ? idxConcesionarios : (idxAcepto !== -1 ? idxAcepto : lineas.length);
    lineas.splice(idxAlmuerzo, finAlmuerzo - idxAlmuerzo, ...lineasAlmuerzo);
    
    const offset = lineasAlmuerzo.length - (finAlmuerzo - idxAlmuerzo);
    let newIdxConcesionarios = idxConcesionarios !== -1 ? idxConcesionarios + offset : -1;
    let newIdxAcepto = idxAcepto !== -1 ? idxAcepto + offset : lineas.length;

    if (newIdxConcesionarios !== -1) {
      lineas.splice(newIdxConcesionarios, newIdxAcepto - newIdxConcesionarios, ...lineasConcesionarios);
    } else if (lineasConcesionarios.length > 0) {
      lineas.splice(newIdxAcepto, 0, "", ...lineasConcesionarios);
    }
  } else {
    const targetIdx = idxAcepto !== -1 ? idxAcepto : lineas.length;
    const appendLines = [];
    if (lineasAlmuerzo.length > 0) {
      appendLines.push("", ...lineasAlmuerzo);
    }
    if (lineasConcesionarios.length > 0) {
      appendLines.push("", ...lineasConcesionarios);
    }
    if (appendLines.length > 0) {
      lineas.splice(targetIdx, 0, ...appendLines);
    }
  }

  return lineas.join("\n");
}

function SeccionAlmuerzo({ form, esMostrarSeccionAlmuerzo, actualizarForm }) {
  const isLocalChangeRef = useRef(false);
  const [almuerzoItems, setAlmuerzoItems] = useState([]);
  const [concesionarioItems, setConcesionarioItems] = useState([]);
  const [esModoEstructurado, setEsModoEstructurado] = useState(false);

  useEffect(() => {
    if (!esMostrarSeccionAlmuerzo) return;
    const parsedAlmuerzo = parseLines(form.detalleAlmuerzo);
    const parsedConcesionarios = parseLines(form.concesionarios);
    setAlmuerzoItems(parsedAlmuerzo);
    setConcesionarioItems(parsedConcesionarios);
    setEsModoEstructurado(parsedAlmuerzo.length > 0 || parsedConcesionarios.length > 0);
  }, [esMostrarSeccionAlmuerzo]);

  useEffect(() => {
    if (!esMostrarSeccionAlmuerzo) return;
    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }
    const parsedAlmuerzo = parseLines(form.detalleAlmuerzo);
    const parsedConcesionarios = parseLines(form.concesionarios);
    setAlmuerzoItems(parsedAlmuerzo);
    setConcesionarioItems(parsedConcesionarios);
    setEsModoEstructurado(parsedAlmuerzo.length > 0 || parsedConcesionarios.length > 0);
  }, [form.id, form.tipoComunicado, form.plantilla]);

  const sincronizar = (nuevosAlmuerzos, nuevosConcesionarios) => {
    isLocalChangeRef.current = true;
    const detalleAlmuerzoText = nuevosAlmuerzos.map(item => `•\t${item}`).join("\n");
    const concesionariosText = nuevosConcesionarios.map(item => `•\t${item}`).join("\n");

    let nuevoCompleto = form.comunicadoCompleto || "";
    if (nuevoCompleto) {
      nuevoCompleto = reemplazarAlmuerzoEnTexto(nuevoCompleto, nuevosAlmuerzos, nuevosConcesionarios);
    }

    actualizarForm({
      detalleAlmuerzo: detalleAlmuerzoText,
      concesionarios: concesionariosText,
      comunicadoCompleto: nuevoCompleto
    });
  };

  const handleAlmuerzoItemChange = (index, value) => {
    const updated = [...almuerzoItems];
    updated[index] = value;
    setAlmuerzoItems(updated);
    sincronizar(updated, concesionarioItems);
  };

  const handleAddAlmuerzoItem = () => {
    const updated = [...almuerzoItems, ""];
    setAlmuerzoItems(updated);
    sincronizar(updated, concesionarioItems);
  };

  const handleRemoveAlmuerzoItem = (index) => {
    const updated = [...almuerzoItems];
    updated.splice(index, 1);
    setAlmuerzoItems(updated);
    sincronizar(updated, concesionarioItems);
  };

  const handleConcesionarioItemChange = (index, value) => {
    const updated = [...concesionarioItems];
    updated[index] = value;
    setConcesionarioItems(updated);
    sincronizar(almuerzoItems, updated);
  };

  const handleAddConcesionarioItem = () => {
    const updated = [...concesionarioItems, ""];
    setConcesionarioItems(updated);
    sincronizar(almuerzoItems, updated);
  };

  const handleRemoveConcesionarioItem = (index) => {
    const updated = [...concesionarioItems];
    updated.splice(index, 1);
    setConcesionarioItems(updated);
    sincronizar(almuerzoItems, updated);
  };

  if (!esMostrarSeccionAlmuerzo) return null;

  return (
    <section className="coord-form-section" style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }}>
      <div className="coord-section-heading">
        <Utensils size={18} style={{ color: "#f59e0b" }} />
        <div>
          <h3 style={{ color: "#78350f" }}>Configuración de Almuerzo</h3>
        </div>
      </div>
      <div className="coord-section-grid">
        <div className="coord-field coord-field-full" style={{ margin: 0 }}>
          <label
            className="coord-check-label"
            style={{ cursor: "pointer", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <input
              type="checkbox"
              checked={Boolean(form.incluyeAlmuerzo)}
              onChange={e => {
                const val = e.target.checked;
                actualizarForm("incluyeAlmuerzo", val);
                if (val) {
                  if (!form.detalleAlmuerzo) {
                    actualizarForm(
                      "detalleAlmuerzo",
                      "Contamos con un área para la recepción de los almuerzos, donde se deberá dejar bajo el siguiente horario: De 01:20 a 01:45 p.m.\nIndicando claramente una etiqueta grande en la lonchera, con NOMBRE DEL ALUMNO, GRADO Y SECCIÓN."
                    );
                  }
                  if (!form.concesionarios) {
                    actualizarForm(
                      "concesionarios",
                      "Si deseara coordinar el servicio de Delivery le indicamos los siguientes contactos de nuestros 2 concesionarios para desayunos, loncheras, almuerzos:\nCafetín Los Amigos del recreo (Sra. Rocío) - 976280197\nCafetín Edith (Sra. Deysli) - 960897529\nque son concesionarias autorizadas de nuestra Institución y que cumplen con todo el protocolo que corresponde de acuerdo a las disposiciones del MINSA."
                    );
                  }
                }
              }}
            />
            <span>Incluye recepción de almuerzo</span>
          </label>

          {form.incluyeAlmuerzo && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  color: "#78350f"
                }}
              >
                <strong style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "#b45309" }}>
                  ⏰ Horario de recepción de almuerzo (calculado automáticamente del horario de almuerzo de arriba):
                </strong>
                {form.horarioRecepcionAlmuerzo ? (
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>
                    {form.horarioRecepcionAlmuerzo
                      .split(", ")
                      .map(part => {
                        const match = part.match(/(Inicial|Primaria|Secundaria)\s*:\s*(\d{2}:\d{2})\s*a\s*(\d{2}:\d{2})/i);
                        if (match) {
                          const level = match[1];
                          const t1 = formatearHora12(match[2]);
                          const t2 = formatearHora12(match[3]);
                          return `${level}: de ${t1} a ${t2}`;
                        }
                        return part;
                      })
                      .join(" · ")}
                  </span>
                ) : (
                  <span style={{ fontSize: "13px", color: "#b45309", fontStyle: "italic" }}>
                    Configure al menos un bloque con horario de almuerzo arriba para calcular el horario de recepción.
                  </span>
                )}
              </div>

              {/* Editor Mode Selector */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => setEsModoEstructurado(false)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid",
                    cursor: "pointer",
                    background: !esModoEstructurado ? "#f59e0b" : "#ffffff",
                    color: !esModoEstructurado ? "#ffffff" : "#4b5563",
                    borderColor: !esModoEstructurado ? "#f59e0b" : "#cbd5e1",
                    transition: "all 0.2s"
                  }}
                >
                  Texto Plano (Sencillo)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEsModoEstructurado(true);
                    const parsedAlmuerzo = parseLines(form.detalleAlmuerzo);
                    const parsedConcesionarios = parseLines(form.concesionarios);
                    setAlmuerzoItems(parsedAlmuerzo);
                    setConcesionarioItems(parsedConcesionarios);
                    sincronizar(parsedAlmuerzo, parsedConcesionarios);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid",
                    cursor: "pointer",
                    background: esModoEstructurado ? "#f59e0b" : "#ffffff",
                    color: esModoEstructurado ? "#ffffff" : "#4b5563",
                    borderColor: esModoEstructurado ? "#f59e0b" : "#cbd5e1",
                    transition: "all 0.2s"
                  }}
                >
                  Secciones Estructuradas (Por Bloques)
                </button>
              </div>

              {!esModoEstructurado ? (
                <>
                  <div style={{ marginTop: "12px" }}>
                    <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      Detalle / Indicaciones de almuerzo
                    </label>
                    <textarea
                      value={form.detalleAlmuerzo || ""}
                      onChange={e => actualizarForm("detalleAlmuerzo", e.target.value)}
                      placeholder="Ej: Contamos con un área para la recepción de los almuerzos..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        resize: "vertical",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      Concesionarios autorizados
                    </label>
                    <textarea
                      value={form.concesionarios || ""}
                      onChange={e => actualizarForm("concesionarios", e.target.value)}
                      placeholder="Ej: Cafetín Los Amigos del recreo (Sra. Rocío) - 976280197..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        resize: "vertical",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "12px" }}>
                  
                  {/* BLOQUE INDICACIONES ALMUERZO */}
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#78350f" }}>
                        <CheckboxIcon size={18} style={{ color: "#f59e0b" }} />
                        <strong style={{ fontSize: "13.5px" }}>Detalle / Indicaciones de almuerzo</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAlmuerzoItem}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          background: "#fffbeb",
                          border: "1px solid #d97706",
                          borderRadius: "4px",
                          color: "#d97706",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        <Plus size={12} /> Agregar punto
                      </button>
                    </div>

                    {almuerzoItems.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "8px 0" }}>
                        No hay puntos definidos. Agregue puntos para detallar las indicaciones.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {almuerzoItems.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{idx + 1}.</span>
                            <input
                              value={item}
                              onChange={(e) => handleAlmuerzoItemChange(idx, e.target.value)}
                              placeholder={`Indicación de almuerzo ${idx + 1}`}
                              style={{
                                flex: 1,
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "12.5px"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAlmuerzoItem(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "2px"
                              }}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* BLOQUE CONCESIONARIOS AUTORIZADOS */}
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#78350f" }}>
                        <CheckboxIcon size={18} style={{ color: "#f59e0b" }} />
                        <strong style={{ fontSize: "13.5px" }}>Concesionarios autorizados</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddConcesionarioItem}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          background: "#fffbeb",
                          border: "1px solid #d97706",
                          borderRadius: "4px",
                          color: "#d97706",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        <Plus size={12} /> Agregar concesionario
                      </button>
                    </div>

                    {concesionarioItems.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "8px 0" }}>
                        No hay concesionarios definidos. Agregue registros para detallar los concesionarios.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {concesionarioItems.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{idx + 1}.</span>
                            <input
                              value={item}
                              onChange={(e) => handleConcesionarioItemChange(idx, e.target.value)}
                              placeholder={`Concesionario / Contacto ${idx + 1}`}
                              style={{
                                flex: 1,
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "12.5px"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveConcesionarioItem(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "2px"
                              }}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#475569", background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px" }}>
                    <InfoCircle size={14} style={{ color: "#475569", flexShrink: 0 }} />
                    <span>Las indicaciones y concesionarios estructurados se sincronizan automáticamente con el cuerpo completo del documento.</span>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default SeccionAlmuerzo;
