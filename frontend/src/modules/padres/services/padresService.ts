import { isApiMode, apiClient } from "../../../services/apiClient";
import {
  adaptarEstudiante,
  adaptarInscripcion,
  adaptarPago,
  adaptarPrograma,
} from "../../../services/adapters";
import {
  normalizarDuracionAvisoDias,
  obtenerVentanaInscripcion,
} from "../../../services/dateService";
import {
  calcularEstadoGeneral,
  obtenerProgramaPrincipalPadres,
  programaVisibleEnPortalPadres,
} from "./padresServiceUtils";
import {
  obtenerResumenPadreMock,
  guardarDatosApoderadoPadresMock,
  registrarInscripcionPadresMock,
  registrarPagoVerificacionPadresMock,
  reservarCupoCajaPadresMock,
  obtenerProgramasCoordinacionMock,
} from "../utils/padresServiceMock";

export async function obtenerResumenPadre(dni) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/padres/resumen/${dni}`);
    if (!res.success) throw new Error(res.message || "Error al obtener resumen de padres");
    
    const data = res.data || {};
    const estudiante = adaptarEstudiante(data.estudiante);
    const invitaciones = (data.invitaciones || []).map(adaptarPrograma).map((prog) => {
      const duracionAvisoDias = normalizarDuracionAvisoDias(prog.duracionAvisoDias, 7);
      return {
        ...prog,
        duracionAvisoDias,
        ventanaInscripcion: obtenerVentanaInscripcion(prog.fechaInicio, new Date(), duracionAvisoDias, prog.horaLimiteAviso, prog),
      };
    });
    const inscripciones = (data.inscripciones || []).map(adaptarInscripcion);
    const pagos = (data.pagos || []).map(adaptarPago);
    const documentos = data.documentos || [];
    const inscripcionActual = obtenerProgramaPrincipalPadres(inscripciones);
    const invitacionActual = obtenerProgramaPrincipalPadres(invitaciones);

    return {
      estudiante,
      invitaciones,
      inscripciones,
      pagos,
      documentos,
      inscripcionActual,
      invitacionActual,
      estadoGeneral: calcularEstadoGeneral(inscripcionActual, invitacionActual),
    };
  }
  return obtenerResumenPadreMock(dni);
}

export async function guardarDatosApoderadoPadres(dni, datos) {
  if (isApiMode()) {
    const payload = {
      apoderado: datos.apoderado,
      telefono: datos.telefono,
      correo: datos.correo,
      enviar_pdf_correo: Boolean(datos.enviarPdfCorreo && datos.correo),
    };
    const res = await apiClient.put(`/api/v1/extracurricular/padres/${dni}/apoderado`, payload);
    if (!res.success) throw new Error(res.message || "Error al actualizar datos de apoderado");
    return adaptarEstudiante(res.data);
  }
  return guardarDatosApoderadoPadresMock(dni, datos);
}

export async function registrarInscripcionPadres(dni, datos, programaId = "", horarioPersonalizado = "", tallas = {}) {
  if (isApiMode()) {
    const payload = {
      estudiante_id: dni,
      programa_id: programaId,
      horario: horarioPersonalizado,
      origen_inscripcion: datos.enviarPdfCorreo ? "Portal padres | enviar_correo" : "Portal padres",
      apoderado: datos.apoderado,
      telefono_apoderado: datos.telefono,
      correo_apoderado: datos.correo,
      enviar_pdf_correo: Boolean(datos.enviarPdfCorreo && datos.correo),
      talla_uniforme: tallas.tallaUniforme || "",
      talla_polo: tallas.tallaPolo || "",
      talla_short: tallas.tallaShort || "",
    };
    const res = await apiClient.post("/api/v1/extracurricular/inscripciones", payload);
    if (!res.success) throw new Error(res.message || "Error al registrar inscripción");
    return adaptarInscripcion(res.data);
  }
  return registrarInscripcionPadresMock(dni, datos, programaId, horarioPersonalizado, tallas);
}

export async function registrarPagoVerificacionPadres(dni, inscripcionId, datosPago = {}) {
  if (isApiMode()) {
    const formData = new FormData();
    formData.append("inscripcion_id", inscripcionId);
    formData.append("metodo_pago", "Yape");
    formData.append("referencia", String(datosPago.referencia || "").trim());
    formData.append("telefono", String(datosPago.telefono || "").replace(/\D/g, "").slice(0, 9));
    
    if (datosPago.captura?.file) {
      formData.append("comprobante", datosPago.captura.file);
    } else {
      formData.append("comprobante_base64", datosPago.captura?.base64 || "");
      formData.append("comprobante_nombre", datosPago.captura?.nombre || "");
    }
    
    const res = await apiClient.post("/api/v1/extracurricular/pagos/comprobante", formData);
    if (!res.success) throw new Error(res.message || "Error al subir comprobante de pago");
    return adaptarPago(res.data);
  }
  return registrarPagoVerificacionPadresMock(dni, inscripcionId, datosPago);
}

export async function reservarCupoCajaPadres(dni, inscripcionId) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/inscripciones/${inscripcionId}/reservar-caja`, {
      dni_estudiante: dni,
    });
    if (!res.success) throw new Error(res.message || "Error al reservar cupo para pago en Caja");
    return adaptarInscripcion(res.data);
  }
  return reservarCupoCajaPadresMock(dni, inscripcionId);
}

export async function obtenerProgramasCoordinacion() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/programas");
    if (!res.success) throw new Error(res.message || "Error al obtener programas");
    return res.data.map(adaptarPrograma).map((programa) => {
      const cupos = Number(programa.cupos || 0);
      const cuposOcupados = Number(programa.cuposOcupados || 0);
      const cuposDisponibles = Math.max(0, cupos - cuposOcupados);
      const duracionAvisoDias = normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7);
      const ventanaInscripcion = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), duracionAvisoDias, programa.horaLimiteAviso, programa);
      const requiereGradoCompatible = !programa.invitacionMasiva && (
        Array.isArray(programa.horariosPorGrupo) && programa.horariosPorGrupo.length > 0 ||
        (Array.isArray(programa.gradosAplicables) && programa.gradosAplicables.length > 0)
      );
      const esCambridge = String([
        programa.nombre,
        programa.categoria,
        programa.tipoComunicado,
        programa.plantilla,
        ...(programa.plantillaVariables || []),
      ].join(" ")).toLowerCase().includes("cambridge");

      return {
        ...programa,
        duracionAvisoDias,
        ventanaInscripcion,
        requiereGradoCompatible: esCambridge ? false : requiereGradoCompatible,
        registrable: !esCambridge && programaVisibleEnPortalPadres(programa) && cuposDisponibles > 0,
      };
    });
  }
  return obtenerProgramasCoordinacionMock();
}
