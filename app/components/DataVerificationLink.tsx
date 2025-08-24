'use client';

import { ExternalLink, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface DataVerificationLinkProps {
  ticker: string;
  date: string; // 格式: YYYY-MM-DD
  stockPrice?: number;
  coinSymbol?: string;
  coinPrice?: number;
  coinId?: string;
  holdingQty?: number; // 持有量數據
  compact?: boolean;
}

export default function DataVerificationLink({ 
  ticker, 
  date, 
  stockPrice, 
  coinSymbol, 
  coinPrice, 
  coinId,
  holdingQty,
  compact = false 
}: DataVerificationLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // 生成股票驗證連結 (Yahoo Finance)
  const getStockVerificationUrl = (ticker: string, date: string) => {
    // Yahoo Finance 歷史數據連結
    const yahooDate = date.replace(/-/g, '');
    return `https://finance.yahoo.com/quote/${ticker}/history`;
  };

  // 生成加密貨幣驗證連結 (CoinGecko)
  const getCryptoVerificationUrl = (coinId: string, date: string) => {
    // CoinGecko 歷史價格頁面
    return `https://www.coingecko.com/en/coins/${coinId}/historical_data`;
  };

  // 生成市場數據驗證連結 (TradingView)
  const getTradingViewUrl = (ticker: string) => {
    return `https://www.tradingview.com/symbols/${ticker}`;
  };

  // 生成持有量驗證連結 - 提供實際可用的公司持有量資訊來源
  const getHoldingsVerificationUrls = (ticker: string, coinSymbol: string) => {
    // 基礎連結
    const baseUrls = {
      sosoValue: `https://sosovalue.com/tc/assets/crypto-stocks`,
      sosoValueSearch: `https://sosovalue.com/tc/assets/crypto-stocks?search=${ticker}`,
      seekingAlpha: `https://seekingalpha.com/symbol/${ticker}/balance-sheet`,
      sec10K: `https://www.sec.gov/cgi-bin/browse-edgar?CIK=${ticker}&owner=exclude&action=getcompany`,
      companiesMarketCap: `https://companiesmarketcap.com/`
    };
    
    // 根據不同代幣類型和公司提供具體的持有量驗證來源
    switch (coinSymbol) {
      case 'BTC':
        return {
          primary: 'https://bitcointreasuries.net',
          primaryName: 'BitcoinTreasuries',
          secondary: getCompanyInvestorRelationsUrl(ticker),
          secondaryName: '投資者關係'
        };
        
      default:
        // 對於非BTC持有的公司，優先提供鏈上地址，否則提供財報連結
        const onChainAddress = getOnChainHoldingAddress(ticker, coinSymbol);
        if (onChainAddress) {
          return {
            primary: onChainAddress,
            primaryName: `${coinSymbol} 鏈上地址`,
            secondary: getCompanyInvestorRelationsUrl(ticker),
            secondaryName: '投資者關係'
          };
        } else {
          return {
            primary: getCompanyInvestorRelationsUrl(ticker),
            primaryName: '投資者關係',
            secondary: baseUrls.sosoValue,
            secondaryName: 'SoSoValue 加密股票'
          };
        }
    }
  };
  
  // 獲取公司實際的投資者關係連結
  const getCompanyInvestorRelationsUrl = (ticker: string) => {
    const irUrls: { [key: string]: string } = {
      'MSTR': 'https://www.microstrategy.com/investor-relations', // Strategy Inc.
      'MARA': 'https://ir.mara.com/', // MARA Holdings  
      'CEP': 'https://seekingalpha.com/symbol/CEP/balance-sheet', // XXI Century Capital
      'SBET': 'https://seekingalpha.com/symbol/SBET/balance-sheet', // SharpLink Gaming
      'BMNR': 'https://seekingalpha.com/symbol/BMNR/balance-sheet', // Bitmine Immersion
      'BNC': 'https://seekingalpha.com/symbol/BNC/balance-sheet', // BNB Network Company
      'DFDV': 'https://seekingalpha.com/symbol/DFDV/balance-sheet', // DeFi Development
      'UPXI': 'https://seekingalpha.com/symbol/UPXI/balance-sheet', // UPXI Corp
      'VERB': 'https://ir.verb.tech/', // VERB Technology
      'HYPD': 'https://seekingalpha.com/symbol/HYPD/balance-sheet' // Hyperion DeFi
    };
    
    return irUrls[ticker] || `https://seekingalpha.com/symbol/${ticker}/balance-sheet`;
  };

  // 獲取公司實際的鏈上持有地址
  const getOnChainHoldingAddress = (ticker: string, coinSymbol: string) => {
    // 公司實際的鏈上持有地址
    const addresses: { [key: string]: { [coinType: string]: string } } = {
      'VERB': {
        'TON': 'https://tonscan.org/address/UQDD-Z7E9o75qCDcApvXl9IWA-CH21rS2I1ChbaqBB43-u9m#events'
      },
      'SBET': {
        'ETH': 'https://etherscan.io/address/0x' // 需要實際ETH地址
      },
      'BMNR': {
        'ETH': 'https://etherscan.io/address/0x' // 需要實際ETH地址
      },
      'DFDV': {
        'SOL': 'https://solscan.io/account/' // 需要實際SOL地址
      },
      'UPXI': {
        'SOL': 'https://solscan.io/account/' // 需要實際SOL地址
      },
      'BNC': {
        'BNB': 'https://bscscan.com/address/0x' // 需要實際BNB地址
      },
      'HYPD': {
        'HYPE': 'https://app.hyperliquid.xyz/' // 需要實際HYPE地址
      }
    };

    return addresses[ticker]?.[coinSymbol] || null;
  };;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
  };

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-1 ml-2">
        <div 
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
            <ExternalLink className="w-3 h-3" />
          </button>
          
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              驗證 {formatDate(date)} 數據
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-700 rotate-45"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-200 flex items-center">
          <TrendingUp className="w-4 h-4 mr-1.5 text-blue-400" />
          數據驗證連結
        </h4>
        <span className="text-xs text-slate-400">{formatDate(date)}</span>
      </div>
      
      <div className="space-y-2">
        {/* 股票價格驗證 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">
            {ticker} 股價
            {stockPrice && (
              <span className="ml-2 text-slate-400">${stockPrice.toFixed(2)}</span>
            )}
          </span>
          <div className="flex space-x-2">
            <a
              href={getStockVerificationUrl(ticker, date)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center transition-colors"
            >
              Yahoo Finance
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
            <a
              href={getTradingViewUrl(ticker)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded flex items-center transition-colors"
            >
              TradingView
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>

        {/* 加密貨幣價格驗證 */}
        {coinSymbol && coinId && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">
              {coinSymbol} 幣價
              {coinPrice && (
                <span className="ml-2 text-slate-400">${coinPrice.toLocaleString()}</span>
              )}
            </span>
            <div className="flex space-x-2">
              <a
                href={getCryptoVerificationUrl(coinId, date)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center transition-colors"
              >
                CoinGecko
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href={`https://coinmarketcap.com/currencies/${coinId}/historical-data/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded flex items-center transition-colors"
              >
                CoinMarketCap
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        )}

        {/* 持有量驗證 */}
        {holdingQty && coinSymbol && (() => {
          const holdingUrls = getHoldingsVerificationUrls(ticker, coinSymbol);
          return (
            <div className="flex items-center justify-between border-t border-slate-600 pt-2">
              <span className="text-sm text-slate-300">
                {coinSymbol} 持有量
                <span className="ml-2 text-slate-400">{holdingQty.toLocaleString()}</span>
              </span>
              <div className="flex space-x-2">
                <a
                  href={holdingUrls.primary}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs px-2 py-1 rounded flex items-center transition-colors text-white ${
                    coinSymbol === 'BTC' ? 'bg-yellow-600 hover:bg-yellow-500' :
                    coinSymbol === 'ETH' ? 'bg-blue-600 hover:bg-blue-500' :
                    coinSymbol === 'SOL' ? 'bg-purple-600 hover:bg-purple-500' :
                    coinSymbol === 'BNB' ? 'bg-amber-600 hover:bg-amber-500' :
                    coinSymbol === 'TON' ? 'bg-cyan-600 hover:bg-cyan-500' :
                    coinSymbol === 'HYPE' ? 'bg-violet-600 hover:bg-violet-500' :
                    'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  {holdingUrls.primaryName}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <a
                  href={holdingUrls.secondary}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center transition-colors"
                >
                  {holdingUrls.secondaryName}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}