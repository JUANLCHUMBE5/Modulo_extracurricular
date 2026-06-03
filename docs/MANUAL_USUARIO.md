# Manual de Usuario del Sistema Extracurricular
## Sistema de Gestión de Programas Extracurriculares
### Institución Matemática San Rafael S.A.C.

Bienvenido al **Manual de Usuario** del Sistema de Control de Programas Extracurriculares. Este sistema web modular permite automatizar y auditar todo el ciclo de inscripción, pago, asistencia y reporte de los talleres del colegio.

---

## 1. Acceso al Entorno de Desarrollo (Local)

Para iniciar la aplicación en tu computadora local:
1.  Busca el archivo `iniciar-react.cmd` en la raíz del proyecto.
2.  Haz doble clic sobre él. Se abrirá una terminal que levantará el servidor local y abrirá automáticamente tu navegador web en la dirección: **`http://localhost:5173`**.

### Credenciales de Acceso para Pruebas
Usa las siguientes cuentas para acceder a cada uno de los roles disponibles:

| Rol de Sistema | Usuario (Login Personal) | Contraseña | ¿Qué permite probar? |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `1234` | Gestión de cuentas de usuario del colegio. |
| **Coordinación** | `coordinacion` | `1234` | Configurar talleres, cupos, precios y horarios. |
| **Secretaría** | `secretaria` | `1234` | Matricular alumnos e ingresar externos. |
| **Caja** | `caja` | `1234` | Registrar, validar y rechazar pagos (Yape, Plim, etc.). |
| **Auxiliar** | `auxiliar` | `1234` | Registrar asistencia con QR o búsqueda manual. |
| **Dirección** | `direccion` | `1234` | Visualizar reportes visuales y gráficos estadísticos. |

> [!NOTE]
> Para el **Portal de Padres**, no se usa el "Acceso Personal". En la pantalla de login, selecciona la pestaña **"Acceso de Padres"** e ingresa cualquier DNI de estudiante registrado (ej: `12345678`, `87654321`) junto con su fecha de nacimiento.

---

## 2. Guía de Uso por Módulos y Roles

---

### 💻 Módulo 1: Secretaría (Inscripción de Alumnos)
*Orientado a la atención presencial de padres que acuden a matricular a sus hijos.*

#### ¿Cómo inscribir a un estudiante regular del colegio?
1.  En la barra lateral, selecciona la pestaña **"Registrar Inscripción"**.
2.  Ingresa el **DNI del estudiante** (8 dígitos) y presiona **"Buscar"**.
3.  El sistema cargará automáticamente los datos del alumno (Nombre completo, Grado, Sección y Nivel).
4.  Selecciona el **Programa/Taller** en el cual desea inscribirse.
5.  Ingresa el nombre del **Apoderado**, su **Teléfono de contacto** (9 dígitos) y un **Correo electrónico** válido (el sistema rechazará correos temporales).
6.  Presiona **"Registrar Inscripción"**. El sistema generará la vacante en estado *"Pendiente de Pago"*.

#### ¿Cómo registrar a un estudiante externo (de otro colegio)?
1.  Haz clic en **"Registrar Alumno Externo"**.
2.  *Nota:* Este registro solo está habilitado para talleres del **Período de Verano**.
3.  Completa los datos personales del estudiante externo (Nombres, DNI, Edad y Colegio de procedencia).
4.  Asigna el apoderado y presiona **"Registrar"**. Una vez registrado, podrás proceder a inscribirlo en el taller correspondiente.

---

### 💵 Módulo 2: Caja (Control de Pagos)
*Encargado de auditar el flujo financiero y validar las transacciones.*

#### ¿Cómo validar el pago de un padre de familia?
1.  Al entrar al módulo, verás el **Resumen de Caja** (Total recaudado, ingresos pendientes por cobrar e ingresos cancelados/rechazados) y la tabla de **Pagos Registrados**.
2.  Busca el pago en la tabla (puedes buscar por el DNI del estudiante o número de operación).
3.  Si el padre envió un comprobante (captura de Yape/Plim), haz clic en el ícono de **Editar / Revisar** en la columna de acciones.
4.  Revisa que el **Monto** y el **Número de operación** coincidan con tu banca móvil.
5.  *Para aprobar:* Cambia el estado a **"Completado"** y presiona **"Actualizar"**. Esto habilitará inmediatamente el código QR de asistencia en el portal del padre.
6.  *Para rechazar:* Cambia el estado a **"Cancelado"**, escribe el motivo del rechazo en la sección de observaciones (ej. *"Número de operación falso"* o *"Monto incompleto"*) y presiona **"Actualizar"**.

#### Descarga de reportes
*   Haz clic en el botón **"Descargar Reporte"** en la esquina superior derecha para obtener un archivo `.csv` con todo el historial de pagos listo para ser abierto y analizado en Excel.

---

### 📅 Módulo 3: Coordinación (Creación de Talleres)
*Permite estructurar la oferta extracurricular de la institución.*

#### ¿Cómo crear un nuevo programa o taller?
1.  Selecciona **"Nuevo Programa"**.
2.  Ingresa el **Nombre del Taller** (ej. *"Taller de Ajedrez Avanzado"*).
3.  Selecciona el **Periodo** (*Año escolar* o *Vacaciones de verano*).
4.  Indica el **Grupo / Nivel** al cual está dirigido (Ej: Primaria 1° a 3°).
5.  Establece el **Costo del Taller** (ingresa `0` si es un taller gratuito de selección), los **Cupos disponibles** y describe el **Horario** exacto.
6.  Selecciona si el taller **Requiere Uniforme** específico o no.
7.  Presiona **"Crear Taller"**. El taller estará disponible de inmediato en la lista de Secretaría y en el portal de Padres.

#### Deshabilitar / Modificar Talleres
*   En la lista de programas, puedes hacer clic en **"Editar"** para corregir el horario, precio o agregar más cupos. Si un taller ya no se va a dictar, cambia su estado a **"Deshabilitado"** para que desaparezca de las opciones de matrícula.

---

### 👨‍👩‍👧 Módulo 4: Portal de Padres (Consultas y Asistente Virtual)
*Diseñado para uso exclusivo de los apoderados desde internet.*

#### ¿Cómo ingresar al portal?
1.  En la pantalla de login, ve a **"Acceso de Padres"**.
2.  Ingresa el **DNI de tu hijo** (ej: `12345678`) y su fecha de nacimiento.
3.  Presiona **"Ingresar"**.

#### ¿Qué puede hacer el padre dentro del portal?
*   **Verificar Matrícula:** Visualizar en qué talleres está inscrito su hijo y el estado de la matrícula.
*   **Estado de Pago:** Consultar si el pago ya fue validado por Caja.
*   **Obtener Ficha e Ingreso QR:** Si el pago figura como **Validado**, aparecerá el botón para ver la Ficha de Inscripción y un **Código QR dinámico**. El estudiante debe presentar este código QR en su celular (o impreso) al ingresar al colegio para asistir al taller.
*   **Asistente Virtual (Chatbot):** En el lado derecho del portal, el padre puede escribir preguntas en lenguaje natural (ej. *"¿En qué horario es el taller de básquet?"*, *"¿Mi pago de Yape ya está aprobado?"*, o *"¿Quién es el profesor?"*). El asistente virtual integrado le responderá al instante leyendo los datos actualizados del sistema.

---

### 👮 Módulo 5: Auxiliar (Control de Asistencia)
*Utilizado por el personal en la puerta del colegio o al ingreso del taller.*

#### ¿Cómo registrar la asistencia por QR?
1.  Al entrar al módulo, el sistema solicitará permisos para usar la **cámara de la computadora o celular**.
2.  Apunta la cámara al código QR que el alumno presenta en su teléfono.
3.  El sistema leerá el código, validará en tiempo real si el estudiante tiene su matrícula y pago aprobados, y registrará su entrada marcándolo como **"Presente"** con la hora exacta.
4.  Mapeará una confirmación visual en verde si el acceso es permitido, o un mensaje en rojo indicando el error (ej: *"Pago pendiente"* o *"Estudiante no inscrito en este taller"*).

#### ¿Cómo registrar la asistencia manualmente?
1.  Si el alumno olvidó su teléfono o ficha impresa, ve a **"Búsqueda Manual"**.
2.  Ingresa el **DNI del estudiante** y presiona **"Buscar"**.
3.  Selecciona el taller correspondiente y haz clic en **"Registrar Asistencia"**.

---

### 📈 Módulo 6: Dirección (Reportes e Indicadores)
*Destinado al equipo directivo del colegio para la toma de decisiones estratégicas.*

#### ¿Qué indicadores se visualizan?
*   **Métricas Clave:** Cantidad total de estudiantes inscritos, total de dinero recaudado y porcentaje de asistencia promedio.
*   **Distribución por Niveles:** Gráficos que muestran qué porcentaje de inscritos son de Inicial, Primaria o Secundaria.
*   **Talleres más Demandados:** Gráfico de barras que ordena los programas de mayor a menor según la cantidad de alumnos matriculados.
*   **Reportes Financieros:** Gráfico de pastel que segmenta el dinero recaudado por métodos de pago (Yape, Plim, Efectivo, Banco).

---

### ⚙️ Módulo 7: Administrador (Cuentas y Accesos)
*El encargado de la seguridad y configuración de usuarios.*

#### ¿Cómo crear un nuevo usuario para el personal?
1.  Selecciona **"Crear Usuario"**.
2.  Ingresa el **Nombre de Usuario** único (ej. `marta_secretaria`), el **Nombre completo** y su **Correo institucional** (debe terminar en `@sanrafael.edu.pe`).
3.  Asigna el **Rol** correspondiente (Secretaría, Caja, Auxiliar, Coordinación, Dirección o Administrador).
4.  Asigna una **Contraseña provisional** (mínimo 6 caracteres).
5.  Presiona **"Crear"**. El usuario ya podrá ingresar al sistema con sus credenciales.
