import ExcelJS from "exceljs";
import { gradoCorrespondeAlProgramaApi, obtenerGradoCompletoApi } from "./mappers.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const COLUMNAS_CARGA_EXCEL = new Set([
  "alumno",
  "apellidos",
  "codigo_estudiante",
  "curso_programa",
  "dni",
  "dni_o_codigo",
  "grado",
  "id",
  "nivel_cambridge",
  "nivel_educativo",
  "nombres",
  "observacion",
  "programa",
  "seccion",
  "seleccion",
]);

export interface PreviewCargaParams {
  periodo: string;
  archivo: any;
  programas: any[];
  existentes: Record<string, any[]>;
  estudiantes: Record<string, any>;
  programaId?: string | null;
}

export interface PreviewCargaResult {
  id: string;
  periodo: "verano" | "escolar";
  archivoNombre: string;
  registros: any[];
  resumen: {
    total: number;
    validos: number;
    errores: number;
    duplicados: number;
  };
}

/**
 * Genera una previsualización estructurada a partir del procesamiento y validación de un archivo Excel de alumnos.
 * Cruza la información del Excel con los programas académicos del periodo y los alumnos existentes.
 * 
 * @param params Parámetros que contienen el periodo, archivo binario, programas, alumnos existentes e ID de programa opcional.
 * @returns Objeto de previsualización que contiene el resumen de registros válidos, duplicados y con errores.
 */
export async function generarPreviewCargaExcel({
  periodo,
  archivo,
  programas,
  existentes,
  estudiantes,
  programaId
}: PreviewCargaParams): Promise<PreviewCargaResult> {
  const periodoNormalizado = normalizarPeriodo(periodo);
  validarArchivoExcel(archivo);

  const programasPeriodo = (programas || []).filter((programa) =>
    normalizarPeriodo(programa.periodo) === periodoNormalizado
  );
  const programaSeleccionado = programaId
    ? programasPeriodo.find((programa) => String(programa.id) === String(programaId)) || null
    : null;

  if (programaId && !programaSeleccionado) {
    lanzar("Seleccione un programa habilitado del periodo actual antes de cargar el Excel.");
  }

  const filas = await leerExcelSeguro(archivo);
  const registros = validarRegistros({
    filas,
    programasPeriodo,
    programaSeleccionado,
    existentes: existentes || {},
    estudiantes: estudiantes || {},
  });

  return {
    id: `PREVIEW-${Date.now()}`,
    periodo: periodoNormalizado,
    archivoNombre: renombrarArchivo(archivo.originalname),
    registros,
    resumen: {
      total: registros.length,
      validos: registros.filter((item) => item.estado === "Valido").length,
      errores: registros.filter((item) => item.estado === "Error").length,
      duplicados: registros.filter((item) => item.estado === "Duplicado").length,
    },
  };
}

/**
 * Valida la integridad básica de un archivo cargado antes de procesarlo.
 * Verifica la existencia, la extensión (.xlsx o .xls), tamaño máximo de 5MB y firma mágica de archivo .xlsx.
 * 
 * @param archivo Archivo cargado a validar.
 */
export function validarArchivoExcel(archivo: any): void {
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

/**
 * Lee de forma segura un buffer de archivo Excel usando ExcelJS,
 * localizando dinámicamente los encabezados y extrayendo los datos en formato de objetos planos.
 * 
 * @param archivo Archivo con el buffer de datos Excel.
 * @returns Array de objetos que representan las filas legibles del Excel.
 */
async function leerExcelSeguro(archivo: any): Promise<any[]> {
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

  const filas: any[] = [];
  hoja.eachRow((row, rowNumber) => {
    if (rowNumber <= filaEncabezado) return;
    const fila: Record<string, string> = {};
    encabezadosCarga.forEach(({ nombre, columna }) => {
      fila[nombre] = limpiarTexto(row.getCell(columna).text);
    });
    if (Object.values(fila).some(Boolean)) filas.push({ filaExcel: rowNumber, ...fila });
  });

  return filas;
}

interface EncabezadoInfo {
  nombre: string;
  columna: number;
}

/**
 * Escanea dinámicamente las primeras 10 filas de una hoja de cálculo
 * para identificar los nombres oficiales de columnas válidos del sistema.
 * 
 * @param hoja Hoja de cálculo de ExcelJS.
 * @returns Estructura con la fila de encabezado y la lista de columnas encontradas con su número correlativo.
 */
function obtenerEncabezados(hoja: ExcelJS.Worksheet): { encabezados: EncabezadoInfo[]; filaEncabezado: number } {
  for (let fila = 1; fila <= Math.min(10, hoja.rowCount); fila += 1) {
    const encabezados: EncabezadoInfo[] = [];
    hoja.getRow(fila).eachCell((cell, columna) => {
      const nombre = normalizarEncabezado(cell.text);
      if (nombre) encabezados.push({ nombre, columna });
    });

    const disponibles = new Set(encabezados.map((item) => item.nombre));
    if (esFormatoCargaMasiva(disponibles) || esFormatoCargaGeneral(disponibles) || esFormatoCargaCambridge(disponibles) || esFormatoDocenteTalleres(disponibles)) {
      return { encabezados, filaEncabezado: fila };
    }
  }

  lanzar("No se encontro la fila de encabezados del Excel.");
}

/**
 * Valida que los encabezados disponibles contengan las columnas obligatorias
 * según la variante del formato del archivo Excel (Estándar, Cambridge, Masivo, Docente).
 * 
 * @param encabezados Lista de encabezados leídos.
 */
function validarColumnasObligatorias(encabezados: EncabezadoInfo[]): void {
  const disponibles = new Set(encabezados.map((item) => item.nombre));
  const formatoEstandar = esFormatoEstandar(disponibles);
  const formatoNombreCompleto = esFormatoNombreCompleto(disponibles);
  const formatoDocenteTalleres = esFormatoDocenteTalleres(disponibles);
  const formatoCambridgeLista = esFormatoCambridgeLista(disponibles);
  const formatoCargaMasiva = esFormatoCargaMasiva(disponibles);
  
  const obligatorias = formatoCargaMasiva
    ? [
        disponibles.has("dni_o_codigo") ? "dni_o_codigo" : (disponibles.has("dni") ? "dni" : "codigo_estudiante"),
        disponibles.has("alumno") ? "alumno" : "nombres",
        "grado",
        "nivel_educativo"
      ]
    : formatoEstandar
    ? ["dni", "alumno", "nivel_educativo", "grado", "curso_programa"]
    : formatoCambridgeLista
      ? ["dni", "grado", "seleccion", "curso_programa"]
      : esFormatoCargaCambridge(disponibles) && !esFormatoCargaGeneral(disponibles)
      ? ["dni", "alumno", "grado", "seleccion"]
      : formatoDocenteTalleres
        ? ["alumno", "nivel_educativo", "grado", "curso_programa"]
      : formatoNombreCompleto
        ? ["nombres", "grado", "curso_programa"]
      : ["dni", "nombres", "apellidos", "grado", "curso_programa"];
      
  const faltantes = obligatorias.filter((columna) => !disponibles.has(columna));
  if (faltantes.length) lanzar(`Faltan columnas obligatorias: ${faltantes.join(", ")}.`);
}

/**
 * Comprueba si la lista de columnas tiene el formato estándar (DNI, Alumno, Grado, Programa, Nivel).
 */
function esFormatoEstandar(disponibles: Set<string>): boolean {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

/**
 * Comprueba si la lista de columnas contiene campos mínimos de programa y alumno para una carga general.
 */
function esFormatoCargaGeneral(disponibles: Set<string>): boolean {
  return disponibles.has("curso_programa") &&
    (disponibles.has("dni") || disponibles.has("id") || disponibles.has("alumno") || disponibles.has("nombres"));
}

/**
 * Comprueba si la lista de columnas corresponde al formato de docentes de talleres.
 */
function esFormatoDocenteTalleres(disponibles: Set<string>): boolean {
  return disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

/**
 * Comprueba si el Excel contiene la estructura de nombres de estudiantes (sin apellidos explícitos).
 */
function esFormatoNombreCompleto(disponibles: Set<string>): boolean {
  return disponibles.has("nombres") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa") &&
    !disponibles.has("apellidos");
}

/**
 * Comprueba si el Excel es una plantilla de selección simple de Cambridge.
 */
function esFormatoCargaCambridge(disponibles: Set<string>): boolean {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("seleccion");
}

/**
 * Comprueba si corresponde al listado general de pre-selección de niveles Cambridge.
 */
function esFormatoCambridgeLista(disponibles: Set<string>): boolean {
  return disponibles.has("dni") &&
    disponibles.has("curso_programa") &&
    disponibles.has("seleccion") &&
    (disponibles.has("alumno") || disponibles.has("nombres"));
}

interface ValidarRegistrosParams {
  filas: any[];
  programasPeriodo: any[];
  programaSeleccionado: any;
  existentes: Record<string, any[]>;
  estudiantes: Record<string, any>;
}

/**
 * Realiza la validación a nivel de negocio y lógica de negocio para cada fila extraída del Excel.
 * Detecta duplicados, valida existencia del programa, comprueba correspondencia de grados
 * y evalúa conflictos de identidad (ej: DNI que pertenece a otro alumno).
 * 
 * @param params Objeto con filas, programas del periodo, base de estudiantes e inscripciones existentes.
 * @returns Array de filas procesadas con su respectiva lista de errores y estado final ("Valido", "Duplicado" o "Error").
 */
function validarRegistros({
  filas,
  programasPeriodo,
  programaSeleccionado,
  existentes,
  estudiantes
}: ValidarRegistrosParams): any[] {
  const clavesArchivo = new Set<string>();
  const indiceEstudiantes = crearIndiceEstudiantes(estudiantes);

  return filas.map((fila, index) => {
    const normalizada = resolverEstudianteBase(normalizarFila(fila), indiceEstudiantes);
    const programaDetectado = programaSeleccionado ||
      detectarProgramaPorCurso(normalizada.curso, programasPeriodo) ||
      (normalizada.nivelCambridge ? detectarProgramaCambridge(programasPeriodo) : null);
    const errores = validarFilaCarga(normalizada, programaDetectado, { programaSeleccionado: Boolean(programaSeleccionado) });
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

/**
 * Normaliza las celdas de una fila cruda de Excel estructurando los campos de DNI, código de estudiante,
 * nombre del taller, nivel Cambridge y nombres/apellidos limpios.
 * 
 * @param fila Fila del Excel leída.
 * @returns Fila normalizada.
 */
function normalizarFila(fila: any): any {
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
    idExcel: limpiarTexto(fila.id),
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

/**
 * Valida la consistencia de datos de una fila particular (formatos de DNI, existencia del programa
 * y si el grado del alumno está en el rango permitido del programa).
 * 
 * @param fila Objeto de la fila normalizada.
 * @param programaDetectado Objeto del programa/taller asignado.
 * @param opciones Indicador si el taller fue pre-seleccionado estáticamente.
 * @returns Array con la lista de mensajes de error de validación (vacío si es válido).
 */
function validarFilaCarga(fila: any, programaDetectado: any, opciones: any = {}): string[] {
  const errores = [...(fila.erroresDatos || [])];
  const esCambridge = programaDetectado && esProgramaCambridge(programaDetectado);
  if (!fila.dni) {
    errores.push("Falta DNI y no se pudo resolver con el codigo de estudiante.");
  } else if (!/^\d{8}$/.test(fila.dni)) {
    errores.push("DNI invalido. Debe tener 8 digitos.");
  }
  if (!textoSeguro(fila.alumno || `${fila.nombres} ${fila.apellidos}`)) errores.push("Falta alumno.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (opciones.programaSeleccionado) {
    if (fila.curso && !coincideCurso(fila.curso, programaDetectado.nombre)) {
      errores.push(`El taller en el Excel ("${fila.curso}") no coincide con el seleccionado ("${programaDetectado.nombre}").`);
    }
  } else {
    if (!textoSeguro(fila.curso) && !textoSeguro(fila.nivelCambridge)) errores.push("Falta curso o nivel Cambridge.");
    if (fila.curso && !programaDetectado) errores.push("El programa indicado no existe en el periodo seleccionado.");
    if (!fila.curso && fila.nivelCambridge && !programaDetectado) errores.push("No se encontro un programa Cambridge para esta carga.");
    if (esCambridge && !/^[ABC]$/.test(fila.seleccion)) errores.push("Para Cambridge, seleccion debe indicar A, B o C.");
  }
  if (programaDetectado && String(programaDetectado.estado || "Habilitado") !== "Habilitado") {
    errores.push(`El programa ${programaDetectado.nombre || "seleccionado"} esta ${programaDetectado.estado}. Habilitelo antes de cargar alumnos.`);
  }
  if (programaDetectado && !esCambridge) {
    const nivelEstudiante = fila.nivelEducativo || fila.nivel;
    const gradoCompleto = obtenerGradoCompletoApi(fila.grado, nivelEstudiante, fila.grado);
    if (!gradoCorrespondeAlProgramaApi(programaDetectado, gradoCompleto)) {
      errores.push("El alumno no esta dentro de su grado correspondiente para este taller.");
    }
  }
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observacion contiene caracteres no permitidos.");
  return errores;
}

/**
 * Busca e identifica un programa/taller en la base de datos a partir del nombre del curso extraído del Excel.
 * 
 * @param curso Nombre del curso.
 * @param programas Lista de programas del periodo actual.
 */
function detectarProgramaPorCurso(curso: string, programas: any[]): any {
  if (!curso) return null;
  const directo = programas.find((programa) => coincideCurso(curso, programa.nombre));
  if (directo) return directo;
  return /\bcambridge\b/.test(normalizarComparacion(curso)) ? detectarProgramaCambridge(programas) : null;
}

/**
 * Localiza el programa oficial Cambridge en la lista de programas del periodo actual.
 * 
 * @param programas Lista de programas disponibles.
 */
function detectarProgramaCambridge(programas: any[]): any {
  const candidatos = programas.filter((programa) => esProgramaCambridge(programa));
  if (candidatos.length === 1) return candidatos[0];
  if (!candidatos.length && programas.length === 1) return programas[0];
  return candidatos.find((programa) => String(programa.estado || "Habilitado") === "Habilitado") || null;
}

/**
 * Determina si un taller es de tipo Cambridge evaluando coincidencias léxicas.
 */
function esProgramaCambridge(programa: any): boolean {
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
    (programa.plantillaVariables || []).some((variable: string) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(variable)
    );
}

/**
 * Evalúa mediante comparación aproximada de palabras si el nombre de curso del Excel equivale a un programa.
 */
function coincideCurso(curso: string, programa: string): boolean {
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

/**
 * Valida si las columnas de encabezados corresponden al formato de carga masiva de invitados.
 */
function esFormatoCargaMasiva(disponibles: Set<string>): boolean {
  return (disponibles.has("dni") || disponibles.has("codigo_estudiante") || disponibles.has("dni_o_codigo")) &&
    disponibles.has("grado") &&
    (disponibles.has("alumno") || disponibles.has("nombres")) &&
    disponibles.has("nivel_educativo");
}

interface IndiceEstudiantes {
  porDni: Map<string, any>;
  porCodigo: Map<string, any>;
  porNombre: Map<string, any[]>;
}

/**
 * Construye índices de búsqueda rápidos en memoria (Map) de los alumnos de la institución,
 * ordenándolos por DNI, Código de Alumno y Nombre Completo.
 * 
 * @param estudiantes Diccionario maestro de estudiantes.
 */
function crearIndiceEstudiantes(estudiantes: Record<string, any> = {}): IndiceEstudiantes {
  const porDni = new Map<string, any>();
  const porCodigo = new Map<string, any>();
  const porNombre = new Map<string, any[]>();

  Object.values(estudiantes || {}).forEach((estudiante) => {
    if (!estudiante) return;
    const dni = limpiarTexto(estudiante.dni);
    const codigo = normalizarComparacion(estudiante.codigoEstudiante);
    const nombre = normalizarComparacion(estudiante.nombres);
    if (dni) porDni.set(dni, estudiante);
    if (codigo) porCodigo.set(codigo, estudiante);
    if (nombre) {
      const lista = porNombre.get(nombre) || [];
      lista.push(estudiante);
      porNombre.set(nombre, lista);
    }
  });

  return { porDni, porCodigo, porNombre };
}

/**
 * Resuelve y cruza una fila del Excel con la base de estudiantes oficial para completar información omitida
 * (como recuperar el DNI si el Excel solo aportó el código de estudiante o corregir errores ortográficos).
 * 
 * @param fila Registro normalizado del Excel.
 * @param indice Índices de búsqueda construidos en memoria.
 * @returns Registro actualizado con los datos oficiales vinculados.
 */
function resolverEstudianteBase(fila: any, indice: IndiceEstudiantes): any {
  const porDni = indice.porDni.get(fila.dni);
  const porCodigo = indice.porCodigo.get(normalizarComparacion(fila.codigoEstudiante));
  const coincidenciasNombre = indice.porNombre.get(normalizarComparacion(fila.alumno)) || [];
  const porNombre = coincidenciasNombre.length === 1 ? coincidenciasNombre[0] : null;
  const estudiante = porDni || porCodigo || porNombre;

  if (!estudiante) return fila;
  const nombreExcel = normalizarComparacion(fila.alumno);
  const nombreRegistrado = normalizarComparacion(estudiante.nombres);
  const conflictoIdentidad = nombreExcel && nombreRegistrado && nombreExcel !== nombreRegistrado;

  if (conflictoIdentidad && (porDni || porCodigo)) {
    const origen = porDni ? `DNI ${fila.dni}` : `codigo ${fila.codigoEstudiante}`;
    return {
      ...fila,
      erroresDatos: [
        ...(fila.erroresDatos || []),
        `El ${origen} ya pertenece a ${estudiante.nombres}; el Excel indica ${fila.alumno}.`,
      ],
    };
  }

  const updatedFila = { ...fila };
  if (!updatedFila.dni && estudiante.dni) {
    updatedFila.dni = estudiante.dni;
  }
  if (!updatedFila.codigoEstudiante && estudiante.codigoEstudiante) {
    updatedFila.codigoEstudiante = estudiante.codigoEstudiante;
  }
  if (!updatedFila.nivelEducativo && (estudiante.nivel || estudiante.nivelEducativo)) {
    updatedFila.nivelEducativo = estudiante.nivel || estudiante.nivelEducativo;
  }
  if (!updatedFila.seccion && estudiante.seccion) {
    updatedFila.seccion = estudiante.seccion;
  }
  if (estudiante.nombres) {
    const parts = separarAlumnoCompleto(estudiante.nombres);
    updatedFila.nombres = parts.nombres;
    updatedFila.apellidos = parts.apellidos;
    updatedFila.alumno = estudiante.nombres;
  }

  return {
    ...updatedFila,
    estudianteRegistradoDni: estudiante.dni || "",
    estudianteRegistradoCodigo: estudiante.codigoEstudiante || "",
    estudianteRegistradoNombre: estudiante.nombres || "",
  };
}

/**
 * Genera una clave única en base a los datos del alumno (dni, código o nombres/grado)
 * para detectar registros duplicados a nivel de archivos.
 * 
 * @param alumno Estudiante del Excel.
 */
function claveAlumno(alumno: any): string {
  const dni = String(alumno.dni || "").replace(/\D/g, "");
  if (dni) return `dni:${dni}`;
  if (alumno.codigoEstudiante) return `codigo:${normalizarComparacion(alumno.codigoEstudiante)}`;
  const nombre = normalizarComparacion(`${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim());
  return nombre ? `nombre:${nombre}:${normalizarComparacion(alumno.grado)}` : "";
}

/**
 * Limpia espacios y caracteres especiales HTML peligrosos de una cadena.
 */
function limpiarTexto(valor: any): string {
  return String(valor ?? "").trim().replace(/[<>]/g, "");
}

/**
 * Separa un nombre completo en nombres de pila y apellidos aproximados.
 */
function separarAlumnoCompleto(valor: any): { nombres: string; apellidos: string } {
  const partes = limpiarTexto(valor).split(/\s+/).filter(Boolean);
  if (!partes.length) return { nombres: "", apellidos: "" };
  if (partes.length === 1) return { nombres: partes[0], apellidos: "" };
  return {
    nombres: partes.slice(0, Math.max(1, partes.length - 2)).join(" "),
    apellidos: partes.slice(Math.max(1, partes.length - 2)).join(" "),
  };
}

/**
 * Verifica si un texto no está vacío y es seguro.
 */
function textoSeguro(valor: any): boolean {
  return limpiarTexto(valor).length > 0;
}

/**
 * Determina si la cadena especifica un periodo escolar ordinario o de verano.
 */
function normalizarPeriodo(valor: any): "verano" | "escolar" {
  return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

/**
 * Normaliza y limpia un string de encabezado del Excel mapeando aliases de columnas conocidas a sus nombres estandarizados en base de datos.
 */
function normalizarEncabezado(valor: any): string {
  const encabezado = normalizarComparacion(valor)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const alias: Record<string, string> = {
    apellido: "apellidos",
    apellidos_y_nombres: "alumno",
    nombre_y_apellido: "alumno",
    nombre_y_apellidos: "alumno",
    nombre_apellido: "alumno",
    nombre_apellidos: "alumno",
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
    nombre: "nombres",
    nombres_y_apellidos: "alumno",
    programa: "curso_programa",
    modalidad: "seleccion",
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

/**
 * Convierte un texto a minúsculas, remueve acentos y recorta espacios de los extremos.
 */
function normalizarComparacion(valor: any): string {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Divide el nombre de un taller en palabras (tokens) claves filtrando artículos y preposiciones.
 */
function tokensCurso(valor: string): string[] {
  const ignorar = new Set(["curso", "programa", "taller", "de", "del", "la", "el", "y", "para"]);
  return normalizarComparacion(valor)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !ignorar.has(token));
}

/**
 * Renombra el nombre del archivo subido agregando un sufijo timestamp temporal seguro de procesamiento.
 */
function renombrarArchivo(nombre: string): string {
  const extension = /\.xls$/i.test(nombre) ? "xls" : "xlsx";
  return `carga-${Date.now()}.${extension}`;
}

/**
 * Dispara una excepción controlada con un mensaje descriptivo para el usuario.
 */
function lanzar(publicMessage: string): never {
  const error = new Error(publicMessage) as any;
  error.publicMessage = publicMessage;
  throw error;
}
