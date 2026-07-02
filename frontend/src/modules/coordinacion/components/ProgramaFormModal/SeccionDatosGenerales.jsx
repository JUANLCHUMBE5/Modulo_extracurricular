import { IconBook as BookOpen, IconPlus as Plus, IconTrash as Trash2 } from "@tabler/icons-react";
import { normalizarPeriodoVista } from "../../utils/coordinacionProgramUtils";

function SeccionDatosGenerales({
  form,
  esFormularioVerano,
  esAcademico,
  esNoAcademico,
  esCircularEspecial,
  mostrarGestorCategorias,
  setMostrarGestorCategorias,
  nuevaCat,
  setNuevaCat,
  agregarCategoria,
  catAEliminar,
  setCatAEliminar,
  quitarCategoria,
  categoriasEscolar,
  actualizarNombrePrograma,
  cambiarPeriodoFormulario,
  actualizarCategoriaPrograma,
  actualizarForm,
  categorias,
  usaTalleresPorEdad,
}) {
  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <BookOpen size={18} />
        <div>
          <h3>{esFormularioVerano ? "Datos del programa de verano" : "Datos generales"}</h3>
        </div>
      </div>
      <div className={`coord-section-grid coord-general-grid ${esAcademico ? "is-academico" : ""}`}>
        <div className="coord-field coord-program-name-field">
          <label>{esFormularioVerano ? "Nombre del programa de verano" : "Nombre del programa"}</label>
          <input
            value={form.nombre}
            onChange={e => actualizarNombrePrograma(e.target.value)}
            placeholder={esFormularioVerano ? "Ej: Verano creativo 2026" : "Ej: Reforzamiento y nivelación"}
          />
        </div>

        <div className="coord-field coord-period-field">
          <label>Periodo</label>
          <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
            <option value="escolar">Año escolar</option>
            <option value="verano">Ciclo verano</option>
          </select>
        </div>

        <div className="coord-field coord-category-field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "4px" }}>
            <span style={{ whiteSpace: "nowrap" }}>Categoría</span>
            <button
              type="button"
              className="coord-category-toggle-btn"
              onClick={() => setMostrarGestorCategorias(!mostrarGestorCategorias)}
              style={{ whiteSpace: "nowrap" }}
            >
              {mostrarGestorCategorias ? "Ocultar" : "Gestionar"}
            </button>
          </label>
          <select
            value={form.categoria}
            disabled={esCircularEspecial}
            onChange={e => actualizarCategoriaPrograma(e.target.value)}
            style={esCircularEspecial ? {
              background: "#e2e8f0",
              color: "#64748b",
              cursor: "not-allowed",
              borderColor: "#cbd5e1"
            } : {}}
          >
            <option value="">Seleccione</option>
            {esFormularioVerano ? (
              <>
                <option value="Vacaciones Útiles">Vacaciones Útiles</option>
                <option value="Talleres Recreativos">Talleres Recreativos</option>
                <option value="Talleres Deportivos">Talleres Deportivos</option>
              </>
            ) : (
              categoriasEscolar.map(c => {
                let label = c;
                if (c === "Academico") label = "Académico";
                if (c === "Maraton") label = "Maratón";
                return <option key={c} value={c}>{label}</option>;
              })
            )}
          </select>
        </div>

        {mostrarGestorCategorias ? (
          <div className="coord-category-manager-container coord-field-full">
            <div className="coord-category-manager-inner">
              <div className="coord-field">
                <label>Nueva categoría</label>
                <div className="coord-inline-field">
                  <input
                    placeholder="Ej: Arte, verano, alto rendimiento"
                    value={nuevaCat}
                    onChange={e => setNuevaCat(e.target.value)}
                  />
                  <button type="button" className="coord-mini-btn" onClick={agregarCategoria}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="coord-field">
                <label>Quitar categoría</label>
                <div className="coord-inline-field">
                  <select value={catAEliminar} onChange={e => setCatAEliminar(e.target.value)}>
                    <option value="">Seleccione</option>
                    {categoriasEscolar.map(c => {
                      let label = c;
                      if (c === "Academico") label = "Académico";
                      if (c === "Maraton") label = "Maratón";
                      return <option key={c} value={c}>{label}</option>;
                    })}
                  </select>
                  <button type="button" className="coord-mini-btn coord-mini-danger-btn" onClick={quitarCategoria}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {esAcademico && (
          <div className="coord-field coord-tipo-comunicado-field">
            <label style={{ fontWeight: "700", color: "#1e3a8a" }}>Tipo de comunicado / Circular escolar</label>
            <select
              value={form.tipoComunicado || "Otro genérico"}
              disabled={esNoAcademico}
              onChange={e => {
                const nuevoTipo = e.target.value;

                const templates = {
                  "Club de Tareas": {
                    comunicado: "Club de Tareas está diseñado para brindar a nuestros estudiantes un espacio guiado y estructurado para la resolución y presentación oportuna de sus tareas escolares, fortaleciendo sus hábitos de estudio, autonomía y organización bajo el acompañamiento de docentes especialistas.",
                    requisitos: "Cuaderno de apuntes, cartuchera completa (lápiz, borrador, tajador, regla, colores), agenda escolar física, y los textos/cuadernos de trabajo del colegio correspondientes a las tareas pendientes del día."
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
                    requisitos: `•	01 cuaderno Triple Kids – forrado de color MARRÓN con etiqueta TALLER DE COMUNICACIÓN (4 años)
•	01 cuaderno triple renglón A4 – forrado de color MARRÓN con etiqueta TALLER DE COMUNICACIÓN (5 años, 1°, 2° y 3° grado)
•	01 cuaderno Cuadrimax de 1 x 1 – forrado de color NEGRO con etiqueta TALLER DE MATEMÁTICA (4 años)
•	01 cuaderno cuadriculado A4 – forrado de color NEGRO con etiqueta TALLER DE MATEMÁTICA (5 años, 1°, 2° y 3° grado)
•	Todos los grados – 01 cartuchera completa (lápiz negro, chequeo rojo, borrador, tajador con depósito, colores, regla de 30 cm. (solo primaria)`
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

MODALIDADES DE INSCRIPCIÓN AL PROGRAMA DE CERTIFICACIÓN CAMBRIDGE 2026
Los padres de familia podrán inscribir a sus hijos por dos vías:
📝 Opción A: Inscripción presencial
Acercarse al área de Caja del colegio con esta invitación y realizar el primer pago de S/ 150
Además, deberán presentar los siguientes datos:
•	Nombres y apellidos del alumno 
•	Grado, sección y nivel
•	Nombres completos del apoderado
•	DNI del apoderado
•	Número de celular del apoderado
📲 Opción B: Inscripción virtual (por Yape)
Realizar el primer pago de S/ 150 al número 970 836 322 (Yape a nombre de la institución matemática San Rafael).
Luego, enviar la captura del pago junto con los mismos datos mencionados anteriormente al mismo número de la institución 970 836 322.



Atentamente,  

                                 ____________________                           _______________________
                          COORDINACIÓN			          DIRECTOR GENERAL`,
                    requisitos: `•	Libros de preparación
•	Simulacros del examen oficial Cambridge en todos los niveles.
•	Material adicional requerido`
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

MODALIDADES DE INSCRIPCIÓN AL PROGRAMA DE CERTIFICACIÓN CAMBRIDGE 2026
Los padres de familia podrán inscribir a sus hijos por dos vías:
📝 Opción A: Inscripción presencial
Acercarse al área de Caja del colegio con esta invitación y realizar el primer pago de S/ 150
Además, deberán presentar los siguientes datos:
•	Nombres y apellidos del alumno 
•	Grado, sección y nivel
•	Nombres completos del apoderado
•	DNI del apoderado
•	Número de celular del apoderado
📲 Opción B: Inscripción virtual (por Yape)
Realizar el primer pago de S/ 150 al número 970 836 322 (Yape a nombre de la institución matemática San Rafael).
Luego, enviar la captura del pago junto con los mismos datos mencionados anteriormente al mismo número de la institución 970 836 322.



Atentamente,  

                                 ____________________                           _______________________
                          COORDINACIÓN			          DIRECTOR GENERAL`,
                    requisitos: `•	Libros de preparación
•	Simulacros del examen oficial Cambridge en todos los niveles.
•	Material adicional requerido`
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
                    requisitos: `•	Deberá estar entre los 3 primeros en el cuadro de mérito dentro del aula.
•	El alumno deberá mantener buena conducta, mínimo nota 16.
•	Deberá participar en un 90% como mínimo, de las Olimpiadas matemáticas programadas por el colegio.
•	Deberá asistir como mínimo al 90% de las Maratones Académicas o Simulacros que se realizan previo a los concursos y/o exámenes. Costo simbólico (incluye pago al profesor y separata adicional).`
                  },
                  "Otro genérico": {
                    comunicado: "",
                    requisitos: ""
                  }
                };

                const template = templates[nuevoTipo] || { comunicado: "", requisitos: "" };
                const tipoDocSugerido = (nuevoTipo === "Cambridge" || nuevoTipo === "Certificación Cambridge") ? "Carta" : "Comunicado";
                const prefix = tipoDocSugerido === "Carta" ? "CAR" : "COM";
                const anio = new Date().getFullYear();
                const randomId = Math.floor(Math.random() * 90) + 10;
                const numDocSugerido = `${prefix}-0${randomId}-${anio}`;

                let reseteos = {};
                if (nuevoTipo === "Otro genérico") {
                  reseteos = {
                    tipoDocumento: "Comunicado",
                    numeroDocumento: "",
                    areaTematica: "Matemática",
                    nombreCiclo: "Ciclo I",
                    duracionTaller: "",
                    tablaHorariosNivel: [],
                    incluyeAlmuerzo: false,
                    horarioRecepcionAlmuerzo: "",
                    nivelCambridge: "",
                    modalidadesCambridge: [],
                    montoPrimerPago: "",
                    comunicado: "",
                    comunicadoCompleto: "",
                    requisitos: "",
                    fechaInicio: "",
                    fechaFin: "",
                    duracionAvisoDias: "7",
                    cupos: "",
                    costo: "",
                    modalidadCobro: "Mensual",
                    invitacionMasiva: false,
                    horariosPorGrupo: [],
                    gradosAplicables: [],
                    dias: [],
                    horaInicio: "",
                    horaFin: "",
                  };
                } else if (nuevoTipo === "Cambridge" || nuevoTipo === "Certificación Cambridge") {
                  reseteos = {
                    incluyeAlmuerzo: false,
                    horarioRecepcionAlmuerzo: "",
                    areaTematica: "Inglés / Cambridge",
                  };
                } else {
                  reseteos = {
                    nivelCambridge: "",
                    modalidadesCambridge: [],
                    areaTematica: "Matemática",
                  };
                }

                let categoriaSugerida = form.categoria;
                if (nuevoTipo !== "Otro genérico") {
                  const academica = (categorias || []).find(c => {
                    const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return normal === "academico";
                  });
                  categoriaSugerida = academica || "Academico";
                }

                actualizarForm({
                  tipoComunicado: nuevoTipo,
                  comunicado: template.comunicado,
                  comunicadoCompleto: template.comunicado,
                  requisitos: template.requisitos,
                  tipoDocumento: tipoDocSugerido,
                  numeroDocumento: numDocSugerido,
                  categoria: categoriaSugerida,
                  ...reseteos
                });
              }}
              style={esNoAcademico ? {
                background: "#e2e8f0",
                color: "#64748b",
                cursor: "not-allowed",
                borderColor: "#cbd5e1"
              } : {
                background: "#eff6ff",
                fontWeight: "bold",
                borderColor: "#3b82f6"
              }}
            >
              <option value="Otro genérico">Otro genérico (Taller común)</option>
              <option value="Club de Tareas">Club de Tareas</option>
              <option value="Reforzamiento (Circular)">Reforzamiento (Circular)</option>
              <option value="Selección (Circular)">Selección (Circular)</option>
              <option value="Cambridge">Cambridge</option>
              {form.tipoComunicado === "Certificación Cambridge" && (
                <option value="Certificación Cambridge" style={{ display: "none" }}>Certificación Cambridge</option>
              )}
            </select>
          </div>
        )}
        {usaTalleresPorEdad && esFormularioVerano && form.talleresDeportivos?.length > 0 ? (
          <div className="coord-field coord-field-full">
            <div
              className="coord-deportivo-grados-summary"
              style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}
            >
              <strong>Talleres configurados:</strong>{" "}
              <span style={{ color: "#006b5b", fontWeight: 700 }}>
                {form.talleresDeportivos.map(t => `${t.deporte} (${t.edadMinima}-${t.edadMaxima} años)`).join(", ")}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SeccionDatosGenerales;
