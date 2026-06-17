// BASE LOCAL PARA DESARROLLO.
// La fuente principal es server/db.json mediante /api/db.
// En producciÃ³n serÃ¡ reemplazada por la API del sistema principal.

const STORAGE_KEY = "san_rafael_mock_database_v2";

export const initialData = {
  categorias: ["Academico", "Deportivo", "Arte", "Maraton", "Otro"],
  nextProgramaId: 1,
  nextCargaId: 1,
  nextDocumentoId: 1,
  estudiantes: {
      "10101111": {
          "dni": "10101111",
          "codigoEstudiante": "75640735",
          "nombres": "Fabian Cruz Salazar",
          "grado": "4 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno invitado",
          "estadoMatricula": "Activo",
          "apoderado": "Andrea Salazar",
          "telefonoApoderado": "967891245",
          "correoApoderado": ""
      },
      "11112222": {
          "dni": "11112222",
          "codigoEstudiante": "75640223",
          "nombres": "Luciana Torres Rojas",
          "grado": "4 inicial",
          "seccion": "A",
          "nivel": "Inicial",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Mariela Rojas",
          "telefonoApoderado": "987654321",
          "correoApoderado": ""
      },
      "11112223": {
          "dni": "11112223",
          "codigoEstudiante": "75640895",
          "nombres": "Nicole Fernandez Vega",
          "grado": "1 Secundaria",
          "seccion": "A",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Pedro Fernandez",
          "telefonoApoderado": "978123456",
          "correoApoderado": ""
      },
      "22223333": {
          "dni": "22223333",
          "codigoEstudiante": "75640224",
          "nombres": "Mateo Quispe Huaman",
          "grado": "5 Inicial",
          "seccion": "B",
          "nivel": "Inicial",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Rosa Huaman",
          "telefonoApoderado": "954321876",
          "correoApoderado": ""
      },
      "22223334": {
          "dni": "22223334",
          "codigoEstudiante": "75640896",
          "nombres": "Aaron Castillo Ramos",
          "grado": "2 Secundaria",
          "seccion": "B",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Luis Castillo",
          "telefonoApoderado": "989234567",
          "correoApoderado": ""
      },
      "33334444": {
          "dni": "33334444",
          "codigoEstudiante": "75640225",
          "nombres": "Valentina Chavez Flores",
          "grado": "1 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Luis Chavez",
          "telefonoApoderado": "912345678",
          "correoApoderado": ""
      },
      "33334445": {
          "dni": "33334445",
          "codigoEstudiante": "75640897",
          "nombres": "Daniela Mendoza Ortiz",
          "grado": "3 Secundaria",
          "seccion": "C",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Julia Ortiz",
          "telefonoApoderado": "991345678",
          "correoApoderado": ""
      },
      "44445555": {
          "dni": "44445555",
          "codigoEstudiante": "75640226",
          "nombres": "Thiago Ramos Medina",
          "grado": "2 Primaria",
          "seccion": "C",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno invitado",
          "estadoMatricula": "Activo",
          "apoderado": "Patricia Medina",
          "telefonoApoderado": "965478123",
          "correoApoderado": ""
      },
      "44445556": {
          "dni": "44445556",
          "codigoEstudiante": "75640898",
          "nombres": "Bruno Silva Aquino",
          "grado": "4 Secundaria",
          "seccion": "A",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Ricardo Silva",
          "telefonoApoderado": "902456789",
          "correoApoderado": ""
      },
      "55556666": {
          "dni": "55556666",
          "codigoEstudiante": "75640227",
          "nombres": "Camila Paredes Silva",
          "grado": "3 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Jorge Paredes",
          "telefonoApoderado": "978451236",
          "correoApoderado": ""
      },
      "55556667": {
          "dni": "55556667",
          "codigoEstudiante": "75640899",
          "nombres": "Mariana Gutierrez Leon",
          "grado": "5 Secundaria",
          "seccion": "B",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Teresa Leon",
          "telefonoApoderado": "913567890",
          "correoApoderado": ""
      },
      "66667777": {
          "dni": "66667777",
          "codigoEstudiante": "75640742",
          "nombres": "Sebastian Lopez Garcia",
          "grado": "5 Primaria",
          "seccion": "B",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Rafael Lopez",
          "telefonoApoderado": "923456781",
          "correoApoderado": ""
      },
      "77778888": {
          "dni": "77778888",
          "codigoEstudiante": "75640749",
          "nombres": "Emily Vargas Castro",
          "grado": "6 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Sandra Castro",
          "telefonoApoderado": "934567812",
          "correoApoderado": ""
      },
      "88889999": {
          "dni": "88889999",
          "codigoEstudiante": "75640756",
          "nombres": "Diego Herrera Molina",
          "grado": "1 secundaria",
          "seccion": "C",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Miguel Herrera",
          "telefonoApoderado": "945678123",
          "correoApoderado": ""
      },
      "99990000": {
          "dni": "99990000",
          "codigoEstudiante": "75640763",
          "nombres": "Alessia Navarro Ruiz",
          "grado": "2 Primaria",
          "seccion": "A",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "Carmen Ruiz",
          "telefonoApoderado": "956789234",
          "correoApoderado": ""
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
    { id: "2", nombre: "Maria Asistente", usuario: "secretaria", rol: "Secretaria", estado: "Activo", contrasena: "1234" },
    { id: "3", nombre: "Rosa Cajera", usuario: "caja", rol: "Caja", estado: "Activo", contrasena: "1234" },
    { id: "4", nombre: "Ana Coordinacion Academica", usuario: "coordinacion", rol: "Coordinacion", estado: "Activo", contrasena: "1234" },
    { id: "5", nombre: "Auxiliar de Ingreso", usuario: "aux", rol: "Auxiliar", estado: "Activo", contrasena: "1234" },
    { id: "6", nombre: "Direccion General", usuario: "dir", rol: "Direccion", estado: "Activo", contrasena: "1234" },
    { id: "7", nombre: "Profesor Responsable", usuario: "profe", rol: "Coordinacion", estado: "Activo", contrasena: "1234" },
  ],
  auditLogs: [],
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
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "global" } }));
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
    auditLogs: Array.isArray(stored.auditLogs) ? stored.auditLogs : (defaults.auditLogs || []),
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
