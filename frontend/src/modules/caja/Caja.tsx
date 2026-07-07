import useSidebar from "../../hooks/useSidebar";
import { Button, Group, Modal, Text, Textarea } from "@mantine/core";
import { IconCheck as Check, IconX as X, IconMenu2 as Menu } from "@tabler/icons-react";

import CajaFields from "./components/CajaFields";
import CajaPagoWebModals from "./components/CajaPagoWebModals";
import CajaSidebar from "./components/CajaSidebar/CajaSidebar";
import CajaCobros from "./components/CajaCobros/CajaCobros";
import CajaReportes from "./components/CajaReportes/CajaReportes";
import CajaCancelarCorrelativo from "./components/CajaCancelarCorrelativo/CajaCancelarCorrelativo";
import HistorialAlumnoModal from "./components/CajaReportes/HistorialAlumnoModal";

import { formatearSoles } from "./utils/cajaFormatters";
import useCaja from "./hooks/useCaja";
import "./Caja.css";

export default function Caja({
  delegatedContent,
  embedded = false,
  initialView = "pagos",
  moduleSwitcher,
  onClearDelegatedModule,
  onLogout,
}) {
  const [sidebarExpanded, toggleSidebar] = useSidebar("caja");

  const caja = useCaja({ embedded, initialView });

  return (
    <main className={embedded ? "caja-page caja-page-embedded" : `caja-page ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {/* Backdrop overlay — closes sidebar on click */}
      {!embedded && sidebarExpanded && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      {!embedded ? (
        <CajaSidebar
          sidebarExpanded={sidebarExpanded}
          toggleSidebar={toggleSidebar}
          vista={caja.vista}
          setVista={caja.setVista}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={onClearDelegatedModule}
          onLogout={onLogout}
          delegatedContent={delegatedContent}
        />
      ) : null}

      <section className={embedded ? "caja-main caja-main-embedded" : "caja-main"}>
        {!embedded && !sidebarExpanded && (
          <button
            className="sidebar-floating-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={20} />
          </button>
        )}
        {delegatedContent ? (
          delegatedContent
        ) : (
          <>
            {caja.vista === "reportes" ? (
              <CajaReportes
                sidebarExpanded={sidebarExpanded}
                toggleSidebar={toggleSidebar}
                periodo={caja.periodo}
                setPeriodo={caja.setPeriodo}
                descargarReporte={caja.descargarReporte}
                reporte={caja.reporte}
                reporteCaja={caja.reporteCajaFiltrado}
                filtrosReporte={caja.filtrosReporte}
                historialAlumno={caja.historialAlumno}
                historialAlumnoAbierto={caja.historialAlumnoAbierto}
                historialAlumnoCargando={caja.historialAlumnoCargando}
                historialAlumnoRegistro={caja.historialAlumnoRegistro}
                opcionesReporte={{
                  ...caja.opcionesReporte,
                  grados: caja.gradosDisponibles,
                  secciones: caja.seccionesDisponibles,
                }}
                actualizarFiltroReporte={caja.actualizarFiltroReporte}
                aprobarPagoWebDirecto={caja.aprobarPagoWebDirecto}
                abrirHistorialAlumno={caja.abrirHistorialAlumno}
                abrirObservarModal={caja.abrirObservarModal}
                abrirRechazarModal={caja.abrirRechazarModal}
                cerrarHistorialAlumno={caja.cerrarHistorialAlumno}
              />
            ) : caja.vista === "cancelar_correlativo" ? (
              <CajaCancelarCorrelativo
                sidebarExpanded={sidebarExpanded}
                toggleSidebar={toggleSidebar}
                periodo={caja.periodo}
                onCorrelativoCancelado={() => {
                  caja.cargarDatos();
                  caja.cargarReporteCaja();
                  caja.cargarCorrelativos();
                }}
              />
            ) : (
              <CajaCobros
                pagoConfirmado={caja.pagoConfirmado}
                formulario={caja.formulario}
                buscando={caja.buscando}
                dni={caja.dni}
                buscarEstudiante={caja.buscarEstudiante}
                setDni={caja.setDni}
                setFormulario={caja.setFormulario}
                mensaje={caja.mensaje}
                correlativos={caja.correlativos}
                inscripcionesCaja={caja.inscripcionesCaja}
                seleccionarInscripcionCaja={caja.seleccionarInscripcionCaja}
                limpiarPagoActual={caja.limpiarPagoActual}
                abrirRechazarModal={caja.abrirRechazarModal}
                abrirObservarModal={caja.abrirObservarModal}
                aprobarPagoWebDirecto={caja.aprobarPagoWebDirecto}
                guardando={caja.guardando}
                guardarPago={caja.guardarPago}
                sidebarExpanded={sidebarExpanded}
                toggleSidebar={toggleSidebar}
                resultadosBusqueda={caja.resultadosBusqueda}
                onSeleccionarEstudiante={caja.seleccionarEstudianteDesdeBusqueda}
                onVerHistorialAlumno={caja.abrirHistorialAlumno}
              />
            )}
          </>
        )}
      </section>

      <Modal
        centered
        classNames={{ body: "caja-modal-body", header: "caja-modal-header", title: "caja-modal-title" }}
        onClose={caja.cerrarModal}
        opened={caja.modalAbierto}
        size="xl"
        title={caja.modoEdicion ? "Editar pago" : "Registrar pago"}
      >
        {caja.pagoConfirmado ? (
          <div className="caja-payment-approved" role="status">
            <Check size={20} />
            <div>
              <strong>Pago aprobado</strong>
              <span>
                {caja.formulario.estudianteNombre} quedo como pagado por {formatearSoles(caja.formulario.monto)}.
              </span>
            </div>
          </div>
        ) : null}
        <CajaFields
          buscando={caja.buscando}
          dni={caja.dni}
          formulario={caja.formulario}
          modoEdicion={caja.modoEdicion}
          onBuscar={caja.buscarEstudiante}
          setDni={caja.setDni}
          setFormulario={caja.setFormulario}
          mensaje={caja.mensaje}
          siguienteRecibo={caja.correlativos.recibo}
          correlativos={caja.correlativos}
          onSeleccionarInscripcionCaja={caja.seleccionarInscripcionCaja}
          inscripcionesCaja={caja.inscripcionesCaja}
          resultadosBusqueda={caja.resultadosBusqueda}
          onSeleccionarEstudiante={caja.seleccionarEstudianteDesdeBusqueda}
        />
        <Group justify="flex-end" mt="lg">
          <Button onClick={caja.cerrarModal} variant="default">
            Cancelar
          </Button>
          {caja.pagoConfirmado ? (
            <Button onClick={caja.limpiarPagoActual} variant="default">
              Nuevo pago
            </Button>
          ) : null}
          <Button leftSection={<Check size={17} />} loading={caja.guardando} onClick={caja.guardarPago} disabled={Boolean(caja.pagoConfirmado)}>
            {caja.modoEdicion ? "Actualizar" : ((caja.formulario as any).descuentoAprobado ? "Aprobar" : "Registrar")}
          </Button>
        </Group>
      </Modal>

      <CajaPagoWebModals
        guardandoVerificacion={caja.guardandoVerificacion}
        modalObservarAbierto={caja.modalObservarAbierto}
        modalRechazarAbierto={caja.modalRechazarAbierto}
        modalVerificacionAbierto={caja.modalVerificacionAbierto}
        observacionTexto={caja.observacionTexto}
        rechazoTexto={caja.rechazoTexto}
        onAprobarPagoWeb={caja.aprobarPagoWebDesdeModal}
        onCerrarObservacion={() => caja.setModalObservarAbierto(false)}
        onCerrarRechazo={() => caja.setModalRechazarAbierto(false)}
        onCerrarVerificacion={() => { caja.setModalVerificacionAbierto(false); caja.setPagoVerificar(null); }}
        onRechazarPagoWeb={caja.confirmarRechazoPagoWeb}
        onObservarPagoWeb={caja.observarPagoWebDesdeModal}
        onSetObservacionTexto={caja.setObservacionTexto}
        onSetRechazoTexto={caja.setRechazoTexto}
        onSolicitarObservacion={() => {
          caja.setObservacionTexto("");
          caja.setModalObservarAbierto(true);
        }}
        onSolicitarRechazo={() => {
          caja.setRechazoTexto("");
          caja.setModalRechazarAbierto(true);
        }}
        pagoVerificar={caja.pagoVerificar}
      />

      <Modal
        centered
        opened={caja.modalAnularAbierto}
        onClose={caja.cerrarAnularModal}
        title="Anular Recibo / Pago"
        size="md"
      >
        {caja.pagoAnular ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Text size="xs" color="dimmed">Estudiante:</Text>
              <Text size="sm" fw={700} mb="xs">{caja.pagoAnular.estudiante || caja.pagoAnular.nombresEstudiante || "-"}</Text>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <Text size="xs" color="dimmed">N° de comprobante:</Text>
                  <Text size="sm" fw={700}>{caja.pagoAnular.nroRecibo || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" color="dimmed">Monto:</Text>
                  <Text size="sm" fw={700} color="red">{formatearSoles(caja.pagoAnular.monto)}</Text>
                </div>
              </div>
            </div>

            <Text size="sm" color="dimmed">
              Ingrese el motivo por el cual desea anular este recibo/pago. El recibo quedará registrado como ANULADO en Dirección y el estudiante volverá al estado "Pendiente de pago".
            </Text>

            <Textarea
              label="Motivo de la anulación"
              placeholder="Ej. El padre ya no inscribirá al alumno en este taller y solicitó la cancelación."
              required
              rows={4}
              value={caja.anulacionTexto}
              onChange={(e) => caja.setAnulacionTexto(e.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={caja.cerrarAnularModal}>
                Cancelar
              </Button>
              <Button
                color="red"
                loading={caja.guardando}
                onClick={caja.confirmarAnularPago}
              >
                Confirmar Anulación
              </Button>
            </Group>
          </div>
        ) : null}
      </Modal>

      <HistorialAlumnoModal
        historial={caja.historialAlumno}
        loading={caja.historialAlumnoCargando}
        onClose={caja.cerrarHistorialAlumno}
        opened={caja.historialAlumnoAbierto}
        registro={caja.historialAlumnoRegistro}
      />
    </main>
  );
}
