// Configuración de la conexión del Frontend hacia el Backend (Parámetros Generales)
export const CONFIG_CONEXION = {
  // Dirección y puerto del servidor API local
  host: "127.0.0.1",
  port: 5175,
  
  // Límite de tiempo máximo de respuesta para las llamadas de red (ms)
  timeoutMs: 30000,
  
  // Clave utilizada para almacenar el token JWT de sesión
  tokenKey: "san_rafael_token",
  
  // Calcula la URL base del Backend
  get urlBase() {
    return `http://${this.host}:${this.port}`;
  }
};
