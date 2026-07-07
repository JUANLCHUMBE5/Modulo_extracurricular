import { useState } from "react";
import {
  IconX as X,
  IconStar as Star,
} from "@tabler/icons-react";
import { formatearSoles } from "../hooks/usePadres";
import { repararTexto } from "../utils/padresTextUtils";

import ProgramDetailsCard, {
  calcularPrimerDiaClase,
  obtenerEstadoPagoPadres,
} from "./ProgramDetailsCard";
import CatalogoProgramas from "./CatalogoProgramas";

export { calcularPrimerDiaClase };

function ProgramaPrincipal({
  programa,
  inscripcion,
  setPasoActivo,
  onInscribirProgramaPrincipal,
}: any) {
  if (!programa) return null;

  const tieneTalleres = Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0;
  const deportesUnicos = tieneTalleres
    ? [...new Set(programa.talleresDeportivos.map((t: any) => t.deporte).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b))
    : [];
  const nivelesTalleres = tieneTalleres
    ? [...new Set(programa.talleresDeportivos.map((t: any) => t.nivel).filter(Boolean))]
    : [];

  const nombrePrograma = programa.nombre;

  let buttonText = "Confirmar vacante";
  let buttonDisabled = false;
  let buttonAction = onInscribirProgramaPrincipal;

  let esPagado = false;
  let esVerificando = false;
  let esPendienteCaja = false;

  if (inscripcion) {
    const estadoPago = obtenerEstadoPagoPadres(inscripcion);
    esPagado = estadoPago === "pagado";
    esVerificando = estadoPago === "verificando";
    esPendienteCaja = estadoPago === "pendiente_caja";

    if (esPagado) {
      buttonText = "Pago exitoso";
      buttonDisabled = true;
    } else if (esVerificando) {
      buttonText = "Pago en proceso";
      buttonDisabled = true;
    } else if (esPendienteCaja) {
      buttonText = "Reserva pendiente";
      buttonDisabled = true;
    } else {
      buttonText = "Continuar al pago";
      buttonAction = () => setPasoActivo(3);
    }
  } else if (programa?.ventanaInscripcion?.noIniciada === true) {
    buttonText = "Próximamente";
    buttonDisabled = true;
  } else if (programa?.ventanaInscripcion?.permitida === false) {
    buttonText = "Inscripciones cerradas";
    buttonDisabled = true;
  }

  const IconHead = Star;

  let noteText = "Confirme la participación de su hijo(a) en este programa.";
  let noteIconColor = "#3b82f6";
  let noteBg = "#f8fafc";
  let noteTextColor = "#334155";
  let noteBorderColor = "#e2e8f0";

  if (inscripcion) {
    if (esPagado) {
      noteText = "Inscripción activa y pago registrado con éxito.";
      noteIconColor = "#16a34a";
      noteBg = "#f0fdf4";
      noteTextColor = "#15803d";
      noteBorderColor = "#bbf7d0";
    } else if (esVerificando) {
      noteText = "Pago en proceso de verificación.";
      noteIconColor = "#ca8a04";
      noteBg = "#fefce8";
      noteTextColor = "#a16207";
      noteBorderColor = "#fef08a";
    } else if (esPendienteCaja) {
      noteText = "Reserva registrada. Pendiente de pago en caja.";
      noteIconColor = "#ca8a04";
      noteBg = "#fefce8";
      noteTextColor = "#a16207";
      noteBorderColor = "#fef08a";
    } else {
      noteText = "Inscripción pendiente de pago.";
      noteIconColor = "#dc2626";
      noteBg = "#fef2f2";
      noteTextColor = "#991b1b";
      noteBorderColor = "#fca5a5";
    }
  }

  if (!inscripcion) {
    if (programa?.ventanaInscripcion?.noIniciada === true) {
      noteText = programa.ventanaInscripcion.mensaje || "La inscripción iniciará próximamente.";
      noteIconColor = "#ca8a04";
      noteBg = "#fefce8";
      noteTextColor = "#a16207";
      noteBorderColor = "#fef08a";
    } else if (programa?.ventanaInscripcion?.permitida === false) {
      noteText = "El plazo de inscripción regular cerró. Derive al apoderado a Cajera para evaluar el registro.";
      noteIconColor = "#dc2626";
      noteBg = "#fef2f2";
      noteTextColor = "#991b1b";
      noteBorderColor = "#fca5a5";
    }
  }

  return (
    <ProgramDetailsCard
      programa={programa}
      nombrePrograma={nombrePrograma}
      nivelesTalleres={nivelesTalleres}
      deportesUnicos={deportesUnicos}
      inscripcion={inscripcion}
      noteBg={noteBg}
      noteBorderColor={noteBorderColor}
      noteTextColor={noteTextColor}
      noteIconColor={noteIconColor}
      noteText={noteText}
      buttonDisabled={buttonDisabled}
      buttonAction={buttonAction}
      buttonText={buttonText}
      formatearSoles={formatearSoles}
      IconHead={IconHead}
    />
  );
}

export default function InicioStep({
  cargandoProgramas,
  datosConfirmados,
  guardando,
  inscripcion,
  mostrarCatalogoProgramas,
  programa,
  programaSeleccionadoId,
  programasDisponibles,
  setPasoActivo,
  solicitarInscripcionPadres,
  onInscribirCursoAdicional,
  onInscribirProgramaPrincipal,
}: any) {
  const [lightboxImagen, setLightboxImagen] = useState<any>(null);

  return (
    <>
      <ProgramaPrincipal
        programa={programa}
        inscripcion={inscripcion}
        setPasoActivo={setPasoActivo}
        onInscribirProgramaPrincipal={onInscribirProgramaPrincipal}
      />

      <CatalogoProgramas
        cargandoProgramas={cargandoProgramas}
        datosConfirmados={datosConfirmados}
        guardando={guardando}
        mostrarCatalogoProgramas={mostrarCatalogoProgramas}
        programa={programa}
        programaSeleccionadoId={programaSeleccionadoId}
        programasDisponibles={programasDisponibles}
        setPasoActivo={setPasoActivo}
        solicitarInscripcionPadres={solicitarInscripcionPadres}
        setLightboxImagen={setLightboxImagen}
        onInscribirCursoAdicional={onInscribirCursoAdicional}
      />

      {lightboxImagen ? (
        <div className="padres-lightbox-overlay" onClick={() => setLightboxImagen(null)} role="presentation">
          <div className="padres-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button className="padres-lightbox-close" type="button" onClick={() => setLightboxImagen(null)} aria-label="Cerrar afiche">
              <X size={20} />
            </button>
            <div className="padres-lightbox-body">
              <img src={lightboxImagen.src} alt={lightboxImagen.alt} className="padres-lightbox-img" />
            </div>
            {lightboxImagen.title ? <div className="padres-lightbox-caption">{lightboxImagen.title}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
