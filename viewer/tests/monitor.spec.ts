import { test, expect } from '@playwright/test';

test.describe('Monitor UI', () => {
  test('should display initial monitor state', async ({ page }) => {
    await page.goto('/');
    
    // Check header
    await expect(page.locator('text=TM3L_BREAK_DETECTOR.exe')).toBeVisible();
    
    // Check initial safe status
    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=SAFE').first()).toBeVisible();
    
    // Check live event socket
    await expect(page.locator('text=Live Event Socket')).toBeVisible();
    await expect(page.locator('text=Listening on port 8080...')).toBeVisible();
  });
});
