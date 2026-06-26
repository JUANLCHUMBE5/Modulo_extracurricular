import { useState, useEffect } from "react";
import {
  buscarAlumnoCargaPorDni,
  registrarAlumnoIndividualCarga,
  previsualizarCargaAlumnosMasiva,
  confirmarCargaAlumnos,
  eliminarCargaAlumnos,
} from "../services/coordinacionService";

export default function useCoordinacionCarga({
  puedeCargarAlumnos,
  cargaPeriodo,
  programaCargaId,
  setProgramaCargaId,
  mostrarMsg,
  cargarDatos,
  setUltimoLoteId,
}) {
  const [archivosExcel, setArchivosExcel] = useState([]);
  const [archivoInputKey, setArchivoInputKey] = useState(0);
  const [previewCarga, setPreviewCarga] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(null);
  const [confirmandoCarga, setConfirmandoCarga] = useState(false);
  const [eliminandoCargaId, setEliminandoCargaId] = useState("");
  const [modoCargaAlumnos, setModoCargaAlumnos] = useState("masiva");
  const [alumnoIndividual, setAlumnoIndividual] = useState({ dni: "", nombre: "", grado: "" });
  const [guardandoIndividual, setGuardandoIndividual] = useState(false);
  const [estadoAlumnoIndividual, setEstadoAlumnoIndividual] = useState({ buscando: false, mensaje: "", encontrado: false });

  function actualizarAlumnoIndividual(campo, valor) {
    if (campo === "dni") {
      const dni = String(valor || "").replace(/\D/g, "").slice(0, 8);
      setAlumnoIndividual((prev) => ({ ...prev, dni }));
      return;
    }
    setAlumnoIndividual((prev) => ({ ...prev, [campo]: valor }));
  }

  useEffect(() => {
    if (modoCargaAlumnos !== "individual") return;
    const dni = String(alumnoIndividual.dni || "").replace(/\D/g, "");
    if (dni.length !== 8) {
      setEstadoAlumnoIndividual({ buscando: false, mensaje: "", encontrado: false });
      return;
    }

    let activo = true;
    const timer = setTimeout(async () => {
      setEstadoAlumnoIndividual({ buscando: true, mensaje: "Buscando alumno en la base de datos...", encontrado: false });
      try {
        const alumno = await buscarAlumnoCargaPorDni(dni, cargaPeriodo);
        if (!activo) return;
        if (alumno) {
          setAlumnoIndividual((prev) => {
            if (String(prev.dni || "").replace(/\D/g, "") !== dni) return prev;
            return {
              ...prev,
              nombre: alumno.nombre || prev.nombre,
              grado: alumno.grado || prev.grado,
            };
          });
          setEstadoAlumnoIndividual({ buscando: false, mensaje: "Datos encontrados y completados automaticamente.", encontrado: true });
          return;
        }
        setEstadoAlumnoIndividual({ buscando: false, mensaje: "DNI no encontrado. Complete nombre y grado manualmente.", encontrado: false });
      } catch (err) {
        if (!activo) return;
        setEstadoAlumnoIndividual({ buscando: false, mensaje: err.message || "No se pudo consultar el DNI.", encontrado: false });
      }
    }, 250);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [alumnoIndividual.dni, modoCargaAlumnos, cargaPeriodo]);

  async function guardarAlumnoIndividual() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para registrar alumnos.");
    if (!programaCargaId) return mostrarMsg("Seleccione un programa académico.");
    if (!alumnoIndividual.dni || alumnoIndividual.dni.length !== 8) {
      return mostrarMsg("El DNI debe tener exactamente 8 dígitos.");
    }
    if (!alumnoIndividual.nombre.trim()) {
      return mostrarMsg("Ingrese el nombre completo del alumno.");
    }
    if (!alumnoIndividual.grado.trim()) {
      return mostrarMsg("Ingrese el grado del alumno.");
    }

    setGuardandoIndividual(true);
    try {
      const resultado = await registrarAlumnoIndividualCarga({
        periodo: cargaPeriodo,
        programaId: programaCargaId,
        dni: alumnoIndividual.dni,
        nombre: alumnoIndividual.nombre,
        grado: alumnoIndividual.grado,
      });
      await cargarDatos();
      setAlumnoIndividual({ dni: "", nombre: "", grado: "" });
      setEstadoAlumnoIndividual({ buscando: false, mensaje: "", encontrado: false });
      if (resultado && resultado.cargaId) {
        setUltimoLoteId(resultado.cargaId);
      } else if (resultado && resultado.cargaIds && resultado.cargaIds.length > 0) {
        setUltimoLoteId(resultado.cargaIds[0]);
      }
      mostrarMsg("Alumno registrado individualmente con éxito.", "success");
    } catch (err) {
      mostrarMsg(err.message || "Error al registrar el alumno.");
    } finally {
      setGuardandoIndividual(false);
    }
  }

  async function generarPreviewExcel() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para cargar alumnos.");
    mostrarMsg("");
    setPreviewCarga(null);
    setProgresoCarga(null);

    if (!archivosExcel.length) return mostrarMsg("Seleccione al menos un archivo Excel.");
    if (archivosExcel.length > 15) return mostrarMsg("Puede subir hasta 15 archivos Excel por carga.");

    const invalido = archivosExcel.find((archivo) => !/\.(xlsx|xls)$/i.test(archivo.name));
    const pesado = archivosExcel.find((archivo) => archivo.size > 5 * 1024 * 1024);
    const totalBytes = archivosExcel.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
    const extensionValida = !invalido;
    if (!extensionValida) return mostrarMsg("Solo se permiten archivos .xlsx o .xls.");
    if (pesado) return mostrarMsg("Cada archivo no debe superar 5 MB.");
    if (totalBytes > 50 * 1024 * 1024) return mostrarMsg("La carga masiva no debe superar 50 MB en total.");

    setCargandoPreview(true);
    setProgresoCarga({
      actual: 0,
      total: archivosExcel.length,
      porcentaje: 0,
      archivo: "",
      estado: "preparando",
    });
    try {
      const preview = await previsualizarCargaAlumnosMasiva({
        periodo: cargaPeriodo,
        archivos: archivosExcel,
        programaId: programaCargaId,
        onProgress: setProgresoCarga,
      });
      const tieneErrorDeGrado = (preview.registros || []).some(reg => 
        Array.isArray(reg.errores) && reg.errores.some(err => 
          String(err).toLowerCase().includes("grado correspondiente") || 
          String(err).toLowerCase().includes("no esta dentro de su grado")
        )
      );

      if (tieneErrorDeGrado) {
        setPreviewCarga(null);
        setProgresoCarga(null);
        mostrarMsg("Verifica bien la lista de invitados, hay un grado que no coincide.");
      } else {
        setPreviewCarga(preview);
        setProgresoCarga({
          actual: archivosExcel.length,
          total: archivosExcel.length,
          porcentaje: 100,
          archivo: "",
          node_env: "production",
          estado: "listo",
        });
        if (preview.resumen.validos === 0) {
          mostrarMsg(
            "La vista previa no tiene alumnos listos para guardar. Revise la columna Detalle y confirme que curso_programa coincida con un programa habilitado de Año escolar."
          );
        } else {
          mostrarMsg(`Vista previa generada: ${preview.resumen.validos} alumno(s) listos para guardar.`, "success");
        }
      }
    } catch (err) {
      mostrarMsg(err.message || "No se pudo leer el archivo Excel.");
      setProgresoCarga(null);
      setPreviewCarga(null);
    } finally {
      setCargandoPreview(false);
    }
  }
  async function confirmarCargaExcel() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para confirmar cargas de alumnos.");
    if (!previewCarga) return mostrarMsg("No hay registros para confirmar.");

    // Verificar si algún registro tiene un error de grado que no corresponde
    const tieneErrorDeGrado = (previewCarga.registros || []).some(reg => 
      Array.isArray(reg.errores) && reg.errores.some(err => 
        String(err).toLowerCase().includes("grado correspondiente") || 
        String(err).toLowerCase().includes("no esta dentro de su grado")
      )
    );

    if (tieneErrorDeGrado) {
      return mostrarMsg("Verifica bien la lista de invitados, hay un grado que no coincide.");
    }

    if (previewCarga.resumen.validos === 0) {
      return mostrarMsg("No hay registros válidos para confirmar.");
    }

    setConfirmandoCarga(true);
    try {
      const resultado = await confirmarCargaAlumnos(previewCarga);
      await cargarDatos();
      setPreviewCarga(null);
      setProgresoCarga(null);
      setArchivosExcel([]);
      setArchivoInputKey((actual) => actual + 1);
      if (resultado && resultado.cargaId) {
        setUltimoLoteId(resultado.cargaId);
      } else if (resultado && resultado.cargaIds && resultado.cargaIds.length > 0) {
        setUltimoLoteId(resultado.cargaIds[0]);
      }
      mostrarMsg("Carga confirmada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setConfirmandoCarga(false);
    }
  }

  async function eliminarCargaExcel(carga) {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para borrar cargas.");
    const nombreCarga = Array.isArray(carga.archivos) && carga.archivos.length ? carga.archivos.join(", ") : carga.id;
    const confirmado = window.confirm(
      `¿Borrar esta carga de Excel?\n\n${nombreCarga}\n\nSe retirarán los alumnos importados mientras no tengan inscripción activa.`
    );
    if (!confirmado) return;

    setEliminandoCargaId(carga.id);
    try {
      const resultado = await eliminarCargaAlumnos(carga.id);
      await cargarDatos();
      mostrarMsg(`Carga eliminada. Alumnos retirados: ${resultado.eliminados || 0}.`, "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo borrar la carga.");
    } finally {
      setEliminandoCargaId("");
    }
  }

  function cancelarCargaExcel() {
    setArchivosExcel([]);
    setPreviewCarga(null);
    setProgresoCarga(null);
    mostrarMsg("");
    setArchivoInputKey((actual) => actual + 1);
  }

  return {
    archivosExcel,
    setArchivosExcel,
    archivoInputKey,
    previewCarga,
    cargandoPreview,
    progresoCarga,
    confirmandoCarga,
    eliminandoCargaId,
    modoCargaAlumnos,
    setModoCargaAlumnos,
    alumnoIndividual,
    setAlumnoIndividual,
    estadoAlumnoIndividual,
    guardandoIndividual,
    actualizarAlumnoIndividual,
    guardarAlumnoIndividual,
    generarPreviewExcel,
    confirmarCargaExcel,
    eliminarCargaExcel,
    cancelarCargaExcel,
  };
}
