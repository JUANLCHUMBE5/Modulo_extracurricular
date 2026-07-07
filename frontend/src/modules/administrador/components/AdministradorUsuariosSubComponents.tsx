import React from "react";
import {
  IconEdit as Edit3,
  IconTrash as Trash,
  IconUsers as Users,
  IconKey as Key,
  IconUserCheck as UserCheck,
  IconUserOff as UserOff,
} from "@tabler/icons-react";
import {
  getRoleLabel,
  isSuperAdmin,
  normalizeUser,
} from "../models/usuarioModel";

export const StatCard = ({ label, value, icon: Icon, delay = 0 }: any) => (
  <div className="adm-stat-card" style={{ animationDelay: `${delay}ms` }}>
    <div className="adm-stat-icon"><Icon size={20} /></div>
    <div>
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value">{value}</p>
    </div>
    <div className="adm-stat-glow" />
  </div>
);

export const RolBadge = ({ rol }: any) => (
  <span className="adm-rol-badge" data-rol={rol}>
    <span className="adm-rol-dot" />
    {getRoleLabel(rol)}
  </span>
);

export const EstadoBadge = ({ estado }: any) => (
  <span className="adm-estado-badge" data-estado={estado}>
    <span className="adm-estado-dot" />
    {estado}
  </span>
);

export const PermisosResumen = ({ usuario }: any) => {
  const total = normalizeUser(usuario).permisos.length;
  return (
    <span className="inline-flex min-h-[22px] items-center whitespace-nowrap rounded-full border border-[#d8e0ea] bg-white px-2 text-xs font-extrabold text-slate-600">
      {usuario.rol === "Administrador" ? "Todos" : `${total} permisos`}
    </span>
  );
};

export const Avatar = ({ nombre = "" }: any) => {
  const initials = nombre.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="adm-avatar">{initials || "?"}</div>;
};

export const UserRow = ({ u, onEditar, onCambiarEstado, onEliminar, onResetear, visible }: any) => {
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

export const TablaUsuarios = ({ usuarios, cargando, onEditar, onCambiarEstado, onEliminar, onResetear }: any) => {
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
          {usuarios.map((u: any, i: number) => (
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
