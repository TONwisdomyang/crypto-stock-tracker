interface FooterProps {
  lastUpdated: string;
}

export default function Footer({ lastUpdated }: FooterProps) {
  return (
    <footer className="border-t border-slate-700 pt-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span>數據來源: Yahoo Finance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <span>加密幣數據: CoinGecko</span>
          </div>
        </div>
        
        <div className="text-sm text-slate-400">
          最後更新: {new Date(lastUpdated).toLocaleDateString('zh-TW')}
        </div>
      </div>
      
      <div className="text-center mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          ⚠️ 本工具僅供參考，不構成投資建議。投資有風險，請謹慎決策。
        </p>
      </div>
    </footer>
  );
}