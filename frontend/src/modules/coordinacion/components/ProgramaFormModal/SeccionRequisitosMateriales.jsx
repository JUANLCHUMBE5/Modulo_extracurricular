import { useState, useEffect, useRef, useMemo } from "react";
import {
  IconBook as BookOpen,
  IconPlus as Plus,
  IconTrash as Trash,
  IconCheckbox as CheckboxIcon,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";

// Helpers for parsing and cleaning line items
function limpiarItem(linea) {
  return String(linea || "")
    .replace(/^•\t*/, "")
    .replace(/^•\s*/, "")
    .replace(/^-\t*/, "")
    .replace(/^-\s*/, "")
    .replace(/^\d+[°º]?[.)\s\t]*/, "")
    .replace(/^[a-z]\)[.)\s\t]*/i, "")
    .trim();
}

export function parseStructuredSections(comunicadoCompleto, requisitosRaw) {
  const lineas = (requisitosRaw || "").split("\n").map(l => l.trim());
  const requisitosGrupos = [];
  let grupoActual = null;

  lineas.forEach(linea => {
    const normal = linea.toLowerCase();
    
    // A line is a header if it doesn't start with a bullet point/number and is not empty,
    // and it ends with ":" or contains keywords like "requisitos", "nota", "útiles", "utiles", "promoción", "ventajas", etc.
    const esHeader = linea && 
                     !linea.startsWith("•") && 
                     !linea.startsWith("-") && 
                     !linea.startsWith("*") &&
                     !/^\d+[°º]?\s*/.test(linea) &&
                     !/^[a-z]\)\s*/i.test(linea) &&
                     !/^\d+[.)]\s*/.test(linea) &&
                     (linea.endsWith(":") || 
                      normal.startsWith("requisitos") || 
                      normal.startsWith("nota") || 
                      normal.startsWith("traer los siguientes") || 
                      normal.startsWith("útiles") || 
                      normal.startsWith("utiles") || 
                      normal.startsWith("ventajas") || 
                      normal.startsWith("promoción") || 
                      normal.startsWith("modalidad de ingreso"));

    if (esHeader) {
      if (grupoActual && grupoActual.items.length > 0) {
        requisitosGrupos.push(grupoActual);
      }
      grupoActual = { titulo: linea.replace(/:$/, ""), items: [] };
    } else if (grupoActual) {
      // If it's a known footer or accept block, close the group
      if (normal.startsWith("costo:") || normal.startsWith("el almuerzo:") || normal.startsWith("acepto:") || normal.startsWith("entregar este formato") || normal.startsWith("atentamente")) {
        if (grupoActual.items.length > 0) {
          requisitosGrupos.push(grupoActual);
        }
        grupoActual = null;
        return;
      }
      
      const limpio = limpiarItem(linea);
      if (limpio) {
        grupoActual.items.push(limpio);
      }
    }
  });

  if (grupoActual && grupoActual.items.length > 0) {
    requisitosGrupos.push(grupoActual);
  }

  // Fallback to raw requirements field if no groups found
  if (requisitosGrupos.length === 0 && requisitosRaw) {
    const items = [];
    requisitosRaw.split("\n").forEach(linea => {
      const limpio = limpiarItem(linea);
      if (limpio && !limpio.toLowerCase().startsWith("requisitos")) {
        items.push(limpio);
      }
    });
    if (items.length > 0) {
      requisitosGrupos.push({ titulo: "Requisitos del Programa", items });
    }
  }

  return requisitosGrupos;
}

export function reemplazarSeccionesEnTexto(textoOriginal, nuevosRequisitos) {
  if (!textoOriginal) return "";
  let lineas = textoOriginal.split("\n");
  let desplazamiento = 0;
  
  // Index original headers and their line ranges
  const originalReqs = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].trim();
    const normal = l.toLowerCase();
    
    const esHeader = l && 
                     !l.startsWith("•") && 
                     !l.startsWith("-") && 
                     !l.startsWith("*") &&
                     !/^\d+[°º]?\s*/.test(l) &&
                     !/^[a-z]\)\s*/i.test(l) &&
                     !/^\d+[.)]\s*/.test(l) &&
                     (l.endsWith(":") || 
                      normal.startsWith("requisitos") || 
                      normal.startsWith("nota") || 
                      normal.startsWith("traer los siguientes") || 
                      normal.startsWith("útiles") || 
                      normal.startsWith("utiles") || 
                      normal.startsWith("ventajas") || 
                      normal.startsWith("promoción") || 
                      normal.startsWith("modalidad de ingreso"));

    if (esHeader) {
      let fin = -1;
      for (let j = i + 1; j < lineas.length; j++) {
        const jl = lineas[j].trim();
        const jnormal = jl.toLowerCase();
        
        const jesHeader = jl && 
                         !jl.startsWith("•") && 
                         !jl.startsWith("-") && 
                         !jl.startsWith("*") &&
                         !/^\d+[°º]?\s*/.test(jl) &&
                         !/^[a-z]\)\s*/i.test(jl) &&
                         !/^\d+[.)]\s*/.test(jl) &&
                         (jl.endsWith(":") || 
                          jnormal.startsWith("requisitos") || 
                          jnormal.startsWith("nota") || 
                          jnormal.startsWith("traer los siguientes") || 
                          jnormal.startsWith("útiles") || 
                          jnormal.startsWith("utiles") || 
                          jnormal.startsWith("ventajas") || 
                          jnormal.startsWith("promoción") || 
                          jnormal.startsWith("modalidad de ingreso"));

        const esSeccionCierre = jnormal.startsWith("costo:") || jnormal.startsWith("el almuerzo:") || jnormal.startsWith("acepto:") || jnormal.startsWith("entregar este formato") || jnormal.startsWith("atentamente");

        if (jesHeader || esSeccionCierre) {
          fin = j;
          break;
        }
      }
      if (fin === -1) fin = lineas.length;
      originalReqs.push({ titulo: l.replace(/:$/, ""), inicio: i, fin });
    }
  }

  // Replace groups in place
  nuevosRequisitos.forEach((nuevoGrupo, index) => {
    const original = originalReqs[index];
    if (original) {
      const start = original.inicio + desplazamiento;
      const end = original.fin + desplazamiento;
      
      const title = nuevoGrupo.titulo || lineas[start].replace(/:$/, "");
      const lineasGrupo = [
        title.endsWith(":") ? title : `${title}:`,
        ...nuevoGrupo.items.map((item, itemIdx) => {
          const titleLower = title.toLowerCase();
          if (titleLower.includes("nota 1") || titleLower.includes("nota 2") || titleLower.includes("nota 3")) {
            return `${itemIdx + 1}.\t${item}`;
          } else if (titleLower.includes("nota")) {
            const char = String.fromCharCode(97 + itemIdx);
            return `${char}) ${item}`;
          } else if (titleLower.includes("obtener")) {
            return `${itemIdx + 1}°\t${item}`;
          } else if (titleLower.includes("mantener")) {
            return `${itemIdx + 1})\t${item}`;
          } else {
            return `•\t${item}`;
          }
        })
      ];
      
      const removedCount = end - start;
      lineas.splice(start, removedCount, ...lineasGrupo);
      desplazamiento += lineasGrupo.length - removedCount;
    }
  });

  // Append new groups at the end (before acceptance if found)
  if (nuevosRequisitos.length > originalReqs.length) {
    const nuevosGruposAAppend = nuevosRequisitos.slice(originalReqs.length);
    nuevosGruposAAppend.forEach(grupo => {
      const title = grupo.titulo || "Información Adicional";
      const lineasGrupo = [
        "",
        title.endsWith(":") ? title : `${title}:`,
        ...grupo.items.map(item => `•\t${item}`)
      ];
      
      const idxAcepto = lineas.findIndex(l => l.toLowerCase().trim().startsWith("acepto:") || l.toLowerCase().trim().startsWith("entregar este formato"));
      if (idxAcepto !== -1) {
        lineas.splice(idxAcepto, 0, ...lineasGrupo);
      } else {
        lineas.push(...lineasGrupo);
      }
    });
  }

  return lineas.join("\n");
}

export function serializeStructuredToText(cuerpo, requisitosGrupos) {
  let text = cuerpo || "";

  if (requisitosGrupos && requisitosGrupos.length > 0) {
    requisitosGrupos.forEach(grupo => {
      text += `\n\n${grupo.titulo || "Requisitos"}:\n`;
      grupo.items.forEach(item => {
        text += `•\t${item}\n`;
      });
    });
  }

  return text.trim();
}

function SeccionRequisitosMateriales({ form, actualizarForm }) {
  const isLocalChangeRef = useRef(false);

  // Initialize once on mount
  const initialParsed = useMemo(() => {
    return parseStructuredSections(form.comunicadoCompleto, form.requisitos);
  }, []);

  const [requisitosGrupos, setRequisitosGrupos] = useState(initialParsed);
  const [esModoEstructurado, setEsModoEstructurado] = useState(initialParsed.length > 0);

  // Sync state if form changes externally (e.g. program ID changes or templates change)
  useEffect(() => {
    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }
    const parsed = parseStructuredSections(form.comunicadoCompleto, form.requisitos);
    setRequisitosGrupos(parsed);
    setEsModoEstructurado(parsed.length > 0);
  }, [form.id, form.tipoComunicado, form.plantilla]);

  const sincronizar = (nuevosReqs) => {
    isLocalChangeRef.current = true;
    
    let nuevoCompleto = "";
    if (form.comunicadoCompleto) {
      nuevoCompleto = reemplazarSeccionesEnTexto(form.comunicadoCompleto, nuevosReqs);
    } else {
      nuevoCompleto = serializeStructuredToText(form.comunicado || "", nuevosReqs);
    }

    const nuevoRequisitosText = nuevosReqs.flatMap(g => g.items.map(i => `•\t${i}`)).join("\n");

    actualizarForm({
      comunicadoCompleto: nuevoCompleto,
      requisitos: nuevoRequisitosText
    });
  };

  // requirement groups handlers
  const handleGroupTitleChange = (groupIdx, value) => {
    const updated = [...requisitosGrupos];
    updated[groupIdx].titulo = value;
    setRequisitosGrupos(updated);
    sincronizar(updated);
  };

  const handleGroupItemChange = (groupIdx, itemIdx, value) => {
    const updated = [...requisitosGrupos];
    updated[groupIdx].items[itemIdx] = value;
    setRequisitosGrupos(updated);
    sincronizar(updated);
  };

  const handleAddGroupItem = (groupIdx) => {
    const updated = [...requisitosGrupos];
    updated[groupIdx].items.push("");
    setRequisitosGrupos(updated);
    sincronizar(updated);
  };

  const handleRemoveGroupItem = (groupIdx, itemIdx) => {
    const updated = [...requisitosGrupos];
    updated[groupIdx].items.splice(itemIdx, 1);
    setRequisitosGrupos(updated);
    sincronizar(updated);
  };

  const handleAddGroup = () => {
    const updated = [...requisitosGrupos, { titulo: "Requisitos adicionales", items: [""] }];
    setRequisitosGrupos(updated);
    sincronizar(updated);
  };

  const handleRemoveGroup = (groupIdx) => {
    const updated = [...requisitosGrupos];
    updated.splice(groupIdx, 1);
    setRequisitosGrupos(updated);
    sincronizar(updated);
  };

  return (
    <section className="coord-form-section" style={{ borderLeft: "4px solid #0d9488", paddingLeft: "12px" }}>
      <div className="coord-section-heading" style={{ marginBottom: "16px" }}>
        <BookOpen size={18} style={{ color: "#0d9488" }} />
        <div>
          <h3 style={{ color: "#0f766e" }}>Requisitos y materiales</h3>
        </div>
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
            background: !esModoEstructurado ? "#0d9488" : "#ffffff",
            color: !esModoEstructurado ? "#ffffff" : "#4b5563",
            borderColor: !esModoEstructurado ? "#0d9488" : "#cbd5e1",
            transition: "all 0.2s"
          }}
        >
          Texto Plano (Sencillo)
        </button>
        <button
          type="button"
          onClick={() => {
            setEsModoEstructurado(true);
            const parsed = parseStructuredSections(form.comunicadoCompleto, form.requisitos);
            setRequisitosGrupos(parsed);
            sincronizar(parsed);
          }}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1px solid",
            cursor: "pointer",
            background: esModoEstructurado ? "#0d9488" : "#ffffff",
            color: esModoEstructurado ? "#ffffff" : "#4b5563",
            borderColor: esModoEstructurado ? "#0d9488" : "#cbd5e1",
            transition: "all 0.2s"
          }}
        >
          Secciones Estructuradas (Por Bloques)
        </button>
      </div>

      <div className="coord-section-grid">
        {!esModoEstructurado ? (
          /* Simple Plain Text Area */
          <div className="coord-field coord-field-full">
            <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>
              Lista de útiles / requisitos (editable)
            </label>
            <textarea
              value={form.requisitos || ""}
              onChange={e => actualizarForm("requisitos", e.target.value)}
              placeholder="Escriba los materiales, útiles o requisitos necesarios para el programa..."
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                resize: "vertical"
              }}
            />
          </div>
        ) : (
          /* Structured Sections Editor */
          <div className="coord-field coord-field-full" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* UNIFIED REQUISITOS POR GRUPOS */}
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0f766e" }}>
                  <CheckboxIcon size={18} />
                  <strong style={{ fontSize: "13.5px" }}>Bloques de Información (Requisitos, Útiles y Notas)</strong>
                </div>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: "#e6fffa",
                    border: "1px solid #319795",
                    borderRadius: "4px",
                    color: "#319795",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  <Plus size={12} /> Agregar bloque
                </button>
              </div>

              {requisitosGrupos.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "8px 0" }}>
                  No hay bloques definidos. Agregue bloques para detallar Requisitos, Útiles o Notas.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {requisitosGrupos.map((grupo, gIdx) => (
                    <div
                      key={gIdx}
                      style={{
                        background: "#ffffff",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                        <input
                          value={grupo.titulo}
                          onChange={(e) => handleGroupTitleChange(gIdx, e.target.value)}
                          placeholder="Título del bloque: Ej. Requisitos para la beca / Traer útiles / Notas"
                          style={{
                            flex: 1,
                            fontWeight: "bold",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "12.5px"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(gIdx)}
                          title="Eliminar bloque completo"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "4px"
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      {/* Items inside group */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "12px" }}>
                        {grupo.items.map((item, iIdx) => (
                          <div key={iIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{iIdx + 1}.</span>
                            <input
                              value={item}
                              onChange={(e) => handleGroupItemChange(gIdx, iIdx, e.target.value)}
                              placeholder={`Punto ${iIdx + 1}`}
                              style={{
                                flex: 1,
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "12px"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveGroupItem(gIdx, iIdx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: "2px"
                              }}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddGroupItem(gIdx)}
                          style={{
                            alignSelf: "flex-start",
                            background: "none",
                            border: "none",
                            color: "#0d9488",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px"
                          }}
                        >
                          <Plus size={11} /> Agregar punto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#475569", background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px" }}>
              <InfoCircle size={14} style={{ color: "#475569", flexShrink: 0 }} />
              <span>Los cambios estructurados se sincronizan automáticamente con el cuerpo completo del documento.</span>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}

export default SeccionRequisitosMateriales;
