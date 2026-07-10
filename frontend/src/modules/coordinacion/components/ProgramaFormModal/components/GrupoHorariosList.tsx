import {
  IconX as X,
  IconEdit as Edit3,
  IconCopy as CopyIcon,
} from "@tabler/icons-react";
import { formatearHora12 } from "../../../utils/coordinacionFormatters";
import { resumenGrados } from "../../../utils/coordinacionProgramUtils";

interface GrupoHorariosListProps {
  formHorariosPorGrupo: any[];
  agregarGrupoHorario: (grupo: any) => void;
  iniciarEdicionGrupo: (index: number, grupo: any) => void;
  quitarGrupoHorario: (index: number) => void;
}

function obtenerNiveles(grados: any[]) {
  if (!grados || !grados.length) return "—";
  const niveles = Array.from(new Set(grados.map(g => String(g).split(":")[0]))).filter(Boolean);
  return niveles.join(", ");
}

function obtenerGradosSolo(grados: any[]) {
  if (!grados || !grados.length) return "—";
  const items = grados.map(g => {
    const parts = String(g).split(":");
    const grade = parts[1] || "";
    return grade.replace(/\s*años?/i, "").trim();
  });
  return Array.from(new Set(items)).join(", ");
}

export default function GrupoHorariosList({
  formHorariosPorGrupo,
  agregarGrupoHorario,
  iniciarEdicionGrupo,
  quitarGrupoHorario,
}: GrupoHorariosListProps) {
  return (
    <div className="coord-field coord-field-full coord-block-form-panel" style={{ marginTop: "4px" }}>
      <div className="coord-group-schedule-head" style={{ marginBottom: "12px" }}>
        <strong>Horarios por grado/bloque/docente</strong>
      </div>
      {formHorariosPorGrupo.length ? (
        <div className="coord-group-schedule-list coord-group-schedule-list-compact">
          {formHorariosPorGrupo.map((grupo, index) => (
            <div className="coord-group-schedule coord-group-schedule-compact" key={grupo.id || index}>
              <strong className="coord-group-schedule-badge">Grupo {index + 1}</strong>
              <div className="coord-group-schedule-cell">
                <span>Nivel</span>
                <p>{obtenerNiveles(grupo.grados || [])}</p>
              </div>
              <div className="coord-group-schedule-cell">
                <span>Grados</span>
                <p>{obtenerGradosSolo(grupo.grados || [])}</p>
              </div>
              <div className="coord-group-schedule-cell">
                <span>Días</span>
                <p>{grupo.dia || "Sin día"}</p>
              </div>
              <div className="coord-group-schedule-cell">
                <span>Almuerzo</span>
                <p>{grupo.almuerzoInicio && grupo.almuerzoFin ? `${formatearHora12(grupo.almuerzoInicio)} a ${formatearHora12(grupo.almuerzoFin)}` : "No incluye"}</p>
              </div>
              <div className="coord-group-schedule-cell">
                <span>Clase</span>
                <p>{formatearHora12(grupo.horaInicio || "15:20")} a {formatearHora12(grupo.horaFin || "17:20")}</p>
              </div>
              <div className="coord-group-schedule-cell">
                <span>Docente / aula</span>
                <p>{[grupo.responsable, grupo.tutora, grupo.aula ? `Aula: ${grupo.aula}` : ""].filter(Boolean).join(" · ") || "Sin docente"}</p>
              </div>
              <div className="coord-group-schedule-cell" style={{ maxWidth: "80px" }}>
                <span>Cupos</span>
                <p>{grupo.cupos || 20}</p>
              </div>
              <div className="coord-group-actions">
                <button
                  type="button"
                  className="coord-duplicate-btn"
                  onClick={() => {
                    const copia = { ...grupo, id: `grupo-${Date.now()}-${Math.random().toString(16).slice(2, 6)}` };
                    agregarGrupoHorario(copia);
                  }}
                  title="Duplicar bloque"
                >
                  <CopyIcon size={14} />
                </button>
                <button
                  type="button"
                  className="coord-edit-btn"
                  onClick={() => iniciarEdicionGrupo(index, grupo)}
                  aria-label="Editar grupo"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="coord-delete-btn"
                  onClick={() => quitarGrupoHorario(index)}
                  aria-label="Quitar grupo"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "20px",
            border: "1px dashed #cbd5e1",
            borderRadius: "8px",
            color: "#667085",
            textAlign: "center",
            background: "#f8fafc"
          }}
        >
          Aún no se han configurado bloques de horarios. Agregue uno usando el botón "+ Añadir bloque" de arriba.
        </div>
      )}
    </div>
  );
}
