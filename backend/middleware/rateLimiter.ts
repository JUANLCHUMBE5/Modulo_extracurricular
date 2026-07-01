import rateLimit from "express-rate-limit";

/**
 * Limitador de tasa (Rate Limiter) para mitigar ataques de fuerza bruta
 * y scripts automatizados en las rutas de autenticación.
 * 
 * Permite un máximo de 5 intentos de inicio de sesión por dirección IP cada minuto.
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 intentos por IP cada minuto
  message: {
    success: false,
    message: "Demasiados intentos de inicio de sesion. Por favor, intente de nuevo en un minuto."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
