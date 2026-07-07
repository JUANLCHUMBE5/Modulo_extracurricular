import {
  IconCalendar as Calendar,
  IconClock as Clock,
  IconUser as User,
  IconReceipt as Receipt,
  IconClipboardCheck as ClipboardCheck,
  IconBook2 as BookOpen,
  IconCategory as Category,
  IconBallFootball as BallFootball,
} from "@tabler/icons-react";

export function obtenerTalleresEstructurados(programa: any) {
  if (!programa) return [];

  const categoria = String(programa.categoria || "").toLowerCase();
  const tieneTalleres = Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0;

  if (categoria !== "deportivo" && !tieneTalleres) {
    return [];
  }

  let list = [];

  // 1. Si tiene talleresDeportivos (arreglo estructurado)
  if (tieneTalleres) {
    list = programa.talleresDeportivos.map((taller: any) => {
      const nivelLabel = taller.nivel ? ` [${taller.nivel}]` : "";
      const label = `${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} a.) (${taller.horaInicio}-${taller.horaFin})`;
      const horarioCompleto = `${taller.dia}: ${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} a.): ${taller.horaInicio}-${taller.horaFin}`;
      return {
        dia: taller.dia,
        deporte: taller.deporte,
        nivel: taller.nivel || "",
        edadMinima: taller.edadMinima,
        edadMaxima: taller.edadMaxima,
        horaInicio: taller.horaInicio,
        horaFin: taller.horaFin,
        horarioCompleto,
        label,
      };
    });
  } else {
    // 2. Fallback a parsear el texto de horario
    const texto = String(programa.horario || "").trim();
    if (!texto) return [];

    const sessions = texto.split("/").map(s => s.trim()).filter(Boolean);
    const isComplex = sessions.some(s => s.includes(":"));
    if (!isComplex) return [];

    const resultado: any[] = [];
    sessions.forEach((session) => {
      const colonIdx = session.indexOf(":");
      let day = "";
      let content = session;
      if (colonIdx > -1) {
        const left = session.substring(0, colonIdx).trim();
        if (!/\d/.test(left)) {
          day = left;
          content = session.substring(colonIdx + 1).trim();
        }
      }

      const activities = content.split(",").map(a => a.trim()).filter(Boolean);
      activities.forEach((act) => {
        const actColonIdx = act.indexOf(":");
        if (actColonIdx > -1) {
          const name = act.substring(0, actColonIdx).trim();
          const time = act.substring(actColonIdx + 1).trim();

          let deporte = name;
          let edadMinima = "";
          let edadMaxima = "";
          const matchEdad = name.match(/^(.+?)\s*\((\d+)-(\d+)\s*a\.\)/);
          if (matchEdad) {
            deporte = matchEdad[1].trim();
            edadMinima = matchEdad[2];
            edadMaxima = matchEdad[3];
          }

          const label = `${name} (${time})`;
          const horarioCompleto = `${day}: ${name}: ${time}`;

          resultado.push({
            dia: day,
            deporte,
            edadMinima,
            edadMaxima,
            horaInicio: time.split("-")[0]?.trim() || "",
            horaFin: time.split("-")[1]?.trim() || "",
            horarioCompleto,
            label,
          });
        }
      });
    });
    list = resultado;
  }

  // Sort list alphabetically by sport name (deporte)
  list.sort((a, b) => String(a.deporte || "").localeCompare(String(b.deporte || "")));
  return list;
}

export function formatTime12h(timeStr: string) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1].trim();
  if (Number.isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 should be 12
  return `${hour}:${minute} ${ampm}`;
}

export function obtenerEmojiDeporte(deporte: string) {
  const d = String(deporte || "").toLowerCase();
  if (d.includes("futbol") || d.includes("fútbol")) return "⚽";
  if (d.includes("basquet") || d.includes("básquet") || d.includes("basketball")) return "🏀";
  if (d.includes("voley") || d.includes("vóley") || d.includes("volleyball")) return "🏐";
  return "🏆";
}

export function obtenerIconoPorTipo(tipo = "") {
  if (tipo === "vigencia") return Calendar;
  if (tipo === "horario") return Clock;
  if (tipo === "costo") return Receipt;
  if (tipo === "plazo" || tipo === "inicio") return Calendar;
  if (tipo === "responsable") return User;
  if (tipo === "modalidad") return Category;
  if (tipo === "disponibles") return BallFootball;
  return BookOpen;
}

export function obtenerClasePorTipo(tipo = "") {
  if (tipo === "vigencia" || tipo === "inicio") return "is-vigencia";
  if (tipo === "horario") return "is-horario";
  if (tipo === "costo") return "is-costo";
  if (tipo === "plazo") return "is-plazo";
  if (tipo === "responsable") return "is-responsable";
  if (tipo === "modalidad") return "is-horario";
  if (tipo === "disponibles") return "is-vigencia";
  return "is-general";
}
