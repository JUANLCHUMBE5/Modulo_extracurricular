import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconPhone as Phone,
  IconX as X,
} from "@tabler/icons-react";
import {
  CampoLectura,
  CampoTexto,
  DatoHorario,
  formatearCuposSecretaria,
} from "./SecretariaFields";

function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Promovido por certificado oficial",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por desempeno academico",
  };
  return opciones[seleccion] || "";
}

export default function SecretariaRegistroModal({
  actualizarFormulario,
  esCicloVerano,
  estudiante,
  formulario,
  guardarInscripción,
  guardando,
  horarioResumenRegistro,
  etiquetaPrograma,
  mensaje,
  modoRegistro,
  mostrarSelectorPrograma,
  programaParaRegistro,
  programas,
  programasParaSelector,
  setModoRegistro,
}) {
  const obtenerEtiquetaPrograma = etiquetaPrograma || ((programa) => programa?.nombre || "");
  const esCambridge = /cambridge/i.test([
    programaParaRegistro?.nombre,
    programaParaRegistro?.programa,
    programaParaRegistro?.plantilla,
  ].filter(Boolean).join(" "));
  const seleccionCambridge = programaParaRegistro?.seleccion || "";
  const ingresoCambridge = describirSeleccionCambridge(seleccionCambridge);
  const nivelCambridge = programaParaRegistro?.nivelCambridge || "";
  const requiereSeleccionPrograma = esCicloVerano || mostrarSelectorPrograma;
  const mostrarDetallePrograma = Boolean(programaParaRegistro) && (
    !requiereSeleccionPrograma || Boolean(formulario.programa)
  );

  return (
<>
        {modoRegistro && estudiante ? (
          <div
            className="secretaria-modal-overlay"
            role="presentation"
          >
            <section
              className={`secretaria-card secretaria-registration-card secretaria-registration-modal${esCicloVerano ? " is-summer-registration" : ""}${estudiante.esExterno ? " is-external-registration" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="secretaria-registration-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="secretaria-modal-header">
                <div className="secretaria-card-title">
                  <span className="secretaria-title-icon">
                    <ClipboardCheck size={21} />
                  </span>
                  <div className="secretaria-modal-header-info">
                    <h2 id="secretaria-registration-title" className="secretaria-modal-title">
                      {esCicloVerano ? "Registro Ciclo Verano" : "Registrar Inscripción"}
                    </h2>
                    <div className="secretaria-modal-student-meta-inline">
                      <span className="secretaria-modal-student-name-badge">{estudiante.nombres}</span>
                      <span className="secretaria-meta-divider">•</span>
                      <span><strong>DNI:</strong> {estudiante.dni || "Sin DNI"}</span>
                      <span className="secretaria-meta-divider">•</span>
                      <span><strong>Grado:</strong> {estudiante.grado}</span>
                      {!estudiante.esExterno ? (
                        <>
                          <span className="secretaria-meta-divider">•</span>
                          <span><strong>Sección:</strong> {estudiante.seccion || "Sin sección"}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  className="secretaria-modal-close"
                  type="button"
                  aria-label="Cerrar formulario de inscripcion"
                  onClick={() => setModoRegistro(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="secretaria-registration-form secretaria-registration-form-clean" onSubmit={guardarInscripción}>

                {mensaje ? (
                  <MantineAlert
                    className="secretaria-message secretaria-modal-message secretaria-field-full"
                    color="orange"
                    radius="md"
                    icon={<AlertCircle size={18} />}
                  >
                    {mensaje}
                  </MantineAlert>
                ) : null}

                {!esCicloVerano ? (
                  <div className="secretaria-student-context secretaria-field-full">
                    <div className="secretaria-student-context-item is-name">
                      <span>Alumno</span>
                      <strong>{estudiante.nombres}</strong>
                    </div>
                    <div className="secretaria-student-context-item">
                      <span>DNI</span>
                      <strong>{estudiante.dni || "Sin DNI"}</strong>
                    </div>
                    <div className="secretaria-student-context-item">
                      <span>Grado</span>
                      <strong>{estudiante.grado}</strong>
                    </div>
                    {!estudiante.esExterno ? (
                      <div className="secretaria-student-context-item">
                        <span>Seccion</span>
                        <strong>{estudiante.seccion || "Sin seccion"}</strong>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {esCicloVerano ? (
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
                          value={`${estudiante.grado || "Grado no registrado"}${estudiante.seccion ? ` - Sección ${estudiante.seccion}` : ""}`}
                        />
                      )}
                    </section>

                    <section className="secretaria-summer-panel secretaria-summer-program">
                      <div className="secretaria-registration-section-head secretaria-summer-heading">
                        <strong>Programa</strong>
                        <span>Seleccione el taller de verano</span>
                      </div>

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
                          {programasParaSelector.map((programa) => (
                            <option key={programa.id} value={programa.id}>
                              {obtenerEtiquetaPrograma(programa)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {programasParaSelector.length === 0 ? (
                        <MantineAlert
                          className="secretaria-message secretaria-modal-message secretaria-field-full secretaria-summer-alert"
                          color="orange"
                          radius="md"
                          icon={<AlertCircle size={18} />}
                        >
                          Coordinación debe registrar y habilitar un programa de ciclo verano disponible para el estudiante.
                        </MantineAlert>
                      ) : mostrarDetallePrograma ? (
                        <div className="secretaria-program-details-card secretaria-field-full">
                          <h4 className="secretaria-details-card-title">Resumen del Taller</h4>
                          <div className="secretaria-schedule-summary is-summer-grid">
                            <DatoHorario label="Grupo" value={programaParaRegistro.grupoEtario || programaParaRegistro.grupo} />
                            <DatoHorario label="Día" value={horarioResumenRegistro.dia} />
                            <DatoHorario label="Clase" value={horarioResumenRegistro.clase} />
                            <DatoHorario label="Almuerzo" value={horarioResumenRegistro.almuerzo} />
                          </div>
                          <div className="secretaria-details-divider" />
                          <div className="secretaria-details-meta-grid">
                            <div className="secretaria-meta-item">
                              <span>Costo Referencial</span>
                              <strong>S/ {Number(programaParaRegistro.costo).toFixed(2)}</strong>
                            </div>
                            <div className="secretaria-meta-item">
                              <span>Cupos Disponibles</span>
                              <strong className="secretaria-highlight-green">{formatearCuposSecretaria(programaParaRegistro)}</strong>
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
                          rows="3"
                          placeholder="Observación opcional para el registro"
                          value={formulario.observacion}
                          onChange={(event) =>
                            actualizarFormulario("observacion", event.target.value)
                          }
                        />
                      </div>
                    </section>
                  </div>
                ) : estudiante.esExterno ? (
                  <div className="secretaria-registration-section secretaria-registration-minor secretaria-field-full">
                    <div className="secretaria-registration-section-head">
                      <strong>Datos del menor</strong>
                      <span>Solo se registra como alumno externo en ciclo verano</span>
                    </div>

                    <CampoTexto
                      label="DNI del alumno"
                      value={formulario.dniExterno}
                      onChange={(value) => actualizarFormulario("dniExterno", value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="DNI de 8 numeros"
                      maxLength="8"
                    />
                    <CampoTexto
                      label="Nombre y apellidos del estudiante"
                      value={formulario.nombresExterno}
                      onChange={(value) => actualizarFormulario("nombresExterno", value)}
                      placeholder="Nombre completo del estudiante"
                    />
                    <CampoTexto
                      label="Edad"
                      className="secretaria-field-short secretaria-age-field"
                      value={formulario.edadExterno}
                      onChange={(value) => actualizarFormulario("edadExterno", value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="Ej: 9"
                      maxLength="2"
                    />
                    <CampoTexto
                      label="Domicilio"
                      className="secretaria-field-wide"
                      value={formulario.domicilioExterno}
                      onChange={(value) => actualizarFormulario("domicilioExterno", value)}
                      placeholder="Dirección del estudiante"
                    />
                    <div className="secretaria-field secretaria-field-short">
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
                      label="Grado"
                      value={formulario.gradoExterno}
                      onChange={(value) => actualizarFormulario("gradoExterno", value)}
                      placeholder="Ej: 4 Primaria"
                    />
                  </div>
                ) : null}

                {!esCicloVerano ? (
                <>
                <div className="secretaria-registration-section secretaria-registration-program secretaria-field-full">
                  <div className="secretaria-registration-section-head">
                    <strong>Programa</strong>
                    <span>Datos necesarios para confirmar la inscripción</span>
                  </div>

                {mostrarSelectorPrograma ? (
                  <div className="secretaria-field secretaria-program-select-field">
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
                        {programasParaSelector.length
                          ? "Seleccione programa"
                          : esCicloVerano
                            ? "No hay programas de ciclo verano disponibles"
                            : "No hay programas con invitación masiva para este grado"}
                      </option>
                      {programasParaSelector.map((programa) => (
                        <option key={programa.id} value={programa.id}>
                          {obtenerEtiquetaPrograma(programa)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <CampoLectura label="Programa / taller" value={programaParaRegistro?.nombre || estudiante.programaNombre || ""} />
                )}

                {programasParaSelector.length === 0 && (esCicloVerano || !estudiante.tieneInvitacion) ? (
                  <MantineAlert
                    className="secretaria-message secretaria-modal-message secretaria-field-full"
                    color="orange"
                    radius="md"
                    icon={<AlertCircle size={18} />}
                  >
                    {esCicloVerano
                      ? "Coordinación debe registrar y habilitar un programa de ciclo verano disponible para el estudiante."
                      : "Coordinación debe registrar y habilitar un programa con invitación masiva para el grado del estudiante."}
                  </MantineAlert>
                ) : null}

                {mostrarDetallePrograma ? (
                  <div className="secretaria-program-details-card secretaria-field-full">
                    <h4 className="secretaria-details-card-title">Resumen del Taller</h4>
                    <div className="secretaria-schedule-summary">
                      <DatoHorario label="Día" value={horarioResumenRegistro.dia} />
                      <DatoHorario label="Clase" value={horarioResumenRegistro.clase} />
                      <DatoHorario label="Almuerzo" value={horarioResumenRegistro.almuerzo} />
                    </div>
                    <div className="secretaria-details-divider" />
                    <div className="secretaria-details-meta-grid">
                      {esCambridge && ingresoCambridge ? (
                        <div className="secretaria-meta-item is-cambridge">
                          <span>Modalidad Cambridge</span>
                          <strong>{ingresoCambridge} {nivelCambridge ? `(${nivelCambridge})` : ""}</strong>
                        </div>
                      ) : null}
                      <div className="secretaria-meta-item">
                        <span>Costo Referencial</span>
                        <strong>S/ {Number(programaParaRegistro.costo).toFixed(2)}</strong>
                      </div>
                      <div className="secretaria-meta-item">
                        <span>Cupos Disponibles</span>
                        <strong className="secretaria-highlight-green">{formatearCuposSecretaria(programaParaRegistro)}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                {programaParaRegistro?.requiereUniforme ? (
                  <div className="secretaria-field">
                    <label htmlFor="talla">Talla de uniforme</label>
                    <select
                      id="talla"
                      value={formulario.tallaUniforme}
                      onChange={(event) =>
                        actualizarFormulario("tallaUniforme", event.target.value)
                      }
                    >
                      <option value="">Seleccione talla</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                    </select>
                  </div>
                ) : null}

                {programaParaRegistro?.requiereIndumentaria ? (
                  <>
                    <div className="secretaria-field">
                      <label htmlFor="tallaPolo">Talla de polo</label>
                      <select
                        id="tallaPolo"
                        value={formulario.tallaPolo}
                        onChange={(event) =>
                          actualizarFormulario("tallaPolo", event.target.value)
                        }
                      >
                        <option value="">Seleccione talla</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                    <div className="secretaria-field">
                      <label htmlFor="tallaShort">Talla de short</label>
                      <select
                        id="tallaShort"
                        value={formulario.tallaShort}
                        onChange={(event) =>
                          actualizarFormulario("tallaShort", event.target.value)
                        }
                      >
                        <option value="">Seleccione talla</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                  </>
                ) : null}
                </div>

                <div className="secretaria-registration-section secretaria-registration-contact secretaria-field-full">
                  <div className="secretaria-registration-section-head">
                    <strong>Padre o apoderado</strong>
                    <span>Información de contacto para el registro</span>
                  </div>

                <CampoTexto
                  label="Nombre del padre / apoderado"
                  value={formulario.apoderado}
                  onChange={(value) => actualizarFormulario("apoderado", value)}
                  placeholder="Nombre completo del apoderado"
                />

                <CampoTexto
                  label="Teléfono del padre"
                  icon={<Phone size={15} />}
                  value={formulario.telefono}
                  onChange={(value) =>
                    actualizarFormulario("telefono", value.replace(/\D/g, ""))
                  }
                  placeholder="987654321"
                  maxLength="9"
                />

                <div className="secretaria-field secretaria-field-full secretaria-registration-observation">
                  <label htmlFor="observacion">Observación</label>
                  <textarea
                    id="observacion"
                    rows="3"
                    placeholder="Observación opcional para el registro"
                    value={formulario.observacion}
                    onChange={(event) =>
                      actualizarFormulario("observacion", event.target.value)
                    }
                  />
                </div>

                </div>
                </>
                ) : null}

                <label className="secretaria-check secretaria-field-full">
                  <input
                    type="checkbox"
                    checked={formulario.aceptaCondiciones}
                    onChange={(event) =>
                      actualizarFormulario("aceptaCondiciones", event.target.checked)
                    }
                  />
                  <span>El padre/apoderado acepta las condiciones del programa.</span>
                </label>

                <div className="secretaria-form-actions">
                  <button
                    className="secretaria-secondary-button"
                    type="button"
                    onClick={() => setModoRegistro(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="secretaria-register-button"
                    type="submit"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <Loader2 className="secretaria-spin" size={17} />
                    ) : (
                      <ClipboardCheck size={17} />
                    )}
                    <span>{guardando ? "Guardando" : "Confirmar inscripcion"}</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
</>
  );
}
