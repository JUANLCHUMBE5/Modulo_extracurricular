// Simulacion de las llamadas API al backend.
// En produccion, aqui se usaria apiClient.js para llamar a /api/estudiantes/...

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function validarDni(dni) {
  await delay(600);

  if (!/^\d{8}$/.test(dni)) {
    throw new Error("El DNI debe contener exactamente 8 digitos numericos.");
  }

  // Mock de respuesta exitosa del backend basada en el contrato de API del plan.
  return {
    dni,
    nombres: "Estudiante de Prueba",
    programa: "CLUB DE TAREAS MATEMATICA",
    horario: "15:20 - 17:20",
    estadoPago: "Validado",
    estadoInscripcion: "Inscrito"
  };
}

export async function validarQR(codigo) {
  await delay(500);
  if (!codigo.trim()) throw new Error("El codigo QR proporcionado no es valido.");
  // Simula la decodificacion del QR a un DNI.
  return validarDni("12345678");
}

export async function registrarAsistencia(dni, observacion) {
  await delay(600);
  // Seguridad: validar texto seguro sin HTML.
  if (/<[a-z][\s\S]*>/i.test(observacion)) {
    throw new Error("La observacion contiene caracteres no permitidos (etiquetas HTML).");
  }
  return { success: true, fechaRegistro: new Date().toISOString() };
}
