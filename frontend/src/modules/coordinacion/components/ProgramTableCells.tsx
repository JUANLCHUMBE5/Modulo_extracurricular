import { calcularDuracionTexto, normalizarDuracionAvisoDias } from "../../../services/dateService";

function abreviarDias(texto) {
  return String(texto || "")
    .replace(/\bLunes\b/gi, "L")
    .replace(/\bMartes\b/gi, "M")
    .replace(/\bMi[eé]rcoles\b/gi, "Mi")
    .replace(/\bJueves\b/gi, "J")
    .replace(/\bViernes\b/gi, "V")
    .replace(/\bS[aá]bado\b/gi, "S")
    .replace(/\bDomingo\b/gi, "D");
}

function extraerGradosYDia(diaOriginal) {
  const limpio = String(diaOriginal || "").trim();
  const match = limpio.match(/^(.*?):\s*\b(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\b/i);
  if (match) {
    return {
      gradosRaw: match[1].trim(),
      dia: match[2].trim()
    };
  }

  // Validar si el texto contiene algún día de la semana
  const matchSoloDia = limpio.match(/\b(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\b/i);
  if (matchSoloDia) {
    return {
      gradosRaw: "",
      dia: limpio
    };
  }

  return {
    gradosRaw: "",
    dia: ""
  };
}

function separarClaseYAula(claseOriginal) {
  const limpio = String(claseOriginal || "").trim();
  const match = limpio.match(/^(.*?)\s*·\s*(Aula\s+.*)$/i);
  if (match) {
    return {
      claseTime: match[1].trim(),
      aula: match[2].trim()
    };
  }
  return {
    claseTime: limpio,
    aula: ""
  };
}

function formatearAulas(aulas) {
  const numeros = [...new Set(
    aulas
      .map((a) => String(a).replace(/Aula\s+/i, "").trim())
      .filter(Boolean)
  )];
  if (numeros.length === 0) return "";
  if (numeros.length === 1) return ` · Aula ${numeros[0]}`;
  return ` · Aulas: ${numeros.join(", ")}`;
}

function obtenerHoraInicio(timeStr) {
  const limpio = String(timeStr || "").trim();
  if (!limpio) return "";
  return limpio.split("-")[0].trim();
}

function simplificarYAgruparEtiquetas(labels: string[]): string {
  const grupos: { [base: string]: string[] } = {};
  const orden: string[] = [];

  labels.forEach((label) => {
    const base = label
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\([^)]+\)/g, "")
      .trim();

    const matchParentesis = label.match(/\(([^)]+)\)/);
    const edad = matchParentesis ? matchParentesis[1].trim() : "";

    if (!base) return;

    if (!grupos[base]) {
      grupos[base] = [];
      orden.push(base);
    }
    if (edad && !grupos[base].includes(edad)) {
      grupos[base].push(edad);
    }
  });

  return orden
    .map((base) => {
      const edades = grupos[base];
      if (edades.length === 0) return base;
      return `${base} (${edades.join(", ")})`;
    })
    .join(", ");
}

function HorarioTabla({ programa }) {
  const texto = String(programa?.horario || "").trim();
  if (!texto || texto.toLowerCase() === "por definir") {
    return <span className="coord-table-small-text">Por definir</span>;
  }

  const bloques = texto.split(/\s*\/\s*/g).filter(Boolean);
  const gruposMap = {};

  bloques.forEach((bloque) => {
    const partes = dividirHorarioTabla(bloque);
    const { dia } = extraerGradosYDia(partes.dia);

    // Si no hay un día válido en el bloque, se ignora por completo (evitando dangling colons o vacíos)
    if (!dia) return;

    const { claseTime } = separarClaseYAula(partes.clase);
    const almuerzoInicio = obtenerHoraInicio(partes.almuerzo);
    const claseInicio = obtenerHoraInicio(claseTime);

    // Si no tiene ni hora de almuerzo ni hora de clase, se ignora
    if (!almuerzoInicio && !claseInicio) return;

    const key = `${almuerzoInicio} | ${claseInicio}`;
    if (!gruposMap[key]) {
      gruposMap[key] = {
        almuerzoInicio,
        claseInicio,
        diasSet: new Set()
      };
    }

    const diaAbreviado = abreviarDias(dia);
    diaAbreviado.split(",").forEach((d) => {
      const dLimpio = d.trim();
      if (dLimpio) gruposMap[key].diasSet.add(dLimpio);
    });
  });

  const listaAgrupada = Object.values(gruposMap);
  if (listaAgrupada.length === 0) {
    return (
      <div className="coord-table-schedule" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {bloques.map((bloque, index) => {
          // Check if block matches "Days: Sport: Time, Sport: Time" format
          const dayMatch = String(bloque).trim().match(/^(.*?(?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo).*?)\s*:\s*(.*)$/i);
          if (dayMatch) {
            const dias = dayMatch[1].trim();
            const rest = dayMatch[2].trim();
            
            // Extract all Sport: Time pairs
            const itemRegex = /([^:,]+?)\s*:\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/g;
            let m;
            const items: { label: string, time: string }[] = [];
            while ((m = itemRegex.exec(rest)) !== null) {
              const label = m[1].replace(/^[\s,]+|[\s,]+$/g, "").trim();
              items.push({
                label,
                time: m[2].trim()
              });
            }

            if (items.length > 0) {
              const timeGroups: { [time: string]: string[] } = {};
              const timeOrder: string[] = [];
              items.forEach(item => {
                if (!timeGroups[item.time]) {
                  timeGroups[item.time] = [];
                  timeOrder.push(item.time);
                }
                timeGroups[item.time].push(item.label);
              });

              return (
                <div key={index} style={{ marginBottom: "6px", fontSize: "11px", lineHeight: "1.4" }}>
                  <strong style={{ color: "var(--coord-ink)", fontWeight: "750", display: "block" }}>
                    {dias}
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "2px" }}>
                    {timeOrder.map((time, tIdx) => (
                      <div key={tIdx} style={{ paddingLeft: "4px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            color: "#1e3a8a",
                            background: "#eff6ff",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "600"
                          }}>
                            {time}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "10px" }}>
                            • {simplificarYAgruparEtiquetas(timeGroups[time])}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          }

          // Fallback to original block parsing
          const matchHora = String(bloque).match(/(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
          let hora = "";
          let resto = String(bloque);
          if (matchHora) {
            hora = matchHora[1].trim();
            resto = String(bloque).replace(matchHora[0], "").trim();
            resto = resto.replace(/:\s*$/, "").trim();
          }

          const indexColon = resto.indexOf(':');
          let dias = resto;
          let detalle = "";
          if (indexColon !== -1) {
            dias = resto.substring(0, indexColon).trim();
            detalle = resto.substring(indexColon + 1).trim();
          }

          if (dias && hora) {
            return (
              <div key={index} style={{ marginBottom: "2px", fontSize: "11px", lineHeight: "1.4" }}>
                <strong style={{ color: "var(--coord-ink)", fontWeight: "750", display: "block" }}>
                  {dias}
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{
                    color: "#1e3a8a",
                    background: "#eff6ff",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "600"
                  }}>
                    {hora}
                  </span>
                  {detalle && (
                    <span style={{ color: "#64748b", fontSize: "10px" }}>
                      • {detalle}
                    </span>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={index} style={{ fontSize: "11px", color: "var(--coord-ink)", lineHeight: "1.3" }}>
              {bloque.trim()}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="coord-table-schedule" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {listaAgrupada.map((item, index) => {
        const ordenDias = ["L", "M", "Mi", "J", "V", "S", "D"];
        const diasArray = [...item.diasSet].sort((a, b) => ordenDias.indexOf(a) - ordenDias.indexOf(b));
        const diasTexto = diasArray.join(", ");

        return (
          <div key={index} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--coord-ink)", lineHeight: "1.3" }}>
            <strong style={{ color: "var(--coord-ink)", fontWeight: "750" }}>
              {diasTexto}:
            </strong>
            {item.claseInicio ? (
              <span style={{
                color: "#1e3a8a",
                background: "#eff6ff",
                padding: "1px 5px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "600"
              }}>
                {item.claseInicio}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AulasTabla({ programa }) {
  const texto = String(programa?.horario || "").trim();
  if (!texto || texto.toLowerCase() === "por definir") {
    return <span className="coord-table-small-text">Por definir</span>;
  }

  const bloques = texto.split(/\s*\/\s*/g).filter(Boolean);
  const aulasSet = new Set();

  bloques.forEach((bloque) => {
    const partes = dividirHorarioTabla(bloque);
    const { dia } = extraerGradosYDia(partes.dia);

    // Si el bloque no tiene un día válido, se ignora
    if (!dia) return;

    const { aula } = separarClaseYAula(partes.clase);
    if (aula) {
      const numAulas = aula.replace(/Aulas?:/i, "").replace(/Aula\s+/i, "").trim();
      numAulas.split(",").forEach((a) => {
        const aLimpia = a.trim();
        if (aLimpia) aulasSet.add(aLimpia);
      });
    }
  });

  const listaAulas = [...aulasSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (listaAulas.length === 0) {
    return <span className="coord-table-small-text">Por definir</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {listaAulas.map((aulaNum, idx) => (
        <span
          key={idx}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 6px",
            background: "#f1f5f9",
            color: "#475569",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
            border: "1px solid #e2e8f0"
          }}
        >
          Aula {aulaNum}
        </span>
      ))}
    </div>
  );
}

function GradosTabla({ programa }) {
  const grados = programa?.grupo || resumenGradosDesdeValores(programa?.gradosAplicables || []);
  if (!grados) return <span className="coord-table-small-text">Por definir</span>;

  const partes = String(grados).split(/\s*\/\s*/g).filter(Boolean);
  
  // Group sports/levels by age ranges
  const groups: { [key: string]: string[] } = {};
  const order: string[] = [];

  partes.forEach(p => {
    const cleanP = p.trim();
    // Match something like "Fútbol [Formativo] (6-9 años)"
    const match = cleanP.match(/^(.*?)\s*(\([^)]+\))$/);
    if (match) {
      const key = match[1].trim();
      const ageRange = match[2].trim();
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(ageRange);
    } else {
      order.push(cleanP);
    }
  });

  const finalPartes: string[] = [];
  const processedKeys = new Set<string>();

  order.forEach(item => {
    if (groups[item]) {
      if (!processedKeys.has(item)) {
        processedKeys.add(item);
        const combinedAgeRanges = groups[item].join("-");
        finalPartes.push(`${item} ${combinedAgeRanges}`);
      }
    } else {
      finalPartes.push(item);
    }
  });

  if (finalPartes.length > 1) {
    return (
      <div className="coord-table-small-text" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {finalPartes.map((p, idx) => (
          <div key={idx} style={{ lineHeight: "1.4" }}>
            • {p}
          </div>
        ))}
      </div>
    );
  }
  return <span className="coord-table-small-text" style={{ lineHeight: "1.4" }}>{finalPartes[0] || grados}</span>;
}

function VigenciaTabla({ inicio, fin, duracion, avisoDias }) {
  const duracionTexto = duracion || calcularDuracionTexto(inicio, fin);
  return (
    <div className="coord-table-date" style={{ display: "flex", flexDirection: "column", gap: "1px", lineHeight: "1.25" }}>
      <span style={{ fontWeight: 600, color: "var(--coord-ink)", fontSize: "12px" }}>{formatearFechaCorta(inicio)}</span>
      <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 500, paddingLeft: "2px" }}>al</span>
      <span style={{ fontWeight: 600, color: "var(--coord-ink)", fontSize: "12px" }}>{formatearFechaCorta(fin)}</span>
      {duracionTexto && (
        <small className="coord-date-details" style={{ fontSize: "10.5px", marginTop: "2px", fontWeight: 500 }}>
          {duracionTexto}
        </small>
      )}
    </div>
  );
}

function CuposTabla({ programa }) {
  return (
    <div className="coord-table-cupos">
      <span>{programa.cuposOcupados || 0}/{programa.cupos || 0}</span>
      <div>
        <i style={{ width: `${calcularPorcentajeCupos(programa)}%` }} />
      </div>
    </div>
  );
}

function dividirHorarioTabla(bloque) {
  const texto = String(bloque || "").trim();
  const match = texto.match(/^(.*?)(?:\s+almuerzo\s+([^,]+))?(?:,\s*clase\s+(.+))?$/i);
  if (!match) return { dia: texto, almuerzo: "", clase: "" };

  let dia = (match[1] || texto).trim();
  // Limpia cualquier texto sobrante al final del dia
  dia = dia.replace(/\s*clase\s*$/i, "").replace(/[\s·,:]+$/, "").trim();

  return {
    dia,
    almuerzo: (match[2] || "").trim(),
    clase: (match[3] || "").trim(),
  };
}

function resumenGradosDesdeValores(grados) {
  if (!grados.length) return "";
  const niveles = ["Inicial", "Primaria", "Secundaria"];
  return niveles
    .map((nivel) => {
      const items = grados
        .filter((item) => item.startsWith(`${nivel}:`))
        .map((item) => etiquetaGradoCorta(item.split(":")[1]));
      return items.length ? `${nivel}: ${items.join(", ")}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}

function formatearFechaCorta(valor) {
  if (!valor) return "Sin fecha";
  const partes = String(valor).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return valor;
}

function calcularPorcentajeCupos(prog) {
  const cupos = Number(prog.cupos || 0);
  if (cupos <= 0) return 0;
  return Math.min(100, Math.round((Number(prog.cuposOcupados || 0) / cupos) * 100));
}

export { HorarioTabla, GradosTabla, VigenciaTabla, CuposTabla, AulasTabla };
