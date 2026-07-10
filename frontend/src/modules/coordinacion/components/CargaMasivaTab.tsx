import {
  IconFileSpreadsheet as FileSpreadsheet,
  IconCloudUpload as CloudUpload,
  IconCircleCheck as CheckCircle2,
  IconX as X,
  IconInfoCircle as InfoCircle,
  IconLoader2 as Loader2,
} from "@tabler/icons-react";
import { obtenerResumenArchivos } from "../utils/cargaExcelHelpers";

interface Programa {
  id: string;
  nombre: string;
}

interface CargaMasivaTabProps {
  programaCargaId: string;
  setProgramaCargaId: (val: string) => void;
  programasCarga: Programa[];
  setPreviewCarga: (val: any) => void;
  setProgresoCarga: (val: any) => void;
  setMensaje: (val: string) => void;
  archivoInputKey: string | number;
  archivosExcel: File[];
  setArchivosExcel: (val: File[]) => void;
  cancelarCargaExcel: () => void;
  previewCarga: any;
  generarPreviewExcel: () => void;
  cargandoPreview: boolean;
  confirmarCargaExcel: () => void;
  confirmandoCarga: boolean;
}

export default function CargaMasivaTab({
  programaCargaId,
  setProgramaCargaId,
  programasCarga,
  setPreviewCarga,
  setProgresoCarga,
  setMensaje,
  archivoInputKey,
  archivosExcel,
  setArchivosExcel,
  cancelarCargaExcel,
  previewCarga,
  generarPreviewExcel,
  cargandoPreview,
  confirmarCargaExcel,
  confirmandoCarga,
}: CargaMasivaTabProps) {
  return (
    <div style={{ animation: "coord-fade-in 0.25s ease" }}>
      {/* Selector de programa */}
      <div className="coord-form-group-green">
        <label htmlFor="coord-programa-carga-masiva">
          <FileSpreadsheet size={16} />
          Código del programa o curso
        </label>
        <select
          id="coord-programa-carga-masiva"
          value={programaCargaId}
          onChange={(event) => {
            setProgramaCargaId(event.target.value);
            setPreviewCarga(null);
            setProgresoCarga(null);
            setMensaje("");
          }}
        >
          <option value="">Seleccione programa o curso</option>
          {programasCarga.map((programa) => (
            <option key={programa.id} value={programa.id}>
              {programa.id} - {programa.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Zona de Drag & Drop */}
      <div className="coord-form-group-green">
        <label>
          <FileSpreadsheet size={16} />
          Archivo (Excel)
        </label>
        <div
          className="coord-file-drop"
          onClick={() => document.getElementById("coord-excel-upload")?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("dragover");
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove("dragover")}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("dragover");
            if (e.dataTransfer.files.length) {
              setArchivosExcel(Array.from(e.dataTransfer.files));
              setPreviewCarga(null);
              setProgresoCarga(null);
              setMensaje("");
            }
          }}
        >
          <CloudUpload size={22} className="coord-drop-icon" />
          <div className="coord-drop-text-group">
            <p className="coord-drop-text">
              Arrastra tu archivo o <span className="coord-drop-highlight">haz clic para elegir</span>
            </p>
            <div className="coord-drop-sub">.xlsx, .xls — máx 5 MB</div>
          </div>
          <input
            id="coord-excel-upload"
            key={archivoInputKey}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(event) => {
              setArchivosExcel(Array.from(event.target.files || []));
              setPreviewCarga(null);
              setProgresoCarga(null);
              setMensaje("");
            }}
          />
        </div>

        {archivosExcel.length > 0 && (
          <div className="coord-file-info-bar">
            <CheckCircle2 size={18} />
            <span>{obtenerResumenArchivos(archivosExcel)}</span>
            <span className="coord-file-size">
              ({(archivosExcel.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB)
        )}

        {/* Botón Guardar (aparece solo con preview) */}
        {previewCarga && (
          <button
            className="coord-btn-full coord-btn-save"
            type="button"
            onClick={confirmarCargaExcel}
            disabled={confirmandoCarga}
          >
            {confirmandoCarga ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
            <span>{confirmandoCarga ? "Guardando..." : "Guardar"}</span>
          </button>
        )}

        {/* Botón Cancelar (aparece con archivos o preview) */}
        {(archivosExcel.length > 0 || previewCarga) && (
          <button
            className="coord-btn-full coord-btn-cancel"
            type="button"
            onClick={cancelarCargaExcel}
            disabled={cargandoPreview || confirmandoCarga}
          >
            <X size={17} />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>
  );
}
