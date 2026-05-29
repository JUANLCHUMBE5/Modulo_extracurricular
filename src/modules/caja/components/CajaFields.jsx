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
}) {
  const pagoHabilitado = modoEdicion || Boolean(formulario.inscripcionId);

  function actualizar(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  const datosLectura = [
    ["DNI", formulario.estudianteDni || "Sin DNI"],
    ["Estudiante", formulario.estudianteNombre || "Sin estudiante"],
    ["Tipo de alumno", formulario.tipoAlumno || "No definido"],
    ["Programa", formulario.programaNombre || "Sin programa"],
    ["Monto", formatearSoles(formulario.monto)],
    ["Concepto", formulario.concepto || "Inscripcion"],
    ["Estado", "Pagado"],
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
              <p>Información cargada desde la inscripción.</p>
            </div>
          </div>

          <div className="caja-payment-summary">
            {datosLectura.map(([etiqueta, valor]) => (
              <div className="caja-readonly-field" key={etiqueta}>
                <span>{etiqueta}</span>
                <strong>{valor}</strong>
              </div>
            ))}
            <label className="caja-payment-method">
              Forma de pago
              <select value={formulario.formaPago} onChange={(event) => actualizar("formaPago", event.currentTarget.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}
    </div>
  );
}
