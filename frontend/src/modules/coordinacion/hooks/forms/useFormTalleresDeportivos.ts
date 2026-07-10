import { useState } from "react";
import { normalizarPeriodoVista } from "../../utils/coordinacionProgramUtils";

export const tallerDepFormInicial = {
  deporte: "Vóley",
  custom: "",
  minEdad: "6",
  maxEdad: "9",
  dias: ["Jueves"],
  horaInicio: "15:50",
  horaFin: "16:50",
  cupos: "20",
  nivel: "Formativo",
  docente: "",
};

interface UseFormTalleresDeportivosProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  mostrarMsg: (msg: string, tipo?: string) => void;
}

export default function useFormTalleresDeportivos({
  form,
  setForm,
  mostrarMsg,
}: UseFormTalleresDeportivosProps) {
  const [tallerDepForm, setTallerDepForm] = useState(tallerDepFormInicial);
  const [indiceTallerEditando, setIndiceTallerEditando] = useState<number | null>(null);

  const iniciarEdicionTaller = (index: number) => {
    const lista = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const taller = lista[index];
    if (!taller) return;

    setIndiceTallerEditando(index);

    const deportesPorDefecto =
      normalizarPeriodoVista(form.periodo) === "verano"
        ? form.categoria === "Talleres Deportivos"
          ? ["Fútbol", "Vóley", "Básquet"]
          : ["Danza", "Mini Chef", "Pintura", "Teatro", "Inglés", "Zancos", "Artes plásticas"]
        : ["Vóley", "Fútbol", "Básquet"];

    const esOtro = !deportesPorDefecto.includes(taller.deporte);

    setTallerDepForm({
      deporte: esOtro ? "Otro" : taller.deporte,
      custom: esOtro ? taller.deporte : "",
      minEdad: String(taller.edadMinima),
      maxEdad: String(taller.edadMaxima),
      dias: String(taller.dia || "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      horaInicio: taller.horaInicio,
      horaFin: taller.horaFin,
      cupos: String(taller.cupos || 20),
      nivel: taller.nivel || "Formativo",
      docente: taller.docente || "",
    });
  };

  const cancelarEdicionTaller = () => {
    setIndiceTallerEditando(null);
    setTallerDepForm({
      ...tallerDepFormInicial,
      deporte:
        normalizarPeriodoVista(form.periodo) === "verano"
          ? form.categoria === "Talleres Deportivos"
            ? "Fútbol"
            : "Danza"
          : "Vóley",
    });
  };

  const agregarTallerDeportivo = () => {
    const deporteFinal = tallerDepForm.deporte === "Otro" ? tallerDepForm.custom.trim() : tallerDepForm.deporte;
    if (!deporteFinal) {
      mostrarMsg("Ingrese el nombre del deporte.");
      return;
    }
    const minE = Number(tallerDepForm.minEdad);
    const maxE = Number(tallerDepForm.maxEdad);
    if (!tallerDepForm.minEdad || !tallerDepForm.maxEdad || minE > maxE) {
      mostrarMsg("Rango de edades inválido.");
      return;
    }
    if (!tallerDepForm.horaInicio || !tallerDepForm.horaFin) {
      mostrarMsg("Ingrese las horas de inicio y fin.");
      return;
    }
    if (tallerDepForm.horaInicio >= tallerDepForm.horaFin) {
      mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      return;
    }
    const cuposTaller = Number(tallerDepForm.cupos);
    if (Number.isNaN(cuposTaller) || cuposTaller <= 0) {
      mostrarMsg("Ingrese un número de cupos válido para el taller.");
      return;
    }
    const docenteFinal = tallerDepForm.docente.trim();
    if (!docenteFinal) {
      mostrarMsg("Ingrese el tutor o docente a cargo del taller.");
      return;
    }
    if (!tallerDepForm.dias || tallerDepForm.dias.length === 0) {
      mostrarMsg("Seleccione al menos un día de atención.");
      return;
    }

    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    let nuevaLista: any[];
    if (indiceTallerEditando !== null) {
      const nuevoTaller = {
        deporte: deporteFinal,
        edadMinima: minE,
        edadMaxima: maxE,
        dia: tallerDepForm.dias.join(", "),
        horaInicio: tallerDepForm.horaInicio,
        horaFin: tallerDepForm.horaFin,
        cupos: cuposTaller,
        nivel: tallerDepForm.nivel,
        docente: docenteFinal,
      };
      nuevaLista = listaActual.map((taller, idx) => (idx === indiceTallerEditando ? nuevoTaller : taller));
    } else {
      const nuevoTaller = {
        deporte: deporteFinal,
        edadMinima: minE,
        edadMaxima: maxE,
        dia: tallerDepForm.dias.join(", "),
        horaInicio: tallerDepForm.horaInicio,
        horaFin: tallerDepForm.horaFin,
        cupos: cuposTaller,
        nivel: tallerDepForm.nivel,
        docente: docenteFinal,
      };
      nuevaLista = [...listaActual, nuevoTaller];
    }
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm((prev: any) => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    setIndiceTallerEditando(null);

    setTallerDepForm((prev) => ({
      ...prev,
      custom: "",
      cupos: "20",
      nivel: "Formativo",
      docente: "",
      dias: ["Jueves"],
    }));
  };

  const quitarTallerDeportivo = (index: number) => {
    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const nuevaLista = listaActual.filter((_, idx) => idx !== index);
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm((prev: any) => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    if (indiceTallerEditando === index) {
      setIndiceTallerEditando(null);
      setTallerDepForm((prev) => ({
        ...prev,
        custom: "",
        cupos: "20",
        nivel: "Formativo",
        docente: "",
      }));
    } else if (indiceTallerEditando !== null && indiceTallerEditando > index) {
      setIndiceTallerEditando((prev) => (prev !== null ? prev - 1 : null));
    }
  };

  return {
    tallerDepForm,
    setTallerDepForm,
    indiceTallerEditando,
    setIndiceTallerEditando,
    iniciarEdicionTaller,
    cancelarEdicionTaller,
    agregarTallerDeportivo,
    quitarTallerDeportivo,
  };
}
