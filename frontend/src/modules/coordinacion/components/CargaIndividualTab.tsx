import { IconLoader2 as Loader2, IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

interface Programa {
  id: string;
  nombre: string;
}

interface AlumnoIndividualType {
  dni: string;
  nombre: string;
  grado: string;
}

interface EstadoAlumnoIndividualType {
  buscando: boolean;
  mensaje: string;
  encontrado: boolean;
}

interface CargaIndividualTabProps {
  programaCargaId: string;
  setProgramaCargaId: (val: string) => void;
  programasCarga: Programa[];
  busquedaAlumno: string;
  setBusquedaAlumno: (val: string) => void;
  resultadosAlumnos: any[];
  buscandoAlumnos: boolean;
  registrarAlumnoDirecto: (item: any) => void;
  alumnoIndividual: AlumnoIndividualType;
  actualizarAlumnoIndividual: (campo: string, valor: string) => void;
  setAlumnoIndividual: (val: AlumnoIndividualType) => void;
  setEstadoAlumnoIndividual: (val: EstadoAlumnoIndividualType) => void;
  guardarAlumnoIndividual: () => void;
  guardandoIndividual: boolean;
  estadoAlumnoIndividual: EstadoAlumnoIndividualType;
  setPreviewCarga: (val: any) => void;
  setProgresoCarga: (val: any) => void;
  setMensaje: (val: string) => void;
}

export default function CargaIndividualTab({
  programaCargaId,
  setProgramaCargaId,
  programasCarga,
  busquedaAlumno,
  setBusquedaAlumno,
  resultadosAlumnos,
  buscandoAlumnos,
  registrarAlumnoDirecto,
  alumnoIndividual,
  actualizarAlumnoIndividual,
  setAlumnoIndividual,
  setEstadoAlumnoIndividual,
  guardarAlumnoIndividual,
  guardandoIndividual,
  estadoAlumnoIndividual,
  setPreviewCarga,
  setProgresoCarga,
  setMensaje,
}: CargaIndividualTabProps) {
  return (
    <div className="coord-form coord-individual-clean-form">
      <div className="coord-field coord-individual-clean-program">
        <label htmlFor="coord-programa-carga">Código del programa o curso</label>
        <select
          id="coord-programa-carga"
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

      <div className="coord-individual-search-bar" style={{ marginBottom: "20px", position: "relative" }}>
        <label
          htmlFor="coord-individual-search-input"
          style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold", color: "#374151" }}
        >
          Buscar Alumno (DNI, Código de estudiante o Nombre/Apellido)
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            id="coord-individual-search-input"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "#ffffff",
            }}
            value={busquedaAlumno}
            onChange={(e) => setBusquedaAlumno(e.target.value)}
            placeholder="Escriba DNI, Código de alumno, Nombres o Apellidos para buscar..."
          />
          {busquedaAlumno && (
            <button
              type="button"
              onClick={() => {
                setBusquedaAlumno("");
                setAlumnoIndividual({ dni: "", nombre: "", grado: "" });
                setEstadoAlumnoIndividual({ buscando: false, mensaje: "", encontrado: false });
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#f3f4f6",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
              }}
            >
              Limpiar
            </button>
          )}
        </div>

        {resultadosAlumnos.length > 0 ? (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 9999,
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              maxHeight: "220px",
              overflowY: "auto",
              padding: "4px 0",
              margin: "4px 0 0 0",
              listStyle: "none",
            }}
          >
            {resultadosAlumnos.map((item: any) => {
              const studentCode = item.codigoEstudiante || item.codigo_estudiante || item.codigo || "";
              return (
                <li
                  key={item.dni}
                  onClick={() => {
                    registrarAlumnoDirecto(item);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  <div>
                    <strong style={{ display: "block", color: "#111827" }}>{item.nombres || item.nombre}</strong>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>
                      DNI: {item.dni} {studentCode ? `| Cód: ${studentCode}` : ""}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      backgroundColor: "#e5e7eb",
                      color: "#374151",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {item.grado}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : busquedaAlumno.trim().length >= 3 && !buscandoAlumnos ? (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 9999,
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "12px",
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: "#6b7280",
              textAlign: "center",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            No se encontraron alumnos con esa búsqueda. Ingrese los datos manualmente a continuación.
          </div>
        ) : buscandoAlumnos ? (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 9999,
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "12px",
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: "#6b7280",
              textAlign: "center",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            Buscando...
          </div>
        ) : null}
      </div>

      <div className="coord-individual-clean-row">
        <div className="coord-field coord-individual-clean-dni">
          <label htmlFor="coord-individual-dni">DNI</label>
          <input
            id="coord-individual-dni"
            value={alumnoIndividual.dni}
            onChange={(event) => actualizarAlumnoIndividual("dni", event.target.value)}
            placeholder="8 dígitos"
            inputMode="numeric"
            maxLength={8}
          />
        </div>
        <div className="coord-field coord-individual-clean-name">
          <label htmlFor="coord-individual-nombre">Nombre</label>
          <input
            id="coord-individual-nombre"
            value={alumnoIndividual.nombre}
            onChange={(event) => actualizarAlumnoIndividual("nombre", event.target.value)}
            placeholder="Nombre completo del alumno"
          />
        </div>
        <div className="coord-field coord-individual-clean-grade">
          <label htmlFor="coord-individual-grado">Grado</label>
          <input
            id="coord-individual-grado"
            value={alumnoIndividual.grado}
            onChange={(event) => actualizarAlumnoIndividual("grado", event.target.value)}
            placeholder="Ej: 2 Primaria"
          />
        </div>
        <button
          className="coord-register-button coord-individual-clean-submit"
          type="button"
          onClick={guardarAlumnoIndividual}
          disabled={guardandoIndividual || !alumnoIndividual.dni || !alumnoIndividual.nombre || !alumnoIndividual.grado}
        >
          {guardandoIndividual ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
          <span>{guardandoIndividual ? "Guardando" : "Agregar alumno"}</span>
        </button>
      </div>
      {estadoAlumnoIndividual.mensaje ? (
        <p className={`coord-individual-clean-status ${estadoAlumnoIndividual.encontrado ? "is-success" : "is-warning"}`}>
          {estadoAlumnoIndividual.mensaje}
        </p>
      ) : null}
    </div>
  );
}
