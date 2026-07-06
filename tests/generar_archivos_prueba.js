import fs from 'fs';
import path from 'path';
import Pizzip from 'pizzip';

const zip = new Pizzip();

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Estimado apoderado, le damos la bienvenida al taller extracurricular a su hijo/a {{ALUMNO}} con DNI {{DNI}} en el grado {{GRADO}} seccion {{SECCION}}. El taller {{TALLER}} se dictará en el horario {{HORARIO}} con el docente {{DOCENTE}}.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

zip.file("[Content_Types].xml", contentTypesXml);
zip.file("_rels/.rels", relsXml);
zip.file("word/document.xml", documentXml);

const buffer = zip.generate({ type: 'nodebuffer' });
const dir = path.resolve('tests/archivos_prueba');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'plantilla_test.docx'), buffer);
console.log('✅ Archivo plantilla_test.docx generado con éxito');
