import React from "react";
import { Button, Group } from "@mantine/core";
import { IconCheck as Check, IconX as X, IconAlertTriangle as AlertTriangle, IconMenu2 as Menu } from "@tabler/icons-react";
import CajaFields from "../CajaFields";
import { formatearSoles } from "../../utils/cajaFormatters";
import { esRegistroWeb } from "../../cajaServiceUtils";
import "./CajaCobros.css";

export default function CajaCobros({
  pagoConfirmado,
  formulario,
  buscando,
  dni,
  buscarEstudiante,
  setDni,
  setFormulario,
  mensaje,
  correlativos,
  inscripcionesCaja,
  seleccionarInscripcionCaja,
  limpiarPagoActual,
  abrirRechazarModal,
  abrirObservarModal,
  aprobarPagoWebDirecto,
  guardando,
  guardarPago,
  sidebarExpanded,
  toggleSidebar,
  resultadosBusqueda = [],
  onSeleccionarEstudiante,
}) {
  const siguienteRecibo = correlativos.reciboActual || correlativos.recibo || "";

  return (
    <>
      {!sidebarExpanded && (
        <div style={{ marginBottom: "6px" }}>
          <button
            className="caja-menu-toggle-btn-header"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={22} />
          </button>
        </div>
      )}
      <section className="caja-payment-workspace">
        {pagoConfirmado ? (
          <div className="caja-payment-approved" role="status">
            <Check size={20} />
            <div>
              <strong>Pago aprobado</strong>
              <span>
                {formulario.estudianteNombre} quedo como pagado por {formatearSoles(formulario.monto)}.
              </span>
            </div>
          </div>
        ) : null}
        <CajaFields
          buscando={buscando}
          dni={dni}
          formulario={formulario}
          modoEdicion={false}
          onBuscar={buscarEstudiante}
          setDni={setDni}
          setFormulario={setFormulario}
          mensaje={mensaje}
          siguienteRecibo={siguienteRecibo}
          correlativos={correlativos}
          inscripcionesCaja={inscripcionesCaja}
          onSeleccionarInscripcionCaja={seleccionarInscripcionCaja}
          resultadosBusqueda={resultadosBusqueda}
          onSeleccionarEstudiante={onSeleccionarEstudiante}
        />
        {formulario.inscripcionId ? (
          formulario.estadoPago === "verificando" || formulario.estadoPago === "Por Verificar" ? (
            <Group className="caja-payment-actions" justify="flex-end">
              <Button onClick={limpiarPagoActual} variant="default">
                Limpiar
              </Button>
              <Button
                color="red"
                leftSection={<X size={15} />}
                onClick={() => abrirRechazarModal(formulario)}
              >
                Rechazar Pago
              </Button>
              <Button
                color="orange"
                leftSection={<AlertTriangle size={15} />}
                onClick={() => abrirObservarModal(formulario)}
              >
                Observar Pago
              </Button>
              <Button
                color="green"
                leftSection={<Check size={15} />}
                onClick={() => aprobarPagoWebDirecto(formulario)}
              >
                Aprobar Pago
              </Button>
            </Group>
          ) : (
            <Group className="caja-payment-actions" justify="flex-end">
              <Button onClick={limpiarPagoActual} variant="default">
                Limpiar
              </Button>
              <Button leftSection={<Check size={17} />} loading={guardando} onClick={guardarPago}>
                Registrar pago
              </Button>
            </Group>
          )
        ) : null}
      </section>
    </>
  );
}
