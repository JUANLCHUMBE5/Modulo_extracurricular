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
      <div className="coord-table-schedule" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {bloques.map((bloque, index) => {
          const matchDeportivo = String(bloque).trim().match(/^(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo):\s*(.+)$/i);
          if (matchDeportivo) {
            return (
              <div key={index} style={{ fontSize: "11px", color: "var(--coord-ink)", lineHeight: "1.3" }}>
                <strong style={{ color: "var(--coord-ink)", fontWeight: "750" }}>
                  {matchDeportivo[1]}:
                </strong>{" "}
                <span style={{ color: "var(--coord-ink)" }}>{matchDeportivo[2]}</span>
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
            {item.almuerzoInicio ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <span style={{
                  fontWeight: "750",
                  color: "#006b5b",
                  background: "#e6f4ea",
                  padding: "0 3px",
                  borderRadius: "3px",
                  fontSize: "9px",
                  textTransform: "uppercase",
                  lineHeight: "1.2"
                }}>Alm</span>
                {item.almuerzoInicio}
              </span>
            ) : null}
            {item.almuerzoInicio && item.claseInicio ? <span style={{ color: "#cbd5e1" }}>|</span> : null}
            {item.claseInicio ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <span style={{
                  fontWeight: "750",
                  color: "#1e3a8a",
                  background: "#eff6ff",
                  padding: "0 3px",
                  borderRadius: "3px",
                  fontSize: "9px",
                  textTransform: "uppercase",
                  lineHeight: "1.2"
                }}>Clase</span>
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
  if (partes.length > 1) {
    return (
      <div className="coord-table-small-text" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {partes.map((p, idx) => (
          <div key={idx} style={{ lineHeight: "1.4" }}>
            • {p}
          </div>
        ))}
      </div>
    );
  }
  return <span className="coord-table-small-text" style={{ lineHeight: "1.4" }}>{grados}</span>;
}

function VigenciaTabla({ inicio, fin, duracion, avisoDias }) {
  const duracionTexto = duracion || calcularDuracionTexto(inicio, fin);
  const diasAviso = normalizarDuracionAvisoDias(avisoDias, 7);
  return (
    <div className="coord-table-date">
      <span className="coord-date-range">{formatearFechaCorta(inicio)} al {formatearFechaCorta(fin)}</span>
      <small className="coord-date-details">
        {duracionTexto ? `${duracionTexto} · ` : ""}Aviso {diasAviso} d.
      </small>
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
