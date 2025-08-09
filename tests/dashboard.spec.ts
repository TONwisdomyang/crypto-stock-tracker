import { test, expect } from '@playwright/test';

test.describe('CryptoStock Tracker Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main dashboard', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/CryptoStock Tracker/i);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('CryptoStock Tracker');
    
    // Check if dashboard loads without errors
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display header components', async ({ page }) => {
    // Check logo/emoji
    await expect(page.locator('text=🪙')).toBeVisible();
    
    // Check title
    await expect(page.locator('h1:has-text("CryptoStock Tracker")')).toBeVisible();
    
    // Check week selector
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('label:has-text("週期選擇")')).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    // Check for all 4 summary cards
    await expect(page.locator('text=股票平均漲幅')).toBeVisible();
    await expect(page.locator('text=加密幣漲幅')).toBeVisible(); 
    await expect(page.locator('text=總持倉價值')).toBeVisible();
    await expect(page.locator('text=相關性')).toBeVisible();
    
    // Check card icons
    await expect(page.locator('text=📈')).toBeVisible();
    await expect(page.locator('text=🪙')).toBeVisible();
    await expect(page.locator('text=💰')).toBeVisible();
    await expect(page.locator('text=📊')).toBeVisible();
  });

  test('should display data table with companies', async ({ page }) => {
    // Check table headers
    await expect(page.locator('th:has-text("公司")')).toBeVisible();
    await expect(page.locator('th:has-text("股價")')).toBeVisible();
    await expect(page.locator('th:has-text("股價變化%")')).toBeVisible();
    await expect(page.locator('th:has-text("加密幣")')).toBeVisible();
    await expect(page.locator('th:has-text("幣價")')).toBeVisible();
    
    // Check for company data (MSTR should be in mock data)
    await expect(page.locator('text=MSTR')).toBeVisible();
    await expect(page.locator('text=MicroStrategy Inc.')).toBeVisible();
    
    // Check for BTC badge
    await expect(page.locator('text=BTC')).toBeVisible();
  });

  test('should display trend chart', async ({ page }) => {
    // Check chart section header
    await expect(page.locator('h2:has-text("價格趨勢對比")')).toBeVisible();
    await expect(page.locator('text=股價 vs 加密幣價格 (雙Y軸)')).toBeVisible();
    
    // Chart should be rendered (Recharts creates SVG)
    await expect(page.locator('svg')).toBeVisible();
  });

  test('should display footer with data sources', async ({ page }) => {
    // Check data source indicators
    await expect(page.locator('text=數據來源: Yahoo Finance')).toBeVisible();
    await expect(page.locator('text=加密幣數據: CoinGecko')).toBeVisible();
    
    // Check last updated info
    await expect(page.locator('text=最後更新:')).toBeVisible();
    
    // Check disclaimer
    await expect(page.locator('text=本工具僅供參考，不構成投資建議')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if main elements are still visible
    await expect(page.locator('h1:has-text("CryptoStock Tracker")')).toBeVisible();
    await expect(page.locator('text=股票平均漲幅')).toBeVisible();
    
    // Table should be scrollable on mobile
    await expect(page.locator('div.overflow-x-auto')).toBeVisible();
  });

  test('should handle week selector interaction', async ({ page }) => {
    const select = page.locator('select');
    
    // Check default value
    await expect(select).toHaveValue('2025-W32');
    
    // Change selection
    await select.selectOption('2025-W31');
    await expect(select).toHaveValue('2025-W31');
  });

  test('should show hover effects on table rows', async ({ page }) => {
    const tableRow = page.locator('tbody tr').first();
    
    // Hover over the first row
    await tableRow.hover();
    
    // Row should have hover class (bg-slate-750 transition)
    await expect(tableRow).toHaveClass(/hover:bg-slate-750/);
  });

  test('should display percentage changes with correct colors', async ({ page }) => {
    // Look for positive percentage (green)
    const positiveChange = page.locator('.text-emerald-400').first();
    await expect(positiveChange).toBeVisible();
    
    // The percentage should contain % symbol
    await expect(positiveChange).toContainText('%');
  });

  test('should format currency values correctly', async ({ page }) => {
    // Look for currency formatting ($ symbol)
    await expect(page.locator('text=/\\$[\\d,]+\\.\\d{2}/')).toBeVisible();
    
    // Check for large number formatting in holdings
    await expect(page.locator('text=/\\d+(\\.\\d+)?[KM]/')).toBeVisible();
  });
});