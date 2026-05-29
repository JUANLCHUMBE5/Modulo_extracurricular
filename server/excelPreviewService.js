import ExcelJS from "exceljs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const COLUMNAS_CARGA_EXCEL = new Set([
  "alumno",
  "apellidos",
  "codigo_estudiante",
  "curso_programa",
  "dni",
  "grado",
  "nivel_cambridge",
  "nivel_educativo",
  "nombres",
  "observacion",
  "programa",
  "seccion",
  "seleccion",
]);

export async function generarPreviewCargaExcel({ periodo, archivo, programas, existentes }) {
  const periodoNormalizado = normalizarPeriodo(periodo);
  validarArchivoExcel(archivo);

  const programasPeriodo = (programas || []).filter((programa) =>
    normalizarPeriodo(programa.periodo) === periodoNormalizado
  );

  const filas = await leerExcelSeguro(archivo);
  const registros = validarRegistros({ filas, programasPeriodo, existentes: existentes || {} });

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

async function leerExcelSeguro(archivo) {
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
  const obligatorias = formatoEstandar
    ? ["dni", "alumno", "nivel_educativo", "grado", "seccion", "curso_programa"]
    : esFormatoCargaCambridge(disponibles) && !esFormatoCargaGeneral(disponibles)
      ? ["dni", "alumno", "grado", "seccion", "seleccion", "nivel_cambridge"]
      : formatoDocenteTalleres
        ? ["alumno", "nivel_educativo", "grado", "seccion", "curso_programa"]
      : formatoNombreCompleto
        ? ["dni", "nombres", "grado", "seccion", "curso_programa"]
      : ["dni", "nombres", "apellidos", "grado", "seccion", "curso_programa"];
  const faltantes = obligatorias.filter((columna) => !disponibles.has(columna));
  if (faltantes.length) lanzar(`Faltan columnas obligatorias: ${faltantes.join(", ")}.`);
}

function esFormatoEstandar(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("seccion") &&
    disponibles.has("curso_programa");
}

function esFormatoCargaGeneral(disponibles) {
  return disponibles.has("dni") && disponibles.has("curso_programa");
}

function esFormatoDocenteTalleres(disponibles) {
  return disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("seccion") &&
    disponibles.has("curso_programa");
}

function esFormatoNombreCompleto(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("nombres") &&
    disponibles.has("grado") &&
    disponibles.has("seccion") &&
    disponibles.has("curso_programa") &&
    !disponibles.has("apellidos");
}

function esFormatoCargaCambridge(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("nivel_cambridge") &&
    disponibles.has("seleccion");
}

function validarRegistros({ filas, programasPeriodo, existentes }) {
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
  return {
    codigoEstudiante: limpiarTexto(fila.codigo_estudiante),
    dni: limpiarTexto(fila.dni),
    alumno: limpiarTexto(fila.alumno) || `${nombres} ${apellidos}`.trim(),
    nombres,
    apellidos,
    nivelEducativo: limpiarTexto(fila.nivel_educativo),
    grado: limpiarTexto(fila.grado),
    seccion: limpiarTexto(fila.seccion).toUpperCase(),
    seleccion: limpiarTexto(fila.seleccion).toUpperCase(),
    nivelCambridge,
    curso: limpiarTexto(fila.curso_programa) || limpiarTexto(fila.curso) || limpiarTexto(fila.programa),
    observacion: limpiarTexto(fila.observacion),
    estadoAlumno: "Invitado",
  };
}

function validarFilaCarga(fila, programaDetectado) {
  const errores = [];
  if (fila.dni && !/^\d{8}$/.test(fila.dni)) errores.push("DNI invalido. Debe tener 8 digitos.");
  if (!textoSeguro(fila.alumno || `${fila.nombres} ${fila.apellidos}`)) errores.push("Falta alumno.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (!textoSeguro(fila.seccion)) errores.push("Falta seccion.");
  if (!textoSeguro(fila.curso) && !textoSeguro(fila.nivelCambridge)) errores.push("Falta curso o nivel Cambridge.");
  if (fila.curso && !programaDetectado) errores.push("El programa indicado no existe en el periodo seleccionado.");
  if (!fila.curso && fila.nivelCambridge && !programaDetectado) errores.push("No se encontro un programa Cambridge para esta carga.");
  if (programaDetectado && String(programaDetectado.estado || "Habilitado") !== "Habilitado") {
    errores.push(`El programa ${programaDetectado.nombre || "seleccionado"} esta ${programaDetectado.estado}. Habilitelo antes de cargar alumnos.`);
  }
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observacion contiene caracteres no permitidos.");
  return errores;
}

function detectarProgramaPorCurso(curso, programas) {
  if (!curso) return null;
  return programas.find((programa) => coincideCurso(curso, programa.nombre)) || null;
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
    programa.categoria,
    programa.plantilla,
    ...(programa.plantillaVariables || []),
  ].filter(Boolean).join(" "));
  return /\bcambridge\b/.test(texto) ||
    /\bcertificacion\b/.test(texto) ||
    /\bpreparacion\b/.test(texto) ||
    (programa.plantillaVariables || []).some((variable) =>
      ["fecha_carta", "anio_cert", "nivel_cambridge", "ciclo_i", "ciclo_ii", "chk_a", "chk_b", "chk_c"].includes(variable)
    );
}

function coincideCurso(curso, programa) {
  const a = normalizarComparacion(curso);
  const b = normalizarComparacion(programa);
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const tokensA = tokensCurso(a);
  const tokensB = tokensCurso(b);
  if (!tokensA.length || !tokensB.length) return false;

  const coincidencias = tokensA.filter((token) => tokensB.includes(token)).length;
  return coincidencias >= Math.min(2, tokensA.length, tokensB.length);
}

function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `nombre:${nombre}:${alumno.grado}:${alumno.seccion}` : "";
}

function limpiarTexto(valor) {
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

function normalizarPeriodo(valor) {
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
    curso: "curso_programa",
    curso_taller: "curso_programa",
    id: "dni",
    nombre: "nombres",
    nombres_y_apellidos: "alumno",
    programa: "curso_programa",
    taller: "curso_programa",
  };
  return alias[encabezado] || encabezado;
}

function normalizarComparacion(valor) {
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

function renombrarArchivo(nombre) {
  const extension = /\.xls$/i.test(nombre) ? "xls" : "xlsx";
  return `carga-${Date.now()}.${extension}`;
}

function lanzar(publicMessage) {
  const error = new Error(publicMessage);
  error.publicMessage = publicMessage;
  throw error;
}
