import { execFile } from "child_process";
import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_WORD_FILE_SIZE = 25 * 1024 * 1024;

const execFileAsync = promisify(execFile);
const COLUMNAS_CARGA_EXCEL = new Set([
  "alumno",
  "apellidos",
  "codigo_estudiante",
  "curso_programa",
  "dni",
  "dni_o_codigo",
  "grado",
  "nivel_cambridge",
  "nivel_educativo",
  "nombres",
  "observacion",
  "programa",
  "seccion",
  "seleccion",
]);

export function validarArchivoExcel(archivo) {
  if (!archivo) lanzar("Seleccione un archivo Excel.");

  const nombre = String(archivo.originalname || "");
  if (!/\.(xlsx|xls)$/i.test(nombre)) lanzar("Solo se permiten archivos .xlsx o .xls.");
  if (/\.(xlsx|xls)\.[a-z0-9]+$/i.test(nombre.toLowerCase())) {
    lanzar("El archivo tiene una extension sospechosa.");
  }
  if (archivo.size > MAX_FILE_SIZE) lanzar("El archivo no debe superar 5 MB.");

  const esXlsxReal = archivo.buffer.subarray(0, 4).toString("hex") === "504b0304";
  if (/\.xlsx$/i.test(nombre) && !esXlsxReal) {
    lanzar("El archivo no parece ser un Excel valido.");
  }
}

export function validarArchivoWord(archivo) {
  if (!archivo) lanzar("Seleccione una plantilla Word para convertir.");

  const nombre = String(archivo.originalname || "");
  if (!/\.docx$/i.test(nombre)) lanzar("Solo se permite convertir documentos Word .docx.");
  if (/\.docx\.[a-z0-9]+$/i.test(nombre.toLowerCase())) {
    lanzar("El archivo Word tiene una extension sospechosa.");
  }
  if (archivo.size > MAX_WORD_FILE_SIZE) lanzar("El documento Word no debe superar 25 MB.");

  const esDocxReal = archivo.buffer.subarray(0, 4).toString("hex") === "504b0304";
  if (!esDocxReal) lanzar("El archivo no parece ser un Word valido.");
}

export async function convertirWordAPdf(buffer) {
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), "modulo-extracurricular-"));
  const base = randomUUID();
  const entrada = path.join(carpeta, `${base}.docx`);
  const salida = path.join(carpeta, `${base}.pdf`);

  try {
    await fs.writeFile(entrada, buffer);

    const convertido = await convertirConLibreOffice(entrada, carpeta, salida)
      .catch(() => convertirConMicrosoftWord(entrada, salida));

    return await fs.readFile(convertido);
  } finally {
    await fs.rm(carpeta, { recursive: true, force: true }).catch(() => {});
  }
}

async function convertirConLibreOffice(entrada, carpeta, salida) {
  const perfilLibreOffice = path.join(carpeta, "libreoffice-profile");
  const perfilUrl = `file:///${perfilLibreOffice.replace(/\\/g, "/")}`;
  const ejecutables = [
    "soffice",
    "libreoffice",
    process.env.LIBREOFFICE_PATH,
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean);

  for (const ejecutable of ejecutables) {
    try {
      await execFileAsync(ejecutable, [
        "--headless",
        "--nologo",
        "--nodefault",
        "--nofirststartwizard",
        "--nolockcheck",
        `-env:UserInstallation=${perfilUrl}`,
        "--convert-to",
        "pdf",
        "--outdir",
        carpeta,
        entrada,
      ], { timeout: 90000, windowsHide: true });

      await fs.access(salida);
      return salida;
    } catch {
      // Probar el siguiente convertidor disponible.
    }
  }

  throw new Error("LibreOffice no disponible.");
}

async function convertirConMicrosoftWord(entrada, salida) {
  const script = path.join(path.dirname(entrada), "convertir-word-pdf.ps1");
  await fs.writeFile(script, `
$ErrorActionPreference = "Stop"
$entrada = $args[0]
$salida = $args[1]
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $documento = $word.Documents.Open($entrada, $false, $true)
  try {
    $documento.ExportAsFixedFormat($salida, 17)
  } finally {
    $documento.Close($false)
  }
} finally {
  $word.Quit()
}
`, "utf8");

  await execFileAsync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    entrada,
    salida,
  ], { timeout: 90000, windowsHide: true });

  await fs.access(salida);
  return salida;
}

export async function leerExcelSeguro(archivo) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(archivo.buffer, {
      ignoreNodes: ["dataValidations", "conditionalFormatting", "extLst"],
    });
  } catch {
    lanzar("El archivo no se pudo abrir como Excel .xlsx valido. Verifique que no este danado, protegido o guardado en otro formato.");
  }

  const hoja = workbook.worksheets[0];
  if (!hoja) lanzar("El Excel no contiene hojas para validar.");

  const { encabezados, filaEncabezado } = obtenerEncabezados(hoja);
  const encabezadosCarga = encabezados.filter((item) => COLUMNAS_CARGA_EXCEL.has(item.nombre));
  validarColumnasObligatorias(encabezadosCarga);

  const filas = [];
  hoja.eachRow((row, rowNumber) => {
    if (rowNumber <= filaEncabezado) return;
    const fila = {};
    encabezadosCarga.forEach(({ nombre, columna }) => {
      fila[nombre] = limpiarTexto(row.getCell(columna).text);
    });
    if (Object.values(fila).some(Boolean)) filas.push({ filaExcel: rowNumber, ...fila });
  });

  return filas;
}

function obtenerEncabezados(hoja) {
  for (let fila = 1; fila <= Math.min(10, hoja.rowCount); fila += 1) {
    const encabezados = [];
    hoja.getRow(fila).eachCell((cell, columna) => {
      const nombre = normalizarEncabezado(cell.text);
      if (nombre) encabezados.push({ nombre, columna });
    });

    const disponibles = new Set(encabezados.map((item) => item.nombre));
    if (esFormatoCargaGeneral(disponibles) || esFormatoCargaCambridge(disponibles) || esFormatoDocenteTalleres(disponibles)) {
      return { encabezados, filaEncabezado: fila };
    }
  }

  lanzar("No se encontro la fila de encabezados del Excel.");
}

function validarColumnasObligatorias(encabezados) {
  const disponibles = new Set(encabezados.map((item) => item.nombre));
  const formatoEstandar = esFormatoEstandar(disponibles);
  const formatoNombreCompleto = esFormatoNombreCompleto(disponibles);
  const formatoDocenteTalleres = esFormatoDocenteTalleres(disponibles);
  const formatoCambridgeLista = esFormatoCambridgeLista(disponibles);
  const obligatorias = formatoEstandar
    ? ["dni", "alumno", "nivel_educativo", "grado", "curso_programa"]
    : formatoCambridgeLista
      ? ["dni", "grado", "seleccion", "curso_programa"]
      : esFormatoCargaCambridge(disponibles) && !esFormatoCargaGeneral(disponibles)
      ? ["dni", "alumno", "grado", "seleccion"]
      : formatoDocenteTalleres
        ? ["alumno", "nivel_educativo", "grado", "curso_programa"]
      : formatoNombreCompleto
        ? ["dni", "nombres", "grado", "curso_programa"]
      : ["dni", "nombres", "apellidos", "grado", "curso_programa"];
  const faltantes = obligatorias.filter((columna) => !disponibles.has(columna));
  if (faltantes.length) lanzar(`Faltan columnas obligatorias: ${faltantes.join(", ")}.`);
}

function esFormatoEstandar(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

function esFormatoCargaGeneral(disponibles) {
  return disponibles.has("dni") && disponibles.has("curso_programa");
}

function esFormatoDocenteTalleres(disponibles) {
  return disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

function esFormatoNombreCompleto(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("nombres") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa") &&
    !disponibles.has("apellidos");
}

function esFormatoCargaCambridge(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("seleccion");
}

function esFormatoCambridgeLista(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("curso_programa") &&
    disponibles.has("seleccion") &&
    (disponibles.has("alumno") || disponibles.has("nombres"));
}

export function validarRegistros({ filas, programasPeriodo, existentes }) {
  const clavesArchivo = new Set();

  return filas.map((fila, index) => {
    const normalizada = normalizarFila(fila);
    const programaDetectado = detectarProgramaPorCurso(normalizada.curso, programasPeriodo) ||
      (normalizada.nivelCambridge ? detectarProgramaCambridge(programasPeriodo) : null);
    const errores = validarFilaCarga(normalizada, programaDetectado);
    const clave = claveAlumno(normalizada);
    const claveArchivo = programaDetectado ? `${programaDetectado.id}:${clave}` : clave;
    const existentesPrograma = new Set((existentes[programaDetectado?.id] || []).map(claveAlumno));
    const duplicadoArchivo = Boolean(claveArchivo && clavesArchivo.has(claveArchivo));
    const duplicadoPrograma = Boolean(clave && existentesPrograma.has(clave));

    if (claveArchivo) clavesArchivo.add(claveArchivo);
    if (duplicadoArchivo) errores.push("Alumno duplicado en el archivo.");
    if (duplicadoPrograma) errores.push("Alumno ya existe en el programa.");

    const estado = errores.length > 0
      ? (duplicadoArchivo || duplicadoPrograma ? "Duplicado" : "Error")
      : "Valido";

    return {
      fila: fila.filaExcel || index + 2,
      ...normalizada,
      programaId: programaDetectado?.id || "",
      programaNombre: programaDetectado?.nombre || "",
      estado,
      errores,
    };
  });
}

function normalizarFila(fila) {
  const alumno = separarAlumnoCompleto(fila.alumno);
  const nivelCambridge = limpiarTexto(fila.nivel_cambridge);
  const nombres = limpiarTexto(fila.nombres) || alumno.nombres;
  const apellidos = limpiarTexto(fila.apellidos) || alumno.apellidos;

  let dni = limpiarTexto(fila.dni);
  let codigoEstudiante = limpiarTexto(fila.codigo_estudiante);
  const rawDniOrCodigo = limpiarTexto(fila.dni_o_codigo);
  if (rawDniOrCodigo) {
    if (/^\d{8}$/.test(rawDniOrCodigo)) {
      dni = rawDniOrCodigo;
    } else {
      codigoEstudiante = rawDniOrCodigo;
    }
  }

  const rawCurso = limpiarTexto(fila.curso_programa) || limpiarTexto(fila.curso) || limpiarTexto(fila.programa);
  const rawSeleccion = limpiarTexto(fila.seleccion);
  const esSeleccionGrupo = /^[A-Z]$/i.test(rawSeleccion);
  const curso = rawCurso || (!esSeleccionGrupo ? rawSeleccion : "");

  return {
    codigoEstudiante,
    dni,
    alumno: limpiarTexto(fila.alumno) || `${nombres} ${apellidos}`.trim(),
    nombres,
    apellidos,
    nivelEducativo: limpiarTexto(fila.nivel_educativo),
    grado: limpiarTexto(fila.grado),
    seccion: limpiarTexto(fila.seccion).toUpperCase(),
    seleccion: limpiarTexto(fila.seleccion).toUpperCase(),
    nivelCambridge,
    curso,
    observacion: limpiarTexto(fila.observacion),
    estadoAlumno: "Invitado",
  };
}

function validarFilaCarga(fila, programaDetectado) {
  const errores = [];
  const esCambridge = programaDetectado && esProgramaCambridge(programaDetectado);
  if (fila.dni && !/^\d{8}$/.test(fila.dni)) errores.push("DNI invalido. Debe tener 8 digitos.");
  if (!textoSeguro(fila.alumno || `${fila.nombres} ${fila.apellidos}`)) errores.push("Falta alumno.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (!textoSeguro(fila.curso) && !textoSeguro(fila.nivelCambridge)) errores.push("Falta curso o nivel Cambridge.");
  if (fila.curso && !programaDetectado) errores.push("El programa indicado no existe en el periodo seleccionado.");
  if (!fila.curso && fila.nivelCambridge && !programaDetectado) errores.push("No se encontro un programa Cambridge para esta carga.");
  if (esCambridge && !/^[ABC]$/.test(fila.seleccion)) errores.push("Para Cambridge, seleccion debe indicar A, B o C.");
  if (programaDetectado && String(programaDetectado.estado || "Habilitado") !== "Habilitado") {
    errores.push(`El programa ${programaDetectado.nombre || "seleccionado"} esta ${programaDetectado.estado}. Habilitelo antes de cargar alumnos.`);
  }
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observación contiene caracteres no permitidos.");
  return errores;
}

function detectarProgramaPorCurso(curso, programas) {
  if (!curso) return null;
  const directo = programas.find((programa) => coincideCurso(curso, programa.nombre));
  if (directo) return directo;
  return /\b(cambridge|cambrigde|cabringde|camringde|ingles|ingless)\b/.test(normalizarComparacion(curso)) ? detectarProgramaCambridge(programas) : null;
}

function detectarProgramaCambridge(programas) {
  const candidatos = programas.filter((programa) => esProgramaCambridge(programa));
  if (candidatos.length === 1) return candidatos[0];
  if (!candidatos.length && programas.length === 1) return programas[0];
  return candidatos.find((programa) => String(programa.estado || "Habilitado") === "Habilitado") || null;
}

function esProgramaCambridge(programa) {
  const texto = normalizarComparacion([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.tipoComunicado,
    programa.tipo_comunicado,
    programa.plantilla,
    ...(programa.plantillaVariables || []),
  ].filter(Boolean).join(" "));
  return /\bcambridge\b/.test(texto) ||
    /\bcambrigde\b/.test(texto) ||
    /\bcabringde\b/.test(texto) ||
    /\bcamringde\b/.test(texto) ||
    /\bingles?s?\b/.test(texto) ||
    /\bcertificacion\b/.test(texto) ||
    /\bpreparacion\b/.test(texto) ||
    (programa.plantillaVariables || []).some((variable) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(variable)
    );
}

function coincideCurso(curso, programa) {
  const a = normalizarComparacion(curso);
  const b = normalizarComparacion(programa);
  if (a === b) return true;

  const tokensA = tokensCurso(a);
  const tokensB = tokensCurso(b);
  if (!tokensA.length || !tokensB.length) return false;

  const coincidencias = tokensA.filter((token) => tokensB.includes(token)).length;
  const coberturaCurso = coincidencias / tokensA.length;
  const coberturaPrograma = coincidencias / tokensB.length;

  return coberturaCurso >= 0.85 && coberturaPrograma >= 0.6;
}

function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `nombre:${nombre}:${alumno.grado}` : "";
}

export function obtenerInvitacionesAlumno(db, dni) {
  return (db.programas || []).flatMap((programa) => {
    const invitados = db.invitadosPorPrograma?.[programa.id] || [];
    return invitados
      .filter((invitado) => limpiarDni(invitado.dni) === dni)
      .map((invitado) => ({
        ...invitado,
        programaId: programa.id,
        programa: programa.nombre,
        periodo: programa.periodo,
        horario: programa.horario,
        costo: programa.costo,
        estadoPrograma: programa.estado,
      }));
  });
}

export function limpiarDni(valor) {
  return String(valor || "").replace(/\D/g, "");
}

export function limpiarTexto(valor) {
  return String(valor ?? "").trim().replace(/[<>]/g, "");
}

function separarAlumnoCompleto(valor) {
  const partes = limpiarTexto(valor).split(/\s+/).filter(Boolean);
  if (!partes.length) return { nombres: "", apellidos: "" };
  if (partes.length === 1) return { nombres: partes[0], apellidos: "" };
  return {
    nombres: partes.slice(0, Math.max(1, partes.length - 2)).join(" "),
    apellidos: partes.slice(Math.max(1, partes.length - 2)).join(" "),
  };
}

function textoSeguro(valor) {
  return limpiarTexto(valor).length > 0;
}

export function normalizarPeriodo(valor) {
  return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

function normalizarEncabezado(valor) {
  const encabezado = normalizarComparacion(valor)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const alias = {
    apellido: "apellidos",
    apellidos_y_nombres: "alumno",
    cod_estudiante: "codigo_estudiante",
    codigo: "codigo_estudiante",
    cod_alumno: "codigo_estudiante",
    codigo_alumno: "codigo_estudiante",
    cod_est: "codigo_estudiante",
    codigoestudiante: "codigo_estudiante",
    codigo_de_estudiante: "codigo_estudiante",
    codigo_de_estudainte: "codigo_estudiante",
    curso: "curso_programa",
    curso_taller: "curso_programa",
    id: "dni",
    nombre: "nombres",
    nombres_y_apellidos: "alumno",
    programa: "curso_programa",
    selecci_n: "seleccion",
    taller: "curso_programa",
    nivel: "nivel_educativo",
    nivel_educativo: "nivel_educativo",
    niveleducativo: "nivel_educativo",
    dni_o_codigo_de_estudiante: "dni_o_codigo",
    dni_o_codigo_de_estudainte: "dni_o_codigo",
    dni_o_codigo: "dni_o_codigo",
    dni_codigo: "dni_o_codigo",
  };
  return alias[encabezado] || encabezado;
}

export function normalizarId(valor) {
  return normalizarComparacion(valor)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "curso";
}

export function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokensCurso(valor) {
  const ignorar = new Set(["curso", "programa", "taller", "de", "del", "la", "el", "y", "para"]);
  return normalizarComparacion(valor)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !ignorar.has(token));
}

export function parseJsonArray(valor) {
  try {
    const parsed = JSON.parse(valor || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(valor) {
  try {
    const parsed = JSON.parse(valor || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function renombrarArchivo(nombre) {
  const extension = /\.xls$/i.test(nombre) ? "xls" : "xlsx";
  return `carga-${Date.now()}.${extension}`;
}

export function normalizarNombreDescarga(nombre) {
  return String(nombre || "documento.docx")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "documento.docx";
}

function lanzar(publicMessage) {
  const error = new Error(publicMessage);
  error.publicMessage = publicMessage;
  throw error;
}
