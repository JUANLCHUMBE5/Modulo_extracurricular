import { test, expect } from '@playwright/test';

test.describe('Verificación de Módulos Adicionales (Administrador, Caja, Dirección, Auxiliar)', () => {
  
  test('Flujo de Administrador: Verificación de Dashboard de Usuarios', async ({ page }) => {
    // 1. Iniciar sesión como Mauricio (Administrador)
    await page.goto('/');
    await page.fill('input[placeholder="Usuario*"]', 'mauricio');
    await page.fill('input[placeholder="Contraseña*"]', '123456');
    await page.click('button:has-text("Ingresar")');

    // Validar redirección automática al Módulo Administrador
    await expect(page).toHaveURL(/.*administrador.*/, { timeout: 15000 });

    // Validar título y cards principales
    await expect(page.locator('text=Administración de usuarios')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Directorio de usuarios')).toBeVisible({ timeout: 15000 });

    // Validar que se muestre al menos un usuario (ej. admin o carlos)
    await expect(page.locator('table')).toContainText('carlos');
    await expect(page.locator('table')).toContainText('pedro');
  });

  test('Flujo de Cajera: Registrar Cobro y Reportes', async ({ page }) => {
    // 1. Iniciar sesión como Carlos (tiene todos los permisos asignados)
    await page.goto('/');
    await page.fill('input[placeholder="Usuario*"]', 'carlos');
    await page.fill('input[placeholder="Contraseña*"]', 'carlos123');
    await page.click('button:has-text("Ingresar")');

    // Validar redirección al módulo por defecto (secretaria)
    await expect(page).toHaveURL(/.*secretaria.*/, { timeout: 15000 });

    // Expandir Módulo Cajera en la barra lateral
    await page.click('text=Módulo Cajera');
    
    // Hacer clic en "Registrar Cobro" para navegar efectivamente
    await page.click('text=Registrar Cobro');
    await expect(page).toHaveURL(/.*caja\/pagos.*/, { timeout: 15000 });

    // Verificar sección del buscador de Caja
    await expect(page.locator('text=Buscar estudiante')).toBeVisible({ timeout: 15000 });

    // Buscar al alumno por DNI (Daniel Garcia Paredes)
    const DNI_TEST = '60000031';
    await page.fill('input[placeholder="DNI o nombres del estudiante"]', DNI_TEST);
    await page.click('button:has-text("Buscar")');

    // Locators para esperar la respuesta de la búsqueda
    const msgLoc = page.locator('text=pero Asistente aun no derivo');
    const panelLoc = page.locator('text=Datos del pago');

    // Esperar a que ocurra la navegación/búsqueda (aparece el mensaje de no pendientes o los datos del pago)
    await expect(msgLoc.or(panelLoc)).toBeVisible({ timeout: 15000 });

    const sinPendientes = await msgLoc.isVisible();

    if (sinPendientes) {
      console.log('ℹ️ El estudiante ya pagó o no tiene talleres pendientes de cobro. Flujo de consulta validado.');
    } else {
      // Si tiene pago pendiente, se habrán cargado sus datos en el resumen de cobros.
      await expect(page.locator('text=Daniel Garcia Paredes')).toBeVisible({ timeout: 15000 });

      // Registrar el pago
      await page.click('button:has-text("Registrar pago")');

      // Esperar la notificación de éxito (toast)
      await expect(page.locator('text=Pago aprobado').first()).toBeVisible({ timeout: 15000 });
      console.log('✅ Pago del taller registrado y aprobado exitosamente en Caja.');
    }
  });

  test('Flujo de Dirección: Dashboard de Métricas y Reportes', async ({ page }) => {
    // 1. Iniciar sesión como Carlos
    await page.goto('/');
    await page.fill('input[placeholder="Usuario*"]', 'carlos');
    await page.fill('input[placeholder="Contraseña*"]', 'carlos123');
    await page.click('button:has-text("Ingresar")');

    // Expandir Módulo Dirección
    await page.click('text=Módulo Dirección');

    // Hacer clic en "Resumen General" (o "Resumen general") para navegar
    await page.click('text=Resumen General');
    await expect(page).toHaveURL(/.*direccion\/resumen.*/, { timeout: 15000 });

    // Verificar métricas y dashboards
    await expect(page.locator('text=TOTAL RECAUDADO')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=PROYECCIÓN TOTAL')).toBeVisible({ timeout: 15000 });
  });

  test('Flujo de Auxiliar: Registro de Asistencias', async ({ page }) => {
    // 1. Iniciar sesión como Carlos
    await page.goto('/');
    await page.fill('input[placeholder="Usuario*"]', 'carlos');
    await page.fill('input[placeholder="Contraseña*"]', 'carlos123');
    await page.click('button:has-text("Ingresar")');

    // Expandir Módulo Auxiliar
    await page.click('text=Módulo Auxiliar');

    // Hacer clic en "Registrar Asistencia"
    await page.click('text=Registrar Asistencia');
    await expect(page).toHaveURL(/.*auxiliar\/asistencia.*/, { timeout: 15000 });

    // Verificar interfaz del auxiliar
    await expect(page.locator('text=Portal de Ingreso Taller')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Escaneo de Acceso')).toBeVisible({ timeout: 15000 });
  });

});
