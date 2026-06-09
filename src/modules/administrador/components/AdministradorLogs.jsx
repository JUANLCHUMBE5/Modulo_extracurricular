import {
  IconEye as Eye,
  IconFileText as FileText,
  IconX as X,
} from "@tabler/icons-react";
import { getRoleLabel } from "../models/usuarioModel";

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return "";
  try {
    const d = new Date(fechaStr);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return fechaStr;
  }
};

const getAccionBadgeClass = (accion) => {
  if (!accion) return "adm-badge-default";
  if (accion === "INICIO_SESION") return "adm-badge-exito";
  if (accion.includes("EXITOSO")) return "adm-badge-exito";
  if (accion.includes("FALLIDO")) return "adm-badge-error";
  if (accion.includes("CREAR")) return "adm-badge-crear";
  if (accion.includes("EDITAR")) return "adm-badge-editar";
  if (accion.includes("ELIMINAR")) return "adm-badge-eliminar";
  if (accion.includes("RESET") || accion.includes("RESTABLECER") || accion.includes("DB_RESET")) return "adm-badge-critico";
  return "adm-badge-default";
};

const obtenerModuloLog = (log) => {
  if (log?.detalles) {
    try {
      const detalles = JSON.parse(log.detalles);
      if (detalles?.modulo) return getRoleLabel(detalles.modulo);
    } catch (e) {
      // Mantener fallback cuando el detalle no es JSON.
    }
  }
  return getRoleLabel(log?.rol);
};

const formatearAccionLog = (accion) => {
  if (accion === "INICIO_SESION" || accion === "LOGIN_EXITOSO") return "Inicio de sesion";
  return String(accion || "Acceso").replace(/_/g, " ").toLowerCase();
};

const TablaLogs = ({ logs, cargando, onVerDetalles }) => {
  if (cargando) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Cargando registros de acceso...</p>
      </div>
    );
  }
  if (logs.length === 0) {
    return (
      <div className="adm-empty">
        <div className="adm-empty-icon"><FileText size={32} /></div>
        <p>No se encontraron accesos</p>
        <span>Solo se muestran inicios de sesion de los modulos internos</span>
      </div>
    );
  }

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Fecha y Hora</th>
            <th>Usuario</th>
            <th>Modulo</th>
            <th>Acceso</th>
            <th>Detalles</th>
            <th style={{ width: "80px" }}>Ver</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="adm-log-row">
              <td className="adm-log-date">{formatearFecha(log.fecha)}</td>
              <td>
                <span className="adm-log-username">@{log.usuario}</span>
              </td>
              <td>
                <span className="adm-log-role">{obtenerModuloLog(log)}</span>
              </td>
              <td>
                <span className={`adm-badge ${getAccionBadgeClass(log.accion)}`}>
                  {formatearAccionLog(log.accion)}
                </span>
              </td>
              <td className="adm-log-details-cell">
                <span className="adm-log-details-text">
                  {(() => {
                    if (!log.detalles) return "Sin detalles adicionales";
                    const detallesStr = String(log.detalles);
                    if (detallesStr.startsWith("{") || detallesStr.startsWith("[")) {
                      try {
                        const parsed = JSON.parse(detallesStr);
                        if (parsed?.modulo) return `Ingreso al modulo ${parsed.modulo}`;
                        return Object.entries(parsed)
                          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                          .join(", ")
                          .slice(0, 70) + (detallesStr.length > 70 ? "..." : "");
                      } catch (e) {
                        return detallesStr.slice(0, 70) + (detallesStr.length > 70 ? "..." : "");
                      }
                    }
                    return detallesStr.slice(0, 70) + (detallesStr.length > 70 ? "..." : "");
                  })()}
                </span>
              </td>
              <td>
                <button 
                  className="adm-btn-icon adm-btn-view-details" 
                  onClick={() => onVerDetalles(log)} 
                  title="Ver detalles completos"
                >
                  <Eye size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ModalLog = ({ show, log, cerrar }) => {
  if (!show || !log) return null;

  let parsedDetalles = null;
  if (log.detalles) {
    try {
      parsedDetalles = JSON.parse(log.detalles);
    } catch (e) {
      // Ignorar error de parseo si no es JSON
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-5"
      onClick={cerrar}
    >
      <div
        className="max-h-[calc(100vh-44px)] w-full max-w-[580px] overflow-auto rounded-lg border border-[#dbe3ee] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e5ebf3] bg-[#fbfdff] p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#ccebe3] bg-[#e8f7ef] text-[#075e50]">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="m-0 text-lg font-extrabold text-slate-900">
              Detalle de acceso
            </h2>
            <p className="mt-1 mb-0 text-[13px] text-slate-500">ID del acceso: {log.id}</p>
          </div>
          <button
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={cerrar}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 border-b border-[#e2e8f0] pb-4">
            <div>
              <span className="text-xs font-extrabold text-slate-500 block uppercase">Fecha y Hora</span>
              <span className="text-sm font-semibold text-slate-900">{formatearFecha(log.fecha)}</span>
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-500 block uppercase">Usuario</span>
              <span className="text-sm font-bold text-slate-900">@{log.usuario}</span>
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-500 block uppercase">Modulo</span>
              <span className="text-sm font-bold text-slate-900">{obtenerModuloLog(log)}</span>
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-500 block uppercase">Acceso registrado</span>
              <span className={`adm-badge ${getAccionBadgeClass(log.accion)} mt-1`}>{formatearAccionLog(log.accion)}</span>
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-500 block uppercase">ID Interno</span>
              <span className="text-sm font-mono text-slate-600">{log.id}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-500 block uppercase mb-2">Datos del acceso</span>
            <div className="rounded-lg border border-[#d8e0ea] bg-[#f8fafc] p-4 overflow-auto max-h-[250px] font-mono text-xs text-slate-800">
              {parsedDetalles ? (
                <pre className="m-0 leading-relaxed">
                  {JSON.stringify(parsedDetalles, null, 2)}
                </pre>
              ) : (
                <p className="m-0 italic text-slate-500 font-sans">
                  {log.detalles || "Sin detalles adicionales registrados"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#e5ebf3] bg-[#fbfdff] p-4">
          <button
            type="button"
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#d8e0ea] bg-white px-5 text-[13px] font-extrabold text-slate-700 hover:bg-slate-50"
            onClick={cerrar}
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€ Componente Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export { formatearAccionLog, ModalLog, TablaLogs };
