import { useEffect, useState } from "react";
import useSidebar from "../../../hooks/useSidebar";
import {
  buscarEstudiantePorDni,
  buscarEstudiantesPorNombre,
  buscarInscripcionEstudiante,
  listarInscripcionesEstudiante,
  listarProgramasPorPeriodo,
} from "../services/secretariaService";
import { validarDni } from "../../../services/validators";
import { calcularEdadSecretaria, formularioInicial } from "../utils/secretariaRules";

export function useSecretariaSearch({ onApply, onRegisterExterno, onClearDelegatedModule } = {}) {
  const [periodo, setPeriodo] = useState("escolar");
  const [vistaActiva, setVistaActiva] = useState("inscripcion"); // "inscripcion" | "asistencias"
  const [sidebarExpanded, toggleSidebar] = useSidebar("sec");
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [dni, setDni] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [estudiante, setEstudiante] = useState(null);
  const [inscripcion, setInscripción] = useState(null);
  const [inscripcionesEstudiante, setInscripcionesEstudiante] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [resultadosNombre, setResultadosNombre] = useState([]);
  const [registroDesdeLista, setRegistroDesdeLista] = useState(false);

  const esCicloVerano = periodo === "verano";

  useEffect(() => {
    listarProgramasPorPeriodo(periodo).then(setProgramas);
    setEstudiante(null);
    setInscripción(null);
    setInscripcionesEstudiante([]);
    setMensaje("");
  }, [periodo]);

  useEffect(() => {
    async function refrescarDesdeBase() {
      if (validarDni(dni)) {
        const encontrado = await buscarEstudiantePorDni(dni, periodo);
        if (encontrado) {
          setEstudiante(encontrado);
          const registro = await buscarInscripcionEstudiante(encontrado, periodo);
          setInscripción(registro);
          setInscripcionesEstudiante(await listarInscripcionesEstudiante(encontrado, periodo));
          const programasActualizados = await listarProgramasPorPeriodo(periodo, encontrado.grado || "", calcularEdadSecretaria(encontrado, formularioInicial));
          setProgramas(programasActualizados);
          return;
        }
      }

      const programasActualizados = await listarProgramasPorPeriodo(periodo);
      setProgramas(programasActualizados);
    }

    const handleMockDbUpdated = (e) => {
      const mod = e.detail?.modulo;
      if (!mod || mod === "secretaria" || mod === "global") refrescarDesdeBase();
    };

    window.addEventListener("mock-db-updated", handleMockDbUpdated);
    window.addEventListener("api-db-updated", refrescarDesdeBase);
    window.addEventListener("storage", refrescarDesdeBase);

    return () => {
      window.removeEventListener("mock-db-updated", handleMockDbUpdated);
      window.removeEventListener("api-db-updated", refrescarDesdeBase);
      window.removeEventListener("storage", refrescarDesdeBase);
    };
  }, [periodo, dni]);

  async function cargarProgramasDelPeriodo(gradoAlumno = estudiante?.grado || "", edadAlumno = 0) {
    const programasActualizados = await listarProgramasPorPeriodo(periodo, gradoAlumno, edadAlumno);
    setProgramas(programasActualizados);
    return programasActualizados;
  }

  async function buscarEstudiante(event) {
    event.preventDefault();
    await consultarEstudiante();
  }

  async function aplicarEstudianteEncontrado(encontrado, iniciarRegistro = false, desdeLista = false) {
    setRegistroDesdeLista(desdeLista);
    const registroExistente = await buscarInscripcionEstudiante(encontrado, periodo);
    const registrosExistentes = await listarInscripcionesEstudiante(encontrado, periodo);
    const programasCompatibles = await listarProgramasPorPeriodo(periodo, encontrado.grado || "", calcularEdadSecretaria(encontrado, formularioInicial));
    setProgramas(programasCompatibles);

    const estadoRegistro = registroExistente?.estadoInscripción || registroExistente?.estadoInscripción;
    const studentData = {
      ...encontrado,
      estadoInscripción: estadoRegistro || encontrado.estadoInscripcion || encontrado.estadoInscripcion || "No inscrito",
      estadoPago: registroExistente?.estadoPago || encontrado.estadoPago,
    };

    setEstudiante(studentData);
    setInscripción(registroExistente);
    setInscripcionesEstudiante(registrosExistentes);

    if (onApply) {
      await onApply(studentData, registroExistente, programasCompatibles, iniciarRegistro);
    }
  }

  async function consultarEstudiante() {
    setInscripción(null);
    setInscripcionesEstudiante([]);
    setResultadosNombre([]);
    const busqueda = String(dni || "").trim();
    const dniLimpio = busqueda.replace(/\D/g, "");

    try {
      if (!validarDni(dniLimpio)) {
        await cargarProgramasDelPeriodo();
        if (busqueda.length >= 3) {
          setBuscando(true);
          const resultados = await buscarEstudiantesPorNombre(busqueda, periodo);
          setBuscando(false);

          if (resultados.length >= 1) {
            setEstudiante(null);
            setResultadosNombre(resultados);
            setMensaje("");
            return;
          } else {
            setEstudiante(null);
            setMensaje("No se encontraron estudiantes con ese nombre en este periodo.");
            return;
          }
        }

        setEstudiante(null);
        setMensaje("Ingrese un DNI válido de 8 números o al menos 3 letras del nombre.");
        return;
      }

      setBuscando(true);
      const encontrado = await buscarEstudiantePorDni(dniLimpio, periodo);
      setBuscando(false);

      if (!encontrado) {
        if (periodo !== "verano") {
          setEstudiante(null);
          setMensaje("No se encontro al estudiante. El alumno externo solo puede registrarse en ciclo verano.");
          return;
        }

        if (onRegisterExterno) {
          await onRegisterExterno(dniLimpio);
        }
        return;
      }

      setDni(dniLimpio);
      await aplicarEstudianteEncontrado(encontrado, true, false);
    } catch (error) {
      setEstudiante(null);
      setMensaje(error.message || "No se pudo consultar el estudiante. Verifique la conexion con la base local.");
    } finally {
      setBuscando(false);
    }
  }

  function limpiarBusquedaEstudiante() {
    setDni("");
    setMensaje("");
    setEstudiante(null);
    setInscripción(null);
    setInscripcionesEstudiante([]);
    setResultadosNombre([]);
  }

  return {
    periodo,
    setPeriodo,
    vistaActiva,
    setVistaActiva,
    sidebarExpanded,
    toggleSidebar,
    menuAbierto,
    setMenuAbierto,
    dni,
    setDni,
    mensaje,
    setMensaje,
    estudiante,
    setEstudiante,
    inscripcion,
    setInscripción,
    inscripcionesEstudiante,
    setInscripcionesEstudiante,
    programas,
    setProgramas,
    buscando,
    setBuscando,
    resultadosNombre,
    setResultadosNombre,
    registroDesdeLista,
    setRegistroDesdeLista,
    esCicloVerano,
    buscarEstudiante,
    consultarEstudiante,
    cargarProgramasDelPeriodo,
    aplicarEstudianteEncontrado,
    limpiarBusquedaEstudiante,
  };
}
