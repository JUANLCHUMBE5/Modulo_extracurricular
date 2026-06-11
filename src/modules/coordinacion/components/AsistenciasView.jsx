import { useState, useMemo, useEffect } from "react";
import {
  Alert as MantineAlert,
  Select,
  Button,
  Table,
  Badge,
  Group,
  Loader,
  Paper,
  ActionIcon,
  Tooltip,
  SegmentedControl,
} from "@mantine/core";
import {
  IconCalendar as CalendarDays,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconFileDownload as FileDown,
  IconUserCheck as UserCheck,
  IconAlertCircle as AlertCircle,
  IconLoader2 as Loader2,
  IconX as X,
} from "@tabler/icons-react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { apiDb } from "../../../services/dbApi";
import {
  agruparAsistenciasPorFecha,
  badgeStyle,
  calcularEdad,
  claveFechaAsistencia,
  formatearFechaAsistencia,
  formatearHoraAsistencia,
  normalizarNombreArchivoPdf,
  obtenerDniAsistencia,
  obtenerEstadoAccesoAsistencia,
  obtenerFechaAsistencia,
  obtenerNombreAsistencia,
} from "../utils/asistenciasFormatters";

// Helper styles matching AlumnosProgramaModal
function AsistenciasView({ programas = [], listarAsistenciasPrograma, listarMatriculados }) {
  const [tallerId, setTallerId] = useState("");
  const [asistencias, setAsistencias] = useState([]);
  const [matriculados, setMatriculados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [vistaTipo, setVistaTipo] = useState("diario"); // "diario" | "mensual"

  // Fetch asistencias and matriculados whenever selected tallerId changes
  useEffect(() => {
    if (!tallerId) {
      setAsistencias([]);
      setMatriculados([]);
      setFechaSeleccionada("");
      return;
    }

    const cargarDatosTaller = async () => {
      setCargando(true);
      setMensaje("");
      try {
        const [asistResult, matricResult] = await Promise.all([
          listarAsistenciasPrograma(tallerId),
          listarMatriculados(tallerId)
        ]);
        setAsistencias(asistResult || []);
        setMatriculados(matricResult || []);
        setFechaSeleccionada(""); // Reset date selection
      } catch (err) {
        setAsistencias([]);
        setMatriculados([]);
        setMensaje(err.message || "No se pudieron cargar los datos de asistencia.");
        setTipoMsg("error");
      } finally {
        setCargando(false);
      }
    };

    cargarDatosTaller();
  }, [tallerId, listarAsistenciasPrograma, listarMatriculados]);

  const programaSeleccionado = useMemo(() => {
    return programas.find((p) => p.id === tallerId);
  }, [tallerId, programas]);

  // Group fetched attendance data by date (newest first for dropdown)
  const gruposFecha = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.values(agrupado).sort((a, b) => b.clave.localeCompare(a.clave));
  }, [asistencias]);

  // Chronological dates list for the monthly matrix
  const fechasColumnas = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.keys(agrupado)
      .sort((a, b) => a.localeCompare(b))
      .map((clave) => {
        const [year, month, day] = clave.split("-");
        return {
          clave,
          labelDDMM: `${day}/${month}`,
          titulo: agrupado[clave].titulo,
        };
      });
  }, [asistencias]);

  // Attendance lookup map helper
  const checkMap = useMemo(() => {
    const map = new Set();
    asistencias.forEach((asist) => {
      const dateKey = claveFechaAsistencia(obtenerFechaAsistencia(asist));
      const dni = obtenerDniAsistencia(asist);
      if (dni && dateKey) {
        map.add(`${dni}:${dateKey}`);
      }
    });
    return map;
  }, [asistencias]);

  // Sort matriculados alphabetically
  const matriculadosOrdenados = useMemo(() => {
    return [...matriculados].sort((a, b) =>
      String(a.nombres || a.nombresEstudiante || "").localeCompare(String(b.nombres || b.nombresEstudiante || ""))
    );
  }, [matriculados]);

  // Active date group for daily view
  const grupoActivo = useMemo(() => {
    if (!gruposFecha.length) return null;
    return gruposFecha.find((g) => g.clave === fechaSeleccionada) || gruposFecha[0];
  }, [gruposFecha, fechaSeleccionada]);

  // Set active date key when active group changes
  useEffect(() => {
    if (grupoActivo && !fechaSeleccionada) {
      setFechaSeleccionada(grupoActivo.clave);
    }
  }, [grupoActivo, fechaSeleccionada]);

  const indiceActivo = useMemo(() => {
    if (!grupoActivo) return -1;
    return gruposFecha.findIndex((g) => g.clave === grupoActivo.clave);
  }, [gruposFecha, grupoActivo]);

  const irAnterior = () => {
    if (indiceActivo < gruposFecha.length - 1) {
      setFechaSeleccionada(gruposFecha[indiceActivo + 1].clave);
    }
  };

  const irSiguiente = () => {
    if (indiceActivo > 0) {
      setFechaSeleccionada(gruposFecha[indiceActivo - 1].clave);
    }
  };

  // Excel Export Handler (Daily View)
  const handleExportExcelDaily = async () => {
    if (!programaSeleccionado || (!grupoActivo && asistencias.length > 0)) return;
    if (asistencias.length === 0 && !hasMatriculados) return;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Colegio San Rafael";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Asistencia");

      // Columns
      worksheet.columns = [
        { header: "N°", key: "nro", width: 6 },
        { header: "Hora", key: "hora", width: 12 },
        { header: "DNI", key: "dni", width: 15 },
        { header: "Código", key: "codigo", width: 15 },
        { header: "Estudiante", key: "nombres", width: 35 },
        { header: "Pago", key: "pago", width: 15 },
        { header: "Acceso", key: "acceso", width: 15 },
        { header: "Observación", key: "observacion", width: 30 },
      ];

      // Rows
      let rows;
      if (grupoActivo) {
        rows = grupoActivo.filas.map((asist, idx) => {
          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));

          return {
            nro: idx + 1,
            hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
            dni: obtenerDniAsistencia(asist) || "Sin DNI",
            codigo: asist.codigoEstudiante || "—",
            nombres: obtenerNombreAsistencia(asist) || "—",
            pago: asist.estadoPago || "Pendiente",
            acceso: textoAcceso,
            observacion: asist.observacion || "—",
          };
        });
      } else {
        // Template mode
        rows = matriculadosOrdenados.map((alumno, idx) => {
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(alumno.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");

          return {
            nro: idx + 1,
            hora: "—",
            dni: alumno.dni || alumno.dniEstudiante || "Sin DNI",
            codigo: alumno.codigoEstudiante || "—",
            nombres: alumno.nombres || alumno.nombresEstudiante || "—",
            pago: alumno.estadoPago || "Pendiente",
            acceso: textoAcceso,
            observacion: "", // Blank for physical writing/signature
          };
        });
      }

      worksheet.addRows(rows);

      // Header styling
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176C60" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      worksheet.eachRow((row, rowNum) => {
        if (rowNum > 1) {
          row.height = 20;
        }
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle" };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateSuffix = grupoActivo ? grupoActivo.clave : "PLANTILLA";
      link.download = `Asistencia_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}_${dateSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar a Excel.");
      setTipoMsg("error");
    }
  };

  // PDF Export Handler (Daily View)
  const handleExportPdfDaily = () => {
    if (!programaSeleccionado || (!grupoActivo && asistencias.length > 0)) return;
    if (asistencias.length === 0 && !hasMatriculados) return;

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margen = 14;
      const anchoPagina = doc.internal.pageSize.getWidth();
      const altoPagina = doc.internal.pageSize.getHeight();
      let y = 16;

      const isTemplate = !grupoActivo;
      const subtitle = isTemplate
        ? "Plantilla de Control Físico (Sin asistencias registradas)"
        : `Fecha de asistencia: ${grupoActivo.titulo}`;

      doc.setTextColor(23, 108, 96);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("REPORTE DE ASISTENCIA DIARIA", anchoPagina / 2, y, { align: "center" });
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(82, 97, 115);
      doc.text(subtitle, anchoPagina / 2, y, { align: "center" });
      y += 10;

      // Box details
      doc.setDrawColor(216, 229, 226);
      doc.setFillColor(248, 252, 251);
      doc.roundedRect(margen, y, anchoPagina - margen * 2, 24, 3, 3, "FD");
      y += 6;

      const datosProg = [
        ["Taller", programaSeleccionado.nombre || "Sin nombre"],
        ["Código", programaSeleccionado.id || "Sin código"],
        ["Docente", programaSeleccionado.responsable || "No asignado"],
        ["Horario", programaSeleccionado.horario || "Por definir"],
      ];

      datosProg.forEach(([label, value], idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = margen + 5 + col * 91;
        const yy = y + row * 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(82, 97, 115);
        doc.text(label.toUpperCase(), x, yy);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(24, 33, 47);
        doc.text(String(value || "-"), x, yy + 3.8);
      });

      y += 26;

      // Grid header
      doc.setFillColor(234, 246, 242);
      doc.setDrawColor(216, 229, 226);
      doc.roundedRect(margen, y, anchoPagina - margen * 2, 8, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(23, 108, 96);
      doc.text("#", margen + 2, y + 5.3);
      doc.text("HORA", margen + 8, y + 5.3);
      doc.text("DNI", margen + 22, y + 5.3);
      doc.text("ESTUDIANTE", margen + 45, y + 5.3);
      doc.text("PAGO", margen + 115, y + 5.3);
      doc.text("ACCESO", margen + 140, y + 5.3);
      doc.text(isTemplate ? "FIRMA / NOTAS" : "OBSERVACIÓN", margen + 165, y + 5.3);
      y += 12;

      const itemsToExport = grupoActivo ? grupoActivo.filas : matriculadosOrdenados;

      itemsToExport.forEach((item, idx) => {
        if (y > altoPagina - 18) {
          doc.addPage();
          y = 16;
          doc.setFillColor(234, 246, 242);
          doc.setDrawColor(216, 229, 226);
          doc.roundedRect(margen, y, anchoPagina - margen * 2, 8, 2, 2, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(23, 108, 96);
          doc.text("#", margen + 2, y + 5.3);
          doc.text("HORA", margen + 8, y + 5.3);
          doc.text("DNI", margen + 22, y + 5.3);
          doc.text("ESTUDIANTE", margen + 45, y + 5.3);
          doc.text("PAGO", margen + 115, y + 5.3);
          doc.text("ACCESO", margen + 140, y + 5.3);
          doc.text(isTemplate ? "FIRMA / NOTAS" : "OBSERVACIÓN", margen + 165, y + 5.3);
          y += 12;
        }

        let hora, dni, nombre, pago, acceso, obs;

        if (grupoActivo) {
          hora = formatearHoraAsistencia(obtenerFechaAsistencia(item));
          dni = obtenerDniAsistencia(item) || "Sin DNI";
          nombre = obtenerNombreAsistencia(item) || "—";
          pago = item.estadoPago || "Pendiente";
          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(item);
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
          acceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");
          obs = item.observacion || "—";
        } else {
          hora = "—";
          dni = item.dni || item.dniEstudiante || "Sin DNI";
          nombre = item.nombres || item.nombresEstudiante || "—";
          pago = item.estadoPago || "Pendiente";
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(item.estadoPago).toLowerCase());
          acceso = esAccesoPermitido ? "Permitido" : (String(item.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");
          obs = "_________________";
        }

        doc.setDrawColor(237, 242, 245);
        doc.line(margen, y - 2, anchoPagina - margen, y - 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(24, 33, 47);

        doc.text(String(idx + 1), margen + 2, y + 3);
        doc.text(hora, margen + 8, y + 3);
        doc.text(dni, margen + 22, y + 3);
        doc.text(doc.splitTextToSize(nombre, 65), margen + 45, y + 3);
        doc.text(pago, margen + 115, y + 3);
        doc.text(acceso, margen + 140, y + 3);
        doc.text(doc.splitTextToSize(obs, 25), margen + 165, y + 3);

        const altoFila = Math.max(8, doc.splitTextToSize(nombre, 65).length * 4.2 + 4);
        y += altoFila;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(82, 97, 115);
      const countLabel = isTemplate
        ? `Total de alumnos matriculados: ${matriculados.length}`
        : `Total de alumnos registrados hoy: ${grupoActivo.filas.length}`;
      doc.text(countLabel, margen, altoPagina - 10);
      const fileSuffix = isTemplate ? "plantilla" : grupoActivo.clave;
      doc.save(`asistencia_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}_${fileSuffix}.pdf`);
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar a PDF.");
      setTipoMsg("error");
    }
  };

  // Excel Export Handler (Monthly Matrix View)
  const handleExportExcelMonthly = async () => {
    if (!programaSeleccionado || !matriculados.length) return;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Colegio San Rafael";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Registro Mensual");

      // Setup static columns
      const cols = [
        { header: "N°", key: "nro", width: 6 },
        { header: "Apellidos y Nombres", key: "nombres", width: 35 },
        { header: "Edad", key: "edad", width: 12 },
        { header: "N° Teléfono", key: "telefono", width: 18 },
      ];

      // Add dynamic or template date columns
      if (fechasColumnas.length > 0) {
        fechasColumnas.forEach((fechaCol) => {
          cols.push({ header: fechaCol.labelDDMM, key: fechaCol.clave, width: 10 });
        });
      } else {
        for (let i = 1; i <= 5; i++) {
          cols.push({ header: `Clase ${i}`, key: `clase_${i}`, width: 12 });
        }
      }

      worksheet.columns = cols;

      // Add student data rows
      const rows = matriculadosOrdenados.map((alumno, idx) => {
        const birthdate = alumno.fechaNacimiento || (apiDb.estudiantes && apiDb.estudiantes[alumno.dni]?.fechaNacimiento);
        const edad = birthdate ? calcularEdad(birthdate) : "—";
        const rowData = {
          nro: idx + 1,
          nombres: alumno.nombres || alumno.nombresEstudiante || "—",
          edad,
          telefono: alumno.telefono || "—",
        };
        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol) => {
            rowData[fechaCol.clave] = checkMap.has(`${alumno.dni}:${fechaCol.clave}`) ? "✓" : "—";
          });
        } else {
          for (let i = 1; i <= 5; i++) {
            rowData[`clase_${i}`] = "—";
          }
        }
        return rowData;
      });

      worksheet.addRows(rows);

      // Styles
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176C60" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      worksheet.eachRow((row, rowNum) => {
        if (rowNum > 1) {
          row.height = 20;
        }
        row.eachCell((cell, colNum) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle", horizontal: colNum > 4 ? "center" : "left" };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileSuffix = fechasColumnas.length > 0 ? "" : "_Plantilla";
      link.download = `Consolidado_Asistencias_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}${fileSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar consolidado a Excel.");
      setTipoMsg("error");
    }
  };

  // PDF Export Handler (Monthly Matrix View - Landscape)
  const handleExportPdfMonthly = () => {
    if (!programaSeleccionado || !matriculados.length) return;

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margen = 14;
      const anchoPagina = doc.internal.pageSize.getWidth();
      const altoPagina = doc.internal.pageSize.getHeight();
      let y = 16;

      doc.setTextColor(23, 108, 96);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("CONTROL DE ASISTENCIA MENSUAL", anchoPagina / 2, y, { align: "center" });
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(82, 97, 115);
      doc.text("IEP SAN RAFAEL - IEP San Rafael S.A.C.", anchoPagina / 2, y, { align: "center" });
      y += 8;

      // Workshop details header block
      doc.setDrawColor(216, 229, 226);
      doc.setFillColor(248, 252, 251);
      doc.roundedRect(margen, y, anchoPagina - margen * 2, 14, 3, 3, "FD");
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(82, 97, 115);
      doc.text("TALLER:", margen + 5, y);
      doc.text("DOCENTE:", margen + 105, y);
      doc.text("HORARIO:", margen + 205, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(24, 33, 47);
      doc.text(programaSeleccionado.nombre || "—", margen + 20, y);
      doc.text(programaSeleccionado.responsable || "—", margen + 122, y);
      doc.text(programaSeleccionado.horario || "—", margen + 222, y);

      y += 15;

      // Horizontal spacing widths
      const colWidths = {
        nro: 10,
        nombres: 80,
        edad: 18,
        telefono: 32,
        fecha: 12,
      };

      const dibujarEncabezadoMatriz = (yy) => {
        doc.setFillColor(234, 246, 242);
        doc.setDrawColor(216, 229, 226);
        doc.roundedRect(margen, yy, anchoPagina - margen * 2, 8, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(23, 108, 96);

        let cx = margen + 2;
        doc.text("#", cx, yy + 5.3);
        cx += colWidths.nro;
        doc.text("APELLIDOS Y NOMBRES", cx, yy + 5.3);
        cx += colWidths.nombres;
        doc.text("EDAD", cx, yy + 5.3);
        cx += colWidths.edad;
        doc.text("TELÉFONO", cx, yy + 5.3);
        cx += colWidths.telefono;

        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol) => {
            doc.text(fechaCol.labelDDMM, cx + 1, yy + 5.3);
            cx += colWidths.fecha;
          });
        } else {
          for (let i = 1; i <= 5; i++) {
            doc.text(`CLASE ${i}`, cx + 1, yy + 5.3);
            cx += colWidths.fecha;
          }
        }

        return yy + 12;
      };

      // Draw checkmark vector helper
      const dibujarCheck = (pdfDoc, xCheck, yCheck) => {
        pdfDoc.setLineWidth(0.35);
        pdfDoc.setDrawColor(18, 184, 134); // Teal/green color
        pdfDoc.line(xCheck, yCheck + 1.2, xCheck + 1.2, yCheck + 2.5);
        pdfDoc.line(xCheck + 1.2, yCheck + 2.5, xCheck + 3.2, yCheck - 0.5);
        pdfDoc.setLineWidth(0.1); // Restore standard thickness
      };

      y = dibujarEncabezadoMatriz(y);

      matriculadosOrdenados.forEach((alumno, idx) => {
        if (y > altoPagina - 18) {
          doc.addPage();
          y = 16;
          y = dibujarEncabezadoMatriz(y);
        }

        const birthdate = alumno.fechaNacimiento || (apiDb.estudiantes && apiDb.estudiantes[alumno.dni]?.fechaNacimiento);
        const edad = birthdate ? calcularEdad(birthdate) : "—";
        const telefono = alumno.telefono || "—";

        doc.setDrawColor(237, 242, 245);
        doc.line(margen, y - 2, anchoPagina - margen, y - 2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(24, 33, 47);

        let cx = margen + 2;
        doc.text(String(idx + 1), cx, y + 3);
        cx += colWidths.nro;
        doc.text(doc.splitTextToSize(alumno.nombres || alumno.nombresEstudiante || "", 75), cx, y + 3);
        cx += colWidths.nombres;
        doc.text(edad, cx, y + 3);
        cx += colWidths.edad;
        doc.text(telefono, cx, y + 3);
        cx += colWidths.telefono;

        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol) => {
            const asistio = checkMap.has(`${alumno.dni}:${fechaCol.clave}`);
            if (asistio) {
              dibujarCheck(doc, cx + 2, y + 1);
            } else {
              doc.text("—", cx + 3, y + 3);
            }
            cx += colWidths.fecha;
          });
        } else {
          for (let i = 1; i <= 5; i++) {
            doc.text("—", cx + 3, y + 3);
            cx += colWidths.fecha;
          }
        }

        const altoFila = Math.max(8, doc.splitTextToSize(alumno.nombres || alumno.nombresEstudiante || "", 75).length * 4.2 + 4);
        y += altoFila;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(82, 97, 115);
      doc.text(`Matriculados: ${matriculados.length} alumnos`, margen, altoPagina - 10);
      const fileSuffix = fechasColumnas.length > 0 ? "" : "_plantilla";
      doc.save(`consolidado_asistencias_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}${fileSuffix}.pdf`);
    } catch (err) {
      setMensaje(err.message || "No se pudo exportar consolidado a PDF.");
      setTipoMsg("error");
    }
  };

  const selectProgramasData = useMemo(() => {
    return programas.map((prog) => ({
      value: prog.id,
      label: `${prog.id} - ${prog.nombre}`,
    }));
  }, [programas]);

  const selectFechasData = useMemo(() => {
    return gruposFecha.map((grupo) => ({
      value: grupo.clave,
      label: `${grupo.titulo} (${grupo.filas.length} asistencia${grupo.filas.length === 1 ? "" : "s"})`,
    }));
  }, [gruposFecha]);

  const hasMatriculados = matriculados.length > 0;
  const hasAsistencias = asistencias.length > 0;

  return (
    <>
      <header className="coord-topbar">
        <span className="coord-topbar-eyebrow">Gestión académica</span>
        <h1>Asistencia y Control</h1>
      </header>

      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <span className="coord-title-icon"><UserCheck size={21} /></span>
            <div>
              <h2>Control Central de Asistencias</h2>
              <p>Consulte y descargue reportes diarios de asistencia por cada programa.</p>
            </div>
          </div>

          <div className="coord-filtros-card-mantine" style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
            <div className="coord-filtros-row-mantine" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "16px" }}>
              {/* Taller */}
              <div style={{ flex: "2 1 280px" }}>
                <Select
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      <UserCheck size={14} style={{ color: "#176c60" }} /> Seleccionar Taller
                    </span>
                  }
                  placeholder="Elija un programa..."
                  value={tallerId}
                  onChange={(value) => setTallerId(value || "")}
                  data={selectProgramasData}
                  size="md"
                  searchable
                  clearable
                  style={{ width: "100%" }}
                />
              </div>

              {/* Fecha selector - visible only in daily mode */}
              {vistaTipo === "diario" && (
                <div style={{ flex: "1 1 240px" }}>
                  <Select
                    label={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                        <CalendarDays size={14} style={{ color: "#176c60" }} /> Fecha
                      </span>
                    }
                    placeholder={tallerId ? (selectFechasData.length ? "Seleccione una fecha..." : "Sin asistencias") : "Elija un taller primero"}
                    value={fechaSeleccionada}
                    onChange={(value) => setFechaSeleccionada(value || "")}
                    data={selectFechasData}
                    size="md"
                    disabled={!tallerId || !selectFechasData.length}
                    style={{ width: "100%" }}
                    allowDeselect={false}
                  />
                </div>
              )}

              {/* Export Buttons */}
              {tallerId && hasMatriculados && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
                  {vistaTipo === "diario" && (
                    <>
                      <Button
                        color="sanrafael"
                        onClick={handleExportPdfDaily}
                        leftSection={<FileDown size={17} />}
                        size="md"
                        style={{ height: "42px" }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        color="teal"
                        onClick={handleExportExcelDaily}
                        leftSection={<FileDown size={17} />}
                        size="md"
                        style={{ height: "42px", background: "#f0fdf4" }}
                      >
                        Excel
                      </Button>
                    </>
                  )}
                  {vistaTipo === "mensual" && (
                    <>
                      <Button
                        color="sanrafael"
                        onClick={handleExportPdfMonthly}
                        leftSection={<FileDown size={17} />}
                        size="md"
                        style={{ height: "42px" }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        color="teal"
                        onClick={handleExportExcelMonthly}
                        leftSection={<FileDown size={17} />}
                        size="md"
                        style={{ height: "42px", background: "#f0fdf4" }}
                      >
                        Excel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {mensaje && (
            <MantineAlert
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={<AlertCircle size={18} />}
              style={{ marginBottom: "16px" }}
            >
              {mensaje}
            </MantineAlert>
          )}

          {tallerId && !cargando && (
            <SegmentedControl
              value={vistaTipo}
              onChange={setVistaTipo}
              data={[
                { label: "Asistencia Diaria", value: "diario" },
                { label: "Consolidado Mensual (Matriz)", value: "mensual" },
              ]}
              color="teal"
              style={{ marginBottom: "16px" }}
            />
          )}

          {cargando ? (
            <div className="coord-loading" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader color="teal" />
            </div>
          ) : !tallerId ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
              <UserCheck size={48} style={{ color: "#94a3b8", marginBottom: "12px" }} />
              <h3 style={{ color: "#475569", margin: 0 }}>Seleccione un taller</h3>
              <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Elija un taller del listado para comenzar a explorar las asistencias.</p>
            </div>
          ) : (asistencias.length === 0 && !hasMatriculados) ? (
            <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
              <AlertCircle size={48} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
              <h3 style={{ color: "#475569", margin: 0 }}>Sin registros de asistencia</h3>
              <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Este taller no cuenta con alumnos matriculados ni asistencias registradas.</p>
            </div>
          ) : vistaTipo === "diario" ? (
            (grupoActivo || (asistencias.length === 0 && hasMatriculados)) ? (
              <div style={{ marginTop: "8px" }}>
                {asistencias.length === 0 && (
                  <MantineAlert color="teal" radius="md" style={{ marginBottom: "16px" }}>
                    <strong>Plantilla de asistencia:</strong> Mostrando los estudiantes matriculados. Aún no se han registrado asistencias para este taller. Puede descargar el listado en PDF o Excel.
                  </MantineAlert>
                )}
                {/* Pagination-style Date Picker Bar */}
                {grupoActivo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between", flexWrap: "wrap", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Navegar Fechas:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={irAnterior}
                        disabled={indiceActivo >= gruposFecha.length - 1}
                        title="Día anterior"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          border: "1px solid #d0d5dd",
                          background: "#ffffff",
                          color: "#344054",
                          cursor: indiceActivo >= gruposFecha.length - 1 ? "not-allowed" : "pointer",
                          opacity: indiceActivo >= gruposFecha.length - 1 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", padding: "0 10px" }}>
                        {grupoActivo.titulo}
                      </span>
                      <button
                        type="button"
                        onClick={irSiguiente}
                        disabled={indiceActivo <= 0}
                        title="Día siguiente"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          border: "1px solid #d0d5dd",
                          background: "#ffffff",
                          color: "#344054",
                          cursor: indiceActivo <= 0 ? "not-allowed" : "pointer",
                          opacity: indiceActivo <= 0 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <Badge color="sanrafael" size="md">
                      {grupoActivo.filas.length} alumno{grupoActivo.filas.length === 1 ? "" : "s"} registrados hoy
                    </Badge>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#344054" }}>Fecha:</span>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b" }}>
                      Plantilla de control físico (Sin registros de asistencia)
                    </span>
                    <Badge color="teal" size="md">
                      {matriculados.length} alumno{matriculados.length === 1 ? "" : "s"} matriculados
                    </Badge>
                  </div>
                )}

                {/* Table */}
                <div className="coord-table-wrap">
                  <table className="coord-table">
                    <thead>
                      <tr>
                        {grupoActivo && <th>Hora</th>}
                        <th>DNI</th>
                        <th>Código</th>
                        <th>Estudiante</th>
                        <th>Pago</th>
                        <th>Acceso</th>
                        <th>{grupoActivo ? "Observación" : "Observación / Firma"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupoActivo ? (
                        grupoActivo.filas.map((asist, index) => {
                          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
                          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
                          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));
                          const toneAcceso = String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "warning" : "error";

                          return (
                            <tr key={`${asist.id || obtenerDniAsistencia(asist) || obtenerNombreAsistencia(asist)}-${index}`}>
                              <td>{formatearHoraAsistencia(obtenerFechaAsistencia(asist))}</td>
                              <td>{obtenerDniAsistencia(asist) || "Sin DNI"}</td>
                              <td>{asist.codigoEstudiante || "—"}</td>
                              <td><strong>{obtenerNombreAsistencia(asist) || "—"}</strong></td>
                              <td>
                                <span style={badgeStyle(String(asist.estadoPago).toLowerCase() === "pagado", "warning")}>
                                  {asist.estadoPago || "Pendiente"}
                                </span>
                              </td>
                              <td>
                                <span style={badgeStyle(esAccesoPermitido, toneAcceso)}>
                                  {textoAcceso}
                                </span>
                              </td>
                              <td>{asist.observacion || "—"}</td>
                            </tr>
                          );
                        })
                      ) : (
                        matriculadosOrdenados.map((alumno, index) => {
                          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
                          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(alumno.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");

                          return (
                            <tr key={`${alumno.dni || alumno.id || index}-${index}`}>
                              <td>{alumno.dni || alumno.dniEstudiante || "Sin DNI"}</td>
                              <td>{alumno.codigoEstudiante || "—"}</td>
                              <td><strong>{alumno.nombres || alumno.nombresEstudiante || "—"}</strong></td>
                              <td>
                                <span style={badgeStyle(String(alumno.estadoPago).toLowerCase() === "pagado", "warning")}>
                                  {alumno.estadoPago || "Pendiente"}
                                </span>
                              </td>
                              <td>
                                <span style={badgeStyle(esAccesoPermitido, "warning")}>
                                  {textoAcceso}
                                </span>
                              </td>
                              <td><span style={{ color: "#cbd5e1" }}>_________________</span></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null
          ) : (
            // Monthly Matrix view (matches physical binder sheet)
            <div style={{ marginTop: "8px" }}>
              {!hasMatriculados ? (
                <div className="coord-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px" }}>
                  <AlertCircle size={32} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
                  <p style={{ color: "#64748b" }}>No hay alumnos matriculados en este taller para generar el consolidado mensual.</p>
                </div>
              ) : (
                <>
                  {asistencias.length === 0 && (
                    <MantineAlert color="teal" radius="md" style={{ marginBottom: "16px" }}>
                      <strong>Plantilla de consolidado mensual:</strong> Aún no se han registrado asistencias para este taller. Se muestran las columnas vacías para control manual. Puede exportarla en PDF o Excel.
                    </MantineAlert>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b" }}>
                      Consolidado mensual de asistencias registradas por el auxiliar.
                    </span>
                    <Badge color="sanrafael" size="md">
                      {fechasColumnas.length > 0 ? `${fechasColumnas.length} fechas registradas` : "Plantilla de control físico"}
                    </Badge>
                  </div>

                  <div className="coord-table-wrap" style={{ overflowX: "auto" }}>
                    <table className="coord-table" style={{ tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "50px", textAlign: "center" }}>N°</th>
                          <th style={{ minWidth: "220px" }}>Apellidos y Nombres</th>
                          <th style={{ width: "80px", textAlign: "center" }}>Edad</th>
                          <th style={{ minWidth: "120px" }}>Teléfono</th>
                          {fechasColumnas.length > 0 ? (
                            fechasColumnas.map((fechaCol) => (
                              <th
                                key={fechaCol.clave}
                                style={{
                                  width: "60px",
                                  textAlign: "center",
                                  padding: "6px",
                                  fontSize: "11px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fechaCol.labelDDMM}
                              </th>
                            ))
                          ) : (
                            [1, 2, 3, 4, 5].map((num) => (
                              <th
                                key={`blank-${num}`}
                                style={{
                                  width: "70px",
                                  textAlign: "center",
                                  padding: "6px",
                                  fontSize: "11px",
                                  whiteSpace: "nowrap",
                                  color: "#94a3b8",
                                }}
                              >
                                Clase {num}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {matriculadosOrdenados.map((alumno, index) => {
                          const birthdate = alumno.fechaNacimiento || (apiDb.estudiantes && apiDb.estudiantes[alumno.dni]?.fechaNacimiento);
                          const edad = birthdate ? calcularEdad(birthdate) : "—";
                          
                          return (
                            <tr key={alumno.dni || index}>
                              <td style={{ textAlign: "center" }}>{index + 1}</td>
                              <td><strong>{alumno.nombres || alumno.nombresEstudiante || "—"}</strong></td>
                              <td style={{ textAlign: "center" }}>{edad}</td>
                              <td>{alumno.telefono || "—"}</td>
                              {fechasColumnas.length > 0 ? (
                                fechasColumnas.map((fechaCol) => {
                                  const asistio = checkMap.has(`${alumno.dni}:${fechaCol.clave}`);
                                  return (
                                    <td
                                      key={fechaCol.clave}
                                      style={{
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        color: asistio ? "#12b886" : "#ced4da",
                                        fontSize: "16px",
                                      }}
                                    >
                                      {asistio ? "✓" : "—"}
                                    </td>
                                  );
                                })
                              ) : (
                                [1, 2, 3, 4, 5].map((num) => (
                                  <td
                                    key={`blank-${num}`}
                                    style={{
                                      textAlign: "center",
                                      color: "#cbd5e1",
                                    }}
                                  >
                                    —
                                  </td>
                                ))
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default AsistenciasView;
