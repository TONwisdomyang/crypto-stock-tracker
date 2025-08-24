// 供應量計算工具
// 計算企業持有量佔代幣總供應量的百分比

interface CompanyHolding {
  ticker: string;
  company_name: string;
  coin: string;
  holding_qty: number;
  coin_id: string;
}

interface SupplyData {
  totalSupply: number;
  circulatingSupply: number;
}

// 各代幣的供應量數據 (實際數據，會定期更新)
const COIN_SUPPLY_DATA: Record<string, SupplyData> = {
  bitcoin: {
    totalSupply: 21000000,        // BTC 總供應量上限
    circulatingSupply: 19800000   // 約當前流通量
  },
  ethereum: {
    totalSupply: 120280000,       // ETH 約當前總供應量
    circulatingSupply: 120280000  // ETH 流通量 ≈ 總供應量
  },
  binancecoin: {
    totalSupply: 200000000,       // BNB 初始供應量 
    circulatingSupply: 153856150  // 考慮燃燒後的流通量
  },
  solana: {
    totalSupply: 580000000,       // SOL 約當前總供應量
    circulatingSupply: 470000000  // SOL 流通量
  },
  'the-open-network': {
    totalSupply: 5110000000,      // TON 總供應量
    circulatingSupply: 2540000000 // TON 流通量
  },
  hyperliquid: {
    totalSupply: 1000000000,      // HYPE 總供應量
    circulatingSupply: 333658595  // HYPE 流通量
  }
};

export interface SupplyAnalysis {
  totalHolding: number;
  holdingPercentage: number;
  concentrationLevel: 'low' | 'medium' | 'high';
  concentrationDescription: string;
  riskLevel: 'low' | 'medium' | 'high';
  companies: Array<{
    ticker: string;
    name: string;
    holding: number;
    percentage: number;
  }>;
}

/**
 * 計算企業持有量分析
 */
export function calculateSupplyAnalysis(
  coinId: string, 
  holdings: Record<string, CompanyHolding>
): SupplyAnalysis {
  
  const supplyData = COIN_SUPPLY_DATA[coinId];
  
  if (!supplyData) {
    throw new Error(`No supply data available for coin: ${coinId}`);
  }

  // 篩選持有該代幣的公司
  const relevantCompanies = Object.entries(holdings)
    .filter(([_, company]) => company.coin_id === coinId)
    .map(([ticker, company]) => ({
      ticker,
      name: company.company_name,
      holding: company.holding_qty,
      percentage: (company.holding_qty / supplyData.circulatingSupply) * 100
    }));

  // 計算總持有量
  const totalHolding = relevantCompanies.reduce((sum, company) => sum + company.holding, 0);
  const holdingPercentage = (totalHolding / supplyData.circulatingSupply) * 100;

  // 判斷集中度等級
  let concentrationLevel: 'low' | 'medium' | 'high';
  let concentrationDescription: string;
  let riskLevel: 'low' | 'medium' | 'high';

  if (holdingPercentage < 1) {
    concentrationLevel = 'low';
    concentrationDescription = '分散持有';
    riskLevel = 'low';
  } else if (holdingPercentage < 5) {
    concentrationLevel = 'medium';
    concentrationDescription = '中度集中';
    riskLevel = 'medium';
  } else {
    concentrationLevel = 'high';
    concentrationDescription = '高度集中';
    riskLevel = 'high';
  }

  return {
    totalHolding,
    holdingPercentage,
    concentrationLevel,
    concentrationDescription,
    riskLevel,
    companies: relevantCompanies.sort((a, b) => b.holding - a.holding) // 按持有量排序
  };
}

/**
 * 格式化數字顯示
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * 格式化百分比顯示
 */
export function formatPercentage(percentage: number): string {
  if (percentage < 0.001) {
    return '<0.001%';
  } else if (percentage < 0.01) {
    return percentage.toFixed(4) + '%';
  } else if (percentage < 1) {
    return percentage.toFixed(3) + '%';
  } else {
    return percentage.toFixed(2) + '%';
  }
}

/**
 * 獲取集中度風險顏色
 */
export function getConcentrationColor(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'low':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        gradient: 'from-blue-400 to-cyan-500'
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        gradient: 'from-amber-400 to-orange-500'
      };
    case 'high':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
        gradient: 'from-red-400 to-rose-500'
      };
  }
}