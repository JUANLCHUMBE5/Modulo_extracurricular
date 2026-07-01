import { useState } from "react";
import { guardarConfiguracionInstitucional } from "../../services/coordinacionService";

/**
 * Hook personalizado para gestionar la configuración institucional (logos, sellos y firmas).
 * 
 * @param {Object} params Parámetros de inicialización.
 * @param {Function} params.mostrarMsg Función para mostrar mensajes toast/alerta al usuario.
 */
export default function useCoordinacionConfiguracion({ mostrarMsg }) {
  const [configInstitucional, setConfigInstitucional] = useState({});
  const [cargandoConfigInstitucional, setCargandoConfigInstitucional] = useState(false);
  const [guardandoConfigInstitucional, setGuardandoConfigInstitucional] = useState(false);
  const [alertaConfiguracion, setAlertaConfiguracion] = useState("");

  /**
   * Muestra una alerta visual si falta configurar algún campo obligatorio en los talleres.
   * 
   * @param {string} [detalle=""] Detalle adicional de los campos faltantes de la configuración.
   */
  function mostrarAlertaConfiguracion(detalle = "") {
    const texto = detalle
      ? `Complete la configuracion del taller antes de habilitarlo. ${detalle}`
      : "Complete la configuracion del taller antes de habilitarlo.";
    setAlertaConfiguracion(texto);
  }

  /**
   * Actualiza el valor base64 de una de las imágenes de configuración institucional en el estado local.
   * 
   * @param {string} campo Nombre de la propiedad de imagen (logo, sello, firma, etc.).
   * @param {string} imagen Cadena de base64 con el contenido de la imagen cargada.
   */
  function actualizarConfigInstitucionalImagen(campo, imagen) {
    setConfigInstitucional((actual) => ({
      ...actual,
      [campo]: imagen,
    }));
  }

  /**
   * Remueve una imagen de la configuración asignando null al campo seleccionado.
   * 
   * @param {string} campo Nombre de la propiedad de imagen a limpiar.
   */
  function quitarConfigInstitucionalImagen(campo) {
    setConfigInstitucional((actual) => ({
      ...actual,
      [campo]: null,
    }));
  }

  /**
   * Envía la configuración institucional actual al Backend para guardarla de forma permanente.
   */
  async function guardarConfiguracion() {
    setGuardandoConfigInstitucional(true);
    try {
      const guardada = await guardarConfiguracionInstitucional(configInstitucional);
      setConfigInstitucional(guardada);
      mostrarMsg("Configuración institucional guardada con éxito.", "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo guardar la configuración institucional.");
    } finally {
      setGuardandoConfigInstitucional(false);
    }
  }

  return {
    configInstitucional,
    setConfigInstitucional,
    cargandoConfigInstitucional,
    setCargandoConfigInstitucional,
    guardandoConfigInstitucional,
    alertaConfiguracion,
    setAlertaConfiguracion,
    mostrarAlertaConfiguracion,
    actualizarConfigInstitucionalImagen,
    quitarConfigInstitucionalImagen,
    guardarConfigInstitucional: guardarConfiguracion,
  };
}
