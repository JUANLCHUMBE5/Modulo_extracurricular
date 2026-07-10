import { useState } from "react";
import { guardarConfiguracionInstitucional } from "../../services/coordinacionService";

interface UseCoordinacionConfigProps {
  configInstitucional: any;
  setConfigInstitucional: React.Dispatch<React.SetStateAction<any>>;
  mostrarMsg: (msg: string, tipo?: string) => void;
}

export default function useCoordinacionConfig({
  configInstitucional,
  setConfigInstitucional,
  mostrarMsg,
}: UseCoordinacionConfigProps) {
  const [guardandoConfigInstitucional, setGuardandoConfigInstitucional] = useState(false);

  function actualizarConfigInstitucionalImagen(campo: string, imagen: any) {
    setConfigInstitucional((actual: any) => ({
      ...(actual || {}),
      [campo]: imagen,
    }));
  }

  function quitarConfigInstitucionalImagen(campo: string) {
    setConfigInstitucional((actual: any) => ({
      ...(actual || {}),
      [campo]: null,
    }));
  }

  async function guardarConfigInstitucional() {
    setGuardandoConfigInstitucional(true);
    try {
      const guardada = await guardarConfiguracionInstitucional(configInstitucional);
      setConfigInstitucional(guardada);
      mostrarMsg("Recursos institucionales guardados correctamente.", "success");
      return true;
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudo guardar la configuración institucional.");
      return false;
    } finally {
      setGuardandoConfigInstitucional(false);
    }
  }

  return {
    guardandoConfigInstitucional,
    actualizarConfigInstitucionalImagen,
    quitarConfigInstitucionalImagen,
    guardarConfigInstitucional,
  };
}
