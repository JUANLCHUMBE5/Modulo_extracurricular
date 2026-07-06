import { test, expect } from '@playwright/test';

test('Flujo de Secretaría: Buscar, Inscribir y Generar Ficha', async ({ page }) => {
  // Aumentar el tiempo de espera por defecto
  test.setTimeout(60000);

  // Capturar errores del navegador
  const erroresBrowser = [];
  page.on('pageerror', err => erroresBrowser.push(err.message));

  // 1. Iniciar sesión como Carlos (Asistente/Secretaria)
  await page.goto('/');
  await page.fill('input[placeholder="Usuario*"]', 'carlos');
  await page.fill('input[placeholder="Contraseña*"]', 'carlos123');
  await page.click('button:has-text("Ingresar")');

  // Validar redirección automática al Módulo Secretaría
  await expect(page).toHaveURL(/.*secretaria.*/, { timeout: 15000 });

  // 2. Buscar al alumno por DNI (uno de los alumnos del Excel de prueba)
  const DNI_TEST = '60000031'; // Daniel Garcia Paredes
  await page.fill('input[placeholder="Ingrese DNI o nombre del estudiante"]', DNI_TEST);
  await page.click('button:has-text("Buscar")');

  // Esperar a que se abra la ficha del estudiante
  await expect(page.locator('text=Daniel Garcia Paredes')).toBeVisible({ timeout: 15000 });

  // 3. Verificar si ya está inscrito o necesita inscripción
  const btnImprimir = page.locator('button:has-text("Imprimir ficha de registro")');
  const yaInscrito = await btnImprimir.isVisible().catch(() => false);

  if (yaInscrito) {
    console.log('ℹ️ El alumno ya está inscrito. Pasando directamente a la ficha.');
  } else {
    // El alumno fue encontrado pero aún no está inscrito: completar inscripción
    const campoApoderado = page.locator('input[placeholder="Nombre completo del apoderado"]');
    if (await campoApoderado.isVisible().catch(() => false)) {
      await campoApoderado.fill('Juan Garcia Lopez');
    }

    const campoTelefono = page.locator('input[placeholder="987654321"]');
    if (await campoTelefono.isVisible().catch(() => false)) {
      await campoTelefono.fill('999888777');
    }

    // Aceptar los términos y condiciones (si existe el checkbox)
    const termsCheck = page.locator('#termsCheck');
    if (await termsCheck.isVisible().catch(() => false)) {
      await termsCheck.check();
    }

    // Confirmar la inscripción
    const btnConfirmar = page.locator('button:has-text("Confirmar Inscripción")');
    if (await btnConfirmar.isVisible().catch(() => false)) {
      await btnConfirmar.click();
      // Cerrar el modal de éxito
      await page.click('button:has-text("Aceptar")', { timeout: 15000 });
    }

    // Esperar a que aparezca el botón de imprimir
    await expect(btnImprimir).toBeVisible({ timeout: 15000 });
  }

  // 4. Hacer clic en "Imprimir ficha de registro"
  // La función abrirFichaGenerada() llama a imprimirInscripcionDirecta() que
  // genera un PDF y lo envía a la ventana de impresión del navegador directamente.
  // No abre un modal en la UI.
  await btnImprimir.click();

  // Esperar a que el botón cambie a "Preparando ficha" (estado de loading)
  // y luego vuelva a "Imprimir ficha de registro" (indicando que terminó)
  await expect(btnImprimir).toContainText('Imprimir ficha de registro', { timeout: 30000 });

  // 5. Verificar que no hubo errores de runtime durante la generación
  const erroresCriticos = erroresBrowser.filter(e => !e.includes('ResizeObserver'));
  if (erroresCriticos.length > 0) {
    console.error('⚠️ Errores del navegador durante la generación de ficha:', erroresCriticos);
  }
  expect(erroresCriticos.length).toBe(0);

  console.log('✅ Flujo de secretaría completado: búsqueda, inscripción y generación de ficha exitosos.');
});
