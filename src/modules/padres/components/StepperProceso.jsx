import {
  IconCheck as Check,
  IconCreditCard as CreditCard,
  IconFileText as FileText,
  IconHome as Home,
  IconUserCircle as UserRound,
} from "@tabler/icons-react";

const pasosPortal = [
  {
    titulo: "Inicio",
    detalle: "Programa",
    icon: Home,
  },
  {
    titulo: "Comunicado",
    detalle: "Leer y aceptar",
    icon: FileText,
  },
  {
    titulo: "Datos",
    detalle: "Apoderado",
    icon: UserRound,
  },
  {
    titulo: "Pago",
    detalle: "Yape",
    icon: CreditCard,
  },
];

function cn(...items) {
  return items.filter(Boolean).join(" ");
}

export default function StepperProceso({ pasoActivo, pasoMaximo, onSelect }) {
  const permiteNavegar = typeof onSelect === "function";

  return (
    <nav className="padres-flow-stepper" aria-label="Pasos del portal de padres">
      {pasosPortal.map(({ titulo, detalle, icon: Icon }, index) => {
        const activo = pasoActivo === index;
        const completo = index < pasoActivo && index <= pasoMaximo;
        const bloqueado = index > pasoActivo || index > pasoMaximo;
        const navegable = permiteNavegar && index < pasoActivo && index <= pasoMaximo;

        return (
          <button
            key={titulo}
            type="button"
            className={cn("padres-flow-step", activo && "is-active", completo && "is-done", !navegable && "is-readonly")}
            disabled={bloqueado}
            aria-disabled={!navegable}
            onClick={() => {
              if (navegable) onSelect(index);
            }}
          >
            <span className="padres-flow-step-icon">
              {completo ? <Check size={15} /> : <Icon size={17} />}
            </span>
            <span>
              <strong>{titulo}</strong>
              <small>{detalle}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
