import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('should load dashboard with data successfully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for the dashboard to load
    await page.waitForSelector('h1:has-text("CryptoStock Tracker")');
    
    // Check if data is loaded (no loading states visible)
    await expect(page.locator('text=Loading')).not.toBeVisible();
    
    // Verify that actual data is displayed (not just mock data indicators)
    await expect(page.locator('tbody tr')).toHaveCount.greaterThan(0);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Block all external API requests to simulate network issues
    await page.route('**/*', route => {
      if (route.request().url().includes('api.coingecko.com') || 
          route.request().url().includes('yahoo')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    
    // Dashboard should still load with fallback/mock data
    await expect(page.locator('h1:has-text("CryptoStock Tracker")')).toBeVisible();
    
    // Should show some indication of data issues (if implemented)
    // This would depend on error handling implementation
  });

  test('should display reasonable data ranges', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('tbody tr');
    
    // Check that stock prices are in reasonable ranges (> $1, < $10,000)
    const stockPrices = await page.locator('tbody td:nth-child(2)').allTextContents();
    
    for (const priceText of stockPrices) {
      const price = parseFloat(priceText.replace(/[$,]/g, ''));
      if (!isNaN(price)) {
        expect(price).toBeGreaterThan(1);
        expect(price).toBeLessThan(10000);
      }
    }
    
    // Check that percentage changes are in reasonable ranges (-50% to +50%)
    const percentChanges = await page.locator('tbody td:nth-child(3)').allTextContents();
    
    for (const changeText of percentChanges) {
      const change = parseFloat(changeText.replace(/[+%]/g, ''));
      if (!isNaN(change)) {
        expect(Math.abs(change)).toBeLessThan(50);
      }
    }
  });

  test('should update data when week selector changes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForSelector('tbody tr');
    
    // Get initial data
    const initialData = await page.locator('tbody tr').first().textContent();
    
    // Change week selector
    await page.selectOption('select', '2025-W31');
    
    // Wait a moment for any data updates
    await page.waitForTimeout(500);
    
    // In the current implementation, this will be the same data
    // but in a real implementation with multiple weeks of data, 
    // this would validate data changes
    const newData = await page.locator('tbody tr').first().textContent();
    
    // At minimum, the selector should have changed
    await expect(page.locator('select')).toHaveValue('2025-W31');
  });

  test('should display chart with data points', async ({ page }) => {
    await page.goto('/');
    
    // Wait for chart to render
    await page.waitForSelector('svg');
    
    // Check that chart has data points (circles/dots)
    const chartDots = await page.locator('svg circle').count();
    expect(chartDots).toBeGreaterThan(0);
    
    // Check for chart lines
    const chartLines = await page.locator('svg path').count();
    expect(chartLines).toBeGreaterThan(0);
  });

  test('should handle large numbers formatting correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('tbody tr');
    
    // Check for proper number formatting (K, M suffixes)
    const holdingCells = await page.locator('tbody td:nth-child(7)').allTextContents();
    
    let foundLargeNumber = false;
    for (const cellText of holdingCells) {
      if (cellText.includes('K') || cellText.includes('M')) {
        foundLargeNumber = true;
        // Should not contain raw large numbers like "214000"
        expect(cellText).not.toMatch(/\d{5,}/);
      }
    }
    
    expect(foundLargeNumber).toBe(true);
  });

  test('should display correlation value in reasonable range', async ({ page }) => {
    await page.goto('/');
    
    // Find correlation card
    const correlationCard = page.locator('text=相關性').locator('..').locator('..');
    await expect(correlationCard).toBeVisible();
    
    // Get correlation value
    const correlationValue = await correlationCard.locator('.text-purple-400').textContent();
    const correlation = parseFloat(correlationValue || '');
    
    if (!isNaN(correlation)) {
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    }
  });
});