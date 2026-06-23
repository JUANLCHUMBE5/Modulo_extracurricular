import "./loadEnv.js";
import { getDb, saveDb } from "./localDb.js";

async function runTestAllModules() {
  console.log("🚀 Iniciando prueba masiva de base de datos Supabase (Todos los Módulos)...");

  try {
    // 1. Obtener la base de datos actual
    const db = await getDb();
    console.log("✅ Conexión con Supabase y lectura de datos iniciales OK.");

    // ID y datos temporales para pruebas
    const testUserId = 999999;
    const testStudentDni = "99999999";
    const testProgId = "PROG-TEST-ALL";
    const testEnrollId = "enroll-test-antigravity";
    const testPagoId = "pago-test-antigravity";
    const testAsistenciaId = "asistencia-test-antigravity";
    const testCargaId = "carga-test-antigravity";

    // Limpieza previa por si quedaron datos de ejecuciones fallidas
    db.usuarios = (db.usuarios || []).filter(u => u.id !== testUserId);
    if (db.estudiantes && db.estudiantes[testStudentDni]) {
      delete db.estudiantes[testStudentDni];
    }
    db.programas = (db.programas || []).filter(p => p.id !== testProgId);
    db.inscripciones = (db.inscripciones || []).filter(i => i.id !== testEnrollId);
    db.pagos = (db.pagos || []).filter(p => p.id !== testPagoId);
    db.asistencias = (db.asistencias || []).filter(a => a.id !== testAsistenciaId);
    if (db.invitadosPorPrograma && db.invitadosPorPrograma[testProgId]) {
      delete db.invitadosPorPrograma[testProgId];
    }
    db.historialCargas = (db.historialCargas || []).filter(c => c.id !== testCargaId);

    // --- INSERCIÓN DE DATOS DE PRUEBA ---

    // 1. Usuario (Módulo Administración)
    console.log("➡️ Preparando Usuario (Administración)...");
    db.usuarios.push({
      id: testUserId,
      nombre: "Usuario de Prueba Antigravity",
      usuario: "admin_test_antigravity",
      rol: "direccion",
      estado: "Activo",
      contrasena: "test1234"
    });

    // 2. Estudiante (Módulo Secretaría / Alumnos)
    console.log("➡️ Preparando Estudiante (Secretaría)...");
    db.estudiantes[testStudentDni] = {
      dni: testStudentDni,
      codigoEstudiante: "COD-999999",
      nombres: "Estudiante de Prueba Antigravity",
      grado: "Primaria: 6",
      seccion: "A",
      nivel: "Primaria",
      sexo: "M",
      fechaNacimiento: "2015-05-15",
      tipoAlumno: "Regular",
      estadoMatricula: "Matriculado",
      apoderado: "Apoderado de Prueba",
      telefonoApoderado: "999888777",
      correoApoderado: "apoderado.test@correo.com",
      estadoInscripcion: "Habilitado",
      estadoCaja: "Al día"
    };

    // 3. Programa Base + 5 tablas secundarias (Módulo Coordinación)
    console.log("➡️ Preparando Programa y Configuración (Coordinación)...");
    db.programas.push({
      id: testProgId,
      nombre: "PROGRAMA INTEGRADO DE PRUEBA",
      categoria: "Talleres Deportivos",
      fechaInicio: "2026-07-01",
      fechaFin: "2026-07-31",
      costo: 100,
      cupos: 25,
      cuposOcupados: 1,
      gradosAplicables: ["Primaria: 6"],
      periodo: "escolar",
      modalidadCobro: "Pago único",
      horario: "Viernes 3:00 PM a 5:00 PM",
      grupo: "Grupo Test",
      
      // Campos de subtables secundarias
      duracionAvisoDias: 2,
      horaLimiteAviso: "18:00",
      edadMinima: "10",
      edadMaxima: "12",
      grupoEtario: "Niños",
      requisitos: "Cuaderno y lápiz",
      comunicado: "Aviso de prueba para padres...",
      comunicadoCompleto: "Cuerpo del comunicado...",
      detalleCosto: "Costo incluye matrícula",
      creadoDesdeDocumento: false,
      duracionTaller: "4 semanas",
      invitacionMasiva: false,
      alcanceInvitacionMasiva: "grado",
      tipoComunicado: "Circular",
      motivoJustificacion: "Prueba general",
      duracion: "1 mes",
      docente: "Docente Test",
      responsable: "Responsable Test",
      estado: "Habilitado",

      horaInicio: "15:00",
      horaFin: "17:00",
      horariosPorGrupo: [],
      tablaHorariosNivel: [],

      requiereUniforme: false,
      requiereIndumentaria: false,
      talleresDeportivos: [],
      incluyeAlmuerzo: false,
      horarioRecepcionAlmuerzo: "",
      concesionarios: "",
      detalleAlmuerzo: "",
      nivelCambridge: "",
      modalidadesCambridge: [],
      costoCiclo: "",
      montoPrimerPago: "",
      cicloI: "",
      cicloII: "",
      nombreCiclo: "",

      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      tipoDocumento: "Circular",
      numeroDocumento: "CIR-TEST-001",
      areaTematica: "Académica",

      anuncioImagen: "",
      anuncioImagenNombre: "",
      anuncioImagenTamano: "",
      anuncioImagenComprimida: ""
    });

    // 4. Pago (Módulo Caja / Banco)
    console.log("➡️ Preparando Pago (Caja/Banco)...");
    db.pagos.push({
      id: testPagoId,
      inscripcionId: testEnrollId,
      dniEstudiante: testStudentDni,
      nombresEstudiante: "Estudiante de Prueba Antigravity",
      programaId: testProgId,
      programa: "PROGRAMA INTEGRADO DE PRUEBA",
      periodo: "escolar",
      monto: 100,
      formaPago: "Transferencia",
      numeroOperacion: "OP-999999",
      telefonoOperacion: "999888777",
      capturaPagoNombre: "",
      capturaPagoBase64: "",
      estado: "Aprobado",
      fechaPago: "2026-06-22",
      origenRegistro: "Caja",
      nroRecibo: "REC-99999"
    });

    // 5. Inscripción (Módulo Padres / Caja)
    console.log("➡️ Preparando Inscripción (Padres/Matrículas)...");
    db.inscripciones.push({
      id: testEnrollId,
      dniEstudiante: testStudentDni,
      codigoEstudiante: "COD-999999",
      nombresEstudiante: "Estudiante de Prueba Antigravity",
      gradoEstudiante: "Primaria: 6",
      seccion: "A",
      programaId: testProgId,
      programa: "PROGRAMA INTEGRADO DE PRUEBA",
      categoria: "Talleres Deportivos",
      periodo: "escolar",
      horario: "Viernes 3:00 PM a 5:00 PM",
      docente: "Docente Test",
      costo: 100,
      modalidadCobro: "Pago único",
      fechaInicio: "2026-07-01",
      fechaFin: "2026-07-31",
      estadoPago: "Pagado",
      pagoId: testPagoId,
      costoOriginal: 100,
      descuentoAprobado: false,
      descuentoTipo: "",
      descuentoValor: 0,
      descuentoMonto: 0,
      descuentoJustificacion: "",
      descuentoAprobadoPor: "",
      descuentoFechaAprobacion: "",
      derivadoCaja: true,
      estadoCaja: "Aprobado",
      origenRegistro: "Portal padres",
      fechaRegistro: "2026-06-22"
    });

    // 6. Asistencia (Módulo Auxiliar)
    console.log("➡️ Preparando Asistencia (Auxiliares)...");
    db.asistencias.push({
      id: testAsistenciaId,
      inscripcionId: testEnrollId,
      pagoId: testPagoId,
      dniEstudiante: testStudentDni,
      codigoEstudiante: "COD-999999",
      nombresEstudiante: "Estudiante de Prueba Antigravity",
      programaId: testProgId,
      programa: "PROGRAMA INTEGRADO DE PRUEBA",
      horario: "Viernes 3:00 PM a 5:00 PM",
      estadoPago: "Pagado",
      estadoAcceso: "Presente",
      observacion: "Asistió temprano",
      origen: "Puerta",
      fechaRegistro: "2026-06-22T15:05:00Z"
    });

    // 7. Alumnos Invitados (Módulo Carga Masiva)
    console.log("➡️ Preparando Invitado en Programa...");
    db.invitadosPorPrograma[testProgId] = [
      {
        dni: testStudentDni,
        nombres: "Estudiante de Prueba Antigravity",
        grado: "Primaria: 6",
        seccion: "A"
      }
    ];

    // 8. Historial de Carga Excel (Módulo Cargas)
    console.log("➡️ Preparando Registro en Historial de Carga...");
    db.historialCargas.push({
      id: testCargaId,
      fecha: "2026-06-22T22:00:00Z",
      periodo: "escolar",
      archivoNombre: "carga_alumnos_test.xlsx",
      archivos: ["carga_alumnos_test.xlsx"],
      usuario: "admin_test_antigravity",
      resumen: { importados: 1, total: 1, errores: 0, duplicados: 0 },
      registros: [
        {
          fila: 2,
          dni: testStudentDni,
          nombres: "Estudiante de Prueba Antigravity",
          grado: "Primaria: 6",
          seccion: "A",
          estado: "Valido"
        }
      ]
    });

    // Guardar base de datos simulando el flujo de todos los módulos
    console.log("💾 Guardando cambios de todos los módulos en Supabase...");
    await saveDb(db);
    console.log("✅ Datos de prueba insertados en Supabase correctamente.");

    // --- LECTURA Y VALIDACIÓN ---
    console.log("🔍 Verificando recuperación de datos combinados...");
    const dbVerificada = await getDb();

    const uOk = (dbVerificada.usuarios || []).some(u => u.id === testUserId);
    const eOk = dbVerificada.estudiantes && dbVerificada.estudiantes[testStudentDni] !== undefined;
    const pOk = (dbVerificada.programas || []).some(p => p.id === testProgId);
    const iOk = (dbVerificada.inscripciones || []).some(i => i.id === testEnrollId);
    const paOk = (dbVerificada.pagos || []).some(p => p.id === testPagoId);
    const aOk = (dbVerificada.asistencias || []).some(a => a.id === testAsistenciaId);
    const invOk = dbVerificada.invitadosPorPrograma && dbVerificada.invitadosPorPrograma[testProgId]?.length > 0;
    const cOk = (dbVerificada.historialCargas || []).some(c => c.id === testCargaId);

    const validaciones = {
      "Módulo Administración (Usuarios)": uOk,
      "Módulo Secretaría (Estudiantes)": eOk,
      "Módulo Coordinación (Programas + Subtablas)": pOk,
      "Módulo Caja (Pagos)": paOk,
      "Módulo Inscripciones (Inscripciones)": iOk,
      "Módulo Auxiliar (Asistencias)": aOk,
      "Módulo Cargas (Invitados)": invOk,
      "Módulo Cargas (Historial de Cargas)": cOk
    };

    let todoOk = true;
    for (const [modulo, paso] of Object.entries(validaciones)) {
      if (paso) {
        console.log(`   - ${modulo}: OK`);
      } else {
        console.error(`   - ${modulo}: FALLIDO`);
        todoOk = false;
      }
    }

    if (todoOk) {
      console.log("🎉 ¡EXCELENTE! Todos los módulos son 100% compatibles con Supabase. No hay errores de columnas.");
    } else {
      throw new Error("❌ Error: Algunos datos de prueba no se pudieron recuperar correctamente.");
    }

    // --- LIMPIEZA FINAL ---
    console.log("🧹 Limpiando base de datos de Supabase...");
    dbVerificada.usuarios = (dbVerificada.usuarios || []).filter(u => u.id !== testUserId);
    if (dbVerificada.estudiantes) delete dbVerificada.estudiantes[testStudentDni];
    dbVerificada.programas = (dbVerificada.programas || []).filter(p => p.id !== testProgId);
    dbVerificada.inscripciones = (dbVerificada.inscripciones || []).filter(i => i.id !== testEnrollId);
    dbVerificada.pagos = (dbVerificada.pagos || []).filter(p => p.id !== testPagoId);
    dbVerificada.asistencias = (dbVerificada.asistencias || []).filter(a => a.id !== testAsistenciaId);
    if (dbVerificada.invitadosPorPrograma) delete dbVerificada.invitadosPorPrograma[testProgId];
    dbVerificada.historialCargas = (dbVerificada.historialCargas || []).filter(c => c.id !== testCargaId);

    await saveDb(dbVerificada);
    console.log("✅ Limpieza completada con éxito.");

  } catch (error) {
    console.error("❌ Falló la prueba masiva:");
    console.error(error.stack || error.message || error);
    process.exit(1);
  }
}

runTestAllModules();
