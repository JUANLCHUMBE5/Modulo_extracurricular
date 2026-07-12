# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coordinacion.spec.js >> Flujo de Coordinador: Crear Taller y Carga Masiva
- Location: tests\coordinacion.spec.js:4:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.selectOption: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('select#coord-programa-carga')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - button "Alternar barra lateral" [ref=e6] [cursor=pointer]:
          - img [ref=e7]
        - generic "Colegio San Rafael" [ref=e8]:
          - img "Colegio San Rafael" [ref=e9]
      - button "Módulo Asistente" [ref=e11] [cursor=pointer]:
        - generic [ref=e12]:
          - img [ref=e13]
          - generic [ref=e16]: Módulo Asistente
        - img [ref=e19]
      - generic [ref=e22]:
        - generic [ref=e23]:
          - button "Módulo Coordinación Académica" [ref=e24] [cursor=pointer]:
            - generic [ref=e25]:
              - img [ref=e26]
              - generic [ref=e29]: Módulo Coordinación Académica
            - img [ref=e32]
          - generic [ref=e34]:
            - button "Gestion de Programas" [ref=e35] [cursor=pointer]:
              - generic [ref=e36]: Gestion de Programas
            - button "Cargar Invitados" [ref=e37] [cursor=pointer]:
              - generic [ref=e38]: Cargar Invitados
            - button "Plantillas y Documentos" [ref=e39] [cursor=pointer]:
              - generic [ref=e40]: Plantillas y Documentos
            - button "Asistencia y Control" [ref=e41] [cursor=pointer]:
              - generic [ref=e42]: Asistencia y Control
            - button "Historial / Archivo" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]: Historial / Archivo
        - button "Módulo Cajera" [ref=e46] [cursor=pointer]:
          - generic [ref=e47]:
            - img [ref=e48]
            - generic [ref=e51]: Módulo Cajera
          - img [ref=e54]
        - button "Módulo Dirección" [ref=e57] [cursor=pointer]:
          - generic [ref=e58]:
            - img [ref=e59]
            - generic [ref=e61]: Módulo Dirección
          - img [ref=e64]
        - button "Módulo Auxiliar" [ref=e67] [cursor=pointer]:
          - generic [ref=e68]:
            - img [ref=e69]
            - generic [ref=e73]: Módulo Auxiliar
          - img [ref=e76]
      - button "Cerrar sesion" [ref=e79] [cursor=pointer]:
        - img [ref=e80]
        - generic [ref=e84]: Cerrar sesion
    - main [ref=e85]:
      - main [ref=e87]:
        - generic [ref=e89]:
          - tablist "Tipo de carga de alumnos" [ref=e90]:
            - button "Carga masiva" [active] [ref=e91] [cursor=pointer]:
              - img [ref=e92]
              - text: Carga masiva
            - button "Exportar forma masiva" [ref=e96] [cursor=pointer]:
              - img [ref=e97]
              - text: Exportar forma masiva
            - button "Plantillas / Documentos" [ref=e100] [cursor=pointer]:
              - img [ref=e101]
              - text: Plantillas / Documentos
            - button "Anuncios" [ref=e104] [cursor=pointer]:
              - img [ref=e105]
              - text: Anuncios
          - article [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - img [ref=e112]
                  - text: Código del programa o curso
                - combobox "Código del programa o curso" [ref=e116]:
                  - option "Seleccione programa o curso" [selected]
                  - option "PRG-102 - Reforzamiento Circular 2026 Inicial Y Primaria Ii Ciclo"
                  - option "PRG-104 - Test"
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - img [ref=e119]
                  - text: Archivo (Excel)
                - generic [ref=e123] [cursor=pointer]:
                  - img [ref=e124]
                  - generic [ref=e127]:
                    - paragraph [ref=e128]: Arrastra tu archivo o haz clic para elegir
                    - generic [ref=e129]: .xlsx, .xls — máx 5 MB
                  - button "Choose File"
            - generic [ref=e130]:
              - img [ref=e131]
              - paragraph [ref=e135]: Seleccione programa, archivo y revise Vista previa antes de guardar.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | test('Flujo de Coordinador: Crear Taller y Carga Masiva', async ({ page }) => {
  5  |   // Aumentar el tiempo de espera por defecto
  6  |   test.setTimeout(60000);
  7  | 
  8  |   // 1. Iniciar sesión como Carlos (Coordinador/Secretaria)
  9  |   await page.goto('/');
  10 |   await page.fill('input[placeholder="Usuario*"]', 'carlos');
  11 |   await page.fill('input[placeholder="Contraseña*"]', 'carlos123');
  12 |   await page.click('button:has-text("Ingresar")');
  13 | 
  14 |   // Validar redirección automática al Módulo Secretaría (rol primario de Carlos)
  15 |   await expect(page).toHaveURL(/.*secretaria.*/, { timeout: 15000 });
  16 | 
  17 |   // 2. Abrir la sección de Coordinación en el sidebar
  18 |   await page.click('text=Módulo Coordinación Académica');
  19 | 
  20 |   // 3. Entrar a la vista de "Plantillas y Documentos" (que mapea a la vista de Carga)
  21 |   await page.click('text=Plantillas y Documentos');
  22 |   await expect(page).toHaveURL(/.*coordinacion.*/, { timeout: 15000 });
  23 | 
  24 |   // 4. Cambiar a la pestaña "Plantillas / Documentos" dentro del contenedor de carga
  25 |   await page.click('button:has-text("Plantillas / Documentos")');
  26 | 
  27 |   // 5. Subir la plantilla Word de prueba
  28 |   const docxPath = path.resolve('tests/archivos_prueba/plantilla_test.docx');
  29 |   const fileChooserPromise = page.waitForEvent('filechooser');
  30 |   await page.click('.coord-file-drop');
  31 |   const fileChooser = await fileChooserPromise;
  32 |   await fileChooser.setFiles(docxPath);
  33 | 
  34 |   // Esperar a que el validador lea las variables del Word
  35 |   await expect(page.locator('text=Word apto para completar datos')).toBeVisible({ timeout: 15000 });
  36 | 
  37 |   // 6. Guardar la plantilla (si no está ya guardada de una ejecución previa)
  38 |   const yaGuardada = await page.locator('text=Plantilla ya guardada').isVisible();
  39 |   if (!yaGuardada) {
  40 |     await page.click('button:has-text("Guardar plantilla")');
  41 |     // Esperar confirmación de guardado (usando .first() para evitar violaciones de modo estricto)
  42 |     await expect(page.locator('text=guardada en el historial').first()).toBeVisible({ timeout: 15000 });
  43 |   } else {
  44 |     console.log('ℹ️ La plantilla ya figura en el historial. Omitiendo clic de guardado.');
  45 |   }
  46 | 
  47 |   // 7. Validar en "Gestion de Programas" que figure el taller
  48 |   await page.click('text=Gestion de Programas');
  49 |   await expect(page.locator('.coord-workspace')).toContainText('Reforzamiento Circular', { timeout: 15000 });
  50 | 
  51 |   // 8. Volver a "Plantillas y Documentos" para hacer la carga masiva
  52 |   await page.click('text=Plantillas y Documentos');
  53 | 
  54 |   // 9. Cambiar a la pestaña "Carga masiva" dentro del contenedor
  55 |   await page.click('button:has-text("Carga masiva")');
  56 | 
  57 |   // 10. Seleccionar el taller creado en el selector (Reforzamiento Circular - PRG-102)
> 58 |   await page.selectOption('select#coord-programa-carga', 'PRG-102');
     |              ^ Error: page.selectOption: Test timeout of 60000ms exceeded.
  59 | 
  60 |   // 11. Subir el Excel de alumnos de prueba
  61 |   const xlsxPath = path.resolve('tests/archivos_prueba/alumnos_test.xlsx');
  62 |   await page.setInputFiles('input[type="file"]', xlsxPath);
  63 | 
  64 |   // Esperar que procese las filas: primero validar y previsualizar
  65 |   await page.click('button:has-text("Validar y Previsualizar")', { timeout: 15000 });
  66 | 
  67 |   // Esperar a que aparezca la vista previa con el resumen de filas
  68 |   await expect(page.locator('text=Vista previa lista')).toBeVisible({ timeout: 15000 });
  69 | 
  70 |   // Verificar que la validación procesó los registros (LEIDOS > 0)
  71 |   await expect(page.locator('text=LEIDOS')).toBeVisible({ timeout: 5000 });
  72 | 
  73 |   // 12. Verificar el resultado: si hay válidos, confirmar; si son duplicados, es porque
  74 |   //     una ejecución anterior ya cargó los datos (lo cual también valida el flujo completo).
  75 |   const validosText = await page.locator('text=VALIDOS').locator('..').textContent();
  76 |   const duplicadosText = await page.locator('text=DUPLICADOS').locator('..').textContent();
  77 | 
  78 |   const validos = parseInt(validosText.replace(/\D/g, '') || '0', 10);
  79 |   const duplicados = parseInt(duplicadosText.replace(/\D/g, '') || '0', 10);
  80 | 
  81 |   if (validos > 0) {
  82 |     // Primera ejecución: confirmar la carga
  83 |     await page.click('button:has-text("Confirmar y procesar matrícula")', { timeout: 15000 });
  84 |     await expect(page.locator('text=Historial de Cargas Masivas')).toBeVisible({ timeout: 15000 });
  85 |     console.log(`✅ Carga masiva completada: ${validos} alumnos válidos registrados.`);
  86 |   } else if (duplicados > 0) {
  87 |     // Ejecución posterior: alumnos ya cargados previamente
  88 |     console.log(`ℹ️ Todos los ${duplicados} registros son duplicados (ya cargados previamente). Flujo validado.`);
  89 |     // Verificar que el botón de guardar no está disponible (comportamiento esperado con 0 válidos)
  90 |     await expect(page.locator('text=Revisar datos')).toBeVisible({ timeout: 5000 });
  91 |   } else {
  92 |     console.log('⚠️ No se encontraron registros válidos ni duplicados.');
  93 |   }
  94 | });
  95 | 
```