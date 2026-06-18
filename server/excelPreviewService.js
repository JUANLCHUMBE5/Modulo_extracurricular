import ExcelJS from "exceljs";
import { gradoCorrespondeAlProgramaApi, obtenerGradoCompletoApi } from "./apiMappers.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const COLUMNAS_CARGA_EXCEL = new Set([
  "alumno",
  "apellidos",
  "codigo_estudiante",
  "curso_programa",
  "dni",
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

export async function generarPreviewCargaExcel({ periodo, archivo, programas, existentes, estudiantes, programaId }) {
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
  if (programaSeleccionado && !esCategoriaAcademica(programaSeleccionado)) {
    lanzar("La carga de alumnos solo permite programas de categoria Academico.");
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
    if (esFormatoCargaMasiva(disponibles) || esFormatoCargaGeneral(disponibles) || esFormatoCargaCambridge(disponibles) || esFormatoDocenteTalleres(disponibles)) {
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
  const formatoCargaMasiva = esFormatoCargaMasiva(disponibles);
  const obligatorias = formatoCargaMasiva
    ? [
        disponibles.has("dni") ? "dni" : "codigo_estudiante",
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

function esFormatoEstandar(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

function esFormatoCargaGeneral(disponibles) {
  return disponibles.has("curso_programa") &&
    (disponibles.has("dni") || disponibles.has("id") || disponibles.has("alumno") || disponibles.has("nombres"));
}

function esFormatoDocenteTalleres(disponibles) {
  return disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

function esFormatoNombreCompleto(disponibles) {
  return disponibles.has("nombres") &&
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

function validarRegistros({ filas, programasPeriodo, programaSeleccionado, existentes, estudiantes }) {
  const clavesArchivo = new Set();
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

function normalizarFila(fila) {
  const alumno = separarAlumnoCompleto(fila.alumno);
  const nivelCambridge = limpiarTexto(fila.nivel_cambridge);
  const nombres = limpiarTexto(fila.nombres) || alumno.nombres;
  const apellidos = limpiarTexto(fila.apellidos) || alumno.apellidos;
  return {
    codigoEstudiante: limpiarTexto(fila.codigo_estudiante),
    idExcel: limpiarTexto(fila.id),
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

function validarFilaCarga(fila, programaDetectado, opciones = {}) {
  const errores = [...(fila.erroresDatos || [])];
  const esCambridge = programaDetectado && esProgramaCambridge(programaDetectado);
  if (!fila.dni) {
    errores.push("Falta DNI y no se pudo resolver con el codigo de estudiante.");
  } else if (!/^\d{8}$/.test(fila.dni)) {
    errores.push("DNI invalido. Debe tener 8 digitos.");
  }
  if (!textoSeguro(fila.alumno || `${fila.nombres} ${fila.apellidos}`)) errores.push("Falta alumno.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (!opciones.programaSeleccionado) {
    if (!textoSeguro(fila.curso) && !textoSeguro(fila.nivelCambridge)) errores.push("Falta curso o nivel Cambridge.");
    if (fila.curso && !programaDetectado) errores.push("El programa indicado no existe en el periodo seleccionado.");
    if (!fila.curso && fila.nivelCambridge && !programaDetectado) errores.push("No se encontro un programa Cambridge para esta carga.");
    if (esCambridge && !/^[A]$/.test(fila.seleccion)) errores.push("Para Cambridge, seleccion debe indicar A.");
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

function detectarProgramaPorCurso(curso, programas) {
  if (!curso) return null;
  const directo = programas.find((programa) => coincideCurso(curso, programa.nombre));
  if (directo) return directo;
  return /\bcambridge\b/.test(normalizarComparacion(curso)) ? detectarProgramaCambridge(programas) : null;
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

function esFormatoCargaMasiva(disponibles) {
  return (disponibles.has("dni") || disponibles.has("codigo_estudiante")) &&
    disponibles.has("grado") &&
    (disponibles.has("alumno") || disponibles.has("nombres")) &&
    disponibles.has("nivel_educativo");
}

function crearIndiceEstudiantes(estudiantes = {}) {
  const porDni = new Map();
  const porCodigo = new Map();
  const porNombre = new Map();

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

function resolverEstudianteBase(fila, indice) {
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

function claveAlumno(alumno) {
  const dni = String(alumno.dni || "").replace(/\D/g, "");
  if (dni) return `dni:${dni}`;
  if (alumno.codigoEstudiante) return `codigo:${normalizarComparacion(alumno.codigoEstudiante)}`;
  const nombre = normalizarComparacion(`${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim());
  return nombre ? `nombre:${nombre}:${normalizarComparacion(alumno.grado)}` : "";
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

function esCategoriaAcademica(programa = {}) {
  return normalizarComparacion(programa.categoria).includes("academ");
}

function normalizarEncabezado(valor) {
  const encabezado = normalizarComparacion(valor)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const alias = {
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
    curso: "curso_programa",
    curso_taller: "curso_programa",
    nombre: "nombres",
    nombres_y_apellidos: "alumno",
    programa: "curso_programa",
    selecci_n: "seleccion",
    taller: "curso_programa",
    nivel: "nivel_educativo",
    nivel_educativo: "nivel_educativo",
    niveleducativo: "nivel_educativo",
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
