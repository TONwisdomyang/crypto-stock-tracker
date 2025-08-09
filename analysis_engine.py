#!/usr/bin/env python3
"""
Correlation Analysis Engine
統計分析引擎 - 計算股價與加密貨幣的相關性指標
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from scipy import stats
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CorrelationAnalyzer:
    def __init__(self, data_path: str = "public/data"):
        self.data_path = data_path
        self.baseline_data = None
        self.weekly_data = None
        
    def load_data(self):
        """載入歷史基準數據和當前數據"""
        try:
            # 先嘗試載入完整歷史數據
            try:
                with open(f"{self.data_path}/complete_historical_baseline.json", 'r') as f:
                    self.baseline_data = json.load(f)
            except FileNotFoundError:
                # 備選：載入歷史基準數據
                with open(f"{self.data_path}/historical_baseline.json", 'r') as f:
                    self.baseline_data = json.load(f)
                
            # 載入當前週數據  
            with open(f"{self.data_path}/weekly_stats.json", 'r') as f:
                self.weekly_data = json.load(f)
                
            logger.info(f"數據載入成功：{len(self.baseline_data['data'])}週歷史數據")
            return True
            
        except Exception as e:
            logger.error(f"數據載入失敗: {e}")
            return False
    
    def calculate_correlation_metrics(self, ticker: str) -> Dict:
        """計算特定股票對的完整相關性指標"""
        if not self.baseline_data:
            self.load_data()
            
        # 提取時間序列數據
        stock_changes = []
        crypto_changes = []
        dates = []
        base_stock_price = None
        base_crypto_price = None
        
        # 首先找到該股票的第一個有效數據點作為基準
        for week_key, week_data in self.baseline_data['data'].items():
            if ticker in week_data['companies']:
                if base_stock_price is None:
                    # 設置基準價格
                    base_stock_price = week_data['companies'][ticker]['stock_price']
                    base_crypto_price = week_data['companies'][ticker]['coin_price']
                    stock_changes.append(0.0)  # 基準週變化為0
                    crypto_changes.append(0.0)
                else:
                    # 計算相對於基準週的變化
                    company_data = week_data['companies'][ticker]
                    stock_pct = ((company_data['stock_price'] - base_stock_price) / base_stock_price) * 100
                    crypto_pct = ((company_data['coin_price'] - base_crypto_price) / base_crypto_price) * 100
                    
                    stock_changes.append(stock_pct)
                    crypto_changes.append(crypto_pct)
                
                dates.append(week_data['baseline_date'])
        
        if len(stock_changes) < 3:
            return {"error": "數據點不足，無法進行統計分析"}
            
        # 轉換為numpy數組進行分析
        stock_arr = np.array(stock_changes)
        crypto_arr = np.array(crypto_changes)
        
        # 1. 皮爾遜相關係數
        correlation, p_value = stats.pearsonr(stock_arr, crypto_arr)
        
        # 2. 滾動相關性 (3週窗口)
        rolling_corr = []
        for i in range(2, len(stock_arr)):
            window_stock = stock_arr[i-2:i+1]
            window_crypto = crypto_arr[i-2:i+1]
            if len(window_stock) >= 3:
                corr, _ = stats.pearsonr(window_stock, window_crypto)
                rolling_corr.append(corr if not np.isnan(corr) else 0)
        
        # 3. 滯後相關性分析
        lag_correlations = []
        for lag in range(-2, 3):  # -2到+2週的滯後
            if lag == 0:
                lag_corr = correlation
            elif lag > 0:
                # 股價滯後於幣價
                if len(stock_arr) > lag and len(stock_arr[lag:]) >= 2:
                    lag_corr, _ = stats.pearsonr(stock_arr[lag:], crypto_arr[:-lag])
                else:
                    lag_corr = 0
            else:
                # 幣價滯後於股價  
                abs_lag = abs(lag)
                if len(crypto_arr) > abs_lag and len(crypto_arr[abs_lag:]) >= 2:
                    lag_corr, _ = stats.pearsonr(stock_arr[:-abs_lag], crypto_arr[abs_lag:])
                else:
                    lag_corr = 0
                    
            lag_correlations.append({
                "lag_weeks": lag,
                "correlation": lag_corr if not np.isnan(lag_corr) else 0
            })
        
        # 4. 貝塔係數 (股價對幣價的敏感度)
        if np.std(crypto_arr) > 0:
            beta = np.cov(stock_arr, crypto_arr)[0][1] / np.var(crypto_arr)
        else:
            beta = 0
            
        # 5. 脫鉤事件檢測
        decoupling_events = self._detect_decoupling_events(stock_arr, crypto_arr, dates)
        
        # 6. 波動率比較
        stock_volatility = np.std(stock_arr)
        crypto_volatility = np.std(crypto_arr)
        volatility_ratio = stock_volatility / crypto_volatility if crypto_volatility > 0 else 0
        
        return {
            "ticker": ticker,
            "analysis_period": f"{dates[0]} to {dates[-1]}",
            "data_points": len(stock_changes),
            "pearson_correlation": {
                "value": round(correlation, 4),
                "p_value": round(p_value, 6),
                "significance": "顯著" if p_value < 0.05 else "不顯著",
                "strength": self._interpret_correlation(correlation)
            },
            "rolling_correlation": {
                "values": [round(x, 4) for x in rolling_corr],
                "average": round(np.mean(rolling_corr), 4) if rolling_corr else 0,
                "trend": self._analyze_correlation_trend(rolling_corr)
            },
            "lag_analysis": {
                "correlations": lag_correlations,
                "best_lag": max(lag_correlations, key=lambda x: abs(x["correlation"])),
                "interpretation": self._interpret_lag_correlation(lag_correlations)
            },
            "beta_coefficient": {
                "value": round(beta, 4),
                "interpretation": self._interpret_beta(beta)
            },
            "volatility_analysis": {
                "stock_volatility": round(stock_volatility, 2),
                "crypto_volatility": round(crypto_volatility, 2), 
                "ratio": round(volatility_ratio, 4),
                "interpretation": self._interpret_volatility_ratio(volatility_ratio)
            },
            "decoupling_analysis": decoupling_events,
            "investment_insight": self._generate_investment_insight(correlation, beta, decoupling_events)
        }
    
    def _detect_decoupling_events(self, stock_arr: np.ndarray, crypto_arr: np.ndarray, dates: List[str]) -> Dict:
        """檢測脫鉤事件"""
        decoupling_events = []
        
        for i in range(1, len(stock_arr)):
            stock_change = stock_arr[i] - stock_arr[i-1]
            crypto_change = crypto_arr[i] - crypto_arr[i-1]
            
            # 定義脫鉤：一方變化>2%，另一方反向變化>1%
            is_decoupling = (
                (stock_change > 2 and crypto_change < -1) or
                (stock_change < -2 and crypto_change > 1) or  
                (crypto_change > 2 and stock_change < -1) or
                (crypto_change < -2 and stock_change > 1)
            )
            
            if is_decoupling:
                decoupling_events.append({
                    "date": dates[i],
                    "stock_change": round(stock_change, 2),
                    "crypto_change": round(crypto_change, 2),
                    "type": "股價背離" if abs(stock_change) > abs(crypto_change) else "幣價背離"
                })
        
        return {
            "total_events": len(decoupling_events),
            "frequency": len(decoupling_events) / len(stock_arr) if len(stock_arr) > 0 else 0,
            "events": decoupling_events,
            "risk_level": self._assess_decoupling_risk(len(decoupling_events), len(stock_arr))
        }
    
    def _interpret_correlation(self, corr: float) -> str:
        """解釋相關性強度"""
        abs_corr = abs(corr)
        if abs_corr >= 0.7:
            return "強相關"
        elif abs_corr >= 0.5:
            return "中等相關"  
        elif abs_corr >= 0.3:
            return "弱相關"
        else:
            return "幾乎無關"
    
    def _analyze_correlation_trend(self, rolling_corr: List[float]) -> str:
        """分析相關性趨勢"""
        if len(rolling_corr) < 2:
            return "數據不足"
            
        recent = np.mean(rolling_corr[-2:])
        early = np.mean(rolling_corr[:2])
        
        if recent - early > 0.1:
            return "相關性增強"
        elif recent - early < -0.1:
            return "相關性減弱"
        else:
            return "相關性穩定"
    
    def _interpret_lag_correlation(self, lag_corr: List[Dict]) -> str:
        """解釋滯後相關性"""
        best = max(lag_corr, key=lambda x: abs(x["correlation"]))
        
        if abs(best["correlation"]) < 0.3:
            return "無明顯滯後關係"
        elif best["lag_weeks"] == 0:
            return "同步反應"
        elif best["lag_weeks"] > 0:
            return f"股價滯後幣價{best['lag_weeks']}週"
        else:
            return f"幣價滯後股價{abs(best['lag_weeks'])}週"
    
    def _interpret_beta(self, beta: float) -> str:
        """解釋貝塔係數"""
        if beta > 1.2:
            return "高敏感度：股價對幣價變化反應強烈"
        elif beta > 0.8:
            return "中等敏感度：股價與幣價同步變化"
        elif beta > 0.3:
            return "低敏感度：股價對幣價變化反應較弱"  
        elif beta > -0.3:
            return "幾乎無關：股價與幣價獨立變化"
        else:
            return "負相關：股價與幣價反向變化"
    
    def _interpret_volatility_ratio(self, ratio: float) -> str:
        """解釋波動率比例"""
        if ratio > 1.5:
            return "股價波動遠高於幣價"
        elif ratio > 1.1:
            return "股價波動略高於幣價"
        elif ratio > 0.9:
            return "股價與幣價波動相當"
        else:
            return "股價波動低於幣價"
    
    def _assess_decoupling_risk(self, events: int, total_periods: int) -> str:
        """評估脫鉤風險等級"""
        frequency = events / total_periods if total_periods > 0 else 0
        
        if frequency > 0.3:
            return "高風險"
        elif frequency > 0.15:
            return "中風險"
        elif frequency > 0.05:
            return "低風險"
        else:
            return "極低風險"
    
    def _generate_investment_insight(self, correlation: float, beta: float, decoupling: Dict) -> str:
        """生成投資洞察"""
        insights = []
        
        # 相關性洞察
        if abs(correlation) > 0.7:
            insights.append(f"股價與幣價高度相關({correlation:.2f})，適合配對交易策略")
        elif abs(correlation) < 0.3:
            insights.append(f"股價與幣價相關性較弱({correlation:.2f})，投資風險分散效果佳")
            
        # 貝塔洞察  
        if beta > 1.2:
            insights.append("股價對幣價變化敏感，適合短線操作")
        elif beta < 0.5:
            insights.append("股價相對穩定，適合長期持有")
            
        # 脫鉤風險洞察
        if decoupling["risk_level"] == "高風險":
            insights.append("頻繁出現脫鉤現象，需要密切監控市場變化")
        elif decoupling["risk_level"] == "極低風險":
            insights.append("價格走勢穩定同步，投資風險相對較低")
            
        return " | ".join(insights) if insights else "數據有限，建議持續觀察"

    def analyze_all_pairs(self) -> Dict:
        """分析所有股票對的相關性"""
        if not self.load_data():
            return {"error": "數據載入失敗"}
            
        results = {}
        
        # 獲取所有可用的股票代號
        all_tickers = set()
        for week_data in self.baseline_data['data'].values():
            all_tickers.update(week_data['companies'].keys())
            
        # 股票代號映射 (VAPE已更名為BNC)
        ticker_mapping = {
            "VAPE": "BNC"  # VAPE是BNC的舊稱
        }
            
        for original_ticker in all_tickers:
            display_ticker = ticker_mapping.get(original_ticker, original_ticker)
            logger.info(f"分析 {display_ticker} 的相關性指標...")
            
            analysis = self.calculate_correlation_metrics(original_ticker)
            if "error" not in analysis:
                analysis["ticker"] = display_ticker  # 更新ticker顯示名稱
            
            results[display_ticker] = analysis
            
        # 添加綜合分析
        results["summary"] = self._generate_market_summary(results)
        
        return results
    
    def _generate_market_summary(self, results: Dict) -> Dict:
        """生成市場綜合分析"""
        valid_results = [r for r in results.values() if "error" not in r and "summary" not in results]
        
        if not valid_results:
            return {"error": "無有效分析結果"}
            
        correlations = [r["pearson_correlation"]["value"] for r in valid_results]
        betas = [r["beta_coefficient"]["value"] for r in valid_results]
        decoupling_frequencies = [r["decoupling_analysis"]["frequency"] for r in valid_results]
        
        return {
            "market_correlation": {
                "average": round(np.mean(correlations), 4),
                "range": [round(min(correlations), 4), round(max(correlations), 4)],
                "interpretation": self._interpret_market_correlation(np.mean(correlations))
            },
            "market_sensitivity": {
                "average_beta": round(np.mean(betas), 4),
                "range": [round(min(betas), 4), round(max(betas), 4)]
            },
            "market_stability": {
                "average_decoupling_frequency": round(np.mean(decoupling_frequencies), 4),
                "most_stable": min(valid_results, key=lambda x: x["decoupling_analysis"]["frequency"])["ticker"],
                "most_volatile": max(valid_results, key=lambda x: x["decoupling_analysis"]["frequency"])["ticker"]
            },
            "investment_recommendations": self._generate_market_recommendations(valid_results)
        }
    
    def _interpret_market_correlation(self, avg_corr: float) -> str:
        """解釋整體市場相關性"""
        if avg_corr > 0.6:
            return "整體市場高度同步，系統性風險較高"
        elif avg_corr > 0.3:
            return "整體市場中度相關，具有一定分散效果"
        else:
            return "整體市場相關性較弱，投資組合分散效果佳"
    
    def _generate_market_recommendations(self, results: List[Dict]) -> List[str]:
        """生成市場投資建議"""
        recommendations = []
        
        # 找出最穩定和最不穩定的股票對
        stable_pairs = [r for r in results if r["decoupling_analysis"]["risk_level"] in ["極低風險", "低風險"]]
        volatile_pairs = [r for r in results if r["decoupling_analysis"]["risk_level"] in ["高風險", "中風險"]]
        
        if stable_pairs:
            stable_tickers = [r["ticker"] for r in stable_pairs]
            recommendations.append(f"穩定投資推薦：{', '.join(stable_tickers[:3])}")
            
        if volatile_pairs:
            volatile_tickers = [r["ticker"] for r in volatile_pairs]
            recommendations.append(f"短線交易機會：{', '.join(volatile_tickers[:2])}")
            
        # 相關性分析建議
        high_corr = [r for r in results if abs(r["pearson_correlation"]["value"]) > 0.7]
        if high_corr:
            recommendations.append("高相關股票對可考慮配對交易策略")
            
        return recommendations

def main():
    """主函數 - 執行完整的相關性分析"""
    analyzer = CorrelationAnalyzer()
    
    # 執行全面分析
    results = analyzer.analyze_all_pairs()
    
    # 保存分析結果
    output_file = "public/data/correlation_analysis.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    logger.info(f"相關性分析完成，結果保存至: {output_file}")
    
    # 打印綜合摘要
    if "summary" in results:
        summary = results["summary"]
        print("\n=== 市場分析摘要 ===")
        print(f"平均相關性: {summary['market_correlation']['average']}")
        print(f"市場解釋: {summary['market_correlation']['interpretation']}")
        print(f"最穩定股票對: {summary['market_stability']['most_stable']}")
        print(f"最不穩定股票對: {summary['market_stability']['most_volatile']}")
        print("\n投資建議:")
        for rec in summary['investment_recommendations']:
            print(f"- {rec}")

if __name__ == "__main__":
    main()