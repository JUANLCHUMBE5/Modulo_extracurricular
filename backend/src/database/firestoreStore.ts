import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { LocalDatabase } from "./types.js";

let firestoreDb: Firestore | null = null;
let _isFirestoreEnabled = false;

/**
 * Determina si Firestore está activado como modo de datos.
 */
export function isFirestoreEnabled(): boolean {
  return (
    process.env.DATA_MODE === "firestore" ||
    _isFirestoreEnabled
  );
}

/**
 * Inicializa la conexión con Firebase Admin SDK.
 * Si detecta la variable FIRESTORE_EMULATOR_HOST, se conecta al emulador local.
 * Si no, se conecta al proyecto real de Firebase en la nube.
 */
function getFirestoreInstance(): Firestore {
  if (firestoreDb) {
    return firestoreDb;
  }

  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    console.log(`🔥 [FIRESTORE] Conectando al emulador local en ${emulatorHost}`);
  } else {
    console.log("🔥 [FIRESTORE] Conectando a Cloud Firestore en la nube");
  }

  // Inicializar Firebase Admin si no se ha hecho
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "colegio-prueba",
    });
  }

  firestoreDb = getFirestore();
  _isFirestoreEnabled = true;

  return firestoreDb;
}

// ==========================================
// Mapeo de nombres de colecciones en Firestore
// ==========================================
const COLLECTION_MAP = {
  usuarios: "usuarios",
  estudiantes: "estudiantes",
  programas: "programas",
  invitadosPorPrograma: "invitados_programa",
  inscripciones: "inscripciones",
  pagos: "pagos",
  asistencias: "asistencias",
  historialCargas: "historial_cargas",
  auditLogs: "audit_logs",
  configuracion: "configuracion",
} as const;

// ==========================================
// LECTURA: Cargar toda la base de datos desde Firestore
// ==========================================

/**
 * Lee una colección completa de Firestore y retorna los documentos como un array.
 */
async function readCollection<T>(collectionName: string): Promise<T[]> {
  const db = getFirestoreInstance();
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ ...doc.data() } as T));
}

/**
 * Lee una colección indexada por un campo clave (ej. estudiantes indexados por DNI).
 */
async function readIndexedCollection<T>(collectionName: string, keyField: string): Promise<Record<string, T>> {
  const db = getFirestoreInstance();
  const snapshot = await db.collection(collectionName).get();
  const result: Record<string, T> = {};
  snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data() as any;
    const key = data[keyField] || doc.id;
    result[key] = data as T;
  });
  return result;
}

/**
 * Lee la configuración general del sistema desde un documento único en Firestore.
 */
async function readConfig(defaults: any): Promise<any> {
  const db = getFirestoreInstance();
  try {
    const doc = await db.collection(COLLECTION_MAP.configuracion).doc("general").get();
    if (doc.exists) {
      return doc.data();
    }
  } catch { }
  return {
    categorias: defaults.categorias,
    configuracionInstitucional: defaults.configuracionInstitucional,
    correlativos: defaults.correlativos,
    syncEvents: defaults.syncEvents,
    nextProgramaId: defaults.nextProgramaId,
    nextCargaId: defaults.nextCargaId,
    nextDocumentoId: defaults.nextDocumentoId,
  };
}

/**
 * Lee los invitados agrupados por programa desde Firestore.
 * Cada documento en la colección "invitados_programa" tiene como ID el programaId
 * y contiene un campo "invitados" con el array de invitados.
 */
async function readInvitadosPorPrograma(): Promise<Record<string, any[]>> {
  const db = getFirestoreInstance();
  const snapshot = await db.collection(COLLECTION_MAP.invitadosPorPrograma).get();
  const result: Record<string, any[]> = {};
  snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    result[doc.id] = data.invitados || [];
  });
  return result;
}

/**
 * Carga la base de datos completa desde Firestore con valores por defecto como respaldo.
 */
export async function loadDatabaseFromFirestore(defaults: LocalDatabase): Promise<LocalDatabase> {
  console.log("🔥 [FIRESTORE] Cargando base de datos desde Firestore...");

  const [
    usuarios,
    estudiantes,
    programas,
    inscripciones,
    pagos,
    asistencias,
    historialCargas,
    auditLogs,
    invitadosPorPrograma,
    config,
  ] = await Promise.all([
    readCollection(COLLECTION_MAP.usuarios).catch(() => []),
    readIndexedCollection(COLLECTION_MAP.estudiantes, "dni").catch(() => ({})),
    readCollection(COLLECTION_MAP.programas).catch(() => []),
    readCollection(COLLECTION_MAP.inscripciones).catch(() => []),
    readCollection(COLLECTION_MAP.pagos).catch(() => []),
    readCollection(COLLECTION_MAP.asistencias).catch(() => []),
    readCollection(COLLECTION_MAP.historialCargas).catch(() => []),
    readCollection(COLLECTION_MAP.auditLogs).catch(() => []),
    readInvitadosPorPrograma().catch(() => ({})),
    readConfig(defaults),
  ]);

  const hasUsers = (usuarios as any[]).length > 0;
  const hasStudents = Object.keys(estudiantes as any).length > 0;
  const hasPrograms = (programas as any[]).length > 0;

  const mergedDb = {
    usuarios: hasUsers ? usuarios : defaults.usuarios,
    estudiantes: hasStudents ? estudiantes : defaults.estudiantes,
    programas: hasPrograms ? programas : defaults.programas,
    invitadosPorPrograma: Object.keys(invitadosPorPrograma as any).length > 0 ? invitadosPorPrograma : defaults.invitadosPorPrograma,
    inscripciones: (inscripciones as any[]).length > 0 ? inscripciones : defaults.inscripciones,
    documentosGenerados: [],
    pagos: (pagos as any[]).length > 0 ? pagos : defaults.pagos,
    asistencias: (asistencias as any[]).length > 0 ? asistencias : defaults.asistencias,
    historialCargas: (historialCargas as any[]).length > 0 ? historialCargas : defaults.historialCargas,
    auditLogs: (auditLogs as any[]).length > 0 ? auditLogs : defaults.auditLogs,
    categorias: config.categorias || defaults.categorias,
    configuracionInstitucional: config.configuracionInstitucional || defaults.configuracionInstitucional,
    correlativos: config.correlativos || defaults.correlativos,
    syncEvents: config.syncEvents || [],
    nextProgramaId: config.nextProgramaId || defaults.nextProgramaId,
    nextCargaId: config.nextCargaId || defaults.nextCargaId,
    nextDocumentoId: config.nextDocumentoId || defaults.nextDocumentoId,
  } as LocalDatabase;

  // Si Firestore estaba vacío (por ejemplo, primer inicio del emulador),
  // guardamos de vuelta los valores por defecto locales en Firestore para poblar la base de datos de inmediato.
  if (!hasUsers && !hasStudents && !hasPrograms) {
    console.log("🔥 [FIRESTORE] Detectada base de datos vacía. Inicializando con valores locales...");
    await saveDatabaseToFirestore(mergedDb);
  } else {
    console.log("✅ [FIRESTORE] Base de datos cargada exitosamente.");
  }

  return mergedDb;
}

// ==========================================
// ESCRITURA: Guardar toda la base de datos en Firestore
// ==========================================

/**
 * Escribe una colección completa en Firestore usando batch writes.
 * Cada elemento del array se guarda como un documento individual.
 */
async function writeCollection(collectionName: string, data: any[], idField: string): Promise<void> {
  const db = getFirestoreInstance();
  const collRef = db.collection(collectionName);

  // Firestore limita batch writes a 500 operaciones
  const BATCH_LIMIT = 450;
  for (let i = 0; i < data.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = data.slice(i, i + BATCH_LIMIT);
    chunk.forEach((item: any) => {
      const docId = String(item[idField] || `doc_${i}_${Math.random().toString(36).slice(2)}`);
      const docRef = collRef.doc(docId);
      batch.set(docRef, JSON.parse(JSON.stringify(item)));
    });
    await batch.commit();
  }
}

/**
 * Escribe una colección indexada (objeto clave-valor) en Firestore.
 */
async function writeIndexedCollection(collectionName: string, data: Record<string, any>): Promise<void> {
  const db = getFirestoreInstance();
  const collRef = db.collection(collectionName);
  const BATCH_LIMIT = 450;
  const entries = Object.entries(data);

  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + BATCH_LIMIT);
    chunk.forEach(([key, value]: [string, any]) => {
      const docRef = collRef.doc(key);
      batch.set(docRef, JSON.parse(JSON.stringify(value)));
    });
    await batch.commit();
  }
}

/**
 * Guarda los invitados por programa en Firestore.
 */
async function writeInvitadosPorPrograma(data: Record<string, any[]>): Promise<void> {
  const db = getFirestoreInstance();
  const collRef = db.collection(COLLECTION_MAP.invitadosPorPrograma);
  const BATCH_LIMIT = 450;
  const entries = Object.entries(data);

  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + BATCH_LIMIT);
    chunk.forEach(([programaId, invitados]: [string, any[]]) => {
      const docRef = collRef.doc(programaId);
      batch.set(docRef, { invitados: JSON.parse(JSON.stringify(invitados)) });
    });
    await batch.commit();
  }
}

/**
 * Guarda la configuración general del sistema en un documento único de Firestore.
 */
async function writeConfig(db_data: LocalDatabase): Promise<void> {
  const db = getFirestoreInstance();
  await db.collection(COLLECTION_MAP.configuracion).doc("general").set({
    categorias: db_data.categorias || [],
    configuracionInstitucional: db_data.configuracionInstitucional || {},
    correlativos: db_data.correlativos || {},
    syncEvents: (db_data.syncEvents || []).slice(-100),
    nextProgramaId: db_data.nextProgramaId || 1,
    nextCargaId: db_data.nextCargaId || 1,
    nextDocumentoId: db_data.nextDocumentoId || 1,
  });
}

/**
 * Guarda la base de datos completa en Firestore, optimizando la escritura
 * solo para las entidades que cambiaron.
 */
export async function saveDatabaseToFirestore(data: LocalDatabase, changedEntities?: string[]): Promise<void> {
  console.log("🔥 [FIRESTORE] Guardando cambios en Firestore...", changedEntities?.length ? `(Entidades: ${changedEntities.join(", ")})` : "(Todas)");

  const shouldSave = (entity: string) => !changedEntities || changedEntities.length === 0 || changedEntities.includes(entity);

  const tasks: Promise<void>[] = [];

  if (shouldSave("usuarios")) {
    tasks.push(writeCollection(COLLECTION_MAP.usuarios, data.usuarios, "id"));
  }
  if (shouldSave("estudiantes")) {
    tasks.push(writeIndexedCollection(COLLECTION_MAP.estudiantes, data.estudiantes));
  }
  if (shouldSave("programas")) {
    tasks.push(writeCollection(COLLECTION_MAP.programas, data.programas, "id"));
  }
  if (shouldSave("inscripciones")) {
    tasks.push(writeCollection(COLLECTION_MAP.inscripciones, data.inscripciones, "id"));
  }
  if (shouldSave("pagos")) {
    tasks.push(writeCollection(COLLECTION_MAP.pagos, data.pagos, "id"));
  }
  if (shouldSave("asistencias")) {
    tasks.push(writeCollection(COLLECTION_MAP.asistencias, data.asistencias, "id"));
  }
  if (shouldSave("invitados")) {
    tasks.push(writeInvitadosPorPrograma(data.invitadosPorPrograma));
  }

  // Siempre guardar configuración y logs de auditoría
  tasks.push(writeConfig(data));
  tasks.push(writeCollection(COLLECTION_MAP.auditLogs, data.auditLogs, "id"));
  tasks.push(writeCollection(COLLECTION_MAP.historialCargas, data.historialCargas, "id"));

  await Promise.all(tasks);
  console.log("✅ [FIRESTORE] Cambios guardados exitosamente.");
}
