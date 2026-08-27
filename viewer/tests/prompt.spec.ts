import { test, expect } from '@playwright/test';

test.describe('Prompt Compiler UI', () => {
  test('should generate prompt with targets', async ({ page }) => {
    await page.goto('/');
    
    // Switch to Prompt Compiler tab
    await page.click('button:has-text("Prompt Compiler")');
    
    // Type some prompt code so the button gets enabled
    await page.fill('textarea[placeholder="Paste arbitrary Source Code..."]', 'import urllib2\nprint "hello"');
    
    // Select Dockerfile target
    await page.locator('label', { hasText: 'Multi-stage Dockerfile' }).locator('input[type="checkbox"]').check();
    
    // Click Compile
    await page.click('button:has-text("Synthesize Prompt")');
    
    // Verify result appears
    await expect(page.locator('text=TM3L Deterministic Build System Prompt')).toBeVisible();
    await expect(page.locator('text=Dockerfile')).toBeVisible();
  });
});

