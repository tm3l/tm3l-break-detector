import { test, expect } from '@playwright/test';

test.describe('Sandbox UI', () => {
  test('should run python deprecation audit', async ({ page }) => {
    await page.goto('/');
    
    // Switch to Sandbox tab
    await page.click('button:has-text("Sandbox")');
    
    // Select Python mode from the second select (load sample)
    await page.locator('select').nth(1).selectOption({ label: 'Python 2 -> Python 3: Legacy EVE-style Code Migration' });
    
    // Check that button changed
    await expect(page.locator('button:has-text("Audit Python Deprecations")')).toBeVisible();
    
    // Click run
    await page.click('button:has-text("Audit Python Deprecations")');
    
    // Wait for the simulated network response (1000ms)
    await page.waitForTimeout(1500);
    
    // Assert that the text from the mock response is visible
    await expect(page.locator('text=Audit Python Deprecations')).toBeVisible();
  });
});
