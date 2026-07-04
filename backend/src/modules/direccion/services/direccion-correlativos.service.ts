import { DireccionRepository } from "../repositories/direccion.repository.js";

const direccionRepository = new DireccionRepository();

export class DireccionCorrelativosService {
  async getCorrelativos() {
    const db = await direccionRepository.getDb();
    const c = (db.correlativos || {}) as any;

    if (c.reciboInicio === undefined) c.reciboInicio = c.recibo || "REC-0500";
    if (c.reciboActual === undefined) c.reciboActual = c.recibo || "REC-0500";
    if (c.reciboActive === undefined) c.reciboActive = true;
    if (c.reciboVirtualInicio === undefined) c.reciboVirtualInicio = c.reciboVirtual || "V-1000";
    if (c.reciboVirtualActual === undefined) c.reciboVirtualActual = c.reciboVirtual || "V-1000";
    if (c.reciboVirtualActive === undefined) c.reciboVirtualActive = true;
    if (c.egresoInicio === undefined) c.egresoInicio = c.egreso || "EGR-0200";
    if (c.egresoActual === undefined) c.egresoActual = c.egreso || "EGR-0200";
    if (c.egresoActive === undefined) c.egresoActive = true;

    return {
      reciboInicio: c.reciboInicio,
      reciboActual: c.reciboActual,
      reciboActive: c.reciboActive !== false,
      reciboVirtualInicio: c.reciboVirtualInicio,
      reciboVirtualActual: c.reciboVirtualActual,
      reciboVirtualActive: c.reciboVirtualActive !== false,
      egresoInicio: c.egresoInicio,
      egresoActual: c.egresoActual,
      egresoActive: c.egresoActive !== false
    };
  }

  async updateCorrelativos(correlativos: any) {
    const db = await direccionRepository.getDb();
    const actuales = (db.correlativos || {}) as any;

    if (actuales.reciboInicio === undefined) actuales.reciboInicio = actuales.recibo || "REC-0500";
    if (actuales.reciboActual === undefined) actuales.reciboActual = actuales.recibo || "REC-0500";
    if (actuales.reciboVirtualInicio === undefined) actuales.reciboVirtualInicio = actuales.reciboVirtual || "V-1000";
    if (actuales.reciboVirtualActual === undefined) actuales.reciboVirtualActual = actuales.reciboVirtual || "V-1000";
    if (actuales.egresoInicio === undefined) actuales.egresoInicio = actuales.egreso || "EGR-0200";
    if (actuales.egresoActual === undefined) actuales.egresoActual = actuales.egreso || "EGR-0200";

    const resolverValor = (nuevoValor: any, valorAnterior: any) => {
      if (nuevoValor === undefined) return valorAnterior || "";
      return String(nuevoValor).trim();
    };

    const reciboInicio = resolverValor(correlativos.reciboInicio, actuales.reciboInicio);
    const reciboActual = resolverValor(correlativos.reciboActual, actuales.reciboActual);
    const reciboVirtualInicio = resolverValor(correlativos.reciboVirtualInicio, actuales.reciboVirtualInicio);
    const reciboVirtualActual = resolverValor(correlativos.reciboVirtualActual, actuales.reciboVirtualActual);
    const egresoInicio = resolverValor(correlativos.egresoInicio, actuales.egresoInicio);
    const egresoActual = resolverValor(correlativos.egresoActual, actuales.egresoActual);

    db.correlativos = {
      reciboInicio,
      reciboActual,
      reciboActive: correlativos.reciboActive !== false,
      reciboVirtualInicio,
      reciboVirtualActual,
      reciboVirtualActive: correlativos.reciboVirtualActive !== false,
      egresoInicio,
      egresoActual,
      egresoActive: correlativos.egresoActive !== false
    };

    await direccionRepository.saveDb(db);
    return true;
  }
}

