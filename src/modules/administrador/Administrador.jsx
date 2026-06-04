import { useEffect, useState, useMemo } from "react";
import {
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconPlus as Plus,
  IconSearch as Search,
  IconShieldLock as ShieldLock,
  IconTrash as Trash,
  IconUsers as Users,
  IconX as X,
  IconKey as Key,
  IconUserCheck as UserCheck,
  IconUserOff as UserOff,
  IconRefresh as Refresh,
  IconChevronDown as ChevronDown,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconUserPlus as UserPlus,
  IconFileText as FileText,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  listarUsuariosController,
  crearUsuarioController,
  editarUsuarioController,
  cambiarEstadoUsuarioController,
  eliminarUsuarioController,
  resetearContrasenaUsuarioController,
  listarLogsAuditoriaController,
} from "./controllers/administradorController";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLES,
  getRequiredPermissionsByRole,
  isSuperAdmin,
  normalizeUser,
} from "./models/usuarioModel";
import "./Administrador.css";

const crearFormInicial = () => ({
  nombre: "",
  usuario: "",
  rol: "Secretaria",
  permisos: [],
  contrasena: "",
  estado: "Activo",
});

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";



// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatCard = ({ label, value, icon: Icon, delay = 0 }) => (
  <div className="adm-stat-card" style={{ animationDelay: `${delay}ms` }}>
    <div className="adm-stat-icon"><Icon size={20} /></div>
    <div>
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value">{value}</p>
    </div>
    <div className="adm-stat-glow" />
  </div>
);

// â”€â”€ Rol Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RolBadge = ({ rol }) => (
  <span className="adm-rol-badge" data-rol={rol}>
    <span className="adm-rol-dot" />
    {rol}
  </span>
);

// â”€â”€ Estado Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EstadoBadge = ({ estado }) => (
  <span className="adm-estado-badge" data-estado={estado}>
    <span className="adm-estado-dot" />
    {estado}
  </span>
);

const PermisosResumen = ({ usuario }) => {
  const total = normalizeUser(usuario).permisos.length;
  return (
    <span className="inline-flex min-h-7 items-center whitespace-nowrap rounded-full border border-[#d8e0ea] bg-white px-2.5 text-xs font-extrabold text-slate-600">
      {usuario.rol === "Administrador" ? "Todos" : `${total} permisos`}
    </span>
  );
};

// â”€â”€ Avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Avatar = ({ nombre = "" }) => {
  const initials = nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="adm-avatar">{initials || "?"}</div>;
};

// â”€â”€ User Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UserRow = ({ u, onEditar, onCambiarEstado, onEliminar, onResetear, visible }) => {
  const superAdmin = isSuperAdmin(u);
  return (
    <tr className={`adm-user-row ${visible ? "adm-row-visible" : ""}`}>
      <td>
        <div className="adm-user-cell">
          <Avatar nombre={u.nombre} />
          <div>
            <p className="adm-user-name">{u.nombre}</p>
            <p className="adm-user-handle">@{u.usuario}</p>
          </div>
        </div>
      </td>
      <td><RolBadge rol={u.rol} /></td>
      <td><PermisosResumen usuario={u} /></td>
      <td><EstadoBadge estado={u.estado} /></td>
      <td>
        <div className="adm-action-group">
          <button className="adm-btn-icon adm-btn-edit" onClick={() => onEditar(u)} title="Editar">
            <Edit3 size={15} />
          </button>
          <button
            className={`adm-btn-icon ${u.estado === "Activo" ? "adm-btn-disable" : "adm-btn-enable"}`}
            onClick={() => onCambiarEstado(u)}
            disabled={superAdmin}
            title={u.estado === "Activo" ? "Desactivar" : "Activar"}
          >
            {u.estado === "Activo" ? <UserOff size={15} /> : <UserCheck size={15} />}
          </button>
          <button className="adm-btn-icon adm-btn-reset" onClick={() => onResetear(u)} title="Reset contrasena">
            <Key size={15} />
          </button>
          <button className="adm-btn-icon adm-btn-delete" onClick={() => onEliminar(u)} disabled={superAdmin} title="Eliminar">
            <Trash size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// â”€â”€ Tabla â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TablaUsuarios = ({ usuarios, cargando, onEditar, onCambiarEstado, onEliminar, onResetear }) => {
  if (cargando) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Cargando usuarios...</p>
      </div>
    );
  }
  if (usuarios.length === 0) {
    return (
      <div className="adm-empty">
        <div className="adm-empty-icon"><Users size={32} /></div>
        <p>No se encontraron usuarios</p>
        <span>Intenta cambiar los filtros de busqueda</span>
      </div>
    );
  }
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Permisos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u, i) => (
            <UserRow
              key={u.id}
              u={u}
              onEditar={onEditar}
              onCambiarEstado={onCambiarEstado}
              onEliminar={onEliminar}
              onResetear={onResetear}
              visible={true}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// â”€â”€ Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PanelPermisos = ({ form, setForm }) => {
  const permisosObligatorios = new Set(getRequiredPermissionsByRole(form.rol));
  const permisos = form.rol === "Administrador"
    ? ALL_PERMISSIONS
    : Array.from(new Set([...(form.permisos || []), ...permisosObligatorios]));
  const permisosSeleccionados = new Set(permisos);
  const permisosBloqueados = form.rol === "Administrador" || isSuperAdmin(form);

  const alternarPermiso = (permisoId) => {
    if (permisosBloqueados || permisosObligatorios.has(permisoId)) return;
    setForm((actual) => {
      const actuales = new Set(actual.permisos || []);
      getRequiredPermissionsByRole(actual.rol).forEach((permiso) => actuales.add(permiso));
      if (actuales.has(permisoId)) {
        actuales.delete(permisoId);
      } else {
        actuales.add(permisoId);
      }
      return { ...actual, permisos: Array.from(actuales) };
    });
  };

  return (
    <section className="overflow-hidden rounded-lg border border-[#d8e5e1] bg-[#fbfdfc]">
      <div className="flex flex-col gap-3 border-b border-[#e3ece9] p-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="m-0 text-sm font-black text-slate-900">Permisos especificos</h3>
          <p className="mt-1 mb-0 text-xs leading-snug text-slate-500">
            El rol principal queda protegido; puede agregar funciones de otras areas.
          </p>
        </div>
        <span className="inline-flex min-h-6 shrink-0 items-center rounded-full border border-[#b9e4d9] bg-[#e8f7ef] px-2.5 text-xs font-black text-[#075e50]">
          {permisosSeleccionados.size} activos
        </span>
      </div>

      <div className="grid">
        {PERMISSION_GROUPS.map((group) => (
          <div className="border-b border-[#e3ece9] p-3 last:border-b-0" key={group.id}>
            <p className="mb-2.5 mt-0 text-xs font-black uppercase text-slate-700">{group.label}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.permissions.map((permission) => {
                const activo = permisosSeleccionados.has(permission.id);
                const obligatorio = permisosObligatorios.has(permission.id);
                const bloqueado = permisosBloqueados || obligatorio;
                return (
                  <label
                    className={[
                      "flex min-h-[34px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-bold",
                      activo
                        ? "border-[#aee0d2] bg-[#eefbf6] text-[#075e50]"
                        : "border-[#dbe3ee] bg-white text-slate-700",
                      bloqueado ? "cursor-not-allowed opacity-75" : "cursor-pointer",
                    ].join(" ")}
                    key={permission.id}
                  >
                    <input
                      className="h-4 w-4 shrink-0 accent-[#169b83]"
                      type="checkbox"
                      checked={activo}
                      disabled={bloqueado}
                      onChange={() => alternarPermiso(permission.id)}
                    />
                    <span>{permission.label}{obligatorio ? " (rol principal)" : ""}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ModalUsuario = ({ show, modoEditar, form, setForm, guardar, guardando, cerrar }) => {
  const [showPass, setShowPass] = useState(false);
  if (!show) return null;
  const actualizar = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));
  const actualizarRol = (rol) => {
    if (isSuperAdmin(form)) return;
    setForm((actual) => ({
      ...actual,
      rol,
      permisos: rol === "Administrador" ? ALL_PERMISSIONS : getRequiredPermissionsByRole(rol),
    }));
  };
  const labelClass = "text-xs font-extrabold text-slate-600";
  const inputClass = "min-h-10 w-full rounded-lg border border-[#d8e0ea] bg-white px-3 text-sm text-slate-900 outline-0 placeholder:text-slate-400 focus:border-[#0e9f85] focus:shadow-[0_0_0_3px_rgba(14,159,133,0.12)]";
  const selectClass = `${inputClass} cursor-pointer appearance-none pr-10 font-semibold text-slate-700`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-5"
      onClick={cerrar}
    >
      <div
        className="max-h-[calc(100vh-44px)] w-full max-w-[520px] overflow-auto rounded-lg border border-[#dbe3ee] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e5ebf3] bg-[#fbfdff] p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#ccebe3] bg-[#e8f7ef] text-[#075e50]">
            <UserPlus size={22} />
          </div>
          <div>
            <h2 className="m-0 text-lg font-extrabold text-slate-900">
              {modoEditar ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            <p className="mt-1 mb-0 text-[13px] text-slate-500">Complete la informacion del personal</p>
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
        <form id="form-usuario" onSubmit={guardar}>
          <div className="flex flex-col gap-4 p-5">

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nombre completo <span className="text-red-600">*</span></label>
              <input
                className={inputClass}
                value={form.nombre}
                onChange={e => actualizar("nombre", e.target.value)}
                  placeholder="Ej: Juan Perez Gomez"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nombre de usuario <span className="text-red-600">*</span></label>
              <div className="flex min-h-10 w-full overflow-hidden rounded-lg border border-[#d8e0ea] bg-white text-slate-900 focus-within:border-[#0e9f85] focus-within:shadow-[0_0_0_3px_rgba(14,159,133,0.12)]">
                <span className="flex items-center border-r border-[#e5ebf3] bg-slate-50 px-3 font-extrabold text-slate-500">@</span>
                  <input
                    disabled={isSuperAdmin(form)}
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-0 placeholder:text-slate-400"
                  value={form.usuario}
                  onChange={e => actualizar("usuario", e.target.value)}
                  placeholder="jperez"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Rol asignado <span className="text-red-600">*</span></label>
                <div className="relative flex items-center">
                  <select className={selectClass} value={form.rol} onChange={e => actualizarRol(e.target.value)} disabled={isSuperAdmin(form)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Estado</label>
                <div className="relative flex items-center">
                  <select className={selectClass} value={form.estado} onChange={e => actualizar("estado", e.target.value)} disabled={isSuperAdmin(form)}>
                    <option value="Activo">Activo</option>
                    <option value="Regular">Regular</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                {modoEditar ? "Nueva contrasena (vacio = sin cambio)" : "Contrasena *"}
              </label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-11`}
                  type={showPass ? "text" : "password"}
                  value={form.contrasena}
                  onChange={e => actualizar("contrasena", e.target.value)}
                  placeholder="********"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isSuperAdmin(form) ? (
              <div className="rounded-lg border border-[#b9e4d9] bg-[#f0fbf7] px-3 py-2 text-xs font-extrabold text-[#075e50]">
                Super administrador protegido: siempre activo, con rol Administrador y todos los permisos.
              </div>
            ) : null}
            <PanelPermisos form={form} setForm={setForm} />

          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2.5 border-t border-[#e5ebf3] bg-[#fbfdff] p-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#d8e0ea] bg-white px-4 text-[13px] font-extrabold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              onClick={cerrar}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#169b83] bg-[#169b83] px-4 text-[13px] font-extrabold text-white hover:bg-[#0f7d6c] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={guardando}
            >
              {guardando
                ? <><Loader2 size={16} className="adm-spin-icon" /> Guardando...</>
                : <><CheckCircle2 size={16} /> {modoEditar ? "Actualizar" : "Crear usuario"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
      if (detalles?.modulo) return detalles.modulo;
    } catch (e) {
      // Mantener fallback cuando el detalle no es JSON.
    }
  }
  return String(log?.rol || "").replace(/^\w/, (letra) => letra.toUpperCase());
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
export default function Administrador({ onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [seccion, setSeccion] = useState("usuarios");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState({ show: false, editar: false, guardando: false });
  const [form, setForm] = useState(crearFormInicial);

  // States for Audit Logs
  const [logs, setLogs] = useState([]);
  const [cargandoLogs, setCargandoLogs] = useState(false);
  const [logBusqueda, setLogBusqueda] = useState("");
  const [logFiltroAccion, setLogFiltroAccion] = useState("todos");
  const [logFechaInicio, setLogFechaInicio] = useState("");
  const [logFechaFin, setLogFechaFin] = useState("");
  const [modalLog, setModalLog] = useState({ show: false, log: null });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (seccion === "logs") {
      cargarLogs();
    }
  }, [seccion]);

  const notify = (message, type = "error") => {
    if (type === "success") {
      toast.success("Listo", { description: message });
    } else {
      toast.error("Atención", { description: message });
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      setUsuarios(await listarUsuariosController());
    } catch (err) {
      notify("Error al cargar: " + err.message);
    }
    setCargando(false);
  };

  const cargarLogs = async () => {
    setCargandoLogs(true);
    try {
      const data = await listarLogsAuditoriaController();
      setLogs(data);
    } catch (err) {
      notify("Error al cargar registros de acceso: " + err.message);
    } finally {
      setCargandoLogs(false);
    }
  };

  const filtrados = useMemo(() =>
    usuarios.filter(u =>
      (u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
       u.usuario.toLowerCase().includes(busqueda.toLowerCase())) &&
      (filtroRol === "todos" || u.rol === filtroRol) &&
      (filtroEstado === "todos" || u.estado === filtroEstado)
    ), [usuarios, busqueda, filtroRol, filtroEstado]);

  const accionesUnicas = useMemo(() => {
    const set = new Set(logs.map(l => l.accion));
    return Array.from(set).sort();
  }, [logs]);

  const logsFiltrados = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        (log.usuario || "").toLowerCase().includes(logBusqueda.toLowerCase()) ||
        (log.accion || "").toLowerCase().includes(logBusqueda.toLowerCase()) ||
        (log.detalles || "").toLowerCase().includes(logBusqueda.toLowerCase()) ||
        (log.rol || "").toLowerCase().includes(logBusqueda.toLowerCase());

      const matchesAction = logFiltroAccion === "todos" || log.accion === logFiltroAccion;

      let matchesStartDate = true;
      if (logFechaInicio) {
        const logDateStr = log.fecha.slice(0, 10);
        matchesStartDate = logDateStr >= logFechaInicio;
      }

      let matchesEndDate = true;
      if (logFechaFin) {
        const logDateStr = log.fecha.slice(0, 10);
        matchesEndDate = logDateStr <= logFechaFin;
      }

      return matchesSearch && matchesAction && matchesStartDate && matchesEndDate;
    });
  }, [logs, logBusqueda, logFiltroAccion, logFechaInicio, logFechaFin]);

  // Stats
  const totalActivos  = usuarios.filter(u => u.estado === "Activo").length;
  const totalInactivos = usuarios.filter(u => u.estado === "Inactivo").length;
  const totalRoles    = new Set(usuarios.map(u => u.rol)).size;

  const abrirModal = (u = null) => {
    setForm(u ? { ...normalizeUser(u), contrasena: "" } : crearFormInicial());
    setModal({ show: true, editar: !!u, guardando: false });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return notify("El nombre completo es obligatorio.");
    if (!form.usuario.trim()) return notify("El nombre de usuario es obligatorio.");
    if (!modal.editar && !form.contrasena.trim()) return notify("La contraseña es obligatoria.");

    setModal(m => ({ ...m, guardando: true }));
    try {
      const datos = {
        nombre: form.nombre.trim(),
        usuario: form.usuario.trim().toLowerCase(),
        rol: form.rol,
        permisos: form.rol === "Administrador"
          ? ALL_PERMISSIONS
          : Array.from(new Set([...(form.permisos || []), ...getRequiredPermissionsByRole(form.rol)])),
        estado: form.estado,
      };
      if (form.contrasena.trim()) datos.contrasena = form.contrasena.trim();
      modal.editar ? await editarUsuarioController(form.id, datos) : await crearUsuarioController(datos);
      notify(`Usuario ${modal.editar ? "actualizado" : "creado"} correctamente.`, "success");
      await cargarDatos();
      setModal(m => ({ ...m, show: false }));
    } catch (err) { notify(err.message); }
    setModal(m => ({ ...m, guardando: false }));
  };

  const alternarEstado = async (u) => {
    const nuevo = u.estado === "Activo" ? "Inactivo" : "Activo";
    try {
      await cambiarEstadoUsuarioController(u.id, nuevo);
      notify(`Usuario ${nuevo === "Activo" ? "activado" : "desactivado"}.`, "success");
      await cargarDatos();
    } catch (err) { notify(err.message); }
  };

  const resetear = async (u) => {
    try {
      await resetearContrasenaUsuarioController(u.id);
      notify(`Contraseña de @${u.usuario} reiniciada a 123456.`, "success");
    } catch (err) { notify(err.message); }
  };

  const eliminar = async (u) => {
    const confirmado = window.confirm(`¿Eliminar al usuario @${u.usuario}? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      await eliminarUsuarioController(u.id);
      notify(`Usuario @${u.usuario} eliminado correctamente.`, "success");
      await cargarDatos();
    } catch (err) { notify(err.message); }
  };

  const ejecutarDescargarBackup = async () => {
    try {
      notify("Generando copia de seguridad...", "success");
      const backupObj = await descargarBackupController();
      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_san_rafael_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify("Copia de seguridad descargada exitosamente.", "success");
    } catch (err) {
      notify("Error al descargar copia de seguridad: " + err.message);
    }
  };

  const ejecutarResetBaseDatos = async () => {
    const conf1 = window.confirm(
      "¡ATENCIÓN CRÍTICA!\n\n¿Está seguro de que desea restablecer la base de datos a su estado original de fábrica?\n\nEsta acción borrará de forma permanente todos los registros de alumnos, matrículas, pagos y actividades creadas. No se puede deshacer."
    );
    if (!conf1) return;

    const conf2 = window.prompt(
      "ZONA DE PELIGRO: Confirme escribiendo exactamente la palabra 'RESTABLECER' para proceder:"
    );
    if (conf2 !== "RESTABLECER") {
      notify("Restablecimiento cancelado. La confirmación no coincide.");
      return;
    }

    try {
      notify("Iniciando restablecimiento de base de datos...", "success");
      await resetearBaseDatosController();
      notify("Base de datos restablecida correctamente.", "success");
      await cargarDatos();
      if (seccion === "logs") {
        await cargarLogs();
      }
      setSeccion("usuarios");
    } catch (err) {
      notify("Error al restablecer la base de datos: " + err.message);
    }
  };

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-brand" aria-label="Colegio San Rafael">
          <img className="adm-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="adm-module-label">Módulo Administrador</p>

        <nav className="adm-nav">
          <button 
            className={`adm-nav-item ${seccion === "usuarios" ? "adm-nav-active" : ""}`}
            onClick={() => setSeccion("usuarios")}
          >
            <Users size={18} />
            <span>Usuarios y accesos</span>
            <span className="adm-nav-badge">{usuarios.length}</span>
          </button>
          
          <button 
            className={`adm-nav-item ${seccion === "logs" ? "adm-nav-active" : ""}`}
            onClick={() => setSeccion("logs")}
          >
            <FileText size={18} />
            <span>Registro de accesos</span>
          </button>
        </nav>

        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="adm-main">
        {seccion === "usuarios" && (
          <>
            {/* Topbar */}
            <header className="adm-topbar">
              <div>
                <p className="adm-topbar-sub">Panel de control</p>
                <h1>Administración de usuarios</h1>
              </div>
              <div className="adm-topbar-actions">
                <button className="adm-new-btn" onClick={() => abrirModal()}>
                  <Plus size={18} />
                  Nuevo usuario
                </button>
              </div>
            </header>

            {/* Stats */}
            <section className="adm-stats">
              <StatCard label="Total usuarios" value={usuarios.length} icon={Users}     delay={0}   />
              <StatCard label="Activos"        value={totalActivos}   icon={UserCheck}  delay={60}  />
              <StatCard label="Inactivos"      value={totalInactivos} icon={UserOff}    delay={120} />
              <StatCard label="Roles únicos"   value={totalRoles}     icon={ShieldLock} delay={180} />
            </section>

            {/* Tabla card */}
            <section className="adm-content">
              <div className="adm-card-header">
                <div>
                  <h2>Directorio de usuarios</h2>
                  <p>{filtrados.length} de {usuarios.length} usuarios</p>
                </div>
                <button className="adm-refresh-btn" onClick={cargarDatos} title="Actualizar">
                  <Refresh size={16} />
                </button>
              </div>

              {/* Filtros */}
              <div className="adm-filters">
                <div className="adm-search-box">
                  <Search size={16} />
                  <input
                    placeholder="Buscar por nombre o usuario..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  {busqueda && (
                    <button className="adm-search-clear" onClick={() => setBusqueda("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="adm-filter-group">
                  <div className="adm-select-wrap adm-filter-select">
                    <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                      <option value="todos">Todos los roles</option>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={14} className="adm-select-arrow" />
                  </div>

                  <div className="adm-select-wrap adm-filter-select">
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                      <option value="todos">Todos los estados</option>
                      <option value="Activo">Activo</option>
                      <option value="Regular">Regular</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                    <ChevronDown size={14} className="adm-select-arrow" />
                  </div>
                </div>
              </div>

              {/* Tabla */}
              <TablaUsuarios
                usuarios={filtrados}
                cargando={cargando}
                onEditar={abrirModal}
                onCambiarEstado={alternarEstado}
                onEliminar={eliminar}
                onResetear={resetear}
              />
            </section>
          </>
        )}

        {seccion === "logs" && (
          <>
            {/* Topbar */}
            <header className="adm-topbar">
              <div>
                <p className="adm-topbar-sub">Panel de control</p>
                <h1>Registro de accesos</h1>
              </div>
            </header>

            {/* Tabla card */}
            <section className="adm-content">
              <div className="adm-card-header">
                <div>
                  <h2>Inicios de sesion por modulo</h2>
                  <p>{logsFiltrados.length} de {logs.length} registros</p>
                </div>
                <button className="adm-refresh-btn" onClick={cargarLogs} title="Actualizar logs">
                  <Refresh size={16} />
                </button>
              </div>

              {/* Filtros de logs */}
              <div className="adm-filters-logs">
                <div className="adm-search-box">
                  <Search size={16} />
                  <input
                    placeholder="Buscar por usuario, modulo o detalles..."
                    value={logBusqueda}
                    onChange={e => setLogBusqueda(e.target.value)}
                  />
                  {logBusqueda && (
                    <button className="adm-search-clear" onClick={() => setLogBusqueda("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="adm-filter-group-logs">
                  <div className="adm-select-wrap adm-filter-select">
                    <select value={logFiltroAccion} onChange={e => setLogFiltroAccion(e.target.value)}>
                      <option value="todos">Todos los accesos</option>
                      {accionesUnicas.map(acc => <option key={acc} value={acc}>{formatearAccionLog(acc)}</option>)}
                    </select>
                    <ChevronDown size={14} className="adm-select-arrow" />
                  </div>

                  <div className="adm-date-filters">
                    <div className="adm-date-input-wrap">
                      <span className="adm-date-label">Desde:</span>
                      <input 
                        type="date" 
                        value={logFechaInicio} 
                        onChange={e => setLogFechaInicio(e.target.value)} 
                        className="adm-date-input"
                      />
                    </div>
                    <div className="adm-date-input-wrap">
                      <span className="adm-date-label">Hasta:</span>
                      <input 
                        type="date" 
                        value={logFechaFin} 
                        onChange={e => setLogFechaFin(e.target.value)} 
                        className="adm-date-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de Logs */}
              <TablaLogs
                logs={logsFiltrados}
                cargando={cargandoLogs}
                onVerDetalles={(log) => setModalLog({ show: true, log })}
              />
            </section>
          </>
        )}

        {false && (
          <>
            {/* Topbar */}
            <header className="adm-topbar">
              <div>
                <p className="adm-topbar-sub">Panel de control</p>
                <h1>Mantenimiento del sistema</h1>
              </div>
            </header>

            <section className="adm-mantenimiento-grid">
              {/* Card 1: Backup */}
              <div className="adm-maint-card">
                <div className="adm-maint-header">
                  <div className="adm-maint-icon adm-maint-icon-backup">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3>Copia de seguridad (Backup)</h3>
                    <p>Respaldo completo de la información del sistema</p>
                  </div>
                </div>
                <div className="adm-maint-body">
                  <p>
                    Descargue una copia de seguridad completa de la base de datos en formato JSON. 
                    Este archivo contiene todos los datos de alumnos, matrículas, programación, pagos y usuarios registrados.
                  </p>
                  <div className="adm-maint-note">
                    <InfoCircle size={16} />
                    <span>Se recomienda descargar una copia de seguridad antes de realizar cualquier cambio crítico.</span>
                  </div>
                </div>
                <div className="adm-maint-footer">
                  <button className="adm-maint-btn adm-maint-btn-backup" onClick={ejecutarDescargarBackup}>
                    <Download size={16} />
                    Descargar Copia (.json)
                  </button>
                </div>
              </div>

              {/* Card 2: Reset */}
              <div className="adm-maint-card adm-maint-card-danger">
                <div className="adm-maint-header">
                  <div className="adm-maint-icon adm-maint-icon-reset">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3>Restablecer de fábrica</h3>
                    <p className="adm-text-danger">Zona peligrosa y de atención crítica</p>
                  </div>
                </div>
                <div className="adm-maint-body">
                  <p>
                    Restablece la base de datos a sus valores iniciales predeterminados. Se eliminarán permanentemente 
                    todos los registros creados desde el inicio del sistema, incluyendo usuarios adicionales, alumnos, 
                    matrículas, cursos y reportes de pagos.
                  </p>
                  <div className="adm-maint-warning">
                    <AlertTriangle size={16} />
                    <span>Esta acción es irreversible. Por seguridad, requerirá confirmación doble.</span>
                  </div>
                </div>
                <div className="adm-maint-footer">
                  <button className="adm-maint-btn adm-maint-btn-reset" onClick={ejecutarResetBaseDatos}>
                    <Refresh size={16} />
                    Restablecer Base de Datos
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modals */}
      <ModalUsuario
        show={modal.show}
        modoEditar={modal.editar}
        form={form}
        setForm={setForm}
        guardar={guardar}
        guardando={modal.guardando}
        cerrar={() => setModal(m => ({ ...m, show: false }))}
      />

      <ModalLog
        show={modalLog.show}
        log={modalLog.log}
        cerrar={() => setModalLog({ show: false, log: null })}
      />
    </div>
  );
}
