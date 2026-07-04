import { PadresInscripcionRepository } from "../repositories/padres_inscripcion.repository.js";

const inscripcionRepository = new PadresInscripcionRepository();

export class InscripcionQueryService {
  async getInscripcionesLegacy(page: number | null, limit: number) {
    const db = await inscripcionRepository.getDb();
    const list = db.inscripciones || [];
    if (page !== null && !isNaN(page)) {
      const startIndex = (page - 1) * limit;
      const paginated = list.slice(startIndex, startIndex + limit);
      return {
        data: paginated,
        pagination: {
          total: list.length,
          page,
          limit,
          totalPages: Math.ceil(list.length / limit)
        }
      };
    }
    return list;
  }

  async getDocumentosLegacy() {
    const db = await inscripcionRepository.getDb();
    return db.documentosGenerados || [];
  }
}

