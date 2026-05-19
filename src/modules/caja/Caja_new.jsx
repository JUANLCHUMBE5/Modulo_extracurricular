import { useEffect, useState } from "react";
import { Alert as MantineAlert, Table, Badge, Group, ActionIcon, Tooltip, Modal, Button, Select } from "@mantine/core";
import { toast } from "sonner";
import {
  IconAlertCircle as AlertCircle,
  IconCalendar as CalendarDays,
  IconCheck as Check,
  IconCircleCheck as CheckCircle2,
  IconCurrencyDollar as DollarSign,
  IconDownload as Download,
  IconEdit as Edit3,
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconMoney as Money,
  IconPrinter as Printer,
  IconSearch as Search,
  IconTrash as Trash2,
  IconX as X,
} from "@tabler/icons-react";
import {
  listarPagos,
  registrarPago,
  actualizarPago,
  obtenerResumenCaja,
  obtenerEstudiantePorDni,
  generarReportePagos,
} from "./cajaService";
import { validarDni } from "../../services/validators";
import { formatearFechaPeru, fechaActualInput } from "../../services/dateService";
import CajaFields from "./components/CajaFields";
import ResumenCaja from "./components/ResumenCaja";
import "./Caja.css";

const formularioInicial = {
  estudianteDni: "",
  estudianteNombre: "",
  programaId: "",
  programaNombre: "",
  monto: "",
  concepto: "Matrícula",
  formaPago: "Efectivo",
  estado: "pendiente",
  fechaPago: fechaActualInput(),
  observaciones: "",
};

export default function Caja() {
  const [periodo, setPeriodo] = useState("escolar");
  const [formulario, setFormulario] = useState(formularioInicial);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [dni, setDni] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoSeleccionado, setPageoSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [modalExito, setModalExito] = useState(false);

  useEffect(() => {
    cargarPagos();
    cargarResumen();
  }, [periodo]);

  async function cargarPagos() {
    try {
      const datosPagos = await listarPagos(periodo);
      setPagos(datosPagos);
    } catch (error) {
      setMensaje(`Error al cargar pagos: ${error.message}`);
    }
  }

  async function cargarResumen() {
    try {
      const datosResumen = await obtenerResumenCaja(periodo);
      setResumen(datosResumen);
    } catch (error) {
      console.error("Error al cargar resumen:", error);
    }
  }

  async function buscarEstudiante(event) {
    event?.preventDefault();
    if (!dni.trim()) {
      setMensaje("Ingrese un DNI");
      return;
    }

    setBuscando(true);
    try {
      const encontrado = await obtenerEstudiantePorDni(dni);
      if (encontrado) {
        setEstudiante(encontrado);
        setFormulario((prev) => ({
          ...prev,
          estudianteDni: dni,
          estudianteNombre: `${encontrado.nombres || ""} ${encontrado.apellidos || ""}`.trim(),
        }));
        setMensaje("");
      } else {
        setEstudiante(null);
        setMensaje("Estudiante no encontrado");
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setBuscando(false);
    }
  }

  async function guardarPago() {
    if (!validarDatos()) return;

    try {
      if (modoEdicion) {
        await actualizarPago(pagoSeleccionado.id, formulario);
        toast.success("Pago actualizado", {
          description: "El registro de pago se actualizó correctamente.",
        });
      } else {
        await registrarPago(formulario);
        toast.success("Pago registrado", {
          description: "El pago se guardó correctamente.",
        });
      }
      await cargarPagos();
      await cargarResumen();
      cerrarModal();
      setFormulario(formularioInicial);
      setEstudiante(null);
      setDni("");
    } catch (error) {
      toast.error("No se pudo guardar el pago", {
        description: error.message,
      });
    }
  }

  function validarDatos() {
    if (!formulario.estudianteDni.trim()) {
      setMensaje("Seleccione un estudiante");
      return false;
    }
    if (!formulario.monto || Number(formulario.monto) <= 0) {
      setMensaje("Ingrese un monto válido");
      return false;
    }
    return true;
  }

  function abrirModalNuevo() {
    setFormulario(formularioInicial);
    setEstudiante(null);
    setDni("");
    setModoEdicion(false);
    setMensaje("");
    setModalAbierto(true);
  }

  function abrirModalEdicion(pago) {
    setPageoSeleccionado(pago);
    setFormulario(pago);
    setModoEdicion(true);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setFormulario(formularioInicial);
    setModoEdicion(false);
    setMensaje("");
  }

  async function descargarReporte() {
    try {
      const datosPagos = await generarReportePagos({ periodo });
      const csv = generarCSV(datosPagos);
      descargarArchivo(csv, "reporte-caja.csv");
      toast.success("Reporte descargado", {
        description: "El archivo de caja se generó correctamente.",
      });
    } catch (error) {
      toast.error("No se pudo descargar el reporte", {
        description: error.message,
      });
    }
  }

  function generarCSV(datos) {
    const encabezados = ["DNI", "Estudiante", "Programa", "Monto", "Forma de Pago", "Estado", "Fecha"];
    const filas = datos.map((p) => [
      p.estudianteDni,
      p.estudianteNombre,
      p.programaNombre,
      p.monto,
      p.formaPago,
      p.estado,
      formatearFechaPeru(p.fecha),
    ]);

    const contenido = [
      encabezados.join(","),
      ...filas.map((fila) => fila.map((col) => `"${col}"`).join(",")),
    ].join("\n");

    return contenido;
  }

  function descargarArchivo(contenido, nombreArchivo) {
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo;
    enlace.click();
  }

  return (
    <div className="caja-container">
      <div className="caja-header">
        <h1>
          <Money size={28} />
          Módulo de Caja
        </h1>
      </div>

      {/* Selector de período */}
      <div className="caja-period-selector">
        <Select
          label="Período"
          value={periodo}
          onChange={setPeriodo}
          data={[
            { value: "escolar", label: "Año Escolar" },
            { value: "verano", label: "Ciclo Verano" },
          ]}
          searchable
          clearable={false}
        />
      </div>

      {/* Resumen de Caja */}
      {resumen && <ResumenCaja resumen={resumen} />}

      {/* Botones de acción */}
      <div className="caja-actions">
        <Button
          onClick={abrirModalNuevo}
          leftSection={<DollarSign size={16} />}
          color="blue"
        >
          Registrar Pago
        </Button>
        <Button
          onClick={descargarReporte}
          leftSection={<Download size={16} />}
          variant="light"
        >
          Descargar Reporte
        </Button>
      </div>

      {/* Tabla de Pagos */}
      <div className="caja-table-container">
        <h2>Pagos Registrados</h2>
        {pagos.length === 0 ? (
          <div className="caja-empty">
            <p>No hay pagos registrados para este período</p>
          </div>
        ) : (
          <Table striped hover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>DNI</Table.Th>
                <Table.Th>Estudiante</Table.Th>
                <Table.Th>Programa</Table.Th>
                <Table.Th>Monto</Table.Th>
                <Table.Th>Forma de Pago</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pagos.map((pago) => (
                <Table.Tr key={pago.id}>
                  <Table.Td>{pago.estudianteDni}</Table.Td>
                  <Table.Td>{pago.estudianteNombre}</Table.Td>
                  <Table.Td>{pago.programaNombre || "—"}</Table.Td>
                  <Table.Td className="caja-monto">S/. {pago.monto}</Table.Td>
                  <Table.Td>{pago.formaPago}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        pago.estado === "completado"
                          ? "green"
                          : pago.estado === "pendiente"
                          ? "yellow"
                          : "red"
                      }
                    >
                      {pago.estado}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatearFechaPeru(pago.fecha)}</Table.Td>
                  <Table.Td>
                    <Group gap="sm">
                      <Tooltip label="Editar">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => abrirModalEdicion(pago)}
                        >
                          <Edit3 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {/* Modal para registrar/editar pago */}
      <Modal
        opened={modalAbierto}
        onClose={cerrarModal}
        title={modoEdicion ? "Editar Pago" : "Registrar Nuevo Pago"}
        size="lg"
      >
        {mensaje && (
          <MantineAlert icon={<AlertCircle size={16} />} color="red" mb="md">
            {mensaje}
          </MantineAlert>
        )}

        <CajaFields
          formulario={formulario}
          setFormulario={setFormulario}
          estudiante={estudiante}
          dni={dni}
          setDni={setDni}
          buscando={buscando}
          onBuscar={buscarEstudiante}
          modoEdicion={modoEdicion}
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="light" onClick={cerrarModal}>
            Cancelar
          </Button>
          <Button onClick={guardarPago} leftSection={<CheckCircle2 size={16} />}>
            {modoEdicion ? "Actualizar" : "Registrar"}
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
