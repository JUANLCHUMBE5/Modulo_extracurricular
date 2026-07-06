import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

const dbPath = path.join(process.cwd(), 'data', 'estudiantes.json');

// Read existing DB
const dbContent = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbContent);

const firstNames = ["Mateo", "Valentina", "Sebastian", "Camila", "Lucas", "Sofia", "Daniel", "Lucia", "Alejandro", "Valeria", "Thiago", "Mariana", "Diego", "Emma", "Nicolas", "Paula", "Gabriel", "Sara", "Martin", "Luciana"];
const lastNames = ["Torres", "Rojas", "Flores", "Salazar", "Quispe", "Huaman", "Castillo", "Ramos", "Mendoza", "Ortiz", "Silva", "Aquino", "Paredes", "Gutierrez", "Leon", "Lopez", "Garcia", "Vargas", "Castro", "Herrera"];

// Let's generate exactly 95 student records (30 Inicial, 35 Primaria, 30 Secundaria)
const newStudents: any[] = [];

// Sequence starts:
let currentDniSeq = 60000000;
let currentCodeSeq = 75650000;

// To guarantee identical first names / different last names and sibling style:
const premadeNames = [
  // Siblings (same first last name, different first names)
  { nombres: "Mateo Torres", apellidos: "Salazar" },
  { nombres: "Sofia Torres", apellidos: "Salazar" },
  { nombres: "Lucas Quispe", apellidos: "Huaman" },
  { nombres: "Camila Quispe", apellidos: "Huaman" },
  { nombres: "Daniel Mendoza", apellidos: "Ortiz" },
  { nombres: "Lucia Mendoza", apellidos: "Ortiz" },
  { nombres: "Diego Castro", apellidos: "Silva" },
  { nombres: "Valeria Castro", apellidos: "Silva" },
  { nombres: "Thiago Ramos", apellidos: "Medina" },
  { nombres: "Mariana Ramos", apellidos: "Medina" },
  { nombres: "Martin Lopez", apellidos: "Garcia" },
  { nombres: "Sara Lopez", apellidos: "Garcia" },
  { nombres: "Sebastian Vargas", apellidos: "Castro" },
  { nombres: "Emily Vargas", apellidos: "Castro" },
  
  // Same first name, different last names
  { nombres: "Valentina Castillo", apellidos: "Ramos" },
  { nombres: "Valentina Gutierrez", apellidos: "Leon" },
  { nombres: "Valentina Herrera", apellidos: "Molina" },
  { nombres: "Sebastian Lopez", apellidos: "Garcia" },
  { nombres: "Sebastian Herrera", apellidos: "Molina" },
  { nombres: "Sebastian Paredes", apellidos: "Silva" },
  { nombres: "Nicolas Paredes", apellidos: "Silva" },
  { nombres: "Nicolas Flores", apellidos: "Salazar" }
];

// Add premade names first
for (const nameObj of premadeNames) {
  newStudents.push(nameObj);
}

// Generate the rest up to 95
while (newStudents.length < 95) {
  const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lName1 = lastNames[Math.floor(Math.random() * lastNames.length)];
  const lName2 = lastNames[Math.floor(Math.random() * lastNames.length)];
  if (lName1 !== lName2) {
    const nombres = `${fName} ${lName1}`;
    const apellidos = lName2;
    if (!newStudents.some(s => s.nombres === nombres && s.apellidos === apellidos)) {
      newStudents.push({ nombres, apellidos });
    }
  }
}

// Now assign Level, Grade, Section, DNI, Code, and Date of birth
// 30 Inicial, 35 Primaria, 30 Secundaria
const assignedStudents: any[] = [];
for (let i = 0; i < newStudents.length; i++) {
  const student = newStudents[i];
  currentDniSeq++;
  currentCodeSeq++;
  
  let nivel = "";
  let grado = "";
  if (i < 30) {
    nivel = "Inicial";
    grado = String(3 + (i % 3));
  } else if (i < 65) {
    nivel = "Primaria";
    grado = String(1 + (i % 6));
  } else {
    nivel = "Secundaria";
    grado = String(1 + (i % 5));
  }
  
  const seccion = "";
  
  assignedStudents.push({
    dni: String(currentDniSeq),
    codigoEstudiante: String(currentCodeSeq),
    nombres: `${student.nombres} ${student.apellidos}`,
    grado,
    seccion,
    nivel,
    sexo: (i % 2 === 0) ? "M" : "F",
    fechaNacimiento: "2010-01-01",
    tipoAlumno: "Alumno interno",
    estadoMatricula: "Activo",
    apoderado: "Apoderado " + student.apellidos,
    telefonoApoderado: "9" + String(Math.floor(10000000 + Math.random() * 90000000)),
    correoApoderado: ""
  });
}

// Write to DB
for (const student of assignedStudents) {
  db[student.dni] = {
    dni: student.dni,
    codigoEstudiante: student.codigoEstudiante,
    nombres: student.nombres,
    grado: student.grado,
    seccion: student.seccion,
    nivel: student.nivel,
    sexo: student.sexo,
    fechaNacimiento: student.fechaNacimiento,
    tipoAlumno: student.tipoAlumno,
    estadoMatricula: student.estadoMatricula,
    apoderado: student.apoderado,
    telefonoApoderado: student.telefonoApoderado,
    correoApoderado: student.correoApoderado
  };
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log("Database updated successfully with 95 student records (added 15 more to each level).");

// Make the output directory
const outDir = path.join(process.cwd(), '..', 'estudiantes_excel');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate Excel files using ExcelJS
async function generateExcelForLevel(nivel: string, students: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(nivel);
  
  worksheet.columns = [
    { header: 'DNI', key: 'dni', width: 15 },
    { header: 'Código Estudiante', key: 'codigoEstudiante', width: 20 },
    { header: 'Nombres y Apellidos', key: 'nombres', width: 35 },
    { header: 'Grado', key: 'grado', width: 12 },
    { header: 'Sección', key: 'seccion', width: 12 },
    { header: 'Nivel', key: 'nivel', width: 15 },
    { header: 'Fecha de Nacimiento', key: 'fechaNacimiento', width: 20 },
    { header: 'Tipo Alumno', key: 'tipoAlumno', width: 20 },
    { header: 'Estado Matrícula', key: 'estadoMatricula', width: 15 }
  ];
  
  // Format header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' } // Teal brand color
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
  
  // Add data rows
  students.forEach((student) => {
    worksheet.addRow({
      dni: student.dni,
      codigoEstudiante: student.codigoEstudiante,
      nombres: student.nombres,
      grado: student.grado,
      seccion: student.seccion,
      nivel: student.nivel,
      fechaNacimiento: '01/01/2010',
      tipoAlumno: student.tipoAlumno,
      estadoMatricula: student.estadoMatricula
    });
  });
  
  // Add some styles to the data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 20;
      row.alignment = { vertical: 'middle' };
      row.getCell('dni').alignment = { horizontal: 'center' };
      row.getCell('codigoEstudiante').alignment = { horizontal: 'center' };
      row.getCell('grado').alignment = { horizontal: 'center' };
      row.getCell('seccion').alignment = { horizontal: 'center' };
      row.getCell('fechaNacimiento').alignment = { horizontal: 'center' };
    }
  });
  
  const filePath = path.join(outDir, `${nivel.toLowerCase()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  console.log(`Saved Excel for level ${nivel} to: ${filePath}`);
}

(async () => {
  const inicialStudents = assignedStudents.filter(s => s.nivel === "Inicial");
  const primariaStudents = assignedStudents.filter(s => s.nivel === "Primaria");
  const secundariaStudents = assignedStudents.filter(s => s.nivel === "Secundaria");
  
  await generateExcelForLevel("Inicial", inicialStudents);
  await generateExcelForLevel("Primaria", primariaStudents);
  await generateExcelForLevel("Secundaria", secundariaStudents);
  console.log("Excel files regenerated successfully with expanded lists!");
})();
