import { useState } from "react";
import {
  editarPrograma,
  crearProgramaDesdeDocumento,
  obtenerActividadPrograma,
} from "../services/coordinacionService";
import { fechaActualIso } from "../../../services/dateService";
import { formInicial } from "../constants/coordinacionFormDefaults";
import { normalizarComparacion } from "../utils/coordinacionFormatters";
import {
  contarDatosDetectados,
  extraerDatosProgramaDesdeWord,
  filtrarDatosDocumento,
  leerArchivoBase64,
  leerDocumentoWordDesdeBase64,
  leerPlantillaWord,
} from "../utils/wordTemplateUtils";
import {
  nombreProgramaDesdeArchivo,
  esProgramaCambridge,
} from "../utils/coordinacionProgramUtils";

export default function useCoordinacionDocumentos({
  puedeCrearProgramas,
  puedeEditarProgramas,
  form,
  setForm,
  actualizarForm,
  programas,
  categorias,
  mostrarMsg,
  cargarDatos,
  datosProgramaAFormulario,
  setGuardando,
}) {
  const [programaDocsId, setProgramaDocsId] = useState("");
  const [lecturaDocumento, setLecturaDocumento] = useState(null);
  const [plantillaInputKey, setPlantillaInputKey] = useState(0);

  function abrirDocumentosPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar documentos del programa.");
    setForm(datosProgramaAFormulario(prog));
    setProgramaDocsId(prog.id);
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    mostrarMsg("");
  }

  async function guardarDocumentoComoPrograma() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas desde documentos.");
    if (!form.plantillaBase64) return mostrarMsg("Primero suba el documento Word.");
    if (!form.plantillaValidada) return mostrarMsg("El Word debe tener variables editables antes de guardarlo.");
    const nombreDocumento = form.nombre.trim() || nombreProgramaDesdeArchivo(form.plantilla);
    if (!nombreDocumento) return mostrarMsg("Ingrese el nombre del programa.");

    setGuardando(true);
    try {
      const creado = await crearProgramaDesdeDocumento({
        ...form,
        nombre: nombreDocumento,
        categoria: form.categoria || categorias[0] || "General",
      });
      await cargarDatos();
      setProgramaDocsId("");
      setForm(formInicial);
      setLecturaDocumento(null);
      setPlantillaInputKey((actual) => actual + 1);
      mostrarMsg(`Plantilla de ${creado.nombre} guardada en el historial.`, "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarDocumentosPrograma() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar documentos del programa.");
    if (!form.id) return mostrarMsg("Seleccione un programa para gestionar sus documentos.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    try {
      await editarPrograma(form.id, form);
      await cargarDatos();
      mostrarMsg("Documentos del programa actualizados correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function seleccionarPlantilla(event) {
    if (modoEditar() && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar plantillas.");
    if (!modoEditar() && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear plantillas.");
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!/\.docx$/i.test(archivo.name)) {
      setPlantillaInputKey((actual) => actual + 1);
      return mostrarMsg("Solo se permiten plantillas Word en formato .docx.");
    }

    if (modoEditar() && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.tieneActividad) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) {
          setPlantillaInputKey((actual) => actual + 1);
          return;
        }
      }
    }

    try {
      const lectura = await leerPlantillaWord(archivo);
      const { variablesDetectadas, textoPlano } = lectura;
      const plantillaBase64 = await leerArchivoBase64(archivo);
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, archivo.name, categorias);
      const datosAplicables = form.tipoComunicado ? filtrarDatosDocumento(datosDetectados) : datosDetectados; // approximate context or pass it
      if (textoPlano) datosAplicables.comunicadoCompleto = textoPlano;
      const nombreDocumento = datosDetectados.nombre || nombreProgramaDesdeArchivo(archivo.name);
      
      const plantillaExistente = programas.find(
        (programa) => normalizarComparacion(programa.plantilla) === normalizarComparacion(archivo.name)
      );
      
      const totalDetectados = contarDatosDetectados(datosAplicables);
      
      setLecturaDocumento({
        archivo: archivo.name,
        texto: textoPlano,
        datos: datosAplicables,
        variables: variablesDetectadas,
        variablesListasModelo: lectura.variablesListasModelo,
        variablesRequeridasModelo: lectura.variablesRequeridasModelo,
        variablesFaltantes: lectura.variablesFaltantes,
        plantillaModelo: lectura.plantillaModelo,
      });

      if (plantillaExistente) {
        setProgramaDocsId(plantillaExistente.id);
        setForm((actual) => ({
          ...actual,
          ...datosProgramaAFormulario(plantillaExistente),
          plantilla: archivo.name,
          plantillaBase64,
          plantillaVariables: variablesDetectadas,
          plantillaValidada: lectura.plantillaValida,
          plantillaActualizadaEn: fechaActualIso(),
        }));
      } else {
        setForm((actual) => ({
          ...actual,
          ...datosAplicables,
          nombre: actual.nombre || nombreDocumento,
          categoria: actual.categoria || datosDetectados.categoria || categorias[0] || "",
          plantilla: archivo.name,
          plantillaBase64,
          plantillaVariables: variablesDetectadas,
          plantillaValidada: lectura.plantillaValida,
          plantillaActualizadaEn: fechaActualIso(),
        }));
      }

      mostrarMsg(
        plantillaExistente
          ? `La plantilla ya estaba guardada como ${plantillaExistente.nombre}. No es necesario volver a subirla.`
          : totalDetectados > 0
          ? `Plantilla validada. Se autocompletaron ${totalDetectados} dato(s) del programa.`
          : "Plantilla validada. No se encontraron datos del programa para autocompletar.",
        "success"
      );
    } catch (err) {
      setLecturaDocumento(null);
      setForm((actual) => ({
        ...actual,
        plantilla: archivo.name,
        plantillaBase64: "",
        plantillaVariables: [],
        plantillaValidada: false,
        plantillaActualizadaEn: "",
      }));
      mostrarMsg(err.message || "No se pudo validar la plantilla Word.");
    }
  }

  async function autocompletarDesdePlantilla() {
    if (!form.plantillaBase64) {
      return mostrarMsg("Primero suba un documento Word.");
    }

    try {
      const lectura = await leerDocumentoWordDesdeBase64(form.plantillaBase64);
      const { textoPlano, variablesDetectadas } = lectura;
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, form.plantilla, categorias);
      const datosAplicables = form.tipoComunicado ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      if (textoPlano) datosAplicables.comunicadoCompleto = textoPlano;
      const totalDetectados = contarDatosDetectados(datosAplicables);
      
      setLecturaDocumento({
        archivo: form.plantilla,
        texto: textoPlano,
        datos: datosAplicables,
        variables: variablesDetectadas,
        variablesListasModelo: lectura.variablesListasModelo,
        variablesRequeridasModelo: lectura.variablesRequeridasModelo,
        variablesFaltantes: lectura.variablesFaltantes,
        plantillaModelo: lectura.plantillaModelo,
      });

      if (totalDetectados === 0) {
        return mostrarMsg("Documento leído. No se detectaron secciones automáticas para guardar.");
      }

      setForm((actual) => ({
        ...actual,
        ...datosAplicables,
        ...(!programaDocsId ? { nombre: datosDetectados.nombre || nombreProgramaDesdeArchivo(form.plantilla) || actual.nombre } : {}),
      }));
      return mostrarMsg(`Se autocompletaron ${totalDetectados} dato(s) del programa.`, "success");
    } catch (err) {
      return mostrarMsg(err.message || "No se pudo leer la plantilla guardada.");
    }
  }

  async function quitarPlantilla() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar plantillas.");
    if (form.id && form.plantilla) {
      const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${form.plantilla}`);
      if (!confirmado) return;
    }

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      comunicadoCompleto: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    const siguienteForm = {
      ...form,
      ...datosLimpios,
    };

    setForm((actual) => ({
      ...actual,
      ...datosLimpios,
    }));
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);

    if (!form.id) return;

    setGuardando(true);
    try {
      await editarPrograma(form.id, siguienteForm);
      await cargarDatos();
      mostrarMsg("Documento eliminado del programa.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPlantillaHistorial(programa) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar plantillas.");
    const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${programa.plantilla}`);
    if (!confirmado) return;

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      comunicadoCompleto: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    setGuardando(true);
    try {
      await editarPrograma(programa.id, {
        ...datosProgramaAFormulario(programa),
        ...datosLimpios,
      });
      if (programaDocsId === programa.id) {
        setProgramaDocsId("");
        setForm(formInicial);
        setLecturaDocumento(null);
      }
      await cargarDatos();
      mostrarMsg("Plantilla eliminada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function usarPlantillaExistente(programaId) {
    const programa = programas.find((item) => item.id === programaId);
    if (!programa || !programa.plantillaBase64) {
      return mostrarMsg("Seleccione un programa con plantilla validada.");
    }

    if (form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.alumnos || actividad.inscripciones || actividad.documentos) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) return;
      }
    }

    setForm((actual) => ({
      ...actual,
      plantilla: programa.plantilla || "",
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaVariables: programa.plantillaVariables || [],
      plantillaValidada: Boolean(programa.plantillaValidada),
      plantillaActualizadaEn: fechaActualIso(),
    }));
    setPlantillaInputKey((actual) => actual + 1);
    mostrarMsg(`Se usará la plantilla de ${programa.nombre}.`, "success");
  }

  // helper to check if in editing mode
  function modoEditar() {
    return Boolean(form.id);
  }

  return {
    programaDocsId,
    setProgramaDocsId,
    lecturaDocumento,
    setLecturaDocumento,
    plantillaInputKey,
    setPlantillaInputKey,
    abrirDocumentosPrograma,
    guardarDocumentoComoPrograma,
    guardarDocumentosPrograma,
    seleccionarPlantilla,
    autocompletarDesdePlantilla,
    quitarPlantilla,
    eliminarPlantillaHistorial,
    usarPlantillaExistente,
  };
}
