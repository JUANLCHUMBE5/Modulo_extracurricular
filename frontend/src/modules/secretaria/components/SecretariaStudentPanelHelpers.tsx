import {
  IconCircleCheck as CheckCircle2,
  IconAlertTriangle as AlertTriangle,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";

export function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones: any = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeño Académico",
  };
  return opciones[seleccion] || "Pendiente de definir en Coordinación Académica";
}

export function obtenerPillEstadoInscripcion(estado = "") {
  const est = String(estado).trim().toLowerCase();
  if (est.includes("no inscrito") || est.includes("anulada")) {
    return {
      clase: "secretaria-pill-danger",
      Icono: AlertTriangle,
    };
  }
  if (est.includes("pago validado") || est.includes("inscrito")) {
    return {
      clase: "secretaria-pill-success",
      Icono: CheckCircle2,
    };
  }
  if (est.includes("pendiente") || est.includes("derivado")) {
    return {
      clase: "secretaria-pill-warning",
      Icono: AlertTriangle,
    };
  }
  return {
    clase: "secretaria-pill-info",
    Icono: InfoCircle,
  };
}

export function obtenerInfoBoxConfig({ inscripcion, programas, esCicloVerano, invitacionSinHorario, tieneInvitacionOperativa }: any) {
  if (inscripcion?.derivadoCaja) {
    return {
      clase: "secretaria-info-box-success",
      Icono: CheckCircle2,
    };
  }
  if (inscripcion) {
    return {
      clase: "secretaria-info-box-info",
      Icono: InfoCircle,
    };
  }
  if (esCicloVerano) {
    if (programas && programas.length > 0) {
      return {
        clase: "secretaria-info-box-info",
        Icono: InfoCircle,
      };
    } else {
      return {
        clase: "secretaria-info-box-danger",
        Icono: AlertTriangle,
      };
    }
  }
  if (invitacionSinHorario) {
    return {
      clase: "secretaria-info-box-warning",
      Icono: AlertTriangle,
    };
  }
  if (tieneInvitacionOperativa) {
    return {
      clase: "secretaria-info-box-success",
      Icono: CheckCircle2,
    };
  }
  if (programas && programas.length > 0) {
    return {
      clase: "secretaria-info-box-info",
      Icono: InfoCircle,
    };
  }
  return {
    clase: "secretaria-info-box-danger",
    Icono: AlertTriangle,
  };
}
