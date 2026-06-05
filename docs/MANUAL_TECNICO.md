# Manual Técnico de Arquitectura e Integración
## Sistema de Control de Programas Extracurriculares
### Institución Matemática San Rafael S.A.C.

Este documento describe la arquitectura de software, especificaciones de requerimientos funcionales "as-built", modelos de datos y las pautas para la integración final del **Módulo Extracurricular** con el ecosistema de producción basado en Firebase.

---

## 1. Arquitectura de Software

La aplicación está diseñada bajo una arquitectura desacoplada de dos capas (Frontend y Backend local) que facilita la portabilidad y la migración futura hacia APIs en producción.

```mermaid
graph TD
    subgraph Frontend (React + Vite)
        A[App.jsx - Router & Session] --> B[Módulos Funcionales]
        B -->|Secretaría / Caja / Coordinación| C[apiClient.js / dbApi.js]
        B -->|Padres / Auxiliar / Dirección| C
    end
    subgraph Backend Local (Node + Express)
        C -->|Petición /api/db| D[excelApi.js - Express Server]
        D -->|Lectura / Escritura| E[localDb.js - Adaptador]
        E -->|Persistencia JSON| F[(server/db.json)]
    end
    subgraph Producción Futura (Firebase)
        C -.->|Llamada Directa o Proxy| G[(Firebase Firestore / Realtime DB)]
    end
```

### Componentes del Sistema

1.  **Frontend (React + Vite + Mantine UI):**
    *   Gestiona la interfaz de usuario de los 7 roles definidos en el sistema.
    *   Utiliza **Mantine UI** para los componentes de interfaz (modales, tablas, selectores, notificaciones) y **TailwindCSS** para estilos específicos y consistencia visual.
    *   La comunicación con los datos se realiza a través de la capa de servicios (`src/services/apiClient.js` y `src/services/dbApi.js`), aislando los componentes de la lógica de red.
2.  **Backend Local (Node.js + Express):**
    *   Ubicado en la carpeta `server/`.
    *   Maneja un servidor HTTP en el puerto `5175` que expone los endpoints para interactuar con la base de datos simulada.
3.  **Persistencia Local:**
    *   El archivo db.json se utiliza únicamente como fuente de datos local para pruebas funcionales durante la etapa de desarrollo. El frontend no accede directamente a dicho archivo, sino que consume la API local mediante services y apiClient. En una etapa posterior, db.json será reemplazado por una base de datos real o por la base de datos del sistema principal, según la arquitectura definida con el responsable del sistema institucional.

---

## 2. Estructura de Directorios

El código está organizado de forma modular, donde cada rol tiene su propia carpeta que encapsula su lógica visual (`.jsx`), estilos (`.css`), y lógica de llamadas de red (`Service.js`):

```text
src/
├── components/          # Componentes globales compartidos (Ej. Login)
├── modules/             # Módulos del sistema organizados por rol
│   ├── administrador/   # Gestión de cuentas y accesos
│   ├── auxiliar/        # Control de asistencia y lector QR
│   ├── caja/            # Control de caja, validación de pagos y reportes
│   ├── coordinacion/    # Creación de talleres, horarios, precios e inscritos
│   ├── direccion/       # Gráficos estadísticos e indicadores generales
│   ├── padres/          # Portal de consulta de apoderados, fichas y asistente virtual
│   └── secretaria/      # Registro presencial de estudiantes ordinarios y externos
├── services/            # Clientes API y sincronizadores globales
│   ├── apiClient.js     # Cliente Fetch unificado
│   ├── authService.js   # Gestión local de JWT y autenticación
│   └── dbApi.js         # Sincronización y base de datos simulada en memoria
└── main.jsx             # Punto de entrada de React
```

---

## 3. Especificación de Requerimientos Técnicos ("As-Built")

Los siguientes requerimientos técnicos y validaciones fueron derivados directamente del código fuente implementado para garantizar la seguridad y consistencia de los datos:

### Validaciones de Datos en el Cliente
*   **Identificación (DNI):** Debe contener exactamente 8 caracteres numéricos. Se limpia cualquier espacio o caracter no numérico antes de la búsqueda o envío.
*   **Teléfonos / WhatsApp:** Debe contener exactamente 9 caracteres numéricos.
*   **Correos Electrónicos:** Validación de formato estándar. Adicionalmente, el sistema bloquea de manera activa el uso de correos temporales (`tempmail.com`, `yopmail.com`, `mailinator.com`, etc.) para el registro de apoderados.
*   **Campos de Texto:** Las observaciones y descripciones son sanitizadas para evitar ataques de inyección básica de código (inyección HTML/JS).
*   **Montos Financieros:** Todo registro de pago en el módulo de Caja debe validar que el monto sea un valor estrictamente positivo.

### Reglas de Negocio Implementadas
1.  **Restricción de Inscripciones:** No se puede generar una inscripción si el taller no cuenta con cupos disponibles (excepto casos especiales debidamente autorizados con una justificación de Secretaría).
2.  **Validación de Alumnos Externos:** El registro de alumnos que no pertenecen a la institución está estrictamente limitado a los programas del **Período de Verano**.
3.  **Generación de Códigos QR de Asistencia:** El portal de Padres solo genera y muestra el código QR de asistencia para un taller si el estado del pago correspondiente figura como **Validado (Aprobado)** en el módulo de Caja.
4.  **Flujo Financiero (Caja):**
    *   Los estados de pago admitidos son: `Pendiente`, `Completado` (Validado) y `Cancelado` (Rechazado).
    *   Solo el rol de `Caja` puede cambiar el estado de un pago.

---

## 4. Modelos de Datos (Esquema JSON)

El archivo `server/db.json` sigue el siguiente contrato de datos. Al migrar a Firebase (Firestore), estas colecciones deben mantener la misma estructura para evitar modificaciones en el frontend:

### Colección: `usuarios`
Registra al personal de la institución que accede al sistema.
```json
{
  "id": "usr_01",
  "usuario": "caja",
  "nombre": "Encargado de Caja",
  "correo": "caja@sanrafael.edu.pe",
  "rol": "Caja",
  "estado": "Activo",
  "permisos": ["pagos.ver", "pagos.registrar", "pagos.editar"]
}
```

### Colección: `estudiantes`
Directorio de alumnos de la institución.
```json
{
  "dni": "76543210",
  "nombres": "Ana Sofía Torres",
  "nivel": "Secundaria",
  "grado": "2",
  "seccion": "A",
  "fechaNacimiento": "2012-08-20",
  "estado": "Activo"
}
```

### Colección: `programas` (Talleres)
Contiene la oferta de actividades extracurriculares.
```json
{
  "id": "TALLER-BAS-2026",
  "nombre": "Básquetbol Selección",
  "periodo": "escolar",
  "grupo": "Secundaria",
  "horario": "Martes y Jueves 3:30 p.m. - 5:00 p.m.",
  "costo": 80,
  "cuposDisponibles": 15,
  "requiereUniforme": true,
  "estado": "Habilitado"
}
```

### Colección: `inscripciones`
Mapea la inscripción de un estudiante a un taller específico.
```json
{
  "id": "INS-9874",
  "dniEstudiante": "76543210",
  "programaId": "TALLER-BAS-2026",
  "estadoInscripcion": "Inscrito",
  "estadoPago": "Pendiente",
  "apoderado": "María Torres",
  "telefono": "999888777",
  "correo": "maria.torres@gmail.com",
  "fechaRegistro": "2026-06-03T13:40:00Z"
}
```

### Colección: `pagos`
Controla las transacciones monetarias de las inscripciones.
```json
{
  "id": "PAG-5512",
  "dniEstudiante": "76543210",
  "programaId": "TALLER-BAS-2026",
  "monto": 80,
  "metodo": "Yape",
  "operacion": "12984712",
  "estado": "Pendiente",
  "fecha": "2026-06-03",
  "observaciones": ""
}
```

### Colección: `asistencias`
Registro de ingresos de los alumnos a los talleres controlados por el Auxiliar.
```json
{
  "id": "AST-1102",
  "dniEstudiante": "76543210",
  "programaId": "TALLER-BAS-2026",
  "fecha": "2026-06-03",
  "hora": "15:35:10",
  "estado": "Presente",
  "observacion": ""
}
```

---

## 5. Pautas para la Integración con Firebase

Para pasar este sistema a producción bajo el entorno Firebase de tu jefe, se deben seguir estas pautas:

### Paso 1: Configurar las Colecciones en Firestore
Crear en Firestore colecciones que correspondan con los nombres del JSON local:
*   `usuarios`
*   `estudiantes`
*   `programas`
*   `inscripciones`
*   `pagos`
*   `asistencias`

### Paso 2: Reemplazar el Adaptador del Servidor (`server/localDb.js`)
Dado que el frontend en React se comunica únicamente con `/api/db`, no necesitas reescribir todo el frontend. 

El desarrollador integrador puede modificar el archivo [localDb.js](file:///c:/Users/docente/Desktop/Modulo%20Extracurricular/server/localDb.js) para que en lugar de usar `fs.readFile()` y `fs.writeFile()`, inicialice el SDK de Firebase Admin y realice las consultas directamente sobre Firestore:

```javascript
// Ejemplo de cómo quedaría getDb() usando Firebase Admin en el servidor
import admin from "firebase-admin";

export async function getDb() {
  const db = admin.firestore();
  
  // Reconstruye el objeto de base de datos desde las colecciones de Firestore
  const estudiantesSnap = await db.collection("estudiantes").get();
  const programasSnap = await db.collection("programas").get();
  const pagosSnap = await db.collection("pagos").get();
  const inscripcionesSnap = await db.collection("inscripciones").get();
  
  return {
    estudiantes: estudiantesSnap.docs.map(doc => doc.data()),
    programas: programasSnap.docs.map(doc => doc.data()),
    pagos: pagosSnap.docs.map(doc => doc.data()),
    inscripciones: inscripcionesSnap.docs.map(doc => doc.data()),
    // ...
  };
}
```

### Paso 3: Integración de la Autenticación
El inicio de sesión del frontend (`src/components/Login/Login.jsx`) realiza llamadas a `/api/v1/auth/login`. Para pasarlo a producción con Firebase Authentication:
1.  Habilitar el proveedor "Correo electrónico y contraseña" en la consola de Firebase.
2.  Actualizar la lógica en `src/services/authService.js` para que use el método `signInWithEmailAndPassword()` del SDK de Firebase Client en lugar de las credenciales simuladas.
