// BASE LOCAL PARA DESARROLLO.
// La fuente principal es server/db.json mediante /api/db.
// En producción será reemplazada por la API del sistema principal.

const STORAGE_KEY = "san_rafael_mock_database_v2";

export const initialData = {
  categorias: ["Academico", "Deportivo", "Arte", "Maraton", "Otro"],
  configuracionInstitucional: {
    logoInstitucion: null,
    logoCambridge: null,
    firmaCoordinacion: null,
    firmaDireccion: null,
    selloInstitucion: null,
  },
  nextProgramaId: 1,
  nextCargaId: 1,
  nextDocumentoId: 1,
  estudiantes: {
      "10101111": {
          "dni": "10101111",
          "codigoEstudiante": "75640735",
          "nombres": "Fabian Cruz Salazar",
          "grado": "3",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno invitado",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "11112222": {
          "dni": "11112222",
          "codigoEstudiante": "75640223",
          "nombres": "Luciana Torres Rojas",
          "grado": "4",
          "seccion": "",
          "nivel": "Inicial",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "11112223": {
          "dni": "11112223",
          "codigoEstudiante": "75640895",
          "nombres": "Nicole Fernandez Vega",
          "grado": "1",
          "seccion": "",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "22223333": {
          "dni": "22223333",
          "codigoEstudiante": "75640224",
          "nombres": "Mateo Quispe Huaman",
          "grado": "5",
          "seccion": "",
          "nivel": "Inicial",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "22223334": {
          "dni": "22223334",
          "codigoEstudiante": "75640896",
          "nombres": "Aaron Castillo Ramos",
          "grado": "1",
          "seccion": "",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "33334444": {
          "dni": "33334444",
          "codigoEstudiante": "75640225",
          "nombres": "Valentina Chavez Flores",
          "grado": "4",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "33334445": {
          "dni": "33334445",
          "codigoEstudiante": "75640897",
          "nombres": "Daniela Mendoza Ortiz",
          "grado": "2",
          "seccion": "",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "44445555": {
          "dni": "44445555",
          "codigoEstudiante": "75640226",
          "nombres": "Thiago Ramos Medina",
          "grado": "5",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno invitado",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "44445556": {
          "dni": "44445556",
          "codigoEstudiante": "75640898",
          "nombres": "Bruno Silva Aquino",
          "grado": "2",
          "seccion": "",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "55556666": {
          "dni": "55556666",
          "codigoEstudiante": "75640227",
          "nombres": "Camila Paredes Silva",
          "grado": "5",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "55556667": {
          "dni": "55556667",
          "codigoEstudiante": "75640899",
          "nombres": "Mariana Gutierrez Leon",
          "grado": "3",
          "seccion": "",
          "nivel": "Secundaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "66667777": {
          "dni": "66667777",
          "codigoEstudiante": "75640742",
          "nombres": "Sebastian Lopez Garcia",
          "grado": "4",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "77778888": {
          "dni": "77778888",
          "codigoEstudiante": "75640749",
          "nombres": "Emily Vargas Castro",
          "grado": "4",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "88889999": {
          "dni": "88889999",
          "codigoEstudiante": "75640756",
          "nombres": "Diego Herrera Molina",
          "grado": "4",
          "seccion": "",
          "nivel": "Secundaria",
          "sexo": "M",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
          "correoApoderado": ""
      },
      "99990000": {
          "dni": "99990000",
          "codigoEstudiante": "75640763",
          "nombres": "Alessia Navarro Ruiz",
          "grado": "6",
          "seccion": "",
          "nivel": "Primaria",
          "sexo": "F",
          "fechaNacimiento": "2010-01-01",
          "tipoAlumno": "Alumno interno",
          "estadoMatricula": "Activo",
          "apoderado": "",
          "telefonoApoderado": "",
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
    { id: "1", nombre: "Admin Principal", usuario: "admin", rol: "Administrador", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
    { id: "2", nombre: "Maria Asistente", usuario: "secretaria", rol: "Secretaria", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
    { id: "3", nombre: "Rosa Cajera", usuario: "caja", rol: "Caja", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
    { id: "4", nombre: "Ana Coordinacion Academica", usuario: "coordinacion", rol: "Coordinacion", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
    { id: "5", nombre: "Auxiliar de Ingreso", usuario: "aux", rol: "Auxiliar", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
    { id: "6", nombre: "Direccion General", usuario: "dir", rol: "Direccion", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
    { id: "7", nombre: "Profesor Responsable", usuario: "profe", rol: "Coordinacion", estado: "Activo", contrasena: "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK" },
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
    categorias: (Array.isArray(stored.categorias) && stored.categorias.length ? stored.categorias : defaults.categorias).filter(c => {
      const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normal !== "ingles";
    }),
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
