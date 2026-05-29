import { IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

function ProcesoItem({ activo, completado, texto }) {
  return (
    <div className={`secretaria-process-item ${activo ? "is-active" : ""} ${completado ? "is-complete" : ""}`}>
      <span>{completado ? <CheckCircle2 size={15} /> : null}</span>
      <p>{texto}</p>
    </div>
  );
}

function CampoTexto({ label, icon, value, onChange, placeholder, maxLength, className = "" }) {
  return (
    <div className={`secretaria-field ${className}`.trim()}>
      <label>
        {icon}
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

function CampoLectura({ label, value }) {
  return (
    <div className="secretaria-field">
      <label>{label}</label>
      <div className="secretaria-readonly-field">{value || "No definido"}</div>
    </div>
  );
}

function DatoHorario({ label, value }) {
  return (
    <div className="secretaria-schedule-item">
      <span>{label}</span>
      <strong>{value || "No definido"}</strong>
    </div>
  );
}

const diasSemanaSecretaria = [
  { valor: "Lunes", patron: /\blunes\b/i },
  { valor: "Martes", patron: /\bmartes\b/i },
  { valor: "Miércoles", patron: /\bmi(?:e|é|Ã©)rcoles\b/i },
  { valor: "Jueves", patron: /\bjueves\b/i },
  { valor: "Viernes", patron: /\bviernes\b/i },
  { valor: "Sábado", patron: /\bs(?:a|á|Ã¡)bado\b/i },
  { valor: "Domingo", patron: /\bdomingo\b/i },
];

function listarDiasHorario(texto) {
  return diasSemanaSecretaria
    .filter((dia) => dia.patron.test(texto))
    .map((dia) => dia.valor);
}

function formatearDiasHorario(dias) {
  if (dias.length <= 2) return dias.join(" y ");
  return `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}`;
}

function resumirHorarioSecretaria(horario) {
  const texto = String(horario || "");
  const dia = formatearDiasHorario(listarDiasHorario(texto));
  const clase = formatearRangoHoraSecretaria(texto.match(/clase\s+([^,·/]+)/i)?.[1]?.trim() || "");
  const almuerzo = texto.match(/almuerzo\s+([^,·/]+)/i)?.[1]?.trim() || "";
  return {
    dia,
    clase,
    almuerzo,
  };
}

function resumirClaseSecretaria(horario) {
  const clase = resumirHorarioSecretaria(horario).clase || "";
  if (!clase) return String(horario || "");
  return formatearRangoHoraSecretaria(clase);
}

function formatearRangoHoraSecretaria(valor) {
  return String(valor || "")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\b(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\b/gi, (_, hora, minuto, periodo) => {
      if (periodo) return `${Number(hora)}:${minuto} ${periodo.toUpperCase()}`;
      return formatearHoraClase(hora, minuto);
    })
    .replace(/\b(AM|PM)\s+\1\b/gi, "$1")
    .replace(/\bAM\s+PM\b/gi, "PM")
    .replace(/\bPM\s+AM\b/gi, "AM");
}

function formatearHoraClase(horaTexto, minutoTexto) {
  const hora = Number(horaTexto);
  const minuto = String(minutoTexto || "00").padStart(2, "0");
  if (!Number.isFinite(hora)) return `${horaTexto}:${minuto}`;
  if (hora === 0) return `12:${minuto} AM`;
  if (hora < 12) return `${hora}:${minuto} AM`;
  if (hora === 12) return `12:${minuto} PM`;
  return `${hora - 12}:${minuto} PM`;
}

function formatearCuposSecretaria(programa) {
  if (!programa) return "";
  if (Number.isFinite(Number(programa.cuposDisponibles))) return String(programa.cuposDisponibles);
  const match = String(programa.cupos || "").match(/\d+/);
  return match?.[0] || programa.cupos || "";
}

export {
  ProcesoItem,
  CampoTexto,
  CampoLectura,
  DatoHorario,
  resumirClaseSecretaria,
  resumirHorarioSecretaria,
  formatearRangoHoraSecretaria,
  formatearCuposSecretaria,
};
