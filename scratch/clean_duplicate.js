import fs from 'fs';
const filepath = "c:/Users/leonc/OneDrive/Desktop/Modulo Extracurricular/src/modules/coordinacion/components/ProgramaFormModal.jsx";
let content = fs.readFileSync(filepath, 'utf8');

const firstIndex = content.indexOf("const grupoHorarioDraftInicial = {");
const secondIndex = content.indexOf("const grupoHorarioDraftInicial = {", firstIndex + 1);

if (secondIndex !== -1) {
  content = content.substring(0, firstIndex) + content.substring(secondIndex);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log("Successfully cleaned up duplicate!");
} else {
  console.log("Could not find second declaration.");
}
