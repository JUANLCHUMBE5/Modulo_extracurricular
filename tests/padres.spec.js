import { test, expect } from '@playwright/test';

test('Flujo de Padres: Iniciar Sesión y Visualizar Invitación', async ({ page }) => {
  // 1. Ir a la página de login
  await page.goto('/');

  // 2. Cambiar al modo "Padres"
  await page.click('button:has-text("Padres")');

  // 3. Rellenar los datos del estudiante
  const DNI_TEST = '10101111'; // Fabian Cruz Salazar
  await page.fill('input[placeholder="DNI del estudiante*"]', DNI_TEST);
  await page.fill('input[type="date"]', '2010-01-01');

  // 4. Hacer clic en Ingresar
  await page.click('button:has-text("Ingresar")');

  // Validar redirección al portal de padres
  await expect(page).toHaveURL(/.*padres.*/);

  // 5. Verificar que se visualice la información del alumno
  await expect(page.locator('text=Fabian Cruz Salazar')).toBeVisible();
  await expect(page.locator('text=Bienvenido familia de')).toBeVisible();
});
