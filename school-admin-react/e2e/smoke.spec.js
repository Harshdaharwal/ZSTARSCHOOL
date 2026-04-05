import { test, expect } from '@playwright/test';

test('staff login mock and dashboard', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByLabel(/email/i).fill('testing@gmail.com');
  await page.getByLabel(/^password$/i).fill('Test@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\//);
  await expect(page.getByText(/today's timetable|dashboard/i).first()).toBeVisible({ timeout: 15000 });
});

test('teacher student results page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('testing@gmail.com');
  await page.getByLabel(/^password$/i).fill('Test@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\//);
  await page.getByRole('link', { name: /student results/i }).click();
  await expect(page).toHaveURL(/\/results/);
  await expect(page.getByText(/student results/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/subject marks/i)).toBeVisible();
});

