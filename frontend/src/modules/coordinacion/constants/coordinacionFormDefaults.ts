export const formInicial = {
  nombre: "", periodo: "escolar", categoria: "", grupo: "", horario: "",
  grupoEtario: "",
  gradosAplicables: [], edadMinima: "", edadMaxima: "", fechaNacimientoDesde: "", fechaNacimientoHasta: "", dias: [], horaInicio: "", horaFin: "",
  almuerzoInicio: "", almuerzoFin: "",
  horariosPorGrupo: [], usaHorariosPorBloque: false, talleresDeportivos: [],
  fechaInicio: "", fechaFin: "", duracionAvisoDias: "7", horaLimiteAviso: "23:59", cupos: "", costo: "", modalidadCobro: "Unico",
  cicloI: "", cicloII: "",
  responsable: "", tutora: "", plantilla: "", plantillaBase64: "", plantillaVariables: [],
  plantillaValidada: false, plantillaActualizadaEn: "", requisitos: "",
  comunicado: "", comunicadoCompleto: "", detalleCosto: "", detalleAlmuerzo: "", concesionarios: "",
  requiereUniforme: false, requiereIndumentaria: false, invitacionMasiva: false, alcanceInvitacionMasiva: "colegio",
  anuncioImagen: "", anuncioImagenNombre: "", anuncioImagenTamano: 0, anuncioImagenComprimida: false,
  usarFechaLimiteInscripcion: false,
  fechaAperturaInscripcion: "",
  horaAperturaInscripcion: "",
  fechaLimiteInscripcion: "",
  horaLimiteInscripcion: "",

  // Nuevos campos condicionales por tipo de circular
  tipoComunicado: "Otro genérico",
  tipoDocumento: "Comunicado",
  numeroDocumento: "",
  areaTematica: "Matemática",
  nombreCiclo: "Ciclo I",
  tablaHorariosNivel: [],
  incluyeAlmuerzo: false,
  horarioRecepcionAlmuerzo: "",
  nivelCambridge: "",
  modalidadesCambridge: [],
  costoCiclo: "",
  montoPrimerPago: "",
};

export const horarioGrupoInicial = {
  grados: [],
  dia: "Jueves",
  almuerzoInicio: "14:20",
  almuerzoFin: "15:10",
  horaInicio: "15:20",
  horaFin: "17:20",
  aula: "",
  responsable: "",
  tutora: "",
};

export const TEMPLATES_POR_TIPO = {
  "Club de Tareas": {
    comunicado: "Club de Tareas está diseñado para brindar a nuestros estudiantes un espacio guiado y estructurado para la resolución y presentación oportuna de sus tareas escolares, fortaleciendo sus hábitos de estudio, autonomía y organización bajo el acompañamiento de docentes especialistas.",
    requisitos: ""
  },
  "Reforzamiento (Circular)": {
    comunicado: `                         Carabayllo, {{FECHA_CARTA}}
COMUNICADO TALLER DE REFORZAMIENTO Y NIVELACIÓN SAN RAFAEL

Reciba el saludo cordial de la Comunidad Educativa del Colegio Matemático “San Rafael”, en especial de esta Dirección General que está a su servicio. La presente es para manifestarle que, habiendo revisado situación académica y aptitudinal durante el I Bimestre, hemos encontrado en su menor hijo (a), dificultades en el aprendizaje del área de matemática y/o comunicación. Por tal motivo creemos oportuno dentro de la formación que se brinda en nuestra Institución, integrarlo al aula de Clases de Nivelación y Reforzamiento. 

REFORZAMIENTO Y/O NIVELACIÓN

CICLO II: Del {{INI}} al {{FIN}}

A continuación, se indican los horarios correspondientes:

NIVEL	DÍAS 	ALMUERZO	CLASES PRESENCIALES
{{NIVEL_1}}	{{DIAS_1}}	{{ALM_1}}	{{CLASE_1}}
{{NIVEL_2}}	{{DIAS_2}}	{{ALM_2}}	{{CLASE_2}}


VENTAJAS
1. Se le entregará un COMPENDIO (WorkBook) totalmente gratis, que contiene ejercicios, problemas y temas fundamentales para que pueda mejorar su aprendizaje, siempre y cuando haya asistido a todo el ciclo, caso contrario deberá cancelar un costo de S/. 50.00 soles por el libro.
2. El ciclo dura 2 meses.
3. Se garantiza la mejora académica del alumno (a).
4. Se reforzarán los aprendizajes en Matemática y Comunicación.
NOTA:  
a) El alumno (a), deberá mantener una asistencia continua.
b) El alumno (a), deberá mantener buena conducta, orden y disciplina.

Traer los siguientes ÚTILES:
•	01 cuaderno Triple Kids – forrado de color MARRÓN con etiqueta TALLER DE COMUNICACIÓN (4 años)
•	01 cuaderno triple renglón A4 – forrado de color MARRÓN con etiqueta TALLER DE COMUNICACIÓN (5 años, 1°, 2° y 3° grado)
•	01 cuaderno Cuadrimax de 1 x 1 – forrado de color NEGRO con etiqueta TALLER DE MATEMÁTICA (4 años)
•	01 cuaderno cuadriculado A4 – forrado de color NEGRO con etiqueta TALLER DE MATEMÁTICA (5 años, 1°, 2° y 3° grado)
•	Todos los grados – 01 cartuchera completa (lápiz negro, chequeo rojo, borrador, tajador con depósito, colores, regla de 30 cm. (solo primaria)

COSTO:
Una sola cuota de S/. {{COSTO}} soles al inicio del Ciclo.			

EL ALMUERZO:
Contamos con un área para la recepción de los almuerzos, donde se deberá dejar bajo el siguiente horario:
{{NIVEL_1}}: {{HOR_ALM_1}}			
{{NIVEL_2}}: {{HOR_ALM_2}} 

Indicando claramente una etiqueta grande en la lonchera, con NOMBRE DEL ALUMNO, GRADO Y SECCIÓN.

Si deseara coordinar el servicio de Delivery le indicamos los siguientes contactos de nuestros 2 concesionarios para desayunos, loncheras, almuerzos:

📞 Cafetín Los Amigos del recreo (Sra. Rocío)		📞 Cafetín Edith (Sra. Deysli)	
       976280197				        	       960897529

Ambas son concesionarios autorizados de nuestra Institución y que cumplen con todo el protocolo que corresponde de acuerdo a las disposiciones del MINSA.


ENTREGAR ESTE FORMATO FIRMADO si está conforme, al momento de inscribirse en Administración.

ACEPTO:

NOMBRES Y APELLIDOS DEL ALUMNO: {{ALUMNO}} GRADO/SECCIÓN: {{GR_SEC}}
DATOS DEL APODERADO: {{APOD}}     CEL: {{CEL}}   FIRMA: _________________`,
    requisitos: ""
  },
  "Certificación Cambridge": {
    comunicado: `Carabayllo, Abril del 2026
CARTA DA-RCPF 2026-
SEÑOR PADRE DE FAMILIA
Presente. -

ASUNTO: CARTA DE FELICITACIÓN - Programa de Preparación Cambridge

En nuestra institución, estamos comprometidos con la formación integral de nuestros estudiantes, preparándolos para un mundo sin fronteras. Por ello, brindamos una enseñanza sólida y continua del idioma inglés desde primaria hasta secundaria, complementada con talleres especializados de preparación para los exámenes internacionales Cambridge.
Obtener una certificación Cambridge no solo acredita el nivel de inglés de nuestros alumnos, sino que también amplía sus oportunidades académicas, profesionales y personales, tanto en el Perú como a nivel internacional.
Nuestro programa cuenta con una metodología moderna, docentes capacitados y una sólida trayectoria en la preparación de estudiantes exitosos, que han logrado certificarse en distintos niveles con excelentes resultados.

📢 Lo invitamos cordialmente a ser parte de esta experiencia formativa.
Confíe en nuestro programa y acompañe a sus hijos en el camino hacia un futuro con mayores posibilidades y proyección global.


Por lo cual nos complace informarle que su hijo/a {{ALU}} del aula {{AUL}} ha sido admitido/a al Programa de Certificación Cambridge 2026, en el nivel {{NIV}}. Este programa está diseñado para desarrollar las habilidades necesarias para obtener una certificación internacional reconocida internacionalmente.
La modalidad de ingreso es la siguiente:

A) Promovido/a por Obtención de Certificado Oficial 2025       (       )
B) Ingresante por Admission Test                                               (      )
C) Ingresante por Desempeño Académico                                  (        )
El programa de Preparación Cambridge se divide en dos ciclos de formación:

•	Ciclo I: De Abril a julio
•	Ciclo II: De Agosto a noviembre


Precio por ciclo:
	S/ 150 por ciclo.
Horarios:	•	Martes y jueves 3:20 – 4:50 p.m.: Alumnos de Aulas Regulares, Talento Primaria, Pre I y Pre II.
Incluye:	•	Libros de preparación
•	Simulacros del examen oficial Cambridge en todos los niveles.
•	Material adicional requerido



Atentamente,  

                                 ____________________                           _______________________
                          COORDINACIÓN			          DIRECTOR GENERAL`,
    requisitos: ""
  },
  "Cambridge": {
    comunicado: `Carabayllo, Abril del 2026
CARTA DA-RCPF 2026-
SEÑOR PADRE DE FAMILIA
Presente. -

ASUNTO: CARTA DE FELICITACIÓN - Programa de Preparación Cambridge

En nuestra institución, estamos comprometidos con la formación integral de nuestros estudiantes, preparándolos para un mundo sin fronteras. Por ello, brindamos una enseñanza sólida y continua del idioma inglés desde primaria hasta secundaria, complementada con talleres especializados de preparación para los exámenes internacionales Cambridge.
Obtener una certificación Cambridge no solo acredita el nivel de inglés de nuestros alumnos, sino que también amplía sus oportunidades académicas, profesionales y personales, tanto en el Perú como a nivel internacional.
Nuestro programa cuenta con una metodología moderna, docentes capacitados y una sólida trayectoria en la preparación de estudiantes exitosos, que han logrado certificarse en distintos niveles con excelentes resultados.

📢 Lo invitamos cordialmente a ser parte de esta experiencia formativa.
Confíe en nuestro programa y acompañe a sus hijos en el camino hacia un futuro con mayores posibilidades y proyección global.


Por lo cual nos complace informarle que su hijo/a {{ALU}} del aula {{AUL}} ha sido admitido/a al Programa de Certificación Cambridge 2026, en el nivel {{NIV}}. Este programa está diseñado para desarrollar las habilidades necesarias para obtener una certificación internacional reconocida internacionalmente.
La modalidad de ingreso es la siguiente:

A) Promovido/a por Obtención de Certificado Oficial 2025       (       )
B) Ingresante por Admission Test                                               (      )
C) Ingresante por Desempeño Académico                                  (        )
El programa de Preparación Cambridge se divide en dos ciclos de formación:

•	Ciclo I: De Abril a julio
•	Ciclo II: De Agosto a noviembre


Precio por ciclo:
	S/ 150 por ciclo.
Horarios:	•	Martes y jueves 3:20 – 4:50 p.m.: Alumnos de Aulas Regulares, Talento Primaria, Pre I y Pre II.
Incluye:	•	Libros de preparación
•	Simulacros del examen oficial Cambridge en todos los niveles.
•	Material adicional requerido



Atentamente,  

                                 ____________________                           _______________________
                          COORDINACIÓN			          DIRECTOR GENERAL`,
    requisitos: ""
  },
  "Selección (Circular)": {
    comunicado: `                         Carabayllo, {{FECHA}}
SEÑORES PADRES DE FAMILIA
Presente. -	
ASUNTO: CARTA DE FELICITACIÓN – INVITACIÓN AULA ESPECIAL SELECCIÓN – TALENTO

Nos complace saludarlos cordialmente y a través de la presente felicitarlos porque su menor hijo (a), reúne las condiciones y aptitudes académicas, así como la responsabilidad y cumplimiento para integrar el Aula Selección – Talento que incluye a los alumnos más destacados del periodo {{CICLO}}.
Los integrantes tendrán una preparación especial para participar en los diversos concursos de matemáticas a nivel nacional, dentro de un horario de clases especial y extendido.
Ventajas:
1° Tiene un horario especial adicional.
2° Tiene un material adicional de Olimpiadas Matemáticas que se realizan a nivel nacional.
3° Descuento especial del 15% en los Talleres deportivos del Ciclo Vacacional 2026.
4° Asesoría Psicológica permanente durante todo el año.
5º Al culminar el año puede recibir premios especiales como: bicicletas, tablets, audífonos, incluso artefactos electrodomésticos, etc. (asistencia a los Concursos programados en un 90%).
6° Puede ser merecedor si gana:

CANTIDAD DE MEDALLAS DE ORO	BENEFICIOS
6	1/2 BECA para 2027
8 a MÁS	1 BECA para 2027


Requisitos para obtener la Beca 
1° Deberá estar entre los 3 primeros en el cuadro de mérito dentro del aula.
2º El alumno deberá mantener buena conducta, mínimo nota 16.
3º Deberá participar en un 90% como mínimo, de las Olimpiadas matemáticas programadas por el colegio.
4° Deberá asistir como mínimo al 90% de las Maratones Académicas o Simulacros que se realizan previo a los concursos y/o exámenes. Costo simbólico (incluye pago al profesor y separata adicional).

Requisitos para mantenerse en el aula Selección el siguiente año
1)	El alumno deberá mantener buena conducta, mínimo nota 16.
2)	Deberá participar en un 50% como mínimo de las Olimpiadas Matemáticas programadas por el colegio.
3)	Estar dentro de los 2/3 superior del cuadro de mérito dentro del aula.
4)	Deberá asistir como mínimo al 50% de las Maratones Académicas o Simulacros que se realizan previo a los concursos y/o exámenes. Costo simbólico (incluye pago al profesor y separata adicional).
NOTA 1:
1.	Para que la medalla de oro sea considerada, deberá ser aprobada por nuestra Institución. 
2.	La participación del concurso debe ser autorizado por la Dirección. 
3.	El aula a concursar debe tener como mínimo 20 alumnos.
Importante, Sr. Padre de familia, al cumplir los requisitos establecidos, garantizamos el éxito del alumno, ya que nuestra Institución hace todo lo posible para que su menor hijo (a) tenga un futuro promisorio.


Promoción especial solo para el aula Selección:
DESCUENTO MATRÍCULA	1° Pensión	Fecha máx.
50%	25%	28 NOV.
50%	10%	12 DIC.
50%	-	19 DIC.

	NOTA 2:
1.	Pasando la fecha, pierde la promoción.
2.	En el caso de hermanos que postulen a las aulas especiales, la promoción de descuento solo será para uno de los hijos.
3.	Deben haber cancelado las 10 pensiones de enseñanza correspondientes al año 2025 en su totalidad.
4.	No deben presentar deudas pendientes de años anteriores.
5.	Este descuento no es acumulable con ningún otro tipo de descuento o promoción.
6.	No se aceptan pagos parciales en matrícula ni pensiones para acceder a esta promoción.

VACANTES LIMITADAS

Horario especial.

SERVICIO EXTRACURRICULAR PARA SELECCIONADOS 	ALMUERZO
SELECCIÓN INICIAL	4 y 5 años 	LU-MI	08:00 am - 04:00 pm	De 01:00 a 02:00 pm
TALENTOS PRIM. MEN.	1°, 2°, 3° Prim.	LU-MI	07:40 am - 05:00 pm	De 01:00 a 02:00 pm
TALENTOS PRIM.MAY.	4°, 5°, 6° Prim.	LU-MI-VI	07:40 am - 05:30 pm	De 02:20 a 03:10 pm


NOTA 3: Cambio de Aula – Condiciones y Costos
Les recordamos que la promoción vigente aplica exclusivamente para el aula “Selección - Talento”. En caso de que algún padre de familia solicite el cambio de aula, deberá tener en cuenta lo siguiente:

💼 Gastos administrativos: S/100.00
📚 Emisión de nuevos compendios: S/50.00
📘 Anillado de materiales para academias: S/25.00 por cada libro.
🏷️ Libros de editoriales: El costo será asumido directamente por la familia.

⚠️ Condiciones de matrícula y pensión: El cambio de aula implica la pérdida de los beneficios otorgados por la promoción. Por tanto, el padre de familia deberá asumir la diferencia correspondiente en el monto de matrícula y/o pensión según las tarifas regulares del aula de destino.




Dirección General
Entregar este documento firmado al momento de su matrícula.
ACEPTO:
NOMBRES Y APELLIDOS DEL ALUMNO: {{ALUMNO}}
GRADO Y SECCIÓN DONDE CULMINÓ: {{GR_SEC}}
NOMBRES Y APELLIDOS DEL APODERADO: {{APOD}}                   
CEL: {{CEL}}   					FIRMA:_              ________________`,
    requisitos: ""
  },
  "Otro genérico": {
    comunicado: "",
    requisitos: ""
  }
};
