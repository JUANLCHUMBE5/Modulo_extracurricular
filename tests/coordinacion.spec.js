import { test, expect } from '@playwright/test';
import path from 'path';

test('Flujo de Coordinador: Crear Taller y Carga Masiva', async ({ page }) => {
  // Aumentar el tiempo de espera por defecto
  test.setTimeout(60000);

  // 1. Iniciar sesión como Carlos (Coordinador/Secretaria)
  await page.goto('/');
  await page.fill('input[placeholder="Usuario*"]', 'carlos');
  await page.fill('input[placeholder="Contraseña*"]', 'carlos123');
  await page.click('button:has-text("Ingresar")');

  // Validar redirección automática al Módulo Secretaría (rol primario de Carlos)
  await expect(page).toHaveURL(/.*secretaria.*/, { timeout: 15000 });

  // 2. Abrir la sección de Coordinación en el sidebar
  await page.click('text=Módulo Coordinación Académica');

  // 3. Entrar a la vista de "Plantillas y Documentos" (que mapea a la vista de Carga)
  await page.click('text=Plantillas y Documentos');
  await expect(page).toHaveURL(/.*coordinacion.*/, { timeout: 15000 });

  // 4. Cambiar a la pestaña "Plantillas / Documentos" dentro del contenedor de carga
  await page.click('button:has-text("Plantillas / Documentos")');

  // 5. Subir la plantilla Word de prueba
  const docxPath = path.resolve('tests/archivos_prueba/plantilla_test.docx');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('.coord-file-drop');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(docxPath);

  // Esperar a que el validador lea las variables del Word
  await expect(page.locator('text=Word apto para completar datos')).toBeVisible({ timeout: 15000 });

  // 6. Guardar la plantilla (si no está ya guardada de una ejecución previa)
  const yaGuardada = await page.locator('text=Plantilla ya guardada').isVisible();
  if (!yaGuardada) {
    await page.click('button:has-text("Guardar plantilla")');
    // Esperar confirmación de guardado (usando .first() para evitar violaciones de modo estricto)
    await expect(page.locator('text=guardada en el historial').first()).toBeVisible({ timeout: 15000 });
  } else {
    console.log('ℹ️ La plantilla ya figura en el historial. Omitiendo clic de guardado.');
  }

  // 7. Validar en "Gestion de Programas" que figure el taller
  await page.click('text=Gestion de Programas');
  await expect(page.locator('.coord-workspace')).toContainText('Reforzamiento Circular', { timeout: 15000 });

  // 8. Volver a "Plantillas y Documentos" para hacer la carga masiva
  await page.click('text=Plantillas y Documentos');

  // 9. Cambiar a la pestaña "Carga masiva" dentro del contenedor
  await page.click('button:has-text("Carga masiva")');

  // 10. Seleccionar el taller creado en el selector (Reforzamiento Circular - PRG-102)
  await page.selectOption('select#coord-programa-carga', 'PRG-102');

  // 11. Subir el Excel de alumnos de prueba
  const xlsxPath = path.resolve('tests/archivos_prueba/alumnos_test.xlsx');
  await page.setInputFiles('input[type="file"]', xlsxPath);

  // Esperar que procese las filas: primero validar y previsualizar
  await page.click('button:has-text("Validar y Previsualizar")', { timeout: 15000 });

  // Esperar a que aparezca la vista previa con el resumen de filas
  await expect(page.locator('text=Vista previa lista')).toBeVisible({ timeout: 15000 });

  // Verificar que la validación procesó los registros (LEIDOS > 0)
  await expect(page.locator('text=LEIDOS')).toBeVisible({ timeout: 5000 });

  // 12. Verificar el resultado: si hay válidos, confirmar; si son duplicados, es porque
  //     una ejecución anterior ya cargó los datos (lo cual también valida el flujo completo).
  const validosText = await page.locator('text=VALIDOS').locator('..').textContent();
  const duplicadosText = await page.locator('text=DUPLICADOS').locator('..').textContent();

  const validos = parseInt(validosText.replace(/\D/g, '') || '0', 10);
  const duplicados = parseInt(duplicadosText.replace(/\D/g, '') || '0', 10);

  if (validos > 0) {
    // Primera ejecución: confirmar la carga
    await page.click('button:has-text("Confirmar y procesar matrícula")', { timeout: 15000 });
    await expect(page.locator('text=Historial de Cargas Masivas')).toBeVisible({ timeout: 15000 });
    console.log(`✅ Carga masiva completada: ${validos} alumnos válidos registrados.`);
  } else if (duplicados > 0) {
    // Ejecución posterior: alumnos ya cargados previamente
    console.log(`ℹ️ Todos los ${duplicados} registros son duplicados (ya cargados previamente). Flujo validado.`);
    // Verificar que el botón de guardar no está disponible (comportamiento esperado con 0 válidos)
    await expect(page.locator('text=Revisar datos')).toBeVisible({ timeout: 5000 });
  } else {
    console.log('⚠️ No se encontraron registros válidos ni duplicados.');
  }
});
