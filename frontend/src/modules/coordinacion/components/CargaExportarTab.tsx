import React from "react";
import {
  IconDownload as Download,
  IconFileSpreadsheet as FileSpreadsheet,
  IconLoader2 as Loader2,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";

interface Programa {
  id: string;
  nombre: string;
}

interface EstadisticasExportarType {
  total: number;
  conApoderado: number;
  sinApoderado: number;
}

interface CargaExportarTabProps {
  seleccionExportarId: string;
  setSeleccionExportarId: (val: string) => void;
  programasCarga: Programa[];
  cargandoInvitados: boolean;
  estadisticasExportar: EstadisticasExportarType;
  descargarFichasExportarTab: () => void;
  exportando: boolean;
}

export default function CargaExportarTab({
  seleccionExportarId,
  setSeleccionExportarId,
  programasCarga,
  cargandoInvitados,
  estadisticasExportar,
  descargarFichasExportarTab,
  exportando,
}: CargaExportarTabProps) {
  return (
    <div style={{ animation: "coord-fade-in 0.25s ease" }}>
      <div className="coord-form-group-green">
        <label htmlFor="coord-exportar-programa">
          <FileSpreadsheet size={16} />
          Taller / Programa a exportar
        </label>
        <select
          id="coord-exportar-programa"
          value={seleccionExportarId}
          onChange={(event) => setSeleccionExportarId(event.target.value)}
        >
          <option value="all">Todos los talleres</option>
          {programasCarga.map((programa) => (
            <option key={programa.id} value={programa.id}>
              {programa.id} - {programa.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="coord-counter-grid">
        <div className="coord-counter-item">
          <div className="coord-counter-num">{cargandoInvitados ? "..." : estadisticasExportar.total}</div>
          <div className="coord-counter-label">👥 Total alumnos</div>
        </div>
        <div className="coord-counter-item coord-counter-green">
          <div className="coord-counter-num">{cargandoInvitados ? "..." : estadisticasExportar.total}</div>
          <div className="coord-counter-label">📄 Fichas a generar</div>
        </div>
        <div className="coord-counter-item coord-counter-warning">
          <div className="coord-counter-num">
            {cargandoInvitados ? "..." : seleccionExportarId === "all" ? programasCarga.length : 1}
          </div>
          <div className="coord-counter-label">📋 Talleres incluidos</div>
        </div>
      </div>

      <div className="coord-export-actions">
        <button
          className="coord-btn-full coord-btn-validate"
          type="button"
          onClick={descargarFichasExportarTab}
          disabled={exportando || cargandoInvitados || estadisticasExportar.total === 0}
        >
          {exportando ? <Loader2 className="coord-spin" size={17} /> : <Download size={17} />}
          <span>{exportando ? "Generando PDF..." : "Exportar PDF Único"}</span>
        </button>
      </div>

      <div className="coord-note-box">
        <InfoCircle size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
        Las fichas se rellenarán automáticamente con los nombres y grados de los alumnos. El campo{" "}
        <strong>apoderado</strong> quedará en blanco si el estudiante no tiene un apoderado previamente registrado en el
        sistema.
      </div>
    </div>
  );
}
