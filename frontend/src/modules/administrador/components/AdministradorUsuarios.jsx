import { useState, useEffect } from "react";
import {
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconLoader2 as Loader2,
  IconTrash as Trash,
  IconUsers as Users,
  IconX as X,
  IconKey as Key,
  IconUserCheck as UserCheck,
  IconUserOff as UserOff,
  IconChevronDown as ChevronDown,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconUserPlus as UserPlus,
  IconSparkles as Sparkles,
  IconRefresh as Refresh,
} from "@tabler/icons-react";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLES,
  getRoleLabel,
  getRequiredPermissionsByRole,
  isSuperAdmin,
  normalizeUser,
} from "../models/usuarioModel";

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
    {getRoleLabel(rol)}
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
    <span className="inline-flex min-h-[22px] items-center whitespace-nowrap rounded-full border border-[#d8e0ea] bg-white px-2 text-xs font-extrabold text-slate-600">
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
          <button className="adm-btn-icon adm-btn-edit" onClick={() => onEditar(u)} disabled={superAdmin} title="Editar">
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
          <button className="adm-btn-icon adm-btn-reset" onClick={() => onResetear(u)} disabled={superAdmin} title="Reset contrasena">
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

  const seleccionarTodos = () => {
    if (permisosBloqueados) return;
    setForm((actual) => ({
      ...actual,
      permisos: [...ALL_PERMISSIONS],
    }));
  };

  const desmarcarTodos = () => {
    if (permisosBloqueados) return;
    setForm((actual) => ({
      ...actual,
      permisos: getRequiredPermissionsByRole(actual.rol),
    }));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-[#d8e5e1] bg-[#fbfdfc]">
      <div className="flex flex-col gap-2 border-b border-[#e3ece9] py-2 px-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="m-0 text-xs font-black text-slate-900">Permisos especificos</h3>
          <p className="mt-0.5 mb-0 text-[11px] leading-snug text-slate-500">
            El rol principal queda protegido; puede agregar funciones de otras areas.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!permisosBloqueados && (
            <>
              <button
                type="button"
                onClick={seleccionarTodos}
                className="inline-flex h-[19px] items-center rounded bg-slate-100/80 px-1.5 text-[9.5px] font-bold text-slate-600 hover:bg-[#e8f7ef] hover:text-[#075e50] transition-colors cursor-pointer border-0 select-none"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Activar Todos
              </button>
              <button
                type="button"
                onClick={desmarcarTodos}
                className="inline-flex h-[19px] items-center rounded bg-slate-100/80 px-1.5 text-[9.5px] font-bold text-slate-600 hover:bg-[#fdf2f2] hover:text-[#991b1b] transition-colors cursor-pointer border-0 select-none"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Restablecer
              </button>
            </>
          )}
          <span
            className="inline-flex h-[19px] items-center rounded bg-[#e8f7ef] px-1.5 text-[9.5px] font-black text-[#075e50] border border-[#ccebe3] select-none ml-0.5"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {permisosSeleccionados.size} ACTIVOS
          </span>
        </div>
      </div>

      <div className="grid">
        {PERMISSION_GROUPS
          .filter(group => group.id !== "usuarios" || form.rol === "Administrador")
          .map((group) => (
          <div className="border-b border-[#e3ece9] py-2 px-3 last:border-b-0" key={group.id}>
            <p className="mb-1.5 mt-0 text-[10.5px] font-black uppercase text-slate-700">{group.label}</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {group.permissions.map((permission) => {
                const activo = permisosSeleccionados.has(permission.id);
                const obligatorio = permisosObligatorios.has(permission.id);
                const bloqueado = permisosBloqueados || obligatorio;
                return (
                  <label
                    className={[
                      "flex min-h-[28px] items-center gap-2 rounded-lg border px-2 py-1 text-xs font-bold",
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

const sugerirUsuario = (nombre) => {
  if (!nombre) return "";
  const limpio = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return partes[0][0] + partes[1];
};

const ModalUsuario = ({ show, modoEditar, form, setForm, guardar, guardando, cerrar }) => {
  const [showPass, setShowPass] = useState(false);
  const [usuarioEditadoManualmente, setUsuarioEditadoManualmente] = useState(false);
  const [creadoExitoso, setCreadoExitoso] = useState(false);

  useEffect(() => {
    if (show) {
      setUsuarioEditadoManualmente(modoEditar);
      setCreadoExitoso(false);
    }
  }, [show, modoEditar]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const exito = await guardar(e);
    if (exito && !modoEditar) {
      setCreadoExitoso(true);
    }
  };

  const handleFormKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

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
  const inputClass = "min-h-[34px] h-[34px] w-full rounded-lg border border-[#d8e0ea] bg-white px-3 text-sm text-slate-900 outline-0 placeholder:text-slate-400 focus:border-[#0e9f85] focus:shadow-[0_0_0_3px_rgba(14,159,133,0.12)]";
  const selectClass = `${inputClass} cursor-pointer appearance-none pr-10 font-semibold text-slate-700`;

  if (creadoExitoso) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            cerrar();
          }
        }}
      >
        <div
          className="w-full max-w-[480px] overflow-auto rounded-lg border border-[#dbe3ee] bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.28)] text-center"
          onClick={e => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">¡Usuario creado con éxito!</h2>
          <p className="text-[13px] text-slate-500 mb-5">
            Por favor, copie o guarde las credenciales del personal antes de cerrar esta ventana:
          </p>
          
          <div className="bg-slate-50 rounded-lg border border-[#d8e5e1] p-4 mb-5 text-left flex flex-col gap-3 font-semibold text-slate-700 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-bold uppercase">Nombre Completo</span>
              <span className="text-slate-900 font-extrabold">{form.nombre}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase">Usuario</span>
                <span className="text-[#0e9f85] font-extrabold">@{form.usuario}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase">Rol</span>
                <span className="text-slate-900 font-extrabold">{getRoleLabel(form.rol)}</span>
              </div>
            </div>
            <div className="border-t border-slate-200/60 pt-3">
              <span className="text-xs text-slate-400 block font-bold uppercase mb-1">Contraseña asignada</span>
              <span className="text-slate-950 font-mono font-extrabold text-base bg-white border border-slate-200 rounded px-2.5 py-1 inline-block select-all select-text">
                {form.contrasena || "123456"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="w-full inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#169b83] bg-[#169b83] px-4 text-[13px] font-extrabold text-white hover:bg-[#0f7d6c]"
            onClick={cerrar}
          >
            Entendido y Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cerrar();
        }
      }}
    >
      <div
        className="max-h-[calc(100vh-44px)] w-full max-w-[840px] overflow-auto rounded-lg border border-[#dbe3ee] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e5ebf3] bg-[#fbfdff] py-3 px-5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#ccebe3] bg-[#e8f7ef] text-[#075e50]">
            <UserPlus size={18} />
          </div>
          <div>
            <h2 className="m-0 text-base font-extrabold text-slate-900">
              {modoEditar ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            <p className="mt-0.5 mb-0 text-xs text-slate-500">Complete la informacion del personal</p>
          </div>
          <button
            className="ml-auto grid h-7 w-7 place-items-center rounded-lg border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={cerrar}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form id="form-usuario" onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
          <div className="flex flex-col gap-3 p-4 sm:p-5">

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Nombre completo <span className="text-red-600">*</span></label>
                <input
                  className={inputClass}
                  value={form.nombre}
                  onChange={e => {
                    const nuevoNombre = e.target.value.replace(/\r?\n/g, "");
                    actualizar("nombre", nuevoNombre);
                    if (!usuarioEditadoManualmente) {
                      actualizar("usuario", sugerirUsuario(nuevoNombre));
                    }
                  }}
                  placeholder="Ej: Juan Perez Gomez"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Nombre de usuario <span className="text-red-600">*</span></label>
                <div className="flex min-h-[34px] h-[34px] w-full overflow-hidden rounded-lg border border-[#d8e0ea] bg-white text-slate-900 focus-within:border-[#0e9f85] focus-within:shadow-[0_0_0_3px_rgba(14,159,133,0.12)]">
                  <span className="flex items-center border-r border-[#e5ebf3] bg-slate-50 px-3 font-extrabold text-slate-500">@</span>
                  <input
                    disabled={isSuperAdmin(form)}
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-0 placeholder:text-slate-400"
                    value={form.usuario}
                    onChange={e => {
                      setUsuarioEditadoManualmente(true);
                      actualizar("usuario", e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""));
                    }}
                    placeholder="jperez"
                    autoComplete="off"
                  />
                  {!isSuperAdmin(form) && (
                    <button
                      type="button"
                      title="Sugerir/Generar variante aleatoria"
                      className="flex items-center justify-center px-3 border-l border-[#e5ebf3] bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-[#0e9f85] transition-colors"
                      onClick={() => {
                        const base = sugerirUsuario(form.nombre) || "usuario";
                        const randomNum = Math.floor(10 + Math.random() * 90);
                        actualizar("usuario", `${base}${randomNum}`);
                        setUsuarioEditadoManualmente(true);
                      }}
                      disabled={!form.nombre.trim()}
                    >
                      <Sparkles size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Rol asignado <span className="text-red-600">*</span></label>
                <div className="relative flex items-center">
                  <select className={selectClass} value={form.rol} onChange={e => actualizarRol(e.target.value)} disabled={isSuperAdmin(form)}>
                    {ROLES
                      .filter(r => modoEditar || r !== "Administrador")
                      .map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Estado</label>
                <div className="relative flex items-center">
                  <select className={selectClass} value={form.estado} onChange={e => actualizar("estado", e.target.value)} disabled={isSuperAdmin(form)}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-500" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>
                  {modoEditar ? "Nueva contrasena (vacio = sin cambio)" : "Contrasena *"}
                </label>
                <div className="relative flex items-center">
                  <input
                    className={`${inputClass} pr-20`}
                    type={showPass ? "text" : "password"}
                    value={form.contrasena}
                    onChange={e => actualizar("contrasena", e.target.value.replace(/\r?\n/g, ""))}
                    placeholder="********"
                    autoComplete="new-password"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      title="Generar contraseña segura aleatoria"
                      className="grid h-7 w-7 place-items-center rounded-md border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-[#0e9f85] transition-colors"
                      onClick={() => {
                        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
                        let pass = "";
                        for (let i = 0; i < 10; i++) {
                          pass += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        actualizar("contrasena", pass);
                        setShowPass(true);
                      }}
                    >
                      <Refresh size={15} />
                    </button>
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-md border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      onClick={() => setShowPass(s => !s)}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {form.rol === "Administrador" && !isSuperAdmin(form) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800 flex items-start gap-2">
                <span className="text-sm shrink-0">⚠️</span>
                <span>
                  <strong>Atención - Rol Crítico:</strong> El rol Administrador otorga control absoluto sobre todas las funciones y usuarios del sistema. Por seguridad, restrinja este rol únicamente a sub-administradores de total confianza en ocasiones excepcionales.
                </span>
              </div>
            )}

            <PanelPermisos form={form} setForm={setForm} />

          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2.5 border-t border-[#e5ebf3] bg-[#fbfdff] py-2.5 px-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex min-h-[34px] h-[34px] items-center justify-center rounded-lg border border-[#d8e0ea] bg-white px-4 text-[13px] font-extrabold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              onClick={cerrar}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[34px] h-[34px] items-center justify-center gap-2 rounded-lg border border-[#169b83] bg-[#169b83] px-4 text-[13px] font-extrabold text-white hover:bg-[#0f7d6c] disabled:cursor-not-allowed disabled:opacity-55"
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

export { ModalUsuario, StatCard, TablaUsuarios };
