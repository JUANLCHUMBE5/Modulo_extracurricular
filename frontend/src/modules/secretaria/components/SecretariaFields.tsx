import { IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

function ProcesoItem({ activo, completado, texto }: { activo: boolean; completado: boolean; texto: string }) {
  return (
    <div className={`secretaria-process-item ${activo ? "is-active" : ""} ${completado ? "is-complete" : ""}`}>
      <span>{completado ? <CheckCircle2 size={15} /> : null}</span>
      <p>{texto}</p>
    </div>
  );
}

interface CampoTextoProps {
  label: string;
  icon?: React.ReactNode;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  maxLength?: number | string;
  className?: string;
}

function CampoTexto({ label, icon, value, onChange, placeholder, maxLength, className = "" }: CampoTextoProps) {
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
        maxLength={maxLength as any}
      />
    </div>
  );
}

function CampoLectura({ label, value, className = "" }: { label: string; value: any; className?: string }) {
  return (
    <div className={`secretaria-field ${className}`.trim()}>
      <label>{label}</label>
      <div className="secretaria-readonly-field">{value || "No definido"}</div>
    </div>
  );
}

function DatoHorario({ label, value, icon: Icon, themeClass }: { label: string; value: any; icon?: any; themeClass?: string }) {
  const isValido = value && value !== "-" && String(value).trim().toLowerCase() !== "no definido" && String(value).trim() !== "";
  if (!isValido) return null;

  return (
    <div className={`secretaria-schedule-item ${themeClass || ""}`}>
      <span className="secretaria-schedule-label">
        {Icon && <Icon size={14} className="secretaria-schedule-icon" />}
        {label}
      </span>
      <strong className="secretaria-schedule-value">{value}</strong>
    </div>
  );
}

const diasSemanaSecretaria = [
  { valor: "Lunes", patron: /\blunes\b/i },
  { valor: "Martes", patron: /\bmartes\b/i },
  { valor: "Miércoles", patron: /\bmi(?:e|é|é)rcoles\b/i },
  { valor: "Jueves", patron: /\bjueves\b/i },
  { valor: "Viernes", patron: /\bviernes\b/i },
  { valor: "Sábado", patron: /\bs(?:a|á|á)bado\b/i },
  { valor: "Domingo", patron: /\bdomingo\b/i },
];

function listarDiasHorario(texto: string) {
  return diasSemanaSecretaria
    .filter((dia) => dia.patron.test(texto))
    .map((dia) => dia.valor);
}

function formatearDiasHorario(dias: string[]) {
  if (dias.length <= 2) return dias.join(" y ");
  return `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}`;
}

function resumirHorarioSecretaria(horario: any) {
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

function resumirClaseSecretaria(horario: any) {
  const h = resumirHorarioSecretaria(horario);
  if (!h.clase) return String(horario || "");
  const range = formatearRangoHoraSecretaria(h.clase);
  return h.dia ? `${h.dia}: ${range}` : range;
}

function formatearRangoHoraSecretaria(valor: string) {
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

function formatearHoraClase(horaTexto: string, minutoTexto: string) {
  const hora = Number(horaTexto);
  const minuto = String(minutoTexto || "00").padStart(2, "0");
  if (!Number.isFinite(hora)) return `${horaTexto}:${minuto}`;
  if (hora === 0) return `12:${minuto} AM`;
  if (hora < 12) return `${hora}:${minuto} AM`;
  if (hora === 12) return `12:${minuto} PM`;
  return `${hora - 12}:${minuto} PM`;
}

function formatearCuposSecretaria(programa: any) {
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
