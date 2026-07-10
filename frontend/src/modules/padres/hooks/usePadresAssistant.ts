import { useState } from "react";
import {
  responderAsistenteLocal,
  obtenerSiguientePaso,
  obtenerTipoReforzamiento,
} from "../utils/padresAssistantUtils";

const mensajesIniciales = [
  {
    autor: "bot",
    texto: "Hola, soy Rafael. Puedo orientarte sobre el programa, horario, pago, ficha y el siguiente paso del registro.",
  },
];

export function usePadresAssistant({
  estudiante,
  programa,
  inscripcion,
  inscripciones,
  pagos,
  form,
  programaChat,
}: any) {
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [consulta, setConsulta] = useState("");

  function preguntar(texto: string, contextoExtra = {}) {
    const pregunta = String(texto || consulta).trim();
    if (!pregunta) return;

    const currentProg = programaChat || programa;
    const activeInscripcion = currentProg
      ? inscripciones.find((ins: any) => ins.programaId === (currentProg.programaId || currentProg.id))
      : null;

    const currentInscripcion = activeInscripcion || inscripcion;

    const respuesta = responderAsistenteLocal(pregunta, {
      estudiante,
      programa: currentProg,
      inscripcion: currentInscripcion,
      pagos,
      siguientePaso: obtenerSiguientePaso({ programa: currentProg, inscripcion: currentInscripcion }),
      tipoReforzamiento: obtenerTipoReforzamiento(currentProg),
      form,
      contextoFlujo: {
        ...contextoExtra,
        programaActual: currentProg,
        inscripcionActual: currentInscripcion,
      },
    });

    setMensajes((actual) => [
      ...actual,
      { autor: "padre", texto: pregunta },
      { autor: "bot", texto: respuesta },
    ]);
    setConsulta("");
  }

  function consultarRafael(texto: string, contextoExtra = {}) {
    setAsistenteAbierto(true);
    preguntar(texto, contextoExtra);
  }

  return {
    asistenteAbierto,
    setAsistenteAbierto,
    mensajes,
    setMensajes,
    consulta,
    setConsulta,
    preguntar,
    consultarRafael,
  };
}
