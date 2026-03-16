import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Life Admin AI')).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Welcome back')).toBeVisible();
});

test('signup page loads', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByText('Create your account')).toBeVisible();
});

test('dashboard loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Good')).toBeVisible();
});
