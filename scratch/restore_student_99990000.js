import { supabase } from "../server/supabaseClient.js";

async function run() {
  const student = {
    dni: "99990000",
    codigoEstudiante: "75640763",
    nombres: "Alessia Navarro Ruiz",
    grado: "2 Secundaria",
    seccion: "A",
    nivel: "Secundaria",
    sexo: "F",
    fechaNacimiento: "2010-01-01",
    tipoAlumno: "Alumno interno",
    estadoMatricula: "Activo",
    apoderado: "Carmen Ruiz",
    telefonoApoderado: "956789234",
    correoApoderado: ""
  };

  console.log("Restoring student 99990000 in Supabase...");
  const { data, error } = await supabase
    .from("estudiantes")
    .upsert(student)
    .select();

  if (error) {
    console.error("Error restoring student:", error.message);
  } else {
    console.log("Successfully restored student:", data);
  }
}

run();
