import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  crearMapaVariablesDocumento,
  base64ToArrayBuffer,
  normalizarNombreArchivo,
} from "./secretariaFichaData";
import {
  obtenerDelimitadoresPlantilla,
  normalizarDelimitadoresPlantilla,
  removerMarcasAguaWord,
  suavizarMarcasAguaWord,
  suavizarImagenesMarcaAguaDocx,
  generarComunicadoWordBlobLegacy,
  descargarBlob,
  extraerPlantillaPersonalizada,
  crearLineasInvitacionDefault,
} from "./secretariaDocumentoWordParsing";

export async function crearDocumentoInvitacion(estudiante: any, inscripcion: any) {
  if (!inscripcion.plantillaBase64) {
    const ficha = {
      apoderado: { nombre: inscripcion.apoderado || estudiante.apoderado },
      estudiante: {
        nombre: `${estudiante.nombres || inscripcion.nombresEstudiante} ${estudiante.apellidos || ''}`.trim(),
        grado: estudiante.grado,
        seccion: estudiante.seccion,
      },
      programa: {
        nombre: inscripcion.programa || inscripcion.tallerNombre,
        horario: inscripcion.horario,
        responsable: inscripcion.responsable || inscripcion.docente,
        costo: inscripcion.costo,
        modalidadCobro: inscripcion.modalidadCobro || inscripcion.modalidadPago,
        uniforme: inscripcion.uniforme,
        talla: inscripcion.talla,
        requisitos: inscripcion.requisitos,
      },
      observacion: inscripcion.observacion,
    };
    return {
      lineas: crearLineasInvitacionDefault(ficha),
      html: "",
    };
  }

  try {
    return await extraerPlantillaPersonalizada({ estudiante, inscripcion });
  } catch {
    const ficha = {
      apoderado: { nombre: inscripcion.apoderado || estudiante.apoderado },
      estudiante: {
        nombre: `${estudiante.nombres || inscripcion.nombresEstudiante} ${estudiante.apellidos || ''}`.trim(),
        grado: estudiante.grado,
        seccion: estudiante.seccion,
      },
      programa: {
        nombre: inscripcion.programa || inscripcion.tallerNombre,
        horario: inscripcion.horario,
        responsable: inscripcion.responsable || inscripcion.docente,
        costo: inscripcion.costo,
        modalidadCobro: inscripcion.modalidadCobro || inscripcion.modalidadPago,
        uniforme: inscripcion.uniforme,
        talla: inscripcion.talla,
        requisitos: inscripcion.requisitos,
      },
      observacion: inscripcion.observacion,
    };
    return {
      lineas: crearLineasInvitacionDefault(ficha),
      html: "",
    };
  }
}

export function crearLineasInvitacionEspecial(ficha: any, inscripcion: any, estudiante: any) {
  const lineas = [];
  const esDeportivo = String(ficha.programa.nombre).toLowerCase().includes("deport");
  const nombreEstudiante = (ficha.estudiante.nombre || "").toUpperCase();
  const gradoEstudiante = (ficha.estudiante.grado || "").toUpperCase();
  const seccionEstudiante = ficha.estudiante.seccion && ficha.estudiante.seccion !== "-" ? `SECCIÓN ${ficha.estudiante.seccion.toUpperCase()}` : "";
  const nombrePrograma = (ficha.programa.nombre || "").toUpperCase();

  lineas.push("Estimado apoderado:");
  lineas.push(`Nos dirigimos a usted para informarle que su menor hijo(a) ${nombreEstudiante}, del grado ${gradoEstudiante} ${seccionEstudiante}, ha sido invitado(a) a participar en el programa ${nombrePrograma}.`);

  const dias = (ficha.programa.horario || "").split(":")[0] || "Por definir";
  const horarioClase = (ficha.programa.horario || "").split("clase")[1] || ficha.programa.horario || "Por definir";

  lineas.push(`Las clases se realizarán los días ${dias.trim()} en el horario de${horarioClase.trim()}.`);

  if (esDeportivo) {
    lineas.push("Este programa deportivo busca promover el desarrollo físico y el trabajo en equipo de nuestros alumnos.");
  } else {
    lineas.push("Este programa académico tiene como objetivo nivelar y reforzar las competencias en las áreas correspondientes.");
  }

  if (ficha.programa.requisitos) {
    lineas.push(`Requisitos: ${ficha.programa.requisitos}`);
  }

  if (ficha.programa.uniforme === "Sí" || ficha.programa.uniforme === "Si") {
    lineas.push(`Se requiere uniforme especial del taller (Talla: ${ficha.programa.talla || 'Por definir'}).`);
  }

  lineas.push("Agradecemos su atención y confirmación de la vacante.");
  return lineas;
}

export async function descargarComunicadoWord({ estudiante, inscripcion }: any) {
  const blob = await generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista: true });
  const nombreTaller = normalizarNombreArchivo(inscripcion.programa || inscripcion.tallerNombre || "Comunicado");
  const nombreAlumno = normalizarNombreArchivo(estudiante.nombres || inscripcion.nombresEstudiante || "Estudiante");
  descargarBlob(blob, `Comunicado_${nombreTaller}_${nombreAlumno}.docx`);
}

export async function generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista = false }: any) {
  if (!inscripcion.plantillaBase64) {
    throw new Error("El programa no tiene una plantilla Word cargada por Coordinación.");
  }

  const datos = crearMapaVariablesDocumento(estudiante, inscripcion);
  try {
    const zipPlantilla = new PizZip(base64ToArrayBuffer(inscripcion.plantillaBase64));
    const delimitadores = obtenerDelimitadoresPlantilla(zipPlantilla);
    if (!delimitadores) normalizarDelimitadoresPlantilla(zipPlantilla, datos);
    const doc = new Docxtemplater(zipPlantilla, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      ...(delimitadores ? { delimiters: delimitadores } : {}),
    });
    doc.render(datos);
    if (omitirMarcaAguaVista) {
      removerMarcasAguaWord(doc.getZip());
    } else {
      suavizarMarcasAguaWord(doc.getZip());
    }
    const blob = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    return omitirMarcaAguaVista ? blob : await suavizarImagenesMarcaAguaDocx(blob);
  } catch {
    return generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista });
  }
}
