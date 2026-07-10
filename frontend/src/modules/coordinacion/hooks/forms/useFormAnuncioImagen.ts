import { comprimirImagenAnuncio } from "../../utils/coordinacionProgramUtils";

interface UseFormAnuncioImagenProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  mostrarMsg: (msg: string, tipo?: string) => void;
}

export default function useFormAnuncioImagen({ form, setForm, mostrarMsg }: UseFormAnuncioImagenProps) {
  async function seleccionarImagenAnuncio(event: any) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      event.target.value = "";
      mostrarMsg("Seleccione una imagen válida para el anuncio.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      event.target.value = "";
      mostrarMsg("La imagen no debe superar 8 MB antes de comprimir.");
      return;
    }

    try {
      const resultado = await comprimirImagenAnuncio(archivo);
      setForm((actual: any) => ({
        ...actual,
        anuncioImagen: resultado.dataUrl,
        anuncioImagenNombre: archivo.name,
        anuncioImagenTamano: resultado.bytes,
        anuncioImagenComprimida: resultado.comprimida,
      }));
      mostrarMsg(
        resultado.comprimida
          ? "Imagen agregada y comprimida para el portal de padres."
          : "Imagen agregada para el portal de padres.",
        "success"
      );
    } catch (err: any) {
      mostrarMsg(err.message);
    } finally {
      event.target.value = "";
    }
  }

  function quitarImagenAnuncio() {
    setForm((actual: any) => ({
      ...actual,
      anuncioImagen: "",
      anuncioImagenNombre: "",
      anuncioImagenTamano: 0,
      anuncioImagenComprimida: false,
    }));
  }

  return {
    seleccionarImagenAnuncio,
    quitarImagenAnuncio,
  };
}
