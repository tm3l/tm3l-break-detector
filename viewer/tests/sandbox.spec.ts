import { test, expect } from '@playwright/test';

test.describe('Sandbox UI', () => {
  test('should run python deprecation audit', async ({ page }) => {
    await page.goto('/');
    
    // Switch to Sandbox tab
    await page.click('button:has-text("Sandbox")');
    
    // Select Python mode from the sample dropdown
    await page.locator('select').nth(1).selectOption({ label: 'Python 2 -> 3: Legacy urllib2 & print' });
    
    // Check that button changed
    await expect(page.locator('button:has-text("Audit Python Deprecations")')).toBeVisible();
    
    // Click run
    await page.click('button:has-text("Audit Python Deprecations")');
    
    // Wait for the response
    await page.waitForTimeout(1000);
    
    // Assert that the AST findings are visible
    await expect(page.locator('text=AST Migration Findings')).toBeVisible();
    await expect(page.locator('text=Legacy urllib2 module and unparenthesized print statement detected.')).toBeVisible();
  });

  test('should run go deprecation audit', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button:has-text("Sandbox")');
    await page.locator('select').nth(1).selectOption({ label: 'Go: Migrate deprecated io/ioutil' });
    await expect(page.locator('button:has-text("Audit Go Deprecations")')).toBeVisible();
    await page.click('button:has-text("Audit Go Deprecations")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=AST Migration Findings')).toBeVisible();
    await expect(page.locator('text=Package \'io/ioutil\' was deprecated in Go 1.16.')).toBeVisible();
  });

  test('should run typescript modernization audit', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button:has-text("Sandbox")');
    await page.locator('select').nth(1).selectOption({ label: 'TypeScript: Modernize var to const/let' });
    await expect(page.locator('button:has-text("Audit TypeScript Code")')).toBeVisible();
    await page.click('button:has-text("Audit TypeScript Code")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=AST Migration Findings')).toBeVisible();
    await expect(page.locator('text=Usage of \'var\' keyword.')).toBeVisible();
  });
});

