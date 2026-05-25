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
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  listarUsuariosController,
  crearUsuarioController,
  editarUsuarioController,
  cambiarEstadoUsuarioController,
  eliminarUsuarioController,
  resetearContrasenaUsuarioController,
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

// â”€â”€ Componente Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Administrador({ onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState({ show: false, editar: false, guardando: false });
  const [form, setForm] = useState(crearFormInicial);

  useEffect(() => { cargarDatos(); }, []);

  const notify = (message, type = "error") => {
    if (type === "success") {
      toast.success("Listo", { description: message });
    } else {
      toast.error("Atencion", { description: message });
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try { setUsuarios(await listarUsuariosController()); }
    catch (err) { notify("Error al cargar: " + err.message); }
    setCargando(false);
  };

  const filtrados = useMemo(() =>
    usuarios.filter(u =>
      (u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
       u.usuario.toLowerCase().includes(busqueda.toLowerCase())) &&
      (filtroRol === "todos" || u.rol === filtroRol) &&
      (filtroEstado === "todos" || u.estado === filtroEstado)
    ), [usuarios, busqueda, filtroRol, filtroEstado]);

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
    if (!modal.editar && !form.contrasena.trim()) return notify("La contrasena es obligatoria.");

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
      notify(`Contrasena de @${u.usuario} reiniciada a 123456.`, "success");
    } catch (err) { notify(err.message); }
  };

  const eliminar = async (u) => {
    const confirmado = window.confirm(`Eliminar al usuario @${u.usuario}? Esta accion no se puede deshacer.`);
    if (!confirmado) return;

    try {
      await eliminarUsuarioController(u.id);
      notify(`Usuario @${u.usuario} eliminado correctamente.`, "success");
      await cargarDatos();
    } catch (err) { notify(err.message); }
  };

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-brand" aria-label="Colegio San Rafael">
          <img className="adm-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="adm-module-label">Modulo Administrador</p>

        <nav className="adm-nav">
          <button className="adm-nav-item adm-nav-active">
            <Users size={18} />
            <span>Usuarios y accesos</span>
            <span className="adm-nav-badge">{usuarios.length}</span>
          </button>
        </nav>

        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="adm-main">
        {/* Topbar */}
        <header className="adm-topbar">
          <div>
            <p className="adm-topbar-sub">Panel de control</p>
            <h1>Administracion de usuarios</h1>
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
          <StatCard label="Roles unicos"   value={totalRoles}     icon={ShieldLock} delay={180} />
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
      </main>

      {/* Modal */}
      <ModalUsuario
        show={modal.show}
        modoEditar={modal.editar}
        form={form}
        setForm={setForm}
        guardar={guardar}
        guardando={modal.guardando}
        cerrar={() => setModal(m => ({ ...m, show: false }))}
      />
    </div>
  );
}
