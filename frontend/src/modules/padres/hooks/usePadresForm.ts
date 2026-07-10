import { useRef, useState } from "react";
import { toast } from "sonner";
import { guardarDatosApoderadoPadres } from "../services/padresService";

export function usePadresForm({ userDni, cargarResumenCallback }: { userDni: string; cargarResumenCallback: () => Promise<any> }) {
  const [guardando, setGuardando] = useState(false);
  const formularioEditadoRef = useRef(false);
  const [form, setForm] = useState({
    apoderado: "",
    telefono: "",
    correo: "",
    acepta: false,
    enviarPdfCorreo: false,
  });

  function avisar(message: string) {
    toast.warning("Revisar datos", { description: message });
  }

  function actualizar(campo: string, valor: any) {
    formularioEditadoRef.current = true;
    setForm((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "correo" && !String(valor || "").trim()) {
        siguiente.enviarPdfCorreo = false;
      }
      return siguiente;
    });
  }

  async function guardarDatos(eventOrOptions?: any) {
    const isEvent = eventOrOptions && (typeof eventOrOptions.preventDefault === "function" || eventOrOptions.nativeEvent);
    const options = isEvent ? {} : (eventOrOptions || {});
    if (isEvent) {
      eventOrOptions.preventDefault();
    }

    if (!form.apoderado.trim()) {
      avisar("Ingrese el nombre del padre o apoderado.");
      return false;
    }
    if (!/^\d{9}$/.test(form.telefono.trim())) {
      avisar("Ingrese un telefono de contacto valido de 9 numeros.");
      return false;
    }
    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      avisar("Ingrese un correo valido o deje el campo vacio.");
      return false;
    }
    if (!form.acepta) {
      avisar("Confirme que los datos son correctos.");
      return false;
    }

    setGuardando(true);
    try {
      await guardarDatosApoderadoPadres(userDni, form);
      formularioEditadoRef.current = false;
      if (!options.silencioso) {
        toast.success("Padres", {
          description: "Datos del apoderado guardados.",
        });
      }
      await cargarResumenCallback();
      return true;
    } catch (err: any) {
      avisar(err.message || "No se pudieron guardar los datos.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  return {
    form,
    setForm,
    guardando,
    setGuardando,
    actualizar,
    guardarDatos,
    formularioEditadoRef,
  };
}
