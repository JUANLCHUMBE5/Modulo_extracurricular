import { useState, useEffect } from "react";
import {
  IconCircleCheck as CheckCircle2,
  IconLoader2 as Loader2,
  IconX as X,
  IconChevronDown as ChevronDown,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconUserPlus as UserPlus,
  IconSparkles as Sparkles,
  IconRefresh as Refresh,
  IconCopy as Copy,
  IconCheck as Check,
  IconUsers as Users,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLES,
  getRoleLabel,
  getRequiredPermissionsByRole,
  isSuperAdmin,
  normalizeUser,
} from "../models/usuarioModel";
import {
  StatCard,
  TablaUsuarios,
} from "./AdministradorUsuariosSubComponents";

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
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (show) {
      setUsuarioEditadoManualmente(modoEditar);
      setCreadoExitoso(false);
      setCopiado(false);
    }
  }, [show, modoEditar]);

  if (!show) return null;

  const handleCopy = () => {
    const passwordText = form.contrasena || "123456";
    const texto = `Nombre: ${form.nombre}\nUsuario: @${form.usuario}\nRol: ${getRoleLabel(form.rol)}\nContraseña: ${passwordText}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success("Credenciales copiadas al portapapeles.");
    setTimeout(() => setCopiado(false), 2000);
  };

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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            cerrar();
          }
        }}
      >
        <div
          className="w-full max-w-[460px] overflow-auto rounded-xl border border-[#dbe3ee] bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.28)] text-center animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <CheckCircle2 size={32} className="relative z-10" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-1.5 tracking-tight">¡Usuario creado con éxito!</h2>
          <p className="text-[13px] text-slate-500 mb-5 leading-normal max-w-sm mx-auto">
            Por favor, copie o guarde las credenciales del personal antes de cerrar esta ventana:
          </p>
          
          <div className="rounded-xl border border-[#e8edf4] bg-[#f8fafb] p-4.5 mb-6 text-left flex flex-col gap-3.5 text-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Nombre Completo</span>
              <span className="text-slate-900 font-extrabold text-[15px] leading-tight">{form.nombre}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-[#e8edf4] pt-3">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Usuario</span>
                <span className="text-[#0e9f85] font-extrabold text-sm">@{form.usuario}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Rol</span>
                <span className="text-slate-800 font-extrabold text-sm">{getRoleLabel(form.rol)}</span>
              </div>
            </div>
            
            <div className="border-t border-[#e8edf4] pt-3">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Contraseña asignada</span>
              <span className="text-slate-900 font-mono font-extrabold text-base tracking-wider select-all">
                {form.contrasena || "123456"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#d8e0ea] bg-white px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              onClick={handleCopy}
            >
              {copiado ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-slate-500" />
                  <span>Copiar Datos</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#169b83] bg-[#169b83] px-4 text-xs font-extrabold text-white hover:bg-[#0f7d6c] transition cursor-pointer shadow-xs"
              onClick={cerrar}
            >
              Entendido y Cerrar
            </button>
          </div>
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
