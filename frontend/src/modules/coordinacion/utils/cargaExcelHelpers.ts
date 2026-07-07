import { PDFDocument } from "pdf-lib";
import { apiDb } from "../../../services/dbApi";
import { convertirWordOriginalAPdf, crearPdfInvitacionDocumento } from "../../secretaria/utils/secretariaDocumentoPdf";
import { generarComunicadoWordBlob, crearDocumentoInvitacion } from "../../secretaria/utils/secretariaDocumentoWord";
import { toast } from "sonner";

/* ── Combinador de PDFs ── */

export async function combinarBlobsPdf(blobs: Blob[]) {
  const pdfCombinado = await PDFDocument.create();
  for (const blob of blobs) {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const paginasCopiadas = await pdfCombinado.copyPages(pdf, pdf.getPageIndices());
    paginasCopiadas.forEach((pagina) => pdfCombinado.addPage(pagina));
  }
  const bytesPdf = await pdfCombinado.save();
  return new Blob([bytesPdf], { type: "application/pdf" });
}

/* ── Generación de fichas PDF en lote ── */

export async function generarYDescargarPdfFichasLote({
  registros,
  programas,
  nombrePdf,
  setLoadingState = (_v: boolean) => {},
}: {
  registros: any[];
  programas: any[];
  nombrePdf: string;
  setLoadingState?: (v: boolean) => void;
}) {
  if (!registros || !registros.length) {
    toast.error("La carga no tiene alumnos registrados.");
    return;
  }

  setLoadingState(true);
  try {
    const resultados = new Array(registros.length).fill(null);
    const programasSinPlantilla = new Set<string>();

    const procesarRegistro = async (reg: any, index: number) => {
      const programa = programas.find((p) => p.id === reg.programaId);
      if (!programa) return;

      const dbEstudiante = (apiDb as any).estudiantes?.[reg.dni];
      const mockEstudiante = {
        dni: reg.dni,
        nombres: reg.nombres || reg.nombre,
        grado: reg.grado || "",
        seccion: reg.seccion || "",
        apoderado: dbEstudiante?.apoderado || "",
        telefonoApoderado: dbEstudiante?.telefonoApoderado || "",
        correoApoderado: dbEstudiante?.correoApoderado || "",
      };

      const mockInscripcion = {
        id: `INS-INV-${reg.dni}-${reg.programaId}`,
        dniEstudiante: reg.dni,
        nombresEstudiante: reg.nombres || reg.nombre,
        gradoEstudiante: reg.grado || "",
        seccion: reg.seccion || "",
        programaId: reg.programaId,
        programa: programa.nombre,
        horario: programa.horario || "",
        docente: programa.docente || "",
        costo: programa.costo || 0,
        modalidadCobro: programa.modalidadCobro || "",
        fechaInicio: programa.fechaInicio || "",
        fechaFin: programa.fechaFin || "",
        fechaRegistro: new Date().toISOString(),
        apoderado: dbEstudiante?.apoderado || "",
        telefono: dbEstudiante?.telefonoApoderado || "",
        correo: dbEstudiante?.correoApoderado || "",
        plantilla: programa.plantilla || "",
        plantillaBase64: programa.plantillaBase64 || "",
        requiereUniforme: programa.requiereUniforme || false,
        requiereIndumentaria: programa.requiereIndumentaria || false,
        cicloI: programa.cicloI || "",
        cicloII: programa.cicloII || "",
        horariosPorGrupo: programa.horariosPorGrupo || [],
        incluyeAlmuerzo: programa.incluyeAlmuerzo || false,
        detalleAlmuerzo: programa.detalleAlmuerzo || "",
        concesionarios: programa.concesionarios || "",
        horarioRecepcionAlmuerzo: programa.horarioRecepcionAlmuerzo || "",
        tipoComunicado: programa.tipoComunicado || "Otro genérico",
      };

      if (!programa.plantillaBase64) {
        try {
          const documentoFallback = await crearDocumentoInvitacion(mockEstudiante, mockInscripcion);
          const pdfBlob = (await crearPdfInvitacionDocumento(documentoFallback)).output("blob");
          resultados[index] = pdfBlob;
        } catch (err) {
          console.error(`Error generando ficha genérica para ${reg.nombres || reg.nombre}:`, err);
        }
        return;
      }

      try {
        const wordBlob = await generarComunicadoWordBlob({
          estudiante: mockEstudiante,
          inscripcion: mockInscripcion,
          omitirMarcaAguaVista: true,
        });
        const pdfBlob = await convertirWordOriginalAPdf(wordBlob);
        resultados[index] = pdfBlob;
      } catch (err) {
        console.error(`Error generando ficha para ${reg.nombres || reg.nombre}:`, err);
      }
    };

    const batchSize = 5;
    for (let i = 0; i < registros.length; i += batchSize) {
      const lote = registros.slice(i, i + batchSize);
      await Promise.all(lote.map((reg, offset) => procesarRegistro(reg, i + offset)));
    }

    const pdfBlobs = resultados.filter(Boolean);
    const archivosAgregados = pdfBlobs.length;

    if (archivosAgregados === 0) {
      if (programasSinPlantilla.size > 0) {
        alert(
          `No se pudo generar ninguna ficha porque los siguientes programas no tienen plantilla Word asignada:\n\n${Array.from(
            programasSinPlantilla
          ).join("\n")}\n\nPor favor, suba una plantilla en la sección "Importar Formato Taller" primero.`
        );
      } else {
        alert("No se encontraron registros válidos o plantillas para generar.");
      }
      return;
    }

    const pdfCombinadoBlob = await combinarBlobsPdf(pdfBlobs);
    const url = URL.createObjectURL(pdfCombinadoBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombrePdf;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    if (programasSinPlantilla.size > 0) {
      alert(
        `Se descargaron ${archivosAgregados} fichas en un único PDF. Sin embargo, no se generaron fichas para los siguientes programas por falta de plantilla:\n\n${Array.from(
          programasSinPlantilla
        ).join("\n")}`
      );
    }
  } catch (error) {
    console.error("Error al descargar fichas en lote:", error);
    alert("Ocurrió un error al generar las fichas en lote.");
  } finally {
    setLoadingState(false);
  }
}

/* ── Utilidades de formato ── */

export function obtenerResumenArchivos(archivosExcel: any[] = []) {
  if (!archivosExcel.length) return "Ningun archivo seleccionado";
  if (archivosExcel.length === 1) return archivosExcel[0].name;
  return `${archivosExcel.length} archivos seleccionados`;
}

export function formatearFechaCarga(valor = "") {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(fecha);
}

export function resumirProgramasCarga(carga: any = {}) {
  const nombres = new Set((carga.registros || []).map((item: any) => item.programaNombre).filter(Boolean));
  if (!nombres.size) return "-";
  return Array.from(nombres).join(", ");
}

export function resumirCampoCarga(carga: any = {}, resolver: (item: any) => string) {
  const valores = new Set((carga.registros || []).map(resolver).filter(Boolean));
  if (!valores.size) return "-";
  return Array.from(valores).join(", ");
}

export function obtenerNivelDesdeGrado(grado = "") {
  const texto = normalizarTexto(grado);
  if (texto.includes("inicial")) return "Inicial";
  if (texto.includes("primaria")) return "Primaria";
  if (texto.includes("secundaria")) return "Secundaria";
  return "";
}

export function normalizarTexto(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function programasDisponibles(programas: any[] = []) {
  return programas.filter((programa) =>
    String(programa.estado || "").toLowerCase() !== "archivado"
  );
}
