import React, { useState, useEffect } from "react";
import { IconChevronRight as ChevronRight, IconChevronDown as ChevronDown } from "@tabler/icons-react";
import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconUpload as Upload,
  IconUserCheck as UserCheck,
  IconArchive as Archive,
  IconReceipt as Receipt,
  IconReceiptOff as ReceiptOff,
  IconChartBar as ChartBar,
} from "@tabler/icons-react";

export const moduleShortcutGroups = [
  {
    id: "coordinacion",
    title: "Módulo Coordinación Académica",
    items: [
      { id: "coordinacion-programas", label: "Gestion de Programas", module: "coordinacion", view: "programas", permissions: ["coordinacion.programas"], icon: BookOpen },
      { id: "coordinacion-carga", label: "Cargar Invitados", module: "coordinacion", view: "carga", permissions: ["coordinacion.carga"], icon: Upload },
      { id: "coordinacion-documentos", label: "Plantillas y Documentos", module: "coordinacion", view: "documentos", permissions: ["coordinacion.documentos"], icon: FileText },
      { id: "coordinacion-asistencia", label: "Asistencia y Control", module: "coordinacion", view: "asistencias", permissions: ["coordinacion.asistencia"], icon: UserCheck },
      { id: "coordinacion-historial", label: "Historial / Archivo", module: "coordinacion", view: "historial", permissions: ["coordinacion.historial"], icon: Archive },
    ],
  },
  {
    id: "caja",
    title: "Módulo Cajera",
    items: [
      { id: "caja-pagos", label: "Registrar Cobro", module: "caja", view: "pagos", permissions: ["caja.cobro"], icon: Receipt },
      { id: "caja-reportes", label: "Control y Exportacion", module: "caja", view: "reportes", permissions: ["caja.control"], icon: ChartBar },
      { id: "caja-correlativo", label: "Anulación de Correlativo", module: "caja", view: "cancelar_correlativo", permissions: ["caja.correlativo"], icon: ReceiptOff },
    ],
  },
];

export function userHasAssignedPermission(user, permission) {
  if (!user) return false;
  if (user.estado && user.estado !== "Activo") return false;
  if (user.role === "administrador") return true;
  const permisos = Array.isArray(user.permisos)
    ? user.permisos
    : Array.isArray(user.permissions)
      ? user.permissions
      : [];
  return permisos.includes(permission);
}

export default function ModuleSwitcher({ activeShortcutId, availableModules, currentRole, onSelectShortcut, user }) {
  if (availableModules.length <= 1) return null;
  const extraModules = availableModules.filter((moduleId) => moduleId !== currentRole);
  const groups = moduleShortcutGroups
    .filter((group) => extraModules.includes(group.id))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        !item.permissions?.length || item.permissions.some((permission) => userHasAssignedPermission(user, permission))
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  // Track which groups are expanded.
  // By default, if a group contains the currently active view, it should be expanded.
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    groups.forEach((group) => {
      const hasActive = group.items.some((item) => item.id === activeShortcutId);
      initial[group.id] = hasActive;
    });
    return initial;
  });

  // Auto-expand group if a nested item is activated
  useEffect(() => {
    groups.forEach((group) => {
      const hasActive = group.items.some((item) => item.id === activeShortcutId);
      if (hasActive) {
        setExpanded((prev) => {
          if (prev[group.id]) return prev;
          return { ...prev, [group.id]: true };
        });
      }
    });
  }, [activeShortcutId]);

  const toggleGroup = (groupId) => {
    setExpanded((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <div className="grid">
      {groups.map((group) => {
        const isGroupOpen = !!expanded[group.id];
        return (
          <section className="module-switcher-group" key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className="module-switcher-header"
              type="button"
            >
              <span className="module-switcher-header-title">{group.title}</span>
              <span className="module-switcher-header-icon">
                {isGroupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
            </button>

            {isGroupOpen && (
              <div className="module-switcher-content coord-nav">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeShortcutId === item.id;
                  return (
                    <button
                      className={`coord-nav-item ${active ? "coord-nav-item-active" : ""}`}
                      key={item.id}
                      onClick={() => onSelectShortcut(item)}
                      title={item.label}
                      type="button"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="coord-nav-arrow" size={16} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
