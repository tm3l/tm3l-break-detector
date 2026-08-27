import { test, expect } from '@playwright/test';

test.describe('Audit Ledger UI', () => {
  test('should display audit ledger and filter buttons', async ({ page }) => {
    await page.goto('/');
    
    // Switch to Audit Ledger tab
    await page.click('button:has-text("Audit Ledger")');
    
    // Verify title and header
    await expect(page.locator('text=Immutable Audit Ledger')).toBeVisible();
    await expect(page.locator('text=PostgreSQL GIN Indexed')).toBeVisible();
    
    // Check filter buttons
    await expect(page.locator('button:has-text("ALL")')).toBeVisible();
    await expect(page.locator('button:has-text("PASSED")')).toBeVisible();
    await expect(page.locator('button:has-text("FAILED")')).toBeVisible();
    await expect(page.locator('button:has-text("OVERRIDDEN")')).toBeVisible();
  });
});
