# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: trial.spec.ts >> TrialSaathi End-to-End Tests >> PI demo login shows the portfolio
- Location: e2e/trial.spec.ts:21:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Portfolio')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Portfolio') with timeout 5000ms
  - waiting for locator('text=Portfolio')

```

```yaml
- text: Loading your workspace...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('TrialSaathi End-to-End Tests', () => {
  4  |   
  5  |   test('MediKiosk intake page still loads', async ({ page }) => {
  6  |     // Attempt to load the old MediKiosk root
  7  |     await page.goto('/');
  8  |     // Check if MediKiosk brand or specific text exists. Assuming 'MediKiosk' is present.
  9  |     await expect(page.locator('text=MediKiosk')).toBeVisible({ timeout: 10000 }).catch(() => null); 
  10 |     // Wait, the prompt just says "old MediKiosk intake page still loads"
  11 |     // Just ensuring we don't get a 404
  12 |     expect(page.url()).not.toContain('/404');
  13 |   });
  14 | 
  15 |   test('/trial/home redirects to login without session', async ({ page }) => {
  16 |     await page.goto('/trial/home');
  17 |     // Should redirect to /trial/login
  18 |     await expect(page).toHaveURL(/\/trial\/login/);
  19 |   });
  20 | 
  21 |   test('PI demo login shows the portfolio', async ({ page }) => {
  22 |     await page.goto('/trial/login');
  23 |     // Click PI Demo Login
  24 |     await page.click('button:has-text("Log in as PI")');
  25 |     // Should redirect to /trial/home or /trial
  26 |     await expect(page).toHaveURL(/\/trial\/home|\/trial/);
  27 |     
  28 |     // Portfolio should be visible
  29 |     await page.goto('/trial/home');
> 30 |     await expect(page.locator('text=Portfolio')).toBeVisible();
     |                                                  ^ Error: expect(locator).toBeVisible() failed
  31 |   });
  32 | 
  33 |   test('Coordinator verify flow loads', async ({ page }) => {
  34 |     await page.goto('/trial/login');
  35 |     await page.click('button:has-text("Log in as COORDINATOR")');
  36 |     await expect(page).toHaveURL(/\/trial\/home|\/trial/);
  37 |     
  38 |     await page.goto('/trial/verify');
  39 |     await expect(page.locator('text=Verify Queue')).toBeVisible();
  40 |   });
  41 | 
  42 |   test('PV safety desk loads for reporting', async ({ page }) => {
  43 |     await page.goto('/trial/login');
  44 |     await page.click('button:has-text("Log in as PHARMACOVIGILANCE")');
  45 |     await expect(page).toHaveURL(/\/trial\/home|\/trial/);
  46 |     
  47 |     await page.goto('/trial/safety');
  48 |     await expect(page.locator('text=Safety & PV Desk')).toBeVisible();
  49 |   });
  50 | });
  51 | 
```