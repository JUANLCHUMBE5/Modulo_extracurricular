import "./loadEnv.js";
import { supabase } from "./supabaseClient.js";

async function run() {
  if (!supabase) {
    console.error("❌ Cliente de Supabase no inicializado. Asegúrate de configurar SUPABASE_URL y SUPABASE_KEY en el archivo .env.");
    return;
  }

  console.log("🔄 Obteniendo programas desde la tabla base de Supabase...");
  const { data: programas, error } = await supabase.from("programas").select("*");

  if (error) {
    console.error("❌ Error al obtener programas:", error.message);
    return;
  }

  console.log(`📋 Se encontraron ${programas.length} programas en la base de datos.`);
  console.log("🚀 Iniciando migración/distribución de 'grupo' a tablas 1:1 especializadas...");

  let migrados = 0;

  for (const prog of programas) {
    if (prog.grupo && prog.grupo.startsWith("{")) {
      try {
        const meta = JSON.parse(prog.grupo);
        console.log(`⚡ Migrando y distribuyendo programa ID: ${prog.id} - ${prog.nombre}...`);

        const results = await Promise.all([
          supabase.from("programas_configuraciones").upsert({
            programaId: prog.id,
            duracionAvisoDias: meta.duracionAvisoDias ?? null,
            horaLimiteAviso: meta.horaLimiteAviso ?? null,
            edadMinima: meta.edadMinima ?? null,
            edadMaxima: meta.edadMaxima ?? null,
            grupoEtario: meta.grupoEtario ?? null,
            requisitos: meta.requisitos ?? null,
            comunicado: meta.comunicado ?? null,
            comunicadoCompleto: meta.comunicadoCompleto ?? null,
            detalleCosto: meta.detalleCosto ?? null,
            creadoDesdeDocumento: meta.creadoDesdeDocumento ?? null,
            duracionTaller: meta.duracionTaller ?? null,
            invitacionMasiva: meta.invitacionMasiva ?? null,
            alcanceInvitacionMasiva: meta.alcanceInvitacionMasiva ?? null,
            tipoComunicado: meta.tipoComunicado ?? null,
            motivoJustificacion: meta.motivoJustificacion ?? null,
            duracion: meta.duracion ?? null
          }),
          supabase.from("programas_horarios").upsert({
            programaId: prog.id,
            horaInicio: meta.horaInicio ?? null,
            horaFin: meta.horaFin ?? null,
            horariosPorGrupo: meta.horariosPorGrupo ?? null,
            tablaHorariosNivel: meta.tablaHorariosNivel ?? null
          }),
          supabase.from("programas_servicios").upsert({
            programaId: prog.id,
            requiereUniforme: meta.requiereUniforme ?? null,
            requiereIndumentaria: meta.requiereIndumentaria ?? null,
            talleresDeportivos: meta.talleresDeportivos ?? null,
            incluyeAlmuerzo: meta.incluyeAlmuerzo ?? null,
            horarioRecepcionAlmuerzo: meta.horarioRecepcionAlmuerzo ?? null,
            concesionarios: meta.concesionarios ?? null,
            detalleAlmuerzo: meta.detalleAlmuerzo ?? null,
            nivelCambridge: meta.nivelCambridge ?? null,
            modalidadesCambridge: meta.modalidadesCambridge ?? null,
            costoCiclo: meta.costoCiclo ?? null,
            montoPrimerPago: meta.montoPrimerPago ?? null,
            cicloI: meta.cicloI ?? null,
            cicloII: meta.cicloII ?? null,
            nombreCiclo: meta.nombreCiclo ?? null
          }),
          supabase.from("programas_documentos").upsert({
            programaId: prog.id,
            plantilla: prog.plantilla || meta.plantilla || null,
            plantillaBase64: prog.plantillaBase64 || meta.plantillaBase64 || null,
            plantillaVariables: prog.plantillaVariables || meta.plantillaVariables || null,
            plantillaValidada: prog.plantillaValidada !== undefined ? prog.plantillaValidada : (meta.plantillaValidada !== undefined ? meta.plantillaValidada : null),
            tipoDocumento: meta.tipoDocumento ?? null,
            numeroDocumento: meta.numeroDocumento ?? null,
            areaTematica: meta.areaTematica ?? null
          }),
          supabase.from("programas_anuncios").upsert({
            programaId: prog.id,
            anuncioImagen: meta.anuncioImagen ?? null,
            anuncioImagenNombre: meta.anuncioImagenNombre ?? null,
            anuncioImagenTamano: meta.anuncioImagenTamano ?? null,
            anuncioImagenComprimida: meta.anuncioImagenComprimida ?? null
          })
        ]);

        let hasError = false;
        results.forEach((res, index) => {
          if (res.error) {
            console.error(`❌ Error en tabla index ${index} al migrar programa ${prog.id}:`, res.error.message);
            hasError = true;
          }
        });

        if (!hasError) {
          migrados++;
        }
      } catch (e) {
        console.error(`❌ Error parseando JSON de 'grupo' para programa ${prog.id}:`, e.message);
      }
    } else {
      console.log(`ℹ️ El programa ID: ${prog.id} no tiene datos serializados en 'grupo' o ya fue procesado.`);
    }
  }

  console.log(`\n🎉 Distribución completada. ${migrados} programas fueron distribuidos con éxito en las 5 nuevas tablas.`);
}

run();
