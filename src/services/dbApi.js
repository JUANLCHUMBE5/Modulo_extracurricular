import { localDbApi } from "./apiClient";

export const apiDb = {};

export async function syncApiDb() {
  const db = await localDbApi.getDatabase();
  replaceApiDb(db);
  return apiDb;
}

export async function saveApiDb() {
  const db = await localDbApi.saveDatabase(apiDb);
  replaceApiDb(db);
  dispatchApiDbUpdated();
  return apiDb;
}

export async function resetApiDb() {
  const db = await localDbApi.resetDatabase();
  replaceApiDb(db);
  dispatchApiDbUpdated();
  return apiDb;
}

export function nextApiId(key) {
  const value = Number(apiDb[key] || 1);
  apiDb[key] = value + 1;
  return value;
}

function replaceApiDb(db) {
  Object.keys(apiDb).forEach((key) => {
    delete apiDb[key];
  });
  Object.assign(apiDb, db || {});
}

function dispatchApiDbUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("api-db-updated"));
}
