'use client';

import { useState, useMemo } from 'react';

interface TokenLogoProps {
  symbol: string;
  coinId: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackColor: string;
  className?: string;
}

// 官方高畫質 Logo 來源 - 移到組件外部避免初始化問題
const getOfficialLogoSources = (symbol: string): string[] => {
  const officialMap: Record<string, string[]> = {
    'BTC': [
      'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=024',
      'https://static.coingecko.com/s/bitcoin-btc-logo-fc8bbdc7ad97.png'
    ],
    'ETH': [
      'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      'https://ethereum.org/_next/static/media/eth-diamond-glyph.3cd60daa.png',
      'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=024'
    ],
    'SOL': [
      'https://assets.coingecko.com/coins/images/4128/large/solana.png',
      'https://solana.com/src/img/branding/solanaLogoMark.png',
      'https://cryptologos.cc/logos/solana-sol-logo.png?v=024'
    ],
    'BNB': [
      'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
      'https://cryptologos.cc/logos/bnb-bnb-logo.png?v=024'
    ],
    'TON': [
      'https://assets.coingecko.com/coins/images/17980/large/toncoin.png',
      'https://cryptologos.cc/logos/toncoin-ton-logo.png?v=024'
    ],
    'HYPE': [
      'https://assets.coingecko.com/coins/images/38236/large/hyperliquid.png',
      'https://cryptologos.cc/logos/hyperliquid-hype-logo.png?v=024'
    ]
  };
  
  return officialMap[symbol] || [];
};

export default function TokenLogo({ 
  symbol, 
  coinId, 
  size = 'md', 
  fallbackColor,
  className = ''
}: TokenLogoProps) {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // 尺寸映射
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  // 圖片來源優先級順序 - 高畫質官方來源優先
  const imageSources = useMemo(() => {
    const officialSources = getOfficialLogoSources(symbol);
    return [
      ...officialSources,
      `/coin_logo/${symbol}@2x.png`,
      `/coin_logo/${symbol}@2x.jpg`, 
      `/coin_logo/${symbol}.png`,
      `/coin_logo/${symbol}.jpg`,
      `/icons/tokens/${symbol.toLowerCase()}.svg`,
      `/icons/tokens/${symbol.toLowerCase()}.png`
    ];
  }, [symbol, coinId]);


  const currentSource = imageSources[currentSourceIndex];

  const handleImageError = () => {
    if (currentSourceIndex < imageSources.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const handleImageLoad = () => {
    setHasError(false);
  };

  // 如果所有圖片來源都失敗，顯示彩色圓圈 fallback
  if (hasError) {
    return (
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full flex items-center justify-center 
          text-white text-xs font-bold
          relative backdrop-blur-sm 
          bg-gradient-to-br from-white/5 to-white/2
          border border-white/10
          shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]
          hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.25)]
          transition-all duration-300
          ${className}
        `}
        style={{ backgroundColor: fallbackColor }}
      >
        {/* 內層光暈效果 */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50"></div>
        
        {/* 文字 */}
        <span className="relative z-10">
          {symbol.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className={`
      ${sizeClasses[size]} 
      relative rounded-full backdrop-blur-sm 
      bg-gradient-to-br from-white/5 to-white/2
      border border-white/10
      shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]
      hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.25)]
      transition-all duration-300
      ${className}
    `}>
      {/* 內層光暈效果 */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50"></div>
      
      {/* Logo 圖片 - 高品質渲染 */}
      <img
        src={currentSource}
        alt={`${symbol} logo`}
        className={`
          ${sizeClasses[size]} 
          relative z-10 rounded-full object-cover
          ring-1 ring-white/20
          hover:ring-white/30
          transition-all duration-300
          token-logo-enhanced
        `}
        style={{
          imageRendering: '-webkit-optimize-contrast',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          filter: 'contrast(1.1) saturate(1.05) brightness(1.02)',
          WebkitFilter: 'contrast(1.1) saturate(1.05) brightness(1.02)',
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        fetchPriority="high"
      />
    </div>
  );
}