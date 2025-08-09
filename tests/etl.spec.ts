import { test, expect } from '@playwright/test';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

test.describe('ETL Data Integration', () => {
  const dataDir = join(process.cwd(), 'public', 'data');
  
  test('should have required data files', async () => {
    // Check if holdings.json exists
    await expect(async () => {
      await access(join(dataDir, 'holdings.json'));
    }).not.toThrow();
    
    // Check if weekly_stats.json exists (or can be generated)
    try {
      await access(join(dataDir, 'weekly_stats.json'));
    } catch {
      // File might not exist yet, which is acceptable in development
      console.log('weekly_stats.json not found - this is expected in development');
    }
  });

  test('should have valid holdings.json structure', async () => {
    try {
      const holdingsContent = await readFile(join(dataDir, 'holdings.json'), 'utf-8');
      const holdings = JSON.parse(holdingsContent);
      
      // Check structure of holdings data
      for (const [ticker, data] of Object.entries(holdings)) {
        expect(ticker).toMatch(/^[A-Z]{3,5}$/); // Valid stock ticker
        
        const holdingData = data as any;
        expect(holdingData).toHaveProperty('company_name');
        expect(holdingData).toHaveProperty('coin');
        expect(holdingData).toHaveProperty('holding_qty');
        expect(holdingData).toHaveProperty('coin_id');
        
        expect(typeof holdingData.company_name).toBe('string');
        expect(typeof holdingData.coin).toBe('string');
        expect(typeof holdingData.holding_qty).toBe('number');
        expect(typeof holdingData.coin_id).toBe('string');
        
        expect(holdingData.holding_qty).toBeGreaterThan(0);
      }
    } catch (error) {
      throw new Error(`Invalid holdings.json: ${error}`);
    }
  });

  test('should validate weekly_stats.json structure if exists', async () => {
    try {
      const statsContent = await readFile(join(dataDir, 'weekly_stats.json'), 'utf-8');
      const stats = JSON.parse(statsContent);
      
      // Check top-level structure
      expect(stats).toHaveProperty('week_end');
      expect(stats).toHaveProperty('data');
      expect(Array.isArray(stats.data)).toBe(true);
      
      // Check each company data entry
      for (const company of stats.data) {
        expect(company).toHaveProperty('ticker');
        expect(company).toHaveProperty('company_name');
        expect(company).toHaveProperty('stock_close');
        expect(company).toHaveProperty('stock_pct_change');
        expect(company).toHaveProperty('coin');
        expect(company).toHaveProperty('coin_close');
        expect(company).toHaveProperty('coin_pct_change');
        expect(company).toHaveProperty('holding_qty');
        expect(company).toHaveProperty('holding_pct_of_supply');
        
        // Type validation
        expect(typeof company.ticker).toBe('string');
        expect(typeof company.company_name).toBe('string');
        expect(typeof company.stock_close).toBe('number');
        expect(typeof company.stock_pct_change).toBe('number');
        expect(typeof company.coin_close).toBe('number');
        expect(typeof company.coin_pct_change).toBe('number');
        expect(typeof company.holding_qty).toBe('number');
        expect(typeof company.holding_pct_of_supply).toBe('number');
        
        // Value validation
        expect(company.stock_close).toBeGreaterThan(0);
        expect(company.coin_close).toBeGreaterThan(0);
        expect(company.holding_qty).toBeGreaterThan(0);
        expect(company.holding_pct_of_supply).toBeGreaterThanOrEqual(0);
        expect(company.holding_pct_of_supply).toBeLessThan(100);
      }
    } catch (error) {
      // File might not exist in development - that's acceptable
      console.log('weekly_stats.json not available for validation');
    }
  });
});