import { useState } from "react";
import { formularioInicial, programaDisponibleParaEdadSecretaria } from "../utils/secretariaRules";

export function useSecretariaForm({ period, programs }: { period: string; programs: any[] }) {
  const [formulario, setFormulario] = useState(formularioInicial);

  function actualizarFormulario(campo: string, valor: any) {
    setFormulario((actual) => {
      const siguiente = {
        ...actual,
        [campo]: valor,
      };
      if (period === "verano" && campo === "edadExterno") {
        const compatibles = programs.filter((programa) =>
          programaDisponibleParaEdadSecretaria(programa, valor)
        );
        const programaActualValido = compatibles.some((programa) => programa.id === actual.programa);
        siguiente.programa = programaActualValido ? actual.programa : compatibles[0]?.id || "";
      }
      return siguiente;
    });
  }

  return {
    formulario,
    setFormulario,
    actualizarFormulario,
  };
}
