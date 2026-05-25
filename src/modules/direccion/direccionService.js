
import ExcelJS from "exceljs";
import { apiDb, syncApiDb } from "../../services/dbApi";

const esperar = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerPanelDireccion(filtros = {}) {
  await esperar();
  await syncApiDb();

  const periodo = normalizarPeriodo(filtros.periodo || "todos");
  const programas = filtrarPorPeriodo(apiDb.programas || [], periodo);
  const inscripciones = filtrarPorPeriodo(apiDb.inscripciones || [], periodo)
    .filter((item) => item.estadoInscripcion !== "Anulada");
  const pagos = filtrarPorPeriodo(apiDb.pagos || [], periodo);

  const filasProgramas = programas.map((programa) => {
    const inscripcionesPrograma = inscripciones.filter((item) =>
      item.programaId === programa.id || normalizarTexto(item.programa) === normalizarTexto(programa.nombre)
    );
    const pagosPrograma = pagos.filter((item) =>
      item.programaId === programa.id || normalizarTexto(item.programa || item.programaNombre) === normalizarTexto(programa.nombre)
    );
    const inscritos = inscripcionesPrograma.length;
    const cupos = Number(programa.cupos || programa.cuposDisponibles || 0);
    const ocupados = Math.max(Number(programa.cuposOcupados || 0), inscritos);
    const proyectado = inscripcionesPrograma.reduce((sum, item) => sum + Number(item.costo ?? programa.costo ?? 0), 0);
    const recaudado = pagosPrograma
      .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);

    return {
      id: programa.id,
      nombre: programa.nombre || "Programa sin nombre",
      periodo: normalizarPeriodo(programa.periodo || "escolar"),
      estado: programa.estado || "Sin estado",
      categoria: programa.categoria || "Sin categoria",
      responsable: programa.responsable || programa.docente || programa.tutora || "Sin responsable",
      cupos,
      ocupados,
      inscritos,
      costo: Number(programa.costo || 0),
      proyectado,
      recaudado,
      avance: cupos > 0 ? Math.round((ocupados / cupos) * 100) : 0,
    };
  }).sort((a, b) => b.inscritos - a.inscritos);

  const totalRecaudado = pagos
    .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const totalProyectado = inscripciones.reduce((sum, item) => sum + Number(item.costo || 0), 0);
  const pendientesPago = inscripciones.filter((item) => normalizarEstadoPago(item.estadoPago) !== "Pagado");
  const familias = new Set(inscripciones.map((item) => item.telefono || item.apoderado || item.dniEstudiante).filter(Boolean));

  return {
    resumen: {
      programas: programas.length,
      programasHabilitados: programas.filter((item) => item.estado === "Habilitado").length,
      inscripciones: inscripciones.length,
      familias: familias.size,
      totalRecaudado,
      totalProyectado,
      totalPendiente: pendientesPago.reduce((sum, item) => sum + Number(item.costo || 0), 0),
      cupos: filasProgramas.reduce((sum, item) => sum + Number(item.cupos || 0), 0),
      ocupados: filasProgramas.reduce((sum, item) => sum + Number(item.ocupados || 0), 0),
    },
    filasProgramas,
    graficos: {
      inscripcionesPorPrograma: filasProgramas.slice(0, 8).map((item) => ({
        programa: abreviar(item.nombre),
        inscripciones: item.inscritos,
      })),
      ingresosPorPrograma: filasProgramas.slice(0, 8).map((item) => ({
        programa: abreviar(item.nombre),
        proyectado: item.proyectado,
        recaudado: item.recaudado,
      })),
      estadoPago: contarPor(inscripciones, (item) => normalizarEstadoPago(item.estadoPago)),
      origen: contarPor(inscripciones, (item) => item.origenRegistro || "Sin origen"),
    },
    reportes: {
      programas: filasProgramas,
      inscripciones: inscripciones.map(crearFilaInscripcion),
      pagos: pagos.map(crearFilaPago),
    },
  };
}

export async function descargarReporteDireccion(tipoReporte, filtros = {}) {
  const panel = await obtenerPanelDireccion(filtros);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  if (tipoReporte === "completo" || tipoReporte === "resumen") {
    const resumen = Object.entries(panel.resumen).map(([indicador, valor]) => ({ indicador, valor }));
    agregarHoja(workbook, "Resumen", resumen, [
      { header: "Indicador", key: "indicador", width: 28 },
      { header: "Valor", key: "valor", width: 18 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "programas") {
    agregarHoja(workbook, "Programas", panel.reportes.programas, [
      { header: "Codigo", key: "id", width: 14 },
      { header: "Programa", key: "nombre", width: 32 },
      { header: "Periodo", key: "periodo", width: 14 },
      { header: "Estado", key: "estado", width: 16 },
      { header: "Categoria", key: "categoria", width: 18 },
      { header: "Responsable", key: "responsable", width: 24 },
      { header: "Inscritos", key: "inscritos", width: 12 },
      { header: "Cupos", key: "cupos", width: 10 },
      { header: "Avance %", key: "avance", width: 12 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Proyectado", key: "proyectado", width: 14 },
      { header: "Recaudado", key: "recaudado", width: 14 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "inscripciones") {
    agregarHoja(workbook, "Inscripciones", panel.reportes.inscripciones, [
      { header: "Codigo", key: "id", width: 16 },
      { header: "DNI", key: "dni", width: 12 },
      { header: "Estudiante", key: "estudiante", width: 32 },
      { header: "Grado", key: "grado", width: 18 },
      { header: "Programa", key: "programa", width: 32 },
      { header: "Estado inscripcion", key: "estadoInscripcion", width: 20 },
      { header: "Estado pago", key: "estadoPago", width: 16 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Origen", key: "origen", width: 24 },
      { header: "Fecha registro", key: "fechaRegistro", width: 22 },
      { header: "Apoderado", key: "apoderado", width: 24 },
      { header: "Telefono", key: "telefono", width: 16 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "pagos") {
    agregarHoja(workbook, "Pagos", panel.reportes.pagos, [
      { header: "Codigo", key: "id", width: 16 },
      { header: "DNI", key: "dni", width: 12 },
      { header: "Estudiante", key: "estudiante", width: 32 },
      { header: "Programa", key: "programa", width: 32 },
      { header: "Monto", key: "monto", width: 12 },
      { header: "Estado", key: "estado", width: 16 },
      { header: "Medio", key: "medio", width: 18 },
      { header: "Fecha", key: "fecha", width: 22 },
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const nombre = `direccion-${tipoReporte}-${filtros.periodo || "todos"}.xlsx`;
  descargarBlob(blob, nombre);
  return nombre;
}

function agregarHoja(workbook, nombre, filas, columnas) {
  const hoja = workbook.addWorksheet(nombre);
  hoja.columns = columnas;
  hoja.addRows(filas);
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176C60" } };
  hoja.getRow(1).alignment = { vertical: "middle" };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });
}

function crearFilaInscripcion(item) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || "",
    estudiante: item.nombresEstudiante || "",
    grado: item.gradoEstudiante || item.grado || "",
    programa: item.programa || "",
    estadoInscripcion: item.estadoInscripcion || "",
    estadoPago: normalizarEstadoPago(item.estadoPago),
    costo: Number(item.costo || 0),
    origen: item.origenRegistro || "",
    fechaRegistro: item.fechaRegistro || "",
    apoderado: item.apoderado || "",
    telefono: item.telefono || "",
  };
}

function crearFilaPago(item) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || item.estudianteDni || "",
    estudiante: item.nombresEstudiante || item.estudianteNombre || "",
    programa: item.programa || item.programaNombre || "",
    monto: Number(item.monto || 0),
    estado: normalizarEstadoPago(item.estado),
    medio: item.formaPago || item.medioPago || "",
    fecha: item.fechaPago || item.fecha || "",
  };
}

function filtrarPorPeriodo(items, periodo) {
  if (periodo === "todos") return [...items];
  return [...items].filter((item) => normalizarPeriodo(item.periodo || "escolar") === periodo);
}

function normalizarPeriodo(periodo) {
  const texto = String(periodo || "").toLowerCase();
  if (texto.includes("verano")) return "verano";
  if (texto.includes("todos") || texto.includes("ambos")) return "todos";
  return "escolar";
}

function normalizarEstadoPago(estado) {
  const texto = String(estado || "").toLowerCase();
  if (texto.includes("pag") || texto === "completado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

function contarPor(items, resolver) {
  const conteo = new Map();
  items.forEach((item) => {
    const key = resolver(item) || "Sin dato";
    conteo.set(key, (conteo.get(key) || 0) + 1);
  });
  const colores = ["teal.6", "orange.6", "blue.6", "grape.6", "yellow.6", "red.6"];
  return [...conteo.entries()].map(([name, value], index) => ({
    name,
    value,
    color: colores[index % colores.length],
  }));
}

function normalizarTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

function abreviar(valor) {
  const texto = String(valor || "Sin nombre").trim();
  return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
