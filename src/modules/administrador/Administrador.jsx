import { useEffect, useMemo, useState } from "react";
import {
  IconChevronDown as ChevronDown,
  IconFileText as FileText,
  IconLogout as LogOut,
  IconPlus as Plus,
  IconSearch as Search,
  IconShieldLock as ShieldLock,
  IconUsers as Users,
  IconUserCheck as UserCheck,
  IconUserOff as UserOff,
  IconRefresh as Refresh,
  IconMenu2 as Menu,
  IconX as X,
  IconDatabase as Database,
  IconInfoCircle as InfoCircle,
  IconAlertTriangle as AlertTriangle,
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
  descargarBackupController,
  resetearBaseDatosController,
} from "./controllers/administradorController";
import {
  ALL_PERMISSIONS,
  ROLES,
  getRoleLabel,
  getRequiredPermissionsByRole,
  normalizeUser,
} from "./models/usuarioModel";
import { ModalLog, TablaLogs, formatearAccionLog } from "./components/AdministradorLogs";
import { ModalUsuario, StatCard, TablaUsuarios } from "./components/AdministradorUsuarios";
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
export default function Administrador({ onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  
  // Estado de la barra lateral (colapsada/expandida)
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem("adm_sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const newVal = !prev;
      localStorage.setItem("adm_sidebar_expanded", JSON.stringify(newVal));
      return newVal;
    });
  };

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
    <div className={`adm-root ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand-row">
          <button className="adm-menu-toggle-btn" type="button" onClick={toggleSidebar} aria-label="Alternar barra lateral">
            <Menu size={20} />
          </button>
          {sidebarExpanded && (
            <div className="adm-brand" aria-label="Colegio San Rafael">
              <img className="adm-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
            </div>
          )}
        </div>
        {sidebarExpanded && <p className="adm-module-label">Módulo Administrador</p>}

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
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {!sidebarExpanded && (
                  <button 
                    className="adm-menu-toggle-btn-header" 
                    type="button" 
                    onClick={toggleSidebar} 
                    aria-label="Mostrar barra lateral"
                    title="Mostrar barra lateral"
                  >
                    <Menu size={22} />
                  </button>
                )}
                <div>
                  <p className="adm-topbar-sub">Panel de control</p>
                  <h1>Administración de usuarios</h1>
                </div>
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
                      {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
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
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {!sidebarExpanded && (
                  <button 
                    className="adm-menu-toggle-btn-header" 
                    type="button" 
                    onClick={toggleSidebar} 
                    aria-label="Mostrar barra lateral"
                    title="Mostrar barra lateral"
                  >
                    <Menu size={22} />
                  </button>
                )}
                <div>
                  <p className="adm-topbar-sub">Panel de control</p>
                  <h1>Registro de accesos</h1>
                </div>
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
