# Guía de Pruebas Funcionales Manuales (QA Test Plan)
## Sistema de Control de Programas Extracurriculares
### Institución Matemática San Rafael S.A.C.

Este documento contiene el plan de pruebas manuales y checklist paso a paso para verificar que los flujos de negocio del sistema estén 100% operativos antes del pase final a producción.

---

## 🔑 Credenciales de Prueba (Testing)
Todas las cuentas de prueba tienen configurada la contraseña temporal `1234` (ingresarla en texto plano en la vista de login).

| Rol | Usuario | Propósito en la Prueba |
| :--- | :--- | :--- |
| **Administrador** | `admin` | Gestión de logs de auditoría y base de datos. |
| **Secretaría** | `secretaria` | Registro de inscripciones y generación de fichas. |
| **Coordinación** | `coordinacion` | Creación de talleres, horarios, precios y cargas Excel. |
| **Caja** | `caja` | Cobro presencial y validación de transferencias Yape. |
| **Auxiliar** | `aux` | Registro de asistencias y escaneo de códigos QR. |
| **Dirección** | `dir` | Visualización de reportes y gráficas gerenciales. |

---

## 📋 Checklist de Pruebas por Flujo de Trabajo

### Flujo 1: Inicio de Sesión y Control de Accesos
*   [ ] **Caso 1.1: Login Exitoso**
    *   Ingresar al sistema con el usuario `admin` y contraseña `1234`.
    *   *Resultado Esperado:* Ingreso correcto y redirección al panel de Administrador.
*   [ ] **Caso 1.2: Login Fallido**
    *   Ingresar con usuario `admin` y una contraseña incorrecta (ej. `5678`).
    *   *Resultado Esperado:* Mensaje de error visible ("Usuario o contraseña incorrectos") y bloqueo de acceso.
*   [ ] **Caso 1.3: Control de Roles en Navegación**
    *   Iniciar sesión como `caja`. Intentar ingresar manualmente a la ruta `/coordinacion` desde la barra de direcciones.
    *   *Resultado Esperado:* Redirección de seguridad o bloqueo de pantalla por falta de permisos.

---

### Flujo 2: Módulo de Coordinación (Configuración de Talleres)
*   [ ] **Caso 2.1: Creación de Taller Manual**
    *   Entrar como `coordinacion`. Ir a "Programas" y hacer clic en "Nuevo Programa".
    *   Llenar datos básicos: Nombre (ej. *Fútbol Selección 2026*), categoría *Deportivo*, costo *S/. 120*, cupos *20*, y seleccionar grados aplicables. Guardar.
    *   *Resultado Esperado:* El taller debe aparecer listado en la grilla principal inmediatamente con estado "Habilitado".
*   [ ] **Caso 2.2: Carga Masiva de Alumnos Invitados (Excel)**
    *   En el panel de Coordinación, seleccionar un programa e ir a "Carga Masiva".
    *   Subir un archivo Excel con la plantilla de invitados del colegio.
    *   *Resultado Esperado:* Vista previa correcta de los alumnos mapeados. Al confirmar la carga, los estudiantes deben figurar en la lista de "Invitados" del taller.

---

### Flujo 3: Módulo de Secretaría (Inscripciones Presenciales)
*   [ ] **Caso 3.1: Búsqueda de Estudiante**
    *   Entrar como `secretaria`. Ir a "Inscripciones" y buscar un DNI de la base semilla (ej. `10101111` o buscar por nombre *"Fabian Cruz"*).
    *   *Resultado Esperado:* Ficha del alumno cargada con datos personales e invitaciones activas visibles.
*   [ ] **Caso 3.2: Registrar Inscripción en Taller Invitado**
    *   Buscar un alumno que tenga una invitación activa. Seleccionar el taller asociado.
    *   Ingresar los datos del apoderado, WhatsApp (9 dígitos) y guardar.
    *   *Resultado Esperado:* Registro exitoso, decremento del cupo disponible del taller en 1 unidad, y generación del PDF del "Comunicado/Ficha de Aceptación".
*   [ ] **Caso 3.3: Registrar Alumno Externo (Verano)**
    *   En período de "Ciclo Verano", registrar una inscripción para un alumno que no pertenece al colegio (marcar checklist "Alumno Externo").
    *   *Resultado Esperado:* El sistema debe permitir el registro y crear un DNI temporal en la base de datos de externos.

---

### Flujo 4: Módulo de Padres (Auto-consulta y Carga de Pagos)
*   [ ] **Caso 4.1: Validación de Acceso de Apoderado**
    *   Ingresar al "Portal Padres". Digitar el DNI del estudiante (ej. `10101111`) y su fecha de nacimiento (`2010-01-01`).
    *   *Resultado Esperado:* Acceso correcto al portal del estudiante.
*   [ ] **Caso 4.2: Descarga de Ficha y Aceptación de Condiciones**
    *   Visualizar la invitación disponible. Aceptar los términos y condiciones deslizando el panel de lectura.
    *   *Resultado Esperado:* Habilitación del botón "Continuar con la inscripción" y descarga del comunicado en PDF para firmar.
*   [ ] **Caso 4.3: Registro de Pago Web (Subir Voucher Yape)**
    *   Continuar al paso de pago. Ingresar el número de operación del Yape simulado, número de teléfono y cargar una captura del voucher (imagen PNG/JPG). Guardar.
    *   *Resultado Esperado:* El estado de la inscripción pasa a "Pendiente de validación por Caja".

---

### Flujo 5: Módulo de Caja (Gestión de Recaudación)
*   [ ] **Caso 5.1: Validación de Pago Web (Yape)**
    *   Iniciar sesión como `caja`. Ir a "Validación de Pagos".
    *   Localizar el registro enviado en el caso 4.3. Ver la imagen del voucher.
    *   Hacer clic en "Aprobar Pago" e ingresar el número de recibo físico correlativo.
    *   *Resultado Esperado:* El estado de la inscripción cambia a "Pago Validado / Inscrito".
*   [ ] **Caso 5.2: Cobro Directo en Ventanilla (Efectivo/POS)**
    *   Buscar una inscripción derivada por Secretaría.
    *   Seleccionar cobrar en ventanilla, método "Efectivo", procesar e imprimir el recibo de caja.
    *   *Resultado Esperado:* El pago queda registrado instantáneamente y se actualiza el flujo.

---

### Flujo 6: Módulo de Auxiliar (Control de Puerta)
*   [ ] **Caso 6.1: Verificación de Código QR**
    *   Iniciar sesión como `aux`. Abrir la cámara/lector QR del sistema.
    *   Escanear el código QR del alumno que ya tiene pago aprobado (descargable desde el Portal de Padres).
    *   *Resultado Esperado:* Pantalla verde con sonido/indicación de "ACCESO PERMITIDO", mostrando nombres del alumno y taller.
*   [ ] **Caso 6.2: Registro de Asistencia Manual**
    *   En caso de que el alumno no traiga su QR, ingresar su DNI en el buscador de la puerta.
    *   *Resultado Esperado:* Permite marcar la asistencia manualmente y registrar el ingreso en la base de datos de Asistencia del día.

---

### Flujo 7: Módulo de Dirección y Administrador
*   [ ] **Caso 7.1: Gráficos de Recaudación en Tiempo Real**
    *   Ingresar como `dir` (Dirección).
    *   *Resultado Esperado:* Panel con gráficos de torta/barras mostrando recaudación proyectada vs. real, alumnos becados y cantidad de inscritos por categoría.
*   [ ] **Caso 7.2: Descarga de Reportes Consolidados**
    *   Ir a "Descargar Reportes" en Dirección. Generar el reporte Excel completo.
    *   *Resultado Esperado:* Descarga de un archivo `.xlsx` estructurado con hojas separadas para "Resumen", "Programas", "Inscripciones" y "Pagos".
*   [ ] **Caso 7.3: Auditoría y Respaldo de Base de Datos**
    *   Entrar como `admin`. Ir a "Logs de Auditoría".
    *   *Resultado Esperado:* Verificación de que cada acción realizada en los pasos anteriores (login, inscripciones, aprobaciones de pago) esté registrada con fecha, hora, usuario y acción.
