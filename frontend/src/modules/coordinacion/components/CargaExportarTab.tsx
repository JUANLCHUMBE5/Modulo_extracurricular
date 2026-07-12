import React, { useState } from "react";
import {
  IconDownload as Download,
  IconFileSpreadsheet as FileSpreadsheet,
  IconLoader2 as Loader2,
  IconInfoCircle as InfoCircle,
  IconUpload as Upload,
} from "@tabler/icons-react";
import { leerPlantillaWord, extraerDatosProgramaDesdeWord } from "../utils/wordTemplateUtils";

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
  const [arrastrando, setArrastrando] = useState(false);
  const [cargandoFile, setCargandoFile] = useState(false);

  const procesarArchivoWord = async (archivo: File) => {
    if (!archivo) return;
    setCargandoFile(true);
    try {
      const lectura = await leerPlantillaWord(archivo, { validarVariables: false });
      const { textoPlano } = lectura;
      const datos = extraerDatosProgramaDesdeWord(textoPlano, archivo.name);
      
      if (datos.nombre) {
        const nombreBuscado = String(datos.nombre).toLowerCase().trim();
        
        let match = programasCarga.find((p) => {
          const nombreProg = String(p.nombre).toLowerCase().trim();
          return nombreProg === nombreBuscado || nombreProg.includes(nombreBuscado) || nombreBuscado.includes(nombreProg);
        });

        if (match) {
          setSeleccionExportarId(match.id);
        } else {
          alert(`No se encontró un taller registrado con el nombre detectado: "${datos.nombre}"`);
        }
      } else {
        alert("No se pudo detectar el nombre del taller en el documento.");
      }
    } catch (e: any) {
      alert(`Error al leer el archivo: ${e.message || e}`);
    } finally {
      setCargandoFile(false);
    }
  };

  return (
    <div style={{ animation: "coord-fade-in 0.25s ease" }}>
      {/* Zona de Arrastre para Autodetectar Taller */}
      <div 
        className={`coord-dropzone-export ${arrastrando ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (e.dataTransfer.files?.[0]) {
            procesarArchivoWord(e.dataTransfer.files[0]);
          }
        }}
        style={{
          border: "2.5px dashed #cbd5df",
          borderRadius: "10px",
          padding: "24px 16px",
          textAlign: "center",
          background: arrastrando ? "#f1f8e9" : "#f8fafc",
          borderColor: arrastrando ? "#4caf50" : "#cbd5df",
          cursor: "pointer",
          marginBottom: "20px",
          transition: "all 0.25s ease",
          boxShadow: arrastrando ? "0 4px 12px rgba(76, 175, 80, 0.12)" : "none",
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".docx";
          input.onchange = (e: any) => {
            if (e.target.files?.[0]) {
              procesarArchivoWord(e.target.files[0]);
            }
          };
          input.click();
        }}
      >
        {cargandoFile ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#2e7d32" }}>
            <Loader2 className="coord-spin" size={26} />
            <strong style={{ fontSize: "14px", fontWeight: "600" }}>Analizando documento...</strong>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <Upload size={26} style={{ color: arrastrando ? "#4caf50" : "#7b8794", transition: "color 0.2s" }} />
            <strong style={{ fontSize: "14px", color: "#334155" }}>Arrastra aquí el Word del Taller</strong>
            <span style={{ fontSize: "12px", color: "#64748b" }}>o haz clic para seleccionar tu archivo (.docx) para auto-seleccionar</span>
          </div>
        )}
      </div>

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
