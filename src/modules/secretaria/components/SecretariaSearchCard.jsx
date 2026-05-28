import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCalendar as CalendarDays,
  IconId as IdCard,
  IconLoader2 as Loader2,
  IconSearch as Search,
  IconUserPlus as UserPlus,
} from "@tabler/icons-react";

function SecretariaSearchCard({
  aplicarEstudianteEncontrado,
  abrirRegistroAlumnoExterno,
  buscando,
  buscarEstudiante,
  children,
  dni,
  estudiante,
  mensaje,
  periodo,
  resultadosNombre,
  setDni,
  setPeriodo,
}) {
  return (
    <article className="secretaria-card secretaria-search-card">
      <div className="secretaria-card-title">
        <span className="secretaria-title-icon">
          <IdCard size={21} />
        </span>
        <div>
          <h2>Buscar estudiante</h2>
          <p>Ingrese DNI o nombre para iniciar la atencion.</p>
        </div>
      </div>

      <form onSubmit={buscarEstudiante} className="secretaria-form secretaria-search-form-compact">
        <div className="secretaria-field">
          <label htmlFor="periodo">
            <CalendarDays size={15} />
            Periodo
          </label>
          <select
            id="periodo"
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
          >
            <option value="escolar">Año escolar</option>
            <option value="verano">Ciclo verano</option>
          </select>
        </div>

        <div className="secretaria-search-row">
          <div className="secretaria-input-wrap">
            <Search size={18} />
            <input
              aria-label="DNI o nombre del estudiante"
              placeholder="Ingrese DNI o nombre del estudiante"
              value={dni}
              onChange={(event) => setDni(event.target.value)}
            />
          </div>
          <button
            className="secretaria-primary-button"
            type="submit"
            disabled={buscando}
          >
            {buscando ? (
              <Loader2 className="secretaria-spin" size={17} />
            ) : (
              <Search size={17} />
            )}
            <span>{buscando ? "Buscando" : "Buscar"}</span>
          </button>
          {periodo === "verano" ? (
            <button
              className="secretaria-secondary-button secretaria-new-summer-student"
              type="button"
              onClick={() => abrirRegistroAlumnoExterno()}
            >
              <UserPlus size={17} />
              <span>Nuevo estudiante de verano</span>
            </button>
          ) : null}
        </div>
      </form>

      {resultadosNombre.length ? (
        <div className="secretaria-name-results">
          {resultadosNombre.map((item) => (
            <button
              type="button"
              key={`${item.dni || item.codigoEstudiante || item.nombres}-${item.programaAsignado || "base"}`}
              onClick={async () => {
                setDni(item.dni || item.nombres);
                await aplicarEstudianteEncontrado(item);
              }}
            >
              <strong>{item.nombres}</strong>
              <span>{item.dni ? `DNI ${item.dni}` : "Sin DNI"} · {item.codigoEstudiante || "Sin código"} · {item.grado} {item.seccion} · {item.programaNombre || "Sin programa"}</span>
            </button>
          ))}
        </div>
      ) : null}

      {mensaje ? (
        <MantineAlert className="secretaria-message" color="orange" radius="md" icon={<AlertCircle size={18} />}>
          {mensaje}
        </MantineAlert>
      ) : null}

      {!estudiante && !mensaje && !resultadosNombre.length ? (
        <div className="secretaria-search-empty">
          <div className="secretaria-search-empty-icon">
            <Search size={28} />
          </div>
          <div>
            <strong>Lista para iniciar</strong>
            <span>Seleccione el periodo y busque al estudiante para continuar con el registro.</span>
          </div>
        </div>
      ) : null}

      {children}
    </article>
  );
}

export default SecretariaSearchCard;
