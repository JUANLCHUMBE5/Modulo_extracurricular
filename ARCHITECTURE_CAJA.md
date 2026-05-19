# Arquitectura del Módulo de Caja

## 📁 Estructura de Archivos

```
src/modules/caja/
├── Caja.jsx              # Componente principal (560 líneas)
├── Caja.css              # Estilos (265 líneas)
├── cajaService.js        # Servicios de API (116 líneas)
├── Caja_new.jsx          # Versión refactorizada (374 líneas)
├── index.js              # Exportación por defecto
└── components/           # (Para futura refactorización)
    ├── ResumenCaja.jsx
    ├── CajaFields.jsx
    └── ...
```

## 🔄 Flujo de Datos

### 1. Autenticación
```
Login (username: "caja", password: "1234")
    ↓
authService.loginPersonal()
    ↓
rolesSistema["Caja"] → "caja"
    ↓
App.jsx renderiza Caja component
```

### 2. Carga Inicial
```
Caja component (useEffect)
    ↓
cargarPagos() → cajaService.listarPagos()
cargarResumen() → cajaService.obtenerResumenCaja()
    ↓
apiDb.pagos (localStorage)
    ↓
setState (pagos, resumen)
    ↓
Renderización de UI
```

### 3. Registro de Pago
```
Usuario: clic en "Registrar Pago"
    ↓
Modal abierto → CajaFields
    ↓
Usuario: busca estudiante por DNI
    ↓
obtenerEstudiantePorDni(dni) → apiDb.estudiantes
    ↓
Formulario precargado con datos del estudiante
    ↓
Usuario: completa datos del pago
    ↓
guardarPago()
    ↓
registrarPago() → cajaService
    ↓
Guardado en apiDb.pagos
    ↓
cargarPagos() + cargarResumen()
    ↓
UI actualizada
```

### 4. Descarga de Reportes
```
Usuario: clic en "Descargar Reporte"
    ↓
generarReportePagos() → cajaService
    ↓
generarCSV(datos)
    ↓
descargarArchivo() → CSV en navegador
```

## 🎯 Componentes React

### Caja (Componente Principal)
**Props:**
- `onLogout`: Función para cerrar sesión

**Estado:**
- `periodo`: "escolar" | "verano"
- `formulario`: Datos del pago en edición
- `pagos`: Array de pagos
- `resumen`: Objeto con totales
- `buscando`: Boolean para estado de búsqueda
- `estudiante`: Datos del estudiante encontrado
- `dni`: DNI ingresado en búsqueda
- `modalAbierto`: Boolean para modal
- `pagoSeleccionado`: Pago en edición
- `modoEdicion`: Boolean para modo edición
- `mensaje`: Mensajes de error
- `modalExito`: Boolean para modal de éxito

**Funciones:**
- `cargarPagos()`: Obtiene pagos del período
- `cargarResumen()`: Calcula totales
- `buscarEstudiante()`: Busca por DNI
- `guardarPago()`: Registra o actualiza pago
- `validarDatos()`: Valida formulario
- `abrirModalNuevo()`: Abre modal para registro
- `abrirModalEdicion()`: Abre modal para edición
- `cerrarModal()`: Cierra modal
- `descargarReporte()`: Genera y descarga CSV
- `generarCSV()`: Convierte datos a formato CSV
- `descargarArchivo()`: Descarga archivo al cliente

### ResumenCaja (Componente Inline)
**Props:**
- `resumen`: Objeto con totalIngreso, totalPendiente, totalCancelado, cantidadPagos, cantidadPendientes

**Renderiza:**
3 tarjetas Mantine con información de totales

### CajaFields (Componente Inline)
**Props:**
- `formulario`: Datos actuales del formulario
- `setFormulario`: Función para actualizar formulario
- `estudiante`: Datos del estudiante encontrado
- `dni`: DNI ingresado
- `setDni`: Función para actualizar DNI
- `buscando`: Boolean para estado de búsqueda
- `onBuscar`: Función para buscar estudiante
- `modoEdicion`: Boolean para modo edición

**Renderiza:**
- Sección de búsqueda de estudiante
- Sección de datos de pago
- Campo de observaciones

## 🔗 Integración con Servicios

### cajaService.js

#### listarPagos(periodo, filtros)
```javascript
Parámetros:
  - periodo: "escolar" | "verano"
  - filtros: { estudianteDni?, estado?, programa? }

Retorna:
  Array<Pago> ordenado por fecha descendente

Efecto:
  - Sincroniza con apiDb
  - Filtra según criterios
  - Simula delay de 400ms
```

#### registrarPago(datosPago)
```javascript
Parámetros:
  - datosPago: { estudianteDni, estudianteNombre, monto, concepto, ... }

Retorna:
  Pago registrado con ID generado

Efecto:
  - Genera ID único
  - Agrega timestamp
  - Guarda en apiDb.pagos
  - Dispara evento de actualización
```

#### actualizarPago(pagoId, datosActualizados)
```javascript
Parámetros:
  - pagoId: string (ID del pago)
  - datosActualizados: objeto parcial de Pago

Retorna:
  Pago actualizado

Efecto:
  - Busca pago por ID
  - Fusiona datos
  - Agrega timestamp de actualización
  - Guarda cambios
```

#### obtenerResumenCaja(periodo)
```javascript
Parámetros:
  - periodo: "escolar" | "verano"

Retorna:
  {
    totalIngreso: number,
    totalPendiente: number,
    totalCancelado: number,
    cantidadPagos: number,
    cantidadPendientes: number
  }

Efecto:
  - Calcula totales por estado
  - Cuenta cantidad de pagos
```

#### obtenerEstudiantePorDni(dni)
```javascript
Parámetros:
  - dni: string (8 dígitos)

Retorna:
  Objeto Estudiante | null

Efecto:
  - Busca en apiDb.estudiantes
  - Simula delay de 200ms
```

#### generarReportePagos(filtros)
```javascript
Parámetros:
  - filtros: { periodo?, ...otros }

Retorna:
  Array<Pago> filtrado

Efecto:
  - Llama a listarPagos con filtros
  - Simula delay de 500ms
```

## 💾 Estructura de Datos

### Objeto Pago
```javascript
{
  id: string,                    // Generado: "pago_1", "pago_2", etc.
  estudianteDni: string,         // 8 dígitos
  estudianteNombre: string,      // Nombre completo
  programaId: string,            // Referencia a programa
  programaNombre: string,        // Nombre del programa
  monto: number,                 // En soles
  concepto: string,              // "Matrícula" | "Mensualidad" | "Cuota Extraordinaria" | "Otros"
  formaPago: string,             // "Efectivo" | "Transferencia" | "Tarjeta Débito" | "Tarjeta Crédito"
  estado: string,                // "pendiente" | "completado" | "cancelado"
  fechaPago: string,             // ISO 8601
  observaciones: string,         // Notas opcionales
  fecha: string,                 // ISO 8601 (timestamp de creación)
  createdAt: string,             // ISO 8601
  updatedAt: string              // ISO 8601 (si fue actualizado)
}
```

### Objeto Estudiante
```javascript
{
  dni: string,
  codigoEstudiante: string,
  nombres: string,
  apellidos: string,
  sexo: string,
  grado: string,
  seccion: string,
  tipoAlumno: string,
  fechaNacimiento: string,
  estadoInscripcion: string,
  apoderado: string,
  telefonoApoderado: string
}
```

## 🎨 Estilos Principales

- `.caja-container`: Contenedor principal (padding, max-width)
- `.caja-header`: Encabezado con título e ícono
- `.caja-period-selector`: Selector de período
- `.caja-resumen-grid`: Grid de 3 columnas para resumen
- `.caja-resumen-card`: Tarjetas de totales
- `.caja-actions`: Botones de acción
- `.caja-table-container`: Contenedor de tabla
- `.caja-fields-container`: Contenedor de formulario
- `.caja-search-section`: Sección de búsqueda
- `.caja-payment-section`: Sección de datos de pago

## 🔐 Validaciones

- DNI: 8 dígitos requeridos
- Monto: Mayor a 0
- Estudiante: Debe estar seleccionado
- Concepto: Requerido con opciones predefinidas
- Forma de Pago: Requerida con opciones predefinidas
- Estado: Requerido con opciones predefinidas
- Fecha de Pago: Requerida

## 📱 Responsividad

- Grid de resumen: auto-fit con mínimo de 250px
- Tabla: Scroll horizontal en dispositivos pequeños
- Modal: Tamaño "lg" para formularios
- Todos los componentes: Mantine responsive hooks

## 🔄 Ciclo de Vida

1. **Montaje (Mount)**
   - useEffect[] ejecuta: cargarPagos(), cargarResumen()

2. **Cambio de Período**
   - useEffect[periodo] ejecuta: cargarPagos(), cargarResumen()

3. **Evento de Actualización**
   - window.dispatchEvent("mock-db-updated") tras cambios
   - Se puede escuchar para recargar datos automáticamente

## 🎯 Próximas Mejoras (Opcionales)

- [ ] Refactorizar componentes en archivos separados
- [ ] Agregar paginación en tabla de pagos
- [ ] Filtrado avanzado de pagos
- [ ] Gráficos de estadísticas
- [ ] Exportación a PDF
- [ ] Autenticación de usuario en cada acción
- [ ] Historial de cambios
- [ ] Validación de monto por programa
- [ ] Integración con API real
- [ ] Tests automatizados
