import { supabase } from "../server/supabaseClient.js";
import fs from "fs";
import path from "path";

async function run() {
  const dni = "33334444";
  console.log(`=== INICIANDO ELIMINACIÓN DE REGISTROS PARA EL DNI: ${dni} ===`);

  // 1. Eliminar en Supabase
  if (supabase) {
    try {
      // Eliminar asistencias
      const { error: errAsis } = await supabase
        .from("asistencias")
        .delete()
        .eq("dniEstudiante", dni);
      console.log("- Borrado de asistencias:", errAsis ? errAsis.message : "OK");

      // Eliminar inscripciones
      const { error: errInsc } = await supabase
        .from("inscripciones")
        .delete()
        .eq("dniEstudiante", dni);
      console.log("- Borrado de inscripciones:", errInsc ? errInsc.message : "OK");

      // Eliminar pagos
      const { error: errPagos } = await supabase
        .from("pagos")
        .delete()
        .eq("dniEstudiante", dni);
      console.log("- Borrado de pagos:", errPagos ? errPagos.message : "OK");

      // Eliminar invitados
      const { error: errInv } = await supabase
        .from("invitados_programa")
        .delete()
        .eq("dni", dni);
      console.log("- Borrado de invitados_programa:", errInv ? errInv.message : "OK");

      // Eliminar estudiante
      const { error: errEst } = await supabase
        .from("estudiantes")
        .delete()
        .eq("dni", dni);
      console.log("- Borrado de estudiantes:", errEst ? errEst.message : "OK");

    } catch (e) {
      console.error("Error al borrar de Supabase:", e.message);
    }
  } else {
    console.log("Supabase no inicializado en .env (modo local)");
  }

  // 2. Eliminar del archivo server/estudiantes_externos.json
  const filePath = path.resolve("server/estudiantes_externos.json");
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(content);
      const initialCount = list.length;
      
      // Filtrar por DNI o dniEstudiante
      const updatedList = list.filter(item => {
        const itemDni = String(item.dni || item.dniEstudiante || "").trim();
        return itemDni !== dni;
      });

      if (initialCount !== updatedList.length) {
        fs.writeFileSync(filePath, JSON.stringify(updatedList, null, 2), "utf-8");
        console.log(`- Borrado de estudiantes_externos.json: Se eliminó el estudiante (de ${initialCount} a ${updatedList.length} registros).`);
      } else {
        console.log("- Borrado de estudiantes_externos.json: No se encontró al estudiante con ese DNI.");
      }
    } catch (e) {
      console.error("Error al procesar estudiantes_externos.json:", e.message);
    }
  } else {
    console.log("- Archivo server/estudiantes_externos.json no existe.");
  }
  
  console.log("=== PROCESO DE ELIMINACIÓN COMPLETADO ===");
}

run();
