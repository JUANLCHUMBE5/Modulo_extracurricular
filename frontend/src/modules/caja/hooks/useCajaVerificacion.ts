import { useState } from "react";
import { toast } from "sonner";
import {
  validarPagoWeb,
  observarPagoWeb,
  rechazarPagoWeb,
  obtenerPagoPorId,
  anularPago,
} from "../cajaService";
import { useDoubleSubmit } from "../../../hooks/useDoubleSubmit";

/**
 * Hook que gestiona la verificación de pagos web (Yape),
 * observación, rechazo y anulación de pagos.
 */
export default function useCajaVerificacion({
  formulario,
  limpiarPagoActual,
  cargarDatos,
  cargarReporteCaja,
  setCargando,
  setGuardando,
}: {
  formulario: any;
  limpiarPagoActual: () => void;
  cargarDatos: () => Promise<void>;
  cargarReporteCaja: () => Promise<void>;
  setCargando: (v: boolean) => void;
  setGuardando: (v: boolean) => void;
}) {
  // Verificación
  const [modalVerificacionAbierto, setModalVerificacionAbierto] = useState(false);
  const [modalObservarAbierto, setModalObservarAbierto] = useState(false);
  const [modalRechazarAbierto, setModalRechazarAbierto] = useState(false);
  const [pagoVerificar, setPagoVerificar] = useState<any>(null);
  const [observacionTexto, setObservacionTexto] = useState("");
  const [rechazoTexto, setRechazoTexto] = useState("");
  const [guardandoVerificacion, setGuardandoVerificacion] = useState(false);

  // Anulación
  const [modalAnularAbierto, setModalAnularAbierto] = useState(false);
  const [anulacionTexto, setAnulacionTexto] = useState("");
  const [pagoAnular, setPagoAnular] = useState<any>(null);

  /* ── Verificación pagos web ── */

  async function verificarPagoWeb(fila: any) {
    try {
      setCargando(true);
      const pago = await obtenerPagoPorId(fila.pagoId);
      if (!pago) { toast.error("Error", { description: "No se pudo recuperar los detalles del pago." }); return; }
      setPagoVerificar({ ...pago, estudiante: fila.estudiante, dniEstudiante: fila.dniEstudiante, programa: fila.programa });
      setModalVerificacionAbierto(true);
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Error al cargar detalles de verificacion." });
    } finally {
      setCargando(false);
    }
  }

  // Double submit wrapped actions
  const { execute: aprobarPagoWebDirectoAction } = useDoubleSubmit(async (fila: any) => {
    try {
      setCargando(true);
      await validarPagoWeb(fila.pagoId);
      toast.success("Pago aprobado", { description: "El pago web ha sido validado correctamente." });
      if (formulario.pagoId === fila.pagoId) limpiarPagoActual();
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error: any) {
      toast.error("Error al aprobar", { description: error.message || "No se pudo aprobar el pago." });
    } finally {
      setCargando(false);
    }
  });

  async function aprobarPagoWebDirecto(fila: any) {
    await aprobarPagoWebDirectoAction(fila);
  }

  const { execute: aprobarPagoWebDesdeModalAction } = useDoubleSubmit(async () => {
    if (!pagoVerificar) return;
    try {
      setGuardandoVerificacion(true);
      await validarPagoWeb(pagoVerificar.id);
      toast.success("Pago aprobado", { description: "El pago web ha sido validado correctamente." });
      setModalVerificacionAbierto(false);
      setPagoVerificar(null);
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error: any) {
      toast.error("Error al aprobar", { description: error.message || "No se pudo aprobar el pago." });
    } finally {
      setGuardandoVerificacion(false);
    }
  });

  async function aprobarPagoWebDesdeModal() {
    await aprobarPagoWebDesdeModalAction();
  }

  async function abrirObservarModal(fila: any) {
    if (!fila) return;
    try {
      setCargando(true);
      const pagoId = fila.pagoId || fila.id;
      let pago: any = null;
      if (pagoId) pago = await obtenerPagoPorId(pagoId);
      setPagoVerificar({
        ...fila, ...(pago || {}),
        estudiante: fila.estudiante || fila.estudianteNombre,
        dniEstudiante: fila.dniEstudiante || fila.estudianteDni,
        programa: fila.programa || fila.programaNombre,
      });
      setObservacionTexto("");
      setModalObservarAbierto(true);
    } catch {
      toast.error("Error", { description: "No se pudo cargar la captura del pago." });
    } finally {
      setCargando(false);
    }
  }

  async function abrirRechazarModal(fila: any) {
    if (!fila) return;
    try {
      setCargando(true);
      const pagoId = fila.pagoId || fila.id;
      let pago: any = null;
      if (pagoId) pago = await obtenerPagoPorId(pagoId);
      setPagoVerificar({
        ...fila, ...(pago || {}),
        estudiante: fila.estudiante || fila.estudianteNombre,
        dniEstudiante: fila.dniEstudiante || fila.estudianteDni,
        programa: fila.programa || fila.programaNombre,
      });
      setRechazoTexto("");
      setModalRechazarAbierto(true);
    } catch {
      toast.error("Error", { description: "No se pudo cargar la captura del pago." });
    } finally {
      setCargando(false);
    }
  }

  const { execute: observarPagoWebDesdeModalAction } = useDoubleSubmit(async () => {
    if (!pagoVerificar) return;
    if (!observacionTexto.trim()) {
      toast.error("Observar pago", { description: "Debe ingresar una observacion para observar el pago." });
      return;
    }
    try {
      setGuardandoVerificacion(true);
      const pagoId = pagoVerificar.pagoId || pagoVerificar.id;
      await observarPagoWeb(pagoId, observacionTexto);
      toast.success("Pago observado", { description: "El pago ha sido marcado como observado." });
      setModalObservarAbierto(false);
      setModalVerificacionAbierto(false);
      if (formulario.pagoId === pagoId) limpiarPagoActual();
      else setPagoVerificar(null);
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo observar el pago." });
    } finally {
      setGuardandoVerificacion(false);
    }
  });

  async function observarPagoWebDesdeModal() {
    await observarPagoWebDesdeModalAction();
  }

  const { execute: confirmarRechazoPagoWebAction } = useDoubleSubmit(async () => {
    if (!pagoVerificar) return;
    if (!rechazoTexto.trim()) {
      toast.error("Rechazar pago", { description: "Debe ingresar una observacion para rechazar el pago." });
      return;
    }
    try {
      setGuardandoVerificacion(true);
      const pagoId = pagoVerificar.pagoId || pagoVerificar.id;
      await rechazarPagoWeb(pagoId, rechazoTexto);
      toast.success("Pago rechazado", { description: "El pago ha sido rechazado correctamente." });
      setModalRechazarAbierto(false);
      setModalVerificacionAbierto(false);
      if (formulario.pagoId === pagoId) limpiarPagoActual();
      else setPagoVerificar(null);
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo rechazar el pago." });
    } finally {
      setGuardandoVerificacion(false);
    }
  });

  async function confirmarRechazoPagoWeb() {
    await confirmarRechazoPagoWebAction();
  }

  /* ── Anulación ── */

  function abrirAnularModal(fila: any) {
    if (!fila) return;
    setPagoAnular(fila);
    setAnulacionTexto("");
    setModalAnularAbierto(true);
  }

  function cerrarAnularModal() {
    setModalAnularAbierto(false);
    setPagoAnular(null);
    setAnulacionTexto("");
  }

  const { execute: confirmarAnularPagoAction } = useDoubleSubmit(async () => {
    if (!pagoAnular) return;
    if (!anulacionTexto.trim()) {
      toast.error("Anular pago", { description: "Debe ingresar una justificación para anular el pago." });
      return;
    }
    try {
      setGuardando(true);
      const pagoId = pagoAnular.pagoId || pagoAnular.id;
      await anularPago(pagoId, anulacionTexto);
      toast.success("Recibo/Pago anulado", { description: "El registro ha sido anulado correctamente." });
      cerrarAnularModal();
      await cargarDatos();
      await cargarReporteCaja();
    } catch (error: any) {
      toast.error("Error al anular", { description: error.message || "No se pudo anular el pago." });
    } finally {
      setGuardando(false);
    }
  });

  async function confirmarAnularPago() {
    await confirmarAnularPagoAction();
  }

  return {
    // Verificación web
    modalVerificacionAbierto, modalObservarAbierto, modalRechazarAbierto,
    pagoVerificar, observacionTexto, rechazoTexto, guardandoVerificacion,
    setObservacionTexto, setRechazoTexto,
    setModalVerificacionAbierto, setModalObservarAbierto, setModalRechazarAbierto,
    setPagoVerificar,
    verificarPagoWeb, aprobarPagoWebDirecto, aprobarPagoWebDesdeModal,
    abrirObservarModal, abrirRechazarModal,
    observarPagoWebDesdeModal, confirmarRechazoPagoWeb,
    // Anulación
    modalAnularAbierto, pagoAnular, anulacionTexto, setAnulacionTexto,
    abrirAnularModal, cerrarAnularModal, confirmarAnularPago,
  };
}
