import { apiDb, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { esDiaCorrecto } from "./auxiliarAnalytics";
import { fechaActualIso } from "../../../services/dateService";
import {
  resolverValidacionPorNombre,
  resolverValidacion,
  extraerIdentificadoresCodigo,
  extraerIdentificadoresDesdeValidacion,
  generarAsistenciaId,
  limpiarDni,
} from "./auxiliarServiceMockHelpers";

const esperar = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerProgramasActivosMock() {
  await esperar();
  await syncApiDb();
  return (apiDb as any).programas || [];
}

export async function validarDniMock(busqueda: string, programaId = "") {
  await esperar();
  await syncApiDb();

  const query = String(busqueda || "").trim();
  if (!query) {
    throw new Error("Ingrese un DNI o nombre para buscar.");
  }

  if (/^\d+$/.test(query)) {
    const dniLimpio = limpiarDni(query);
    if (!/^\d{8}$/.test(dniLimpio)) {
      throw new Error("El DNI debe contener exactamente 8 numeros.");
    }
    return resolverValidacion({ dni: dniLimpio, codigoOriginal: dniLimpio, programaId });
  }

  return resolverValidacionPorNombre(query, programaId);
}

export async function validarQRMock(codigo: string) {
  await esperar();
  await syncApiDb();

  const codigoLimpio = String(codigo || "").trim();
  if (!codigoLimpio) {
    throw new Error("Escanee o ingrese un codigo valido.");
  }

  return resolverValidacion(extraerIdentificadoresCodigo(codigoLimpio));
}

export async function registrarAsistenciaMock(data: any, observacion = "") {
  await esperar(260);
  await syncApiDb();

  const textoObservacion = String(observacion || "").trim();
  if (/<[^>]+>/.test(textoObservacion)) {
    throw new Error("La observacion no debe contener HTML.");
  }

  const validacion = data?.estadoAcceso
    ? resolverValidacion(extraerIdentificadoresDesdeValidacion(data))
    : resolverValidacion(extraerIdentificadoresCodigo(data));

  if (!validacion.accesoPermitido) {
    throw new Error(validacion.accion || "No se puede registrar el ingreso.");
  }

  if (!Array.isArray((apiDb as any).asistencias)) (apiDb as any).asistencias = [];

  const registro = {
    id: generarAsistenciaId(),
    inscripcionId: validacion.inscripcionId || "",
    pagoId: validacion.pagoId || "",
    dniEstudiante: validacion.dni || "",
    codigoEstudiante: validacion.codigoEstudiante || "",
    nombresEstudiante: validacion.nombres || "",
    programaId: validacion.programaId || "",
    programa: validacion.programa || "",
    horario: validacion.horario || "",
    estadoPago: validacion.estadoPago || "",
    estadoAcceso: validacion.estadoAcceso,
    observacion: textoObservacion,
    origen: "Auxiliar",
    fechaRegistro: fechaActualIso(),
  };

  (apiDb as any).asistencias.push(registro);
  await saveApiDb();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mock-db-updated"));
  }

  return registro;
}
