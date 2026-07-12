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
  IconRosetteDiscount as RosetteDiscount,
  IconAdjustments as Adjustments,
  IconQrcode as QrCode,
  IconSchool as School,
  IconWallet as Wallet,
  IconBuilding as Building,
  IconClipboardList as ClipboardList,
  IconSearch as Search,
  IconCreditCard as CreditCard,
} from "@tabler/icons-react";

export const moduleShortcutGroups = [
  {
    id: "secretaria",
    title: "Módulo Asistente",
    icon: ClipboardList,
    items: [
      { id: "secretaria-inscripcion", label: "Inscripción presencial", module: "secretaria", view: "inscripcion", permissions: ["secretaria.inscripcion"], icon: Search },
    ],
  },
  {
    id: "coordinacion",
    title: "Módulo Coordinación Académica",
    icon: School,
    items: [
      { id: "coordinacion-programas", label: "Gestion de Programas", module: "coordinacion", view: "programas", permissions: ["coordinacion.programas"], icon: BookOpen },
      { id: "coordinacion-carga", label: "Cargar Invitados", module: "coordinacion", view: "registro_individual", permissions: ["coordinacion.carga"], icon: Upload },
      { id: "coordinacion-documentos", label: "Plantillas y Documentos", module: "coordinacion", view: "documentos", permissions: ["coordinacion.documentos"], icon: FileText },
      { id: "coordinacion-asistencia", label: "Asistencia y Control", module: "coordinacion", view: "asistencias", permissions: ["coordinacion.asistencia"], icon: UserCheck },
      { id: "coordinacion-historial", label: "Historial / Archivo", module: "coordinacion", view: "historial", permissions: ["coordinacion.historial"], icon: Archive },
    ],
  },
  {
    id: "caja",
    title: "Módulo Cajera",
    icon: Wallet,
    items: [
      { id: "caja-pagos", label: "Registrar Cobro", module: "caja", view: "pagos", permissions: ["caja.cobro"], icon: Receipt },
      { id: "caja-reportes", label: "Control y Exportacion", module: "caja", view: "reportes", permissions: ["caja.control"], icon: ChartBar },
      { id: "caja-correlativo", label: "Anulación de Correlativo", module: "caja", view: "cancelar_correlativo", permissions: ["caja.correlativo"], icon: ReceiptOff },
    ],
  },
  {
    id: "direccion",
    title: "Módulo Dirección",
    icon: Building,
    items: [
      { id: "direccion-resumen", label: "Resumen General", module: "direccion", view: "resumen", permissions: ["direccion.resumen"], icon: ChartBar },
      { id: "direccion-reportes", label: "Reportes", module: "direccion", view: "reportes", permissions: ["direccion.reportes"], icon: FileText },
      { id: "direccion-descuentos", label: "Descuentos y Becas", module: "direccion", view: "descuentos", permissions: ["direccion.descuentos"], icon: RosetteDiscount },
      { id: "direccion-correlativos", label: "Ajustes de Caja", module: "direccion", view: "correlativos", permissions: ["direccion.correlativos"], icon: Adjustments },
    ],
  },
  {
    id: "auxiliar",
    title: "Módulo Auxiliar",
    icon: QrCode,
    items: [
      { id: "auxiliar-asistencia", label: "Registrar Asistencia", module: "auxiliar", view: "asistencia", permissions: ["auxiliar.asistencia"], icon: QrCode },
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
  console.log("ModuleSwitcher Diagnostic:", {
    availableModules,
    currentRole,
    userUsername: user?.username,
    userRole: user?.role,
    userPermisos: user?.permisos,
    userPermissionsProp: user?.permissions
  });

  if (availableModules.length <= 1) {
    console.log("ModuleSwitcher: hidden because availableModules.length <= 1");
    return null;
  }
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

  console.log("ModuleSwitcher: extraModules/groups:", { extraModules, groupsLength: groups.length });

  if (groups.length === 0) {
    console.log("ModuleSwitcher: hidden because groups.length === 0");
    return null;
  }

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

  // Listen for external collapse requests (e.g. from the current module's sidebar)
  useEffect(() => {
    const handleCollapseAll = () => {
      setExpanded({});
    };
    window.addEventListener("collapse-all-module-switcher-groups", handleCollapseAll);
    return () => {
      window.removeEventListener("collapse-all-module-switcher-groups", handleCollapseAll);
    };
  }, []);

  // Auto-expand group if a nested item is activated
  useEffect(() => {
    groups.forEach((group) => {
      const hasActive = group.items.some((item) => item.id === activeShortcutId);
      if (hasActive) {
        setExpanded((prev) => {
          if (prev[group.id]) return prev;
          
          // Collapse the active module's local menu group
          window.dispatchEvent(new CustomEvent("collapse-current-sidebar-group"));
          
          const nextExpanded = {};
          groups.forEach((g) => {
            nextExpanded[g.id] = g.id === group.id;
          });
          return nextExpanded;
        });
      }
    });
  }, [activeShortcutId]);

  const toggleGroup = (groupId) => {
    setExpanded((prev) => {
      const isCurrentlyOpen = !!prev[groupId];
      const nextExpanded = {};
      
      // Accordion behavior: close all groups, only open the toggled one if it was closed
      groups.forEach((g) => {
        nextExpanded[g.id] = (g.id === groupId) ? !isCurrentlyOpen : false;
      });

      // If we are opening a delegated group, collapse the active module's local menu group
      if (!isCurrentlyOpen) {
        window.dispatchEvent(new CustomEvent("collapse-current-sidebar-group"));
      }

      return nextExpanded;
    });
  };

  return (
    <div className="grid">
      {groups.map((group) => {
        const isGroupOpen = !!expanded[group.id];
        return (
          <section className={`module-switcher-group ${isGroupOpen ? "is-open" : ""}`} key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className={`module-switcher-header ${isGroupOpen ? "module-switcher-header-open" : ""}`}
              type="button"
            >
              <div className="module-switcher-header-left">
                {group.icon && <group.icon className="module-switcher-header-main-icon" size={18} />}
                <span className="module-switcher-header-title">{group.title}</span>
              </div>
              <div className="module-switcher-header-right">
                <span className="module-switcher-header-icon">
                  {isGroupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              </div>
            </button>

            {isGroupOpen && (
              <div className="module-switcher-content coord-nav">
                {group.items.map((item) => {
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
