/**
 * Determina si la base de datos PostgreSQL 17 está activada en la configuración.
 */
export function isPgEnabled(): boolean {
  const mode = process.env.DATA_MODE || "local";
  if (mode === "local" || mode === "firestore") {
    return false;
  }
  return (
    mode === "postgres" ||
    !!process.env.DATABASE_URL ||
    !!process.env.DB_HOST
  );
}
