import { Button } from "@mantine/core";
import {
  IconReceipt2 as Receipt,
  IconSearch as Search,
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../../services/dateService";
import { formatearSoles, limpiarDni, obtenerIniciales } from "../utils/cajaFormatters";

export default function CajaFields({
  buscando,
  dni,
  estudiante,
  formulario,
  modoEdicion,
  onBuscar,
  setDni,
  setFormulario,
  mensaje,
  siguienteRecibo,
}) {
  const pagoHabilitado = modoEdicion || Boolean(formulario.inscripcionId);

  function actualizar(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  let labelEstado = "Pendiente";
  const estPago = String(formulario.estadoPago || "").toLowerCase().trim();
  if (["completado", "pagado", "validado", "pago validado"].some(item => estPago.includes(item))) {
    labelEstado = "Pagado";
  } else if (["verificando", "verificacion", "por verificar", "proceso"].some(item => estPago.includes(item))) {
    labelEstado = "Por Verificar";
  }
  const esPorVerificar = labelEstado === "Por Verificar";

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
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setDni(limpiarDni(event.currentTarget.value))}
              placeholder="DNI del estudiante"
              value={dni}
            />
            <Button leftSection={<Search size={16} />} loading={buscando} type="submit">
              Buscar
            </Button>
          </form>
          {mensaje ? (
            <div className="mt-3 rounded-lg border border-[#f8c7c1] bg-[#fff0ef] px-3 py-2 text-[13px] font-extrabold text-[#b42318]">
              {mensaje}
            </div>
          ) : null}
          {estudiante ? (
            <div className="caja-student-card">
              <span>{obtenerIniciales(estudiante)}</span>
              <div>
                <strong>{`${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim()}</strong>
                <small>
                  {estudiante.codigoEstudiante || "Sin codigo"} - {estudiante.grado || "Sin grado"}
                  {estudiante.seccion ? ` ${estudiante.seccion}` : ""}
                </small>
              </div>
            </div>
          ) : null}
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
              const isPrograma = etiqueta === "Programa";
              const isEstado = etiqueta === "Estado";
              let extraClass = "";
              if (isPrograma) extraClass = "field-programa";
              if (isEstado) {
                if (valor === "Pagado") extraClass = "status-pagado";
                else if (valor === "Por Verificar") extraClass = "status-verificando";
                else extraClass = "status-pendiente";
              }
              return (
                <div className={`caja-readonly-field ${extraClass}`} key={etiqueta}>
                  <span>{etiqueta}</span>
                  <strong>{valor}</strong>
                </div>
              );
            })}
            <label className="caja-payment-method">
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
            <label className="caja-payment-method">
              Nro. recibo SIADED
              <input
                type="text"
                placeholder={siguienteRecibo ? `${siguienteRecibo} (Autogenerado)` : "Ej. 51614"}
                value={formulario.nroRecibo || ""}
                onChange={(event) => actualizar("nroRecibo", event.currentTarget.value)}
                disabled={esPorVerificar}
              />
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                {siguienteRecibo
                  ? "Si se deja vacío, se generará el correlativo automático."
                  : "Ingrese el número de recibo manual."}
              </span>
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
