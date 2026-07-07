import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconUsers as Users,
  IconCalendar as Calendar,
  IconClock as Clock,
  IconCoffee as Coffee,
  IconPhone as Phone,
} from "@tabler/icons-react";
import {
  CampoTexto,
  CampoLectura,
  DatoHorario,
  formatearCuposSecretaria,
} from "./SecretariaFields";

export default function SecretariaSummerRegistroForm({
  estudiante,
  formulario,
  actualizarFormulario,
  programasParaSelector,
  obtenerEtiquetaPrograma,
  programaRegistroVista,
  mostrarDetallePrograma,
  horarioResumenRegistro,
}) {
  return (
    <div className="secretaria-summer-flow secretaria-field-full">
      <section className="secretaria-summer-panel secretaria-summer-student">
        <div className="secretaria-registration-section-head secretaria-summer-heading">
          <strong>Datos del estudiante</strong>
          <span>Información para ciclo verano</span>
        </div>

        <CampoTexto
          label="Colegio de procedencia"
          className="secretaria-field-full secretaria-summer-colegio"
          value={formulario.colegioProcedencia}
          onChange={(value) => actualizarFormulario("colegioProcedencia", value)}
          placeholder="Ej: Colegio San Rafael"
        />

        {estudiante.esExterno ? (
          <>
            <CampoTexto
              label="DNI del alumno"
              className="secretaria-summer-dni"
              value={formulario.dniExterno}
              onChange={(value) => actualizarFormulario("dniExterno", value.replace(/\D/g, "").slice(0, 8))}
              placeholder="DNI de 8 numeros"
              maxLength="8"
            />
            <CampoTexto
              label="Nombre y apellidos del estudiante"
              className="secretaria-summer-name"
              value={formulario.nombresExterno}
              onChange={(value) => actualizarFormulario("nombresExterno", value)}
              placeholder="Nombre completo del estudiante"
            />
            <CampoTexto
              label="Edad"
              className="secretaria-field-short secretaria-age-field secretaria-summer-age"
              value={formulario.edadExterno}
              onChange={(value) => actualizarFormulario("edadExterno", value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Ej: 9"
              maxLength="2"
            />
            <CampoTexto
              label="Grado"
              className="secretaria-summer-grade"
              value={formulario.gradoExterno}
              onChange={(value) => actualizarFormulario("gradoExterno", value)}
              placeholder="Ej: 4 Primaria"
            />
            <div className="secretaria-field secretaria-field-short secretaria-summer-sex">
              <label htmlFor="sexoExterno">Sexo</label>
              <select
                id="sexoExterno"
                value={formulario.sexoExterno}
                onChange={(event) => actualizarFormulario("sexoExterno", event.target.value)}
              >
                <option value="">Seleccione</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
            <CampoTexto
              label="Domicilio"
              className="secretaria-field-full secretaria-summer-address"
              value={formulario.domicilioExterno}
              onChange={(value) => actualizarFormulario("domicilioExterno", value)}
              placeholder="Dirección del estudiante"
            />
          </>
        ) : (
          <CampoLectura
            label="Alumno"
            value={`${estudiante.grado || "Grado no registrado"}${estudiante.seccion ? ` - Sección/Aula ${estudiante.seccion}` : ""}`}
          />
        )}
      </section>

      <section className="secretaria-summer-panel secretaria-summer-program">
        <div className="secretaria-registration-section-head secretaria-summer-heading">
          <strong>Programa</strong>
          <span>Seleccione el taller de verano</span>
        </div>

        {programasParaSelector.length > 1 ? (
          <div className="secretaria-field secretaria-field-full secretaria-summer-program-select">
            <label htmlFor="programa">Programa o taller</label>
            <select
              id="programa"
              value={formulario.programa}
              disabled={programasParaSelector.length === 0}
              onChange={(event) =>
                actualizarFormulario("programa", event.target.value)
              }
            >
              <option value="">
                {programasParaSelector.length ? "Seleccione programa" : "No hay programas de ciclo verano disponibles"}
              </option>
              {programasParaSelector.map((programa: any) => (
                <option key={programa.id} value={programa.id}>
                  {obtenerEtiquetaPrograma(programa)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <CampoLectura className="secretaria-program-readonly-field" label="Programa / taller" value={programaRegistroVista?.nombre || ""} />
        )}

        {programasParaSelector.length === 0 ? (
          <MantineAlert
            className="secretaria-message secretaria-modal-message secretaria-field-full secretaria-summer-alert"
            color="orange"
            radius="md"
            icon={<AlertCircle size={18} />}
          >
            Coordinación Académica debe registrar y habilitar un programa de ciclo verano disponible para el estudiante.
          </MantineAlert>
        ) : mostrarDetallePrograma ? (
          <div className="secretaria-program-details-card secretaria-field-full">
            <h4 className="secretaria-details-card-title">Resumen del Taller</h4>
            <div className="secretaria-schedule-summary">
              <DatoHorario label="Grupo" value={programaRegistroVista.grupoEtario || programaRegistroVista.grupo} icon={Users} themeClass="is-grupo" />
              <DatoHorario label="Día" value={horarioResumenRegistro.dia} icon={Calendar} themeClass="is-dia" />
              <DatoHorario label="Clase" value={horarioResumenRegistro.clase} icon={Clock} themeClass="is-clase" />
              <DatoHorario label="Almuerzo" value={horarioResumenRegistro.almuerzo} icon={Coffee} themeClass="is-almuerzo" />
            </div>
            <div className="secretaria-details-divider" />
            <div className="secretaria-details-meta-grid">
              <div className="secretaria-meta-item">
                <span>Costo Referencial</span>
                <strong>S/ {Number(programaRegistroVista.costo).toFixed(2)}</strong>
              </div>
              <div className="secretaria-meta-item">
                <span>Cupos Disponibles</span>
                <strong className="secretaria-highlight-green">{formatearCuposSecretaria(programaRegistroVista)}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="secretaria-summer-panel secretaria-summer-contact">
        <div className="secretaria-registration-section-head secretaria-summer-heading">
          <strong>Padre o apoderado</strong>
          <span>Datos de contacto</span>
        </div>

        <CampoTexto
          label="Nombre del padre / apoderado"
          className="secretaria-field-full secretaria-summer-parent"
          value={formulario.apoderado}
          onChange={(value) => actualizarFormulario("apoderado", value)}
          placeholder="Nombre completo del apoderado"
        />

        <CampoTexto
          label="Teléfono del padre"
          className="secretaria-field-full secretaria-summer-phone"
          icon={<Phone size={15} />}
          value={formulario.telefono}
          onChange={(value) =>
            actualizarFormulario("telefono", value.replace(/\D/g, ""))
          }
          placeholder="987654321"
          maxLength="9"
        />

        <div className="secretaria-field secretaria-field-full secretaria-registration-observation secretaria-summer-observation">
          <label htmlFor="observacion">Observación</label>
          <textarea
            id="observacion"
            rows={3}
            placeholder="Observación opcional para el registro"
            value={formulario.observacion}
            onChange={(event) =>
              actualizarFormulario("observacion", event.target.value)
            }
          />
        </div>
      </section>
    </div>
  );
}
