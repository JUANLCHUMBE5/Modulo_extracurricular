import {
  calcularDuracionTexto,
  fechaActualInput,
  normalizarDuracionAvisoDias,
  normalizarFecha,
} from "../../../services/dateService";
import { esProgramaCambridge } from "../utils/coordinacionProgramUtils";

export function conCuposDisponibles(programa) {
  return {
    ...programa,
    periodo: normalizarPeriodo(programa.periodo),
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    cuposDisponibles: Number(programa.cupos || 0) - Number(programa.cuposOcupados || 0),
  };
}

export function validarDatosPrograma(datos) {
  if (!String(datos.nombre || "").trim()) throw new Error("El nombre del programa es obligatorio.");
  if (!String(datos.periodo || "").trim()) throw new Error("El periodo del programa es obligatorio.");
  if (!String(datos.categoria || "").trim()) throw new Error("La categoría del programa es obligatoria.");
  const esVerano = normalizarPeriodo(datos.periodo) === "verano";
  const esCambridge = esProgramaCambridge(datos);
  if (!esVerano && !esCambridge && (!Array.isArray(datos.gradosAplicables) || datos.gradosAplicables.length === 0)) {
    throw new Error("Seleccione al menos un grado aplicable.");
  }
  if (esVerano) {
    const edadMinima = Number(datos.edadMinima);
    const edadMaxima = Number(datos.edadMaxima);
    if (!Number.isFinite(edadMinima) || !Number.isFinite(edadMaxima) || edadMinima <= 0 || edadMaxima <= 0 || edadMinima > edadMaxima) {
      throw new Error("Ingrese un rango de edades valido para ciclo verano.");
    }
  }
  if (!String(datos.horario || "").trim()) throw new Error("El horario del programa es obligatorio.");
  const duracionAviso = Number(datos.duracionAvisoDias);
  if (!Number.isInteger(duracionAviso) || duracionAviso < 1 || duracionAviso > 7) {
    throw new Error("El aviso de inscripcion debe durar entre 1 y 7 dias.");
  }
  if (!Number.isFinite(Number(datos.cupos)) || Number(datos.cupos) <= 0) {
    throw new Error("Los cupos deben ser un número positivo.");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(datos.costo || "")) || Number(datos.costo) <= 0) {
    throw new Error("Ingrese un costo válido en soles, con máximo dos decimales.");
  }
  if (!String(datos.modalidadCobro || "").trim()) throw new Error("La modalidad de cobro es obligatoria.");
  if (datos.plantilla && !datos.plantillaValidada) {
    throw new Error("La plantilla Word debe ser validada antes de guardar el programa.");
  }
}

export function debeFinalizarPorFecha(programa, hoy) {
  if (programa.estado === "Finalizado") return false;
  return programaVencido(programa, hoy);
}

export function programaVencido(programa, hoy = normalizarFecha(fechaActualInput())) {
  const fechaFin = normalizarFecha(programa.fechaFin);
  if (!fechaFin || !hoy) return false;
  return fechaFin < hoy;
}

export function normalizarPeriodo(periodo) {
  const valor = String(periodo || "").toLowerCase();
  if (valor.includes("verano")) return "verano";
  return "escolar";
}

export function validarArchivoExcelFrontend({ archivoNombre, archivo }) {
  const nombre = String(archivoNombre || archivo?.name || "");
  const nombreMinuscula = nombre.toLowerCase();

  if (!/\.(xlsx|xls)$/i.test(nombre)) throw new Error("Solo se permiten archivos .xlsx o .xls.");
  if (/\.(xlsx|xls)\.[a-z0-9]+$/i.test(nombreMinuscula)) throw new Error("El archivo tiene una extension sospechosa.");
  if (archivo.size > 5 * 1024 * 1024) throw new Error("El archivo no debe superar 5 MB.");
}

export function normalizarFila(fila) {
  return {
    codigoEstudiante: limpiarTexto(obtenerValor(fila, ["codigo_estudiante", "Código estudiante", "Código"])),
    dni: limpiarTexto(obtenerValor(fila, ["dni", "DNI", "Dni", "Documento"])),
    nombres: limpiarTexto(obtenerValor(fila, ["nombres", "Nombres", "Nombre"])),
    apellidos: limpiarTexto(obtenerValor(fila, ["apellidos", "Apellidos", "Apellido"])),
    grado: limpiarTexto(obtenerValor(fila, ["Grado"])),
    seccion: limpiarTexto(obtenerValor(fila, ["seccion", "Sección", "Sección"])).toUpperCase(),
    curso: limpiarTexto(obtenerValor(fila, ["curso_programa", "Curso / Programa", "Curso", "Programa"])),
    telefono: limpiarTexto(obtenerValor(fila, ["Teléfono apoderado", "Teléfono"])),
    correo: limpiarTexto(obtenerValor(fila, ["Correo", "Email"])),
    observacion: limpiarTexto(obtenerValor(fila, ["observacion", "Observación", "Observación"])),
    estadoAlumno: limpiarTexto(obtenerValor(fila, ["Estado"])),
  };
}

export function validarFilaCarga(fila, programaDetectado) {
  const errores = [];

  if (!/^\d{8}$/.test(fila.dni)) errores.push("DNI invalido. Debe tener 8 digitos.");
  if (!textoSeguro(fila.nombres)) errores.push("Falta nombre o contiene caracteres no permitidos.");
  if (!textoSeguro(fila.apellidos)) errores.push("Falta apellido o contiene caracteres no permitidos.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (!/^[A-Z0-9-]{1,4}$/.test(fila.seccion)) errores.push("Sección invalida.");
  if (!fila.curso) errores.push("Falta curso o programa.");
  if (fila.curso && !programaDetectado) errores.push("Curso o programa no coincide con un programa registrado del periodo.");
  if (fila.telefono && !/^\d{9}$/.test(fila.telefono)) errores.push("Teléfono invalido.");
  if (fila.correo && !correoSeguro(fila.correo)) errores.push("Correo invalido o temporal.");
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observación contiene caracteres no permitidos.");

  return errores;
}

export function textoSeguro(texto) {
  const valor = String(texto ?? "").trim();
  return valor.length > 0 && !/[<>]/.test(valor);
}

function correoSeguro(correo) {
  const valor = String(correo ?? "").trim().toLowerCase();
  const dominio = valor.split("@")[1];
  const temporales = ["tempmail.com", "10minutemail.com", "guerrillamail.com", "mailinator.com", "yopmail.com", "trashmail.com"];
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) && !temporales.includes(dominio);
}

function obtenerValor(fila, nombres) {
  const esperados = nombres.map(normalizarEncabezado);
  const key = Object.keys(fila).find((campo) =>
    esperados.includes(normalizarEncabezado(campo))
  );
  return key ? fila[key] : "";
}

export function limpiarTexto(valor) {
  return String(valor ?? "").trim().replace(/[<>]/g, "");
}

function normalizarGradoAplicableDesdeAlumno(grado = "") {
  const texto = String(grado || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  if (!nivel || !numero) return "";

  const nivelFormateado = {
    inicial: "Inicial",
    primaria: "Primaria",
    secundaria: "Secundaria",
  }[nivel];

  return nivel === "inicial" && /anos|ano/.test(texto)
    ? `${nivelFormateado}:${numero} anos`
    : `${nivelFormateado}:${numero}`;
}

export function agregarGradoProgramaDesdeAlumno(programa, gradoAlumno) {
  if (!programa) return;
  const gradoAplicable = normalizarGradoAplicableDesdeAlumno(gradoAlumno);
  if (!gradoAplicable) return;

  const normalizar = (valor) => String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const actuales = Array.isArray(programa.gradosAplicables) ? programa.gradosAplicables : [];
  const existe = actuales.some((grado) => normalizar(grado) === normalizar(gradoAplicable));
  if (!existe) {
    programa.gradosAplicables = [...actuales, gradoAplicable];
  }
}

function sincronizarGradosProgramaConInvitados(programaId) {
  const programa = apiDb.programas.find((item) => item.id === programaId);
  if (!programa) return;

  const normalizar = (valor) => String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const grados = [];
  (apiDb.invitadosPorPrograma[programaId] || []).forEach((invitado) => {
    const gradoAplicable = normalizarGradoAplicableDesdeAlumno(invitado.grado);
    if (!gradoAplicable) return;
    const existe = grados.some((grado) => normalizar(grado) === normalizar(gradoAplicable));
    if (!existe) grados.push(gradoAplicable);
  });

  if (grados.length) {
    programa.gradosAplicables = ordenarGradosAplicables(grados);
  }
}

export function ordenarGradosAplicables(grados) {
  const ordenNivel = { inicial: 0, primaria: 1, secundaria: 2 };
  const descomponer = (valor) => {
    const texto = String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
    const numero = Number(texto.match(/\d+/)?.[0] || 0);
    return { nivelOrden: ordenNivel[nivel] ?? 99, numero };
  };

  return [...grados].sort((a, b) => {
    const gradoA = descomponer(a);
    const gradoB = descomponer(b);
    if (gradoA.nivelOrden !== gradoB.nivelOrden) return gradoA.nivelOrden - gradoB.nivelOrden;
    return gradoA.numero - gradoB.numero;
  });
}

export function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `nombre:${nombre}:${alumno.grado}:${alumno.seccion}` : "";
}

function coincideCurso(curso, programa) {
  const normalizar = (texto) => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const a = normalizar(curso);
  const b = normalizar(programa);
  return a === b || a.includes(b) || b.includes(a);
}

export function detectarProgramaPorCurso(curso, programas) {
  if (!curso) return null;
  return programas.find((programa) => coincideCurso(curso, programa.nombre)) || null;
}

function normalizarEncabezado(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s/.-]+/g, "_")
    .replace(/_+/g, "_");
}
