import { mismoCodigo, normalizarIdentificadores, normalizarTexto } from "./identity.helpers.js";
import { resolverValidacion } from "./validation.helpers.js";
/**
 * Valida ingresos de alumnos mediante coincidencias de nombre.
 */
export function resolverValidacionPorNombre(db: any, nombreQuery: string, programaId: string = ""): any {
  const queryNormalizada = normalizarTexto(nombreQuery);
  if (queryNormalizada.length < 3) {
    throw new Error("El nombre de busqueda debe tener al menos 3 caracteres.");
  }
  const inscripciones = (db.inscripciones || []).filter((item: any) => normalizarTexto(item.estadoInscripcion) !== "anulada");
  let matchesInscripcion = inscripciones.filter((ins: any) =>
    normalizarTexto(ins.nombresEstudiante).includes(queryNormalizada)
  );
  if (programaId) {
    matchesInscripcion = matchesInscripcion.filter((ins: any) => mismoCodigo(ins.programaId, programaId));
  }
  const resultadosInscripciones = matchesInscripcion.map((ins: any) => {
    const ids = normalizarIdentificadores({
      dni: ins.dniEstudiante,
      codigoEstudiante: ins.codigoEstudiante,
      inscripcionId: ins.id,
      programaId: ins.programaId
    });
    try {
      return resolverValidacion(db, ids);
    } catch {
      return {
        dni: ins.dniEstudiante,
        codigoEstudiante: ins.codigoEstudiante,
        nombres: ins.nombresEstudiante,
        grado: ins.gradoEstudiante || "",
        seccion: ins.seccionEstudiante || "",
        programa: ins.programa || "",
        horario: ins.horario || "",
        estadoAcceso: "no_registrado",
        accesoPermitido: false,
        inscripcionId: ins.id
      };
    }
  });
  let resultadosEstudiantes: any[] = [];
  if (!programaId) {
    let estudiantes: any[] = [];
    if (Array.isArray(db.estudiantes)) estudiantes = db.estudiantes;
    else if (db.estudiantes && typeof db.estudiantes === "object") estudiantes = Object.values(db.estudiantes);
    const dniConInscripcion = new Set(matchesInscripcion.map((ins: any) => {
      return ins.dniEstudiante ? String(ins.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
    }));
    const matchesEstudiante = estudiantes.filter((est: any) => {
      const nomCompleto = `${est.nombres || ""} ${est.apellidos || ""}`;
      const estDni = est.dni ? String(est.dni).replace(/\D/g, "").slice(0, 8) : "";
      return normalizarTexto(nomCompleto).includes(queryNormalizada) && !dniConInscripcion.has(estDni);
    });
    resultadosEstudiantes = matchesEstudiante.map((est: any) => {
      const ids = normalizarIdentificadores({
        dni: est.dni,
        codigoEstudiante: est.codigoEstudiante
      });
      return resolverValidacion(db, ids);
    });
  }
  const todosResultados = [...resultadosInscripciones, ...resultadosEstudiantes];
  if (todosResultados.length === 0) {
    throw new Error(`No se encontro ningun estudiante que coincida con "${nombreQuery}".`);
  }
  if (todosResultados.length === 1) {
    return todosResultados[0];
  }
  return { isMultiple: true, matches: todosResultados };
}

