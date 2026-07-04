const INSTITUTIONAL_ASSET_KEYS = [
  "logoInstitucion",
  "logoCambridge",
  "firmaCoordinacion",
  "firmaDireccion",
  "selloInstitucion",
];

/**
 * Normaliza los archivos/imágenes de la configuración institucional a un formato estándar.
 */
export function normalizarConfiguracionInstitucional(valor: any = {}): any {
  const origen = (valor && typeof valor === "object" ? valor : {}) as any;
  return INSTITUTIONAL_ASSET_KEYS.reduce((acc: any, key) => {
    const item = origen[key];
    acc[key] = item && typeof item === "object"
      ? {
          nombre: String(item.nombre || ""),
          tipo: String(item.tipo || ""),
          dataUrl: String(item.dataUrl || ""),
          actualizadoEn: String(item.actualizadoEn || ""),
        }
      : null;
    return acc;
  }, {});
}
