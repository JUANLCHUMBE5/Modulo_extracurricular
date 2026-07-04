/**
 * Incrementa el valor de un código numérico secuencial (ej: 'REC-0501' a 'REC-0502').
 */
export function incrementarCorrelativo(valor: string): string {
  if (!valor) return "";
  const match = String(valor).match(/^(.*?)(\d+)$/);
  if (!match) return valor;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = Number(numStr) + 1;
  const paddedNum = String(nextNum).padStart(numStr.length, "0");
  return prefix + paddedNum;
}

/**
 * Calcula el siguiente número de recibo disponible evitando colisionar con números existentes.
 */
export function calcularSiguienteRecibo(startValue: string, existingNros: string[]): string {
  if (!startValue) return "";
  const match = String(startValue).match(/^(.*?)(\d+)$/);
  if (!match) return startValue;
  const prefix = match[1];
  const startNumStr = match[2];
  const S = Number(startNumStr);
  const padLength = startNumStr.length;

  let maxM = 0;
  let foundAny = false;

  for (const nro of existingNros) {
    if (!nro) continue;
    const nroStr = String(nro).trim();
    if (nroStr.startsWith(prefix)) {
      const numPart = nroStr.slice(prefix.length);
      if (/^\d+$/.test(numPart)) {
        const val = Number(numPart);
        if (!foundAny || val > maxM) {
          maxM = val;
          foundAny = true;
        }
      }
    }
  }

  let nextVal;
  if (!foundAny || maxM < S) {
    nextVal = S;
  } else {
    nextVal = maxM + 1;
  }

  return prefix + String(nextVal).padStart(padLength, "0");
}

/**
 * Inicializa y normaliza los correlativos de recibos físicos, virtuales y egresos en la base de datos.
 */
export function normalizarCorrelativos(db: any): any {
  if (!db.correlativos) {
    db.correlativos = {};
  }
  const c = db.correlativos;
  
  if (c.recibo !== undefined && c.reciboInicio === undefined) {
    c.reciboInicio = c.recibo;
    const existingNros = (db.pagos || []).map((p: any) => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    c.reciboActual = calcularSiguienteRecibo(c.recibo, existingNros);
    delete c.recibo;
  }
  if (c.reciboVirtual !== undefined && c.reciboVirtualInicio === undefined) {
    c.reciboVirtualInicio = c.reciboVirtual;
    const existingNros = (db.pagos || []).map((p: any) => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    c.reciboVirtualActual = calcularSiguienteRecibo(c.reciboVirtual, existingNros);
    delete c.reciboVirtual;
  }
  if (c.egreso !== undefined && c.egresoInicio === undefined) {
    c.egresoInicio = c.egreso;
    c.egresoActual = c.egreso;
    delete c.egreso;
  }

  if (c.reciboInicio === undefined) c.reciboInicio = "REC-0500";
  if (c.reciboActual === undefined) c.reciboActual = "REC-0501";
  if (c.reciboVirtualInicio === undefined) c.reciboVirtualInicio = "V-1000";
  if (c.reciboVirtualActual === undefined) c.reciboVirtualActual = "V-1001";
  if (c.egresoInicio === undefined) c.egresoInicio = "EGR-0200";
  if (c.egresoActual === undefined) c.egresoActual = "EGR-0201";

  return c;
}
