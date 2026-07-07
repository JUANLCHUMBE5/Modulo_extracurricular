export function normalizarTexto(valor: any) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function esPagoEnVerificacion(inscripcion: any, pagoConfirmado: any) {
  const estadoInscripcion = normalizarTexto(inscripcion?.estadoInscripcion);
  const pagoCorresponde = Boolean(
    pagoConfirmado?.inscripcionId &&
    inscripcion?.id &&
    pagoConfirmado.inscripcionId === inscripcion.id
  );
  const tienePagoRegistrado = Boolean(inscripcion?.pagoId || pagoCorresponde);
  const estadoPago = normalizarTexto([
    pagoCorresponde ? pagoConfirmado?.estado : "",
    pagoCorresponde ? pagoConfirmado?.estadoPago : "",
    pagoCorresponde ? pagoConfirmado?.estadoVerificacion : "",
    inscripcion?.estadoPago,
    inscripcion?.estadoInscripcion,
  ].filter(Boolean).join(" "));
  if (["observado", "observada", "rechazado", "rechazada", "no coincide"].some((item) => estadoPago.includes(item))) return false;
  return tienePagoRegistrado && (estadoInscripcion.includes("verificacion") ||
    estadoInscripcion.includes("validacion") ||
    estadoInscripcion.includes("proceso") ||
    estadoPago.includes("verificando") ||
    estadoPago.includes("por verificar") ||
    estadoPago.includes("proceso") ||
    estadoPago.includes("validacion"));
}

export function esPagoObservado(inscripcion: any, pagoConfirmado: any) {
  const pagoCorresponde = Boolean(
    pagoConfirmado?.inscripcionId &&
    inscripcion?.id &&
    pagoConfirmado.inscripcionId === inscripcion.id
  );
  const texto = normalizarTexto([
    pagoCorresponde ? pagoConfirmado?.estado : "",
    pagoCorresponde ? pagoConfirmado?.estadoPago : "",
    pagoCorresponde ? pagoConfirmado?.estadoVerificacion : "",
    pagoCorresponde ? pagoConfirmado?.observaciones : "",
    inscripcion?.estadoPago,
    inscripcion?.estadoInscripcion,
    inscripcion?.pagoObservacionCaja,
  ].filter(Boolean).join(" "));

  return ["observado", "observada", "rechazado", "rechazada", "no coincide"].some((item) => texto.includes(item));
}

export function obtenerMotivoPagoObservado(inscripcion: any, pagoConfirmado: any) {
  return (
    inscripcion?.pagoObservacionCaja ||
    pagoConfirmado?.observaciones ||
    pagoConfirmado?.observacion ||
    "El pago fue observado por Cajera. Revise el numero de operacion, telefono y captura antes de volver a enviarlo."
  );
}

export function esPagoAprobado(inscripcion: any, pagoConfirmado: any) {
  const pagoCorresponde = Boolean(
    pagoConfirmado?.inscripcionId &&
    inscripcion?.id &&
    pagoConfirmado.inscripcionId === inscripcion.id
  );
  const texto = normalizarTexto([
    pagoCorresponde ? pagoConfirmado?.estado : "",
    pagoCorresponde ? pagoConfirmado?.estadoVerificacion : "",
    inscripcion?.estadoPago,
    inscripcion?.estadoInscripcion,
  ].filter(Boolean).join(" "));

  return ["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item));
}

export function leerArchivoComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event?.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };
      img.onerror = () => {
        resolve(event?.target?.result as string);
      };
    };
    reader.onerror = () => reject(new Error("No se pudo leer la captura del pago."));
  });
}
