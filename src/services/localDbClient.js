// BASE LOCAL PARA DESARROLLO.
// La fuente principal es server/db.json mediante /api/db.
// En producciÃ³n serÃ¡ reemplazada por la API del sistema principal.

const STORAGE_KEY = "san_rafael_mock_database_v1";

export const initialData = {
  categorias: ["Academico", "Ingles", "Deportivo", "Verano", "Arte", "Otro"],
  nextProgramaId: 1,
  nextCargaId: 1,
  nextDocumentoId: 1,
  estudiantes: {
      "14827365": {
          "dni": "14827365",
          "codigoEstudiante": "EST-0007",
          "nombres": "Emily Vargas Castro",
          "grado": "3 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2016-12-05",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Sandra Castro",
          "telefonoApoderado": "934567812"
      },
      "25938471": {
          "dni": "25938471",
          "codigoEstudiante": "EST-0008",
          "nombres": "Diego Herrera Molina",
          "grado": "5 Primaria",
          "seccion": "C",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2014-04-27",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Traslado",
          "apoderado": "Miguel Herrera",
          "telefonoApoderado": "945678123"
      },
      "36192748": {
          "dni": "36192748",
          "codigoEstudiante": "EST-0009",
          "nombres": "Alessia Navarro Ruiz",
          "grado": "6 Primaria",
          "seccion": "B",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2013-08-11",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Carmen Ruiz",
          "telefonoApoderado": "956789234"
      },
      "47281936": {
          "dni": "47281936",
          "codigoEstudiante": "EST-0010",
          "nombres": "Fabian Cruz Salazar",
          "grado": "4 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2015-02-19",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Andrea Salazar",
          "telefonoApoderado": "967891245"
      },
      "48273615": {
          "dni": "48273615",
          "codigoEstudiante": "EST-0001",
          "nombres": "Luciana Torres Rojas",
          "grado": "3 Inicial",
          "seccion": "A",
          "nivel": "Inicial",
          "sexo": "F",
          "fechaNacimiento": "2021-03-12",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Mariela Rojas",
          "telefonoApoderado": "987654321"
      },
      "58392017": {
          "dni": "58392017",
          "codigoEstudiante": "EST-0011",
          "nombres": "Nicole Fernandez Vega",
          "grado": "1 Secundaria",
          "seccion": "A",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2012-10-03",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Pedro Fernandez",
          "telefonoApoderado": "978123456"
      },
      "59381724": {
          "dni": "59381724",
          "codigoEstudiante": "EST-0002",
          "nombres": "Mateo Quispe Huaman",
          "grado": "4 Inicial",
          "seccion": "B",
          "nivel": "Inicial",
          "sexo": "M",
          "fechaNacimiento": "2020-07-09",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Rosa Huaman",
          "telefonoApoderado": "954321876"
      },
      "60491827": {
          "dni": "60491827",
          "codigoEstudiante": "EST-0003",
          "nombres": "Valentina Chavez Flores",
          "grado": "5 Inicial",
          "seccion": "A",
          "nivel": "Inicial",
          "sexo": "F",
          "fechaNacimiento": "2019-11-21",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Luis Chavez",
          "telefonoApoderado": "912345678"
      },
      "69403128": {
          "dni": "69403128",
          "codigoEstudiante": "EST-0012",
          "nombres": "Aaron Castillo Ramos",
          "grado": "2 Secundaria",
          "seccion": "B",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2011-06-14",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Luis Castillo",
          "telefonoApoderado": "989234567"
      },
      "70514239": {
          "dni": "70514239",
          "codigoEstudiante": "EST-0013",
          "nombres": "Daniela Mendoza Ortiz",
          "grado": "3 Secundaria",
          "seccion": "C",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-09-22",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Egresado",
          "apoderado": "Julia Ortiz",
          "telefonoApoderado": "991345678"
      },
      "71529483": {
          "dni": "71529483",
          "codigoEstudiante": "EST-0004",
          "nombres": "Thiago Ramos Medina",
          "grado": "5 Inicial",
          "seccion": "C",
          "nivel": "Inicial",
          "sexo": "M",
          "fechaNacimiento": "2019-01-30",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Patricia Medina",
          "telefonoApoderado": "965478123"
      },
      "81625340": {
          "dni": "81625340",
          "codigoEstudiante": "EST-0014",
          "nombres": "Bruno Silva Aquino",
          "grado": "4 Secundaria",
          "seccion": "A",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2009-01-17",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Ricardo Silva",
          "telefonoApoderado": "902456789"
      },
      "82637491": {
          "dni": "82637491",
          "codigoEstudiante": "EST-0005",
          "nombres": "Camila Paredes Silva",
          "grado": "4 Inicial",
          "seccion": "A",
          "nivel": "Inicial",
          "sexo": "F",
          "fechaNacimiento": "2020-06-18",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Retirado",
          "apoderado": "Jorge Paredes",
          "telefonoApoderado": "978451236"
      },
      "92736451": {
          "dni": "92736451",
          "codigoEstudiante": "EST-0015",
          "nombres": "Mariana Gutierrez Leon",
          "grado": "5 Secundaria",
          "seccion": "B",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2008-05-08",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Teresa Leon",
          "telefonoApoderado": "913567890"
      },
      "93716284": {
          "dni": "93716284",
          "codigoEstudiante": "EST-0006",
          "nombres": "Sebastian Lopez Garcia",
          "grado": "2 Primaria",
          "seccion": "B",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2017-09-15",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Rafael Lopez",
          "telefonoApoderado": "923456781"
      }
  },
  programas: [],
  invitadosPorPrograma: {},
  inscripciones: [],
  documentosGenerados: [],
  pagos: [],
  asistencias: [],
  historialCargas: [],
  usuarios: [
    { id: "1", nombre: "Admin Principal", usuario: "admin", rol: "Administrador", estado: "Activo", contrasena: "1234" },
    { id: "2", nombre: "Maria Secretaria", usuario: "secretaria", rol: "Secretaria", estado: "Activo", contrasena: "1234" },
    { id: "3", nombre: "Jose Caja", usuario: "caja", rol: "Caja", estado: "Activo", contrasena: "1234" },
    { id: "4", nombre: "Ana Coordinadora", usuario: "coordinacion", rol: "Coordinacion", estado: "Activo", contrasena: "1234" },
    { id: "5", nombre: "Auxiliar de Ingreso", usuario: "aux", rol: "Auxiliar", estado: "Activo", contrasena: "1234" },
    { id: "6", nombre: "Direccion General", usuario: "dir", rol: "Direccion", estado: "Activo", contrasena: "1234" },
    { id: "7", nombre: "Profesor Responsable", usuario: "profe", rol: "Coordinacion", estado: "Activo", contrasena: "1234" },
  ],
};

export const mockDb = loadDatabase();

export async function saveMockDb() {
  if (typeof window === "undefined") return;
  const db = await persistirApiLocal(mockDb);
  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key];
  });
  Object.assign(mockDb, mergeWithDefaults(db || mockDb, structuredCloneSafe(initialData)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
  window.dispatchEvent(new CustomEvent("mock-db-updated"));
}

export async function syncMockDbFromStorage() {
  if (typeof window === "undefined") return mockDb;
  const remoto = await leerApiLocal();
  if (remoto) {
    const freshData = mergeWithDefaults(remoto, structuredCloneSafe(initialData));
    Object.keys(mockDb).forEach((key) => {
      delete mockDb[key];
    });
    Object.assign(mockDb, freshData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
    return mockDb;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return mockDb;

  try {
    const freshData = mergeWithDefaults(JSON.parse(stored), structuredCloneSafe(initialData));
    Object.keys(mockDb).forEach((key) => {
      delete mockDb[key];
    });
    Object.assign(mockDb, freshData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return mockDb;
}

export async function resetMockDb() {
  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key];
  });
  Object.assign(mockDb, structuredCloneSafe(initialData));
  await saveMockDb();
}

export function nextMockId(key) {
  const value = Number(mockDb[key] || 1);
  mockDb[key] = value + 1;
  saveMockDb();
  return value;
}

async function leerApiLocal() {
  try {
    const { localDbApi } = await import("./apiClient.js");
    return await localDbApi.getDatabase();
  } catch {
    return null;
  }
}

async function persistirApiLocal(data) {
  try {
    const { localDbApi } = await import("./apiClient.js");
    return await localDbApi.saveDatabase(data);
  } catch {
    // Si la API local no esta levantada, se conserva un respaldo temporal en localStorage.
    return data;
  }
}

function loadDatabase() {
  if (typeof window === "undefined") return structuredCloneSafe(initialData);

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const data = structuredCloneSafe(initialData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  try {
    return mergeWithDefaults(JSON.parse(stored), structuredCloneSafe(initialData));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return structuredCloneSafe(initialData);
  }
}

function mergeWithDefaults(stored, defaults) {
  const merged = {
    ...defaults,
    ...stored,
    categorias: Array.isArray(stored.categorias) && stored.categorias.length ? stored.categorias : defaults.categorias,
    estudiantes: stored.estudiantes && typeof stored.estudiantes === "object" ? stored.estudiantes : defaults.estudiantes,
    programas: Array.isArray(stored.programas) ? stored.programas : defaults.programas,
    invitadosPorPrograma: stored.invitadosPorPrograma && typeof stored.invitadosPorPrograma === "object"
      ? stored.invitadosPorPrograma
      : defaults.invitadosPorPrograma,
    inscripciones: Array.isArray(stored.inscripciones) ? stored.inscripciones : defaults.inscripciones,
    documentosGenerados: Array.isArray(stored.documentosGenerados) ? stored.documentosGenerados : defaults.documentosGenerados,
    pagos: Array.isArray(stored.pagos) ? stored.pagos : defaults.pagos,
    asistencias: Array.isArray(stored.asistencias) ? stored.asistencias : defaults.asistencias,
    historialCargas: Array.isArray(stored.historialCargas) ? stored.historialCargas : defaults.historialCargas,
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
    usuarios: mergeUsuarios(defaults.usuarios, stored.usuarios || []),
  };
  return merged;
}

function mergeUsuarios(defaults, stored) {
  const usuarios = Array.isArray(stored) ? stored : [];
  const porUsuario = new Map();
  defaults.forEach((usuario) => {
    porUsuario.set(String(usuario.usuario || "").toLowerCase(), usuario);
  });
  usuarios.forEach((usuario) => {
    const clave = String(usuario.usuario || "").toLowerCase();
    if (!clave) return;
    porUsuario.set(clave, {
      ...(porUsuario.get(clave) || {}),
      ...usuario,
    });
  });
  return Array.from(porUsuario.values());
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
