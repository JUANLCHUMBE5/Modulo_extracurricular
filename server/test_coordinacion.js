import "./loadEnv.js";
import { getDb, saveDb } from "./localDb.js";

async function runTest() {
  console.log("🚀 Iniciando prueba de base de datos Supabase (Coordinación)...");

  try {
    // 1. Obtener la base de datos actual
    const db = await getDb();
    console.log(`✅ Base de datos leída con éxito.`);
    console.log(`ℹ️ Programas actuales en Supabase: ${db.programas?.length || 0}`);
    console.log(`ℹ️ Estudiantes actuales: ${Object.keys(db.estudiantes || {}).length}`);
    console.log(`ℹ️ Usuarios actuales: ${db.usuarios?.length || 0}`);

    // 2. Crear un programa de prueba con toda la estructura de campos
    const testId = `PROG-9999`;
    
    // Si ya existe por una prueba anterior fallida, lo limpiamos de la base de datos
    db.programas = (db.programas || []).filter(p => p.id !== testId);

    const nuevoPrograma = {
      id: testId,
      nombre: "TALLER DE PRUEBA ANTIGRAVITY",
      categoria: "Talleres Deportivos",
      fechaInicio: "2026-07-01",
      fechaFin: "2026-07-31",
      costo: 150,
      cupos: 30,
      cuposOcupados: 0,
      gradosAplicables: ["Primaria: 4", "Primaria: 5"],
      periodo: "escolar",
      modalidadCobro: "Pago único",
      horario: "Lunes y Miércoles 4:00 PM a 5:30 PM",
      grupo: "Grupo Único",
      
      // Campos de programas_configuraciones
      duracionAvisoDias: 3,
      horaLimiteAviso: "20:00",
      edadMinima: "9",
      edadMaxima: "11",
      grupoEtario: "Niños",
      requisitos: "Zapatillas deportivas y ropa cómoda",
      comunicado: "Invitamos a participar del taller de prueba.",
      comunicadoCompleto: "Cuerpo completo de justificación de la prueba...",
      detalleCosto: "Costo incluye materiales y uniforme básico.",
      creadoDesdeDocumento: false,
      duracionTaller: "4 semanas",
      invitacionMasiva: true,
      alcanceInvitacionMasiva: "colegio",
      tipoComunicado: "Deportes",
      motivoJustificacion: "Prueba de integración",
      duracion: "1 mes",
      docente: "Prof. Test Antigravity",
      responsable: "Coordinador de Prueba",
      estado: "Habilitado",

      // Campos de programas_horarios
      horaInicio: "16:00",
      horaFin: "17:30",
      horariosPorGrupo: [
        {
          id: "bloque-1",
          grados: ["Primaria: 4"],
          dia: "Lunes",
          aula: "Cancha Deportiva",
          almuerzoInicio: "",
          almuerzoFin: "",
          horaInicio: "16:00",
          horaFin: "17:30",
          responsable: "Prof. Test Antigravity",
          tutora: "",
          cupos: 15
        }
      ],
      tablaHorariosNivel: [],

      // Campos de programas_servicios
      requiereUniforme: true,
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

      // Campos de programas_documentos
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      tipoDocumento: "Comunicado",
      numeroDocumento: "COM-TEST-9999",
      areaTematica: "Deportes",

      // Campos de programas_anuncios
      anuncioImagen: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      anuncioImagenNombre: "test_image.png",
      anuncioImagenTamano: 120,
      anuncioImagenComprimida: ""
    };

    db.programas.push(nuevoPrograma);

    console.log("💾 Guardando programa de prueba en Supabase...");
    await saveDb(db);
    console.log("✅ Programa de prueba guardado exitosamente (se ejecutó la segmentación en 6 tablas sin errores).");

    // 3. Volver a leer la base de datos para confirmar que los campos se unieron correctamente
    console.log("🔍 Volviendo a leer los datos de Supabase para validar coherencia...");
    const dbVerificada = await getDb();
    const progVerificado = (dbVerificada.programas || []).find(p => p.id === testId);

    if (!progVerificado) {
      throw new Error("❌ Error grave: El programa de prueba no pudo ser leído de Supabase.");
    }

    console.log("✅ Programa de prueba recuperado de Supabase.");

    // Validar algunos campos clave de distintas tablas para comprobar el JOIN de las 6 tablas
    const camposValidados = {
      nombre: nuevoPrograma.nombre === progVerificado.nombre,
      responsable: nuevoPrograma.responsable === progVerificado.responsable,
      docente: nuevoPrograma.docente === progVerificado.docente,
      duracionAvisoDias: Number(nuevoPrograma.duracionAvisoDias) === Number(progVerificado.duracionAvisoDias),
      numeroDocumento: nuevoPrograma.numeroDocumento === progVerificado.numeroDocumento,
      anuncioImagenNombre: nuevoPrograma.anuncioImagenNombre === progVerificado.anuncioImagenNombre,
      requiereUniforme: nuevoPrograma.requiereUniforme === progVerificado.requiereUniforme,
    };

    let todosValidos = true;
    for (const [campo, coinciden] of Object.entries(camposValidados)) {
      if (coinciden) {
        console.log(`   - Campo [${campo}]: OK (Coincide: "${progVerificado[campo]}")`);
      } else {
        console.error(`   - Campo [${campo}]: ERROR (Original: "${nuevoPrograma[campo]}" | BD: "${progVerificado[campo]}")`);
        todosValidos = false;
      }
    }

    // 4. Comprobar que los horarios se deserializaron correctamente
    if (Array.isArray(progVerificado.horariosPorGrupo) && progVerificado.horariosPorGrupo.length > 0) {
      console.log(`   - Campo [horariosPorGrupo]: OK (Se leyeron ${progVerificado.horariosPorGrupo.length} bloques)`);
    } else {
      console.error(`   - Campo [horariosPorGrupo]: ERROR (No se recuperaron los bloques de horarios)`);
      todosValidos = false;
    }

    if (todosValidos) {
      console.log("🎉 ¡Prueba de integración PASADA con éxito! Las 6 tablas de Supabase se coordinan al 100%.");
    } else {
      throw new Error("❌ Fallaron validaciones de campos específicos de las subtables.");
    }

    // 5. Limpieza final (Borramos el programa de prueba)
    console.log("🧹 Limpiando base de datos (eliminando registro de prueba)...");
    dbVerificada.programas = (dbVerificada.programas || []).filter(p => p.id !== testId);
    await saveDb(dbVerificada);
    console.log("✅ Limpieza completada.");

  } catch (error) {
    console.error("❌ Ocurrió un error en la prueba:");
    console.error(error.stack || error.message || error);
    process.exit(1);
  }
}

runTest();
