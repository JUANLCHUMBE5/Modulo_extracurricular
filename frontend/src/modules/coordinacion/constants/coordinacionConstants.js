export const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

export const variablesPlantillaRequeridas = [
  { id: "n_com", label: "N_COM", aliases: ["N_COM"] },
  { id: "titulo", label: "TITULO", aliases: ["TITULO", "TÍTULO"] },
  { id: "fecha", label: "FECHA", aliases: ["FECHA"] },
  { id: "area", label: "AREA", aliases: ["AREA", "ÁREA"] },
  { id: "prog", label: "PROG", aliases: ["PROG", "PROGRAMA"] },
  { id: "ciclo", label: "CICLO", aliases: ["CICLO"] },
  { id: "ini", label: "INI", aliases: ["INI", "INICIO"] },
  { id: "fin", label: "FIN", aliases: ["FIN"] },
  { id: "dur", label: "DUR", aliases: ["DUR", "DURACION", "DURACIÓN"] },
  { id: "n1", label: "N1", aliases: ["N1"] },
  { id: "n2", label: "N2", aliases: ["N2"] },
  { id: "n3", label: "N3", aliases: ["N3"] },
  { id: "n4", label: "N4", aliases: ["N4"] },
  { id: "dia", label: "DIA", aliases: ["DIA", "DÍA"] },
  { id: "alm", label: "ALM", aliases: ["ALM", "ALMUERZO"] },
  { id: "clase", label: "CLASE", aliases: ["CLASE"] },
  { id: "pago", label: "PAGO", aliases: ["PAGO"] },
  { id: "costo", label: "COSTO", aliases: ["COSTO"] },
  { id: "hor_alm", label: "HOR_ALM", aliases: ["HOR_ALM"] },
  { id: "alumno", label: "ALUMNO", aliases: ["ALUMNO", "NOMBRE_ALUMNO", "NOMBRE DEL ALUMNO", "ESTUDIANTE"] },
  { id: "gr_sec", label: "GR_SEC", aliases: ["GR_SEC", "GRADO_SECCION", "GRADO SECCION"] },
  { id: "apod", label: "APOD", aliases: ["APOD", "APODERADO", "NOMBRE_APODERADO"] },
  { id: "cel", label: "CEL", aliases: ["CEL", "CELULAR", "TELEFONO", "TELÉFONO"] },
];

export const variablesPlantillaCambridge = [
  { id: "fecha_carta", label: "FECHA_CARTA", aliases: ["FECHA_CARTA"] },
  { id: "anio_carta", label: "ANIO_CARTA", aliases: ["ANIO_CARTA", "AÑO_CARTA"] },
  { id: "anio_cert", label: "ANIO_CERT", aliases: ["ANIO_CERT", "AÑO_CERT"] },
  { id: "alu", label: "ALU", aliases: ["ALU", "ALUMNO"] },
  { id: "niv", label: "NIV", aliases: ["NIV", "NIVEL"] },
  { id: "aul", label: "AUL", aliases: ["AUL", "AULA"] },
  { id: "horario", label: "HORARIO", aliases: ["HORARIO"] },
  { id: "ciclo_i", label: "CICLO_I", aliases: ["CICLO_I"] },
  { id: "ciclo_ii", label: "CICLO_II", aliases: ["CICLO_II"] },
  { id: "costo", label: "COSTO", aliases: ["COSTO"] },
  { id: "pago", label: "PAGO", aliases: ["PAGO"] },
  { id: "chk_a", label: "CHK_A", aliases: ["CHK_A"] },
  { id: "chk_b", label: "CHK_B", aliases: ["CHK_B"] },
  { id: "chk_c", label: "CHK_C", aliases: ["CHK_C"] },
];

export const variablesPlantillaReforzamiento = [
  { id: "fecha_carta", label: "FECHA_CARTA", aliases: ["FECHA_CARTA"] },
  { id: "mes_eval", label: "MES_EVAL", aliases: ["MES_EVAL"] },
  { id: "ini", label: "INI", aliases: ["INI", "INICIO"] },
  { id: "fin", label: "FIN", aliases: ["FIN"] },
  { id: "dur", label: "DUR", aliases: ["DUR", "DURACION", "DURACIÓN"] },
  { id: "nivel_1", label: "NIVEL_1", aliases: ["NIVEL_1"] },
  { id: "dias_1", label: "DIAS_1", aliases: ["DIAS_1", "DÍAS_1"] },
  { id: "alm_1", label: "ALM_1", aliases: ["ALM_1"] },
  { id: "clase_1", label: "CLASE_1", aliases: ["CLASE_1"] },
  { id: "nivel_2", label: "NIVEL_2", aliases: ["NIVEL_2"] },
  { id: "dias_2", label: "DIAS_2", aliases: ["DIAS_2", "DÍAS_2"] },
  { id: "alm_2", label: "ALM_2", aliases: ["ALM_2"] },
  { id: "clase_2", label: "CLASE_2", aliases: ["CLASE_2"] },
  { id: "costo", label: "COSTO", aliases: ["COSTO"] },
  { id: "hor_alm_1", label: "HOR_ALM_1", aliases: ["HOR_ALM_1"] },
  { id: "hor_alm_2", label: "HOR_ALM_2", aliases: ["HOR_ALM_2"] },
  { id: "alumno", label: "ALUMNO", aliases: ["ALUMNO", "NOMBRE_ALUMNO", "NOMBRE DEL ALUMNO", "ESTUDIANTE"] },
  { id: "gr_sec", label: "GR_SEC", aliases: ["GR_SEC", "GRADO_SECCION", "GRADO SECCION"] },
  { id: "apod", label: "APOD", aliases: ["APOD", "APODERADO", "NOMBRE_APODERADO"] },
  { id: "cel", label: "CEL", aliases: ["CEL", "CELULAR", "TELEFONO", "TELÉFONO"] },
];

export const modelosPlantilla = [
  { id: "general", label: "Formato general", variables: variablesPlantillaRequeridas },
  { id: "cambridge", label: "Formato Cambridge", variables: variablesPlantillaCambridge },
  { id: "reforzamiento", label: "Formato reforzamiento", variables: variablesPlantillaReforzamiento },
];

export const variablesPlantillaAceptadas = unirVariablesPlantilla([
  ...variablesPlantillaRequeridas,
  ...variablesPlantillaCambridge,
  ...variablesPlantillaReforzamiento,
]);

export const nivelesGrados = [
  { nivel: "Inicial", grados: ["3 años", "4 años", "5 años"] },
  { nivel: "Primaria", grados: ["1", "2", "3", "4", "5", "6"] },
  { nivel: "Secundaria", grados: ["1", "2", "3", "4", "5"] },
];

export const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function unirVariablesPlantilla(variables) {
  const vistas = new Map();
  variables.forEach((variable) => {
    if (!vistas.has(variable.id)) vistas.set(variable.id, variable);
  });
  return Array.from(vistas.values());
}
