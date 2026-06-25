import { Button } from "@mantine/core";
import {
  IconClipboardList as ClipboardList,
  IconReceipt2 as Receipt,
  IconSearch as Search,
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../../services/dateService";
import { formatearSoles } from "../utils/cajaFormatters";

export default function CajaFields({
  buscando,
  dni,
  formulario,
  modoEdicion,
  onBuscar,
  setDni,
  setFormulario,
  mensaje,
  siguienteRecibo,
  correlativos,
  inscripcionesCaja = [],
  onSeleccionarInscripcionCaja,
  resultadosBusqueda = [],
  onSeleccionarEstudiante,
}) {
  const pagoHabilitado = modoEdicion || Boolean(formulario.inscripcionId);
  const mostrarSelectorTallerCaja = !pagoHabilitado && !modoEdicion && inscripcionesCaja.length > 0;
  const mensajeEsInfo = /seleccione|pago registrado/i.test(mensaje || "");

  function actualizar(campo, valor) {
    setFormulario((actual) => {
      const nuevo = { ...actual, [campo]: valor };
      return nuevo;
    });
  }

  let labelEstado = "Pendiente";
  const estPago = String(formulario.estadoPago || "").toLowerCase().trim();
  if (["completado", "pagado", "validado", "pago validado"].some(item => estPago.includes(item))) {
    labelEstado = "Pagado";
  } else if (["verificando", "verificacion", "por verificar", "proceso"].some(item => estPago.includes(item))) {
    labelEstado = "Por Verificar";
  }
  const esPorVerificar = labelEstado === "Por Verificar";
  const formaPagoNormalizada = String(formulario.formaPago || "").toLowerCase().trim();
  const esPagoVirtual = ["yape", "plin", "transferencia", "tarjeta"].includes(formaPagoNormalizada);
  const comprobanteVistaPrevia = formulario.nroRecibo || (correlativos?.reciboActual || correlativos?.recibo || "");

  const datosLectura = [
    ["DNI", formulario.estudianteDni || "Sin DNI"],
    ["Estudiante", formulario.estudianteNombre || "Sin estudiante"],
    ["Tipo de alumno", formulario.tipoAlumno || "No definido"],
    ["Programa", formulario.programaNombre || "Sin programa"],
    ["Monto", formatearSoles(formulario.monto)],
    ["Concepto", formulario.concepto || "Inscripcion"],
    ["Estado", labelEstado],
    ["Fecha", formatearFechaPeru(formulario.fechaPago)],
  ];

  return (
    <div className={`caja-form ${pagoHabilitado ? "has-payment" : "is-search-only"}`}>
      {!modoEdicion ? (
        <section className="caja-form-block">
          <div className="caja-form-title">
            <Search size={18} />
            <div>
              <h3>Buscar estudiante</h3>
            </div>
          </div>
          <form className="caja-search-form" onSubmit={onBuscar}>
            <input
              onChange={(event) => setDni(event.currentTarget.value)}
              placeholder="DNI o nombres del estudiante"
              value={dni}
            />
            <Button leftSection={<Search size={16} />} loading={buscando} type="submit">
              Buscar
            </Button>
          </form>
          {resultadosBusqueda.length > 0 ? (
            <div className="caja-search-results">
              <div className="caja-search-results-title">Seleccione un estudiante:</div>
              {resultadosBusqueda.map((est) => (
                <button
                  key={est.dni}
                  type="button"
                  className="caja-search-result-item"
                  onClick={() => onSeleccionarEstudiante?.(est)}
                >
                  <span className="caja-search-result-name">{est.nombres}</span>
                  <span className="caja-search-result-dni">DNI: {est.dni}</span>
                </button>
              ))}
            </div>
          ) : null}
          {mensaje ? (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-[13px] font-extrabold ${
              mensajeEsInfo
                ? "border-[#b9e6dc] bg-[#eefbf7] text-[#087364]"
                : "border-[#f8c7c1] bg-[#fff0ef] text-[#b42318]"
            }`}>
              {mensaje}
            </div>
          ) : null}
        </section>
      ) : null}

      {mostrarSelectorTallerCaja ? (
        <section className="caja-form-block caja-course-picker">
          <div className="caja-form-title">
            <ClipboardList size={18} />
            <div>
              <h3>Talleres derivados a Caja</h3>
            </div>
          </div>
          <div className="caja-course-list">
            {inscripcionesCaja.map((inscripcion) => (
              <button
                className="caja-course-option"
                key={inscripcion.id || `${inscripcion.programaId}-${inscripcion.programa}`}
                onClick={() => onSeleccionarInscripcionCaja?.(inscripcion)}
                type="button"
              >
                <div className="caja-course-main">
                  <strong>{inscripcion.programa || "Taller sin nombre"}</strong>
                  <span>
                    {inscripcion.origenRegistro || inscripcion.origen || "Derivado por Asistente"}
                    {inscripcion.fechaRegistro ? ` - ${formatearFechaPeru(inscripcion.fechaRegistro)}` : ""}
                  </span>
                </div>
                <div className="caja-course-amount">
                  <span>Monto</span>
                  <strong>{formatearSoles(inscripcion.costo)}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {pagoHabilitado ? (
        <section className="caja-form-block">
          <div className="caja-form-title">
            <Receipt size={18} />
            <div>
              <h3>Datos del pago</h3>
              <p>Informacion cargada desde la inscripcion.</p>
            </div>
          </div>

          <div className="caja-payment-summary">
            {formulario.descuentoAprobado && (
              <div className="caja-discount-applied-card" style={{
                gridColumn: "1 / -1",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}>
                    {formulario.descuentoTipo === "beca" ? "Beca 100% Aprobada" : "Descuento Aprobado"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>por Dirección</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "4px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#475569", display: "block" }}>Costo Original:</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b", textDecoration: "line-through" }}>
                      {formatearSoles(formulario.costoOriginal)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#475569", display: "block" }}>Descuento:</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#16a34a" }}>
                      -{formatearSoles(formulario.descuentoMonto)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#475569", display: "block" }}>Monto Final:</span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#15803d" }}>
                      {formatearSoles(formulario.monto)}
                    </span>
                  </div>
                </div>
                {formulario.descuentoJustificacion && (
                  <div style={{ fontSize: "12px", color: "#166534", borderTop: "1px dashed #bbf7d0", paddingTop: "6px", marginTop: "4px" }}>
                    <strong>Motivo:</strong> {formulario.descuentoJustificacion}
                  </div>
                )}
              </div>
            )}
            {datosLectura.map(([etiqueta, valor]) => {
              const classNames = [];
              if (etiqueta === "Programa") classNames.push("field-programa");
              if (etiqueta === "Monto") classNames.push("field-monto");
              if (etiqueta === "Concepto") classNames.push("field-concepto");
              if (etiqueta === "Fecha") classNames.push("field-fecha");
              if (etiqueta === "Estado") {
                classNames.push("field-estado");
                if (valor === "Pagado") classNames.push("status-pagado");
                else if (valor === "Por Verificar") classNames.push("status-verificando");
                else classNames.push("status-pendiente");
              }
              return (
                <div className={`caja-readonly-field ${classNames.join(" ")}`} key={etiqueta}>
                  <span>{etiqueta}</span>
                  <strong>{valor}</strong>
                </div>
              );
            })}
            <label className="caja-payment-method field-payment-method">
              Forma de pago
              <select
                value={formulario.formaPago}
                onChange={(event) => actualizar("formaPago", event.currentTarget.value)}
                disabled={esPorVerificar}
              >
                {formulario.descuentoAprobado && (
                  <>
                    <option value="Beca">Beca</option>
                    <option value="Descuento">Descuento</option>
                  </>
                )}
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </label>
            <label className="caja-payment-method field-receipt">
              N° de comprobante
              <input
                type="text"
                placeholder="Pendiente de configurar"
                value={comprobanteVistaPrevia}
                readOnly
                disabled={true}
              />
            </label>
            {esPorVerificar ? (
              <div className="caja-yape-details-card" style={{
                gridColumn: "1 / -1",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "6px",
                padding: "12px",
                marginTop: "10px",
              }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#b45309", fontSize: "13px" }}>
                  Detalles del Yape (Web)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>Celular de Operacion:</span>
                    <strong style={{ fontSize: "13px", color: "#1f2937" }}>{formulario.telefonoOperacion || "No ingresado"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>Codigo de Operacion:</span>
                    <strong style={{ fontSize: "13px", color: "#1f2937" }}>{formulario.numeroOperacion || "No ingresado"}</strong>
                  </div>
                </div>
                {formulario.capturaPagoBase64 ? (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "11px", color: "#b45309", display: "block", marginBottom: "4px" }}>Captura de pantalla:</span>
                    <img
                      src={formulario.capturaPagoBase64}
                      alt="Captura Yape"
                      style={{ maxWidth: "100%", maxHeight: "150px", objectFit: "contain", borderRadius: "4px", border: "1px solid #eaeaea" }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>No se adjunto captura de pantalla.</span>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
