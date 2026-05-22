import { useState } from "react";

function normalizarSeleccion(seleccionados) {
  if (!Array.isArray(seleccionados)) return [];
  return seleccionados
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function GradeSelector({ niveles, seleccionados, onToggle }) {
  const nivelesSeguros = Array.isArray(niveles) ? niveles : [];
  const seleccionadosSeguros = normalizarSeleccion(seleccionados);
  const [nivelesAbiertos, setNivelesAbiertos] = useState(["Primaria"]);

  function alternarNivel(nivel) {
    setNivelesAbiertos((actuales) => {
      if (actuales.includes(nivel)) {
        return actuales.filter((item) => item !== nivel);
      }
      return [...actuales, nivel];
    });
  }

  return (
    <div className="coord-grade-selector">
      {nivelesSeguros.map(({ nivel, grados }) => {
        const abierto = nivelesAbiertos.includes(nivel);
        return (
        <div className={`coord-grade-group ${abierto ? "is-open" : ""}`} key={nivel}>
          <button
            type="button"
            className="coord-grade-summary"
            onClick={() => alternarNivel(nivel)}
          >
            <span>{nivel}</span>
            <strong>{seleccionadosSeguros.filter((item) => item.startsWith(`${nivel}:`)).length}</strong>
          </button>
          {abierto ? (
            <div className="coord-grade-options">
            {(Array.isArray(grados) ? grados : []).map((grado) => {
              const valor = `${nivel}:${grado}`;
              const seleccionado = seleccionadosSeguros.includes(valor);
              return (
                <label
                  className={`coord-grade-chip ${seleccionado ? "is-selected" : ""}`}
                  key={valor}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={seleccionado}
                    onChange={() => onToggle?.(valor)}
                  />
                  <span>{etiquetaGradoCorta(grado)}</span>
                </label>
              );
            })}
            </div>
          ) : null}
        </div>
        );
      })}
    </div>
  );
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}

export default GradeSelector;
