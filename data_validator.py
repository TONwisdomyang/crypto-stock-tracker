#!/usr/bin/env python3
"""
數據驗證系統 - Data Validation System
用於驗證新加入公司的股價數據準確性和完整性

功能：
1. 股價數據驗證 - 與市場數據對比
2. 公司資訊驗證 - 驗證公司名稱和股票代碼
3. 數據完整性檢查 - 確保所有必要欄位存在
4. 自動化報告生成 - 生成驗證結果報告
"""

import json
import yfinance as yf
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import time
from dataclasses import dataclass
from enum import Enum

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_validation.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ValidationStatus(Enum):
    PASS = "✅ 通過"
    FAIL = "❌ 失敗" 
    WARNING = "⚠️ 警告"
    INFO = "ℹ️ 資訊"

@dataclass
class ValidationResult:
    company: str
    test_name: str
    status: ValidationStatus
    message: str
    details: Optional[Dict[str, Any]] = None

class DataValidator:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.validation_results: List[ValidationResult] = []
        
        # 設定股價容忍範圍 (%)
        self.price_tolerance = 5.0  # 允許 5% 的差異
        self.volume_threshold = 1000  # 最低成交量要求
        
    def load_company_data(self) -> Dict[str, Any]:
        """載入公司持有數據"""
        holdings_file = self.data_dir / "holdings.json"
        historical_file = self.data_dir / "complete_historical_baseline.json"
        
        holdings = {}
        historical = {}
        
        if holdings_file.exists():
            with open(holdings_file, 'r', encoding='utf-8') as f:
                holdings = json.load(f)
        
        if historical_file.exists():
            with open(historical_file, 'r', encoding='utf-8') as f:
                historical = json.load(f)
                
        return {"holdings": holdings, "historical": historical}
    
    def validate_stock_ticker(self, ticker: str) -> ValidationResult:
        """驗證股票代碼是否有效"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # 檢查是否能獲取基本資訊
            if not info or 'symbol' not in info:
                return ValidationResult(
                    company=ticker,
                    test_name="股票代碼驗證",
                    status=ValidationStatus.FAIL,
                    message=f"股票代碼 {ticker} 無效或無法獲取資訊"
                )
            
            # 檢查公司名稱
            company_name = info.get('longName', info.get('shortName', 'N/A'))
            
            return ValidationResult(
                company=ticker,
                test_name="股票代碼驗證",
                status=ValidationStatus.PASS,
                message=f"股票代碼有效，公司名稱: {company_name}",
                details={
                    "company_name": company_name,
                    "currency": info.get('currency', 'N/A'),
                    "exchange": info.get('exchange', 'N/A'),
                    "sector": info.get('sector', 'N/A')
                }
            )
            
        except Exception as e:
            return ValidationResult(
                company=ticker,
                test_name="股票代碼驗證",
                status=ValidationStatus.FAIL,
                message=f"驗證股票代碼時出錯: {str(e)}"
            )
    
    def validate_stock_price_accuracy(self, ticker: str, expected_price: float, 
                                    target_date: str) -> ValidationResult:
        """驗證股價數據準確性"""
        try:
            stock = yf.Ticker(ticker)
            
            # 轉換目標日期
            target_dt = datetime.strptime(target_date, '%Y-%m-%d')
            start_date = target_dt - timedelta(days=7)
            end_date = target_dt + timedelta(days=3)
            
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                return ValidationResult(
                    company=ticker,
                    test_name="股價準確性驗證",
                    status=ValidationStatus.FAIL,
                    message=f"無法獲取 {ticker} 在 {target_date} 附近的股價數據"
                )
            
            # 尋找最接近的交易日
            closest_date = None
            closest_price = None
            min_diff = float('inf')
            
            for date, row in hist.iterrows():
                date_diff = abs((date.to_pydatetime().date() - target_dt.date()).days)
                if date_diff < min_diff:
                    min_diff = date_diff
                    closest_date = date.date()
                    closest_price = row['Close']
            
            if closest_price is None:
                return ValidationResult(
                    company=ticker,
                    test_name="股價準確性驗證",
                    status=ValidationStatus.FAIL,
                    message=f"找不到 {ticker} 的股價數據"
                )
            
            # 計算價格差異百分比
            price_diff = abs(closest_price - expected_price)
            price_diff_pct = (price_diff / expected_price) * 100
            
            # 判斷是否在容忍範圍內
            if price_diff_pct <= self.price_tolerance:
                status = ValidationStatus.PASS
                message = f"股價數據準確 (差異: {price_diff_pct:.2f}%)"
            elif price_diff_pct <= 15.0:
                status = ValidationStatus.WARNING
                message = f"股價數據有差異但可接受 (差異: {price_diff_pct:.2f}%)"
            else:
                status = ValidationStatus.FAIL
                message = f"股價數據差異過大 (差異: {price_diff_pct:.2f}%)"
            
            return ValidationResult(
                company=ticker,
                test_name="股價準確性驗證",
                status=status,
                message=message,
                details={
                    "expected_price": expected_price,
                    "actual_price": closest_price,
                    "price_diff": price_diff,
                    "price_diff_pct": price_diff_pct,
                    "target_date": target_date,
                    "actual_date": str(closest_date),
                    "date_diff_days": min_diff
                }
            )
            
        except Exception as e:
            return ValidationResult(
                company=ticker,
                test_name="股價準確性驗證",
                status=ValidationStatus.FAIL,
                message=f"驗證股價時出錯: {str(e)}"
            )
    
    def validate_data_completeness(self, ticker: str, company_data: Dict[str, Any]) -> ValidationResult:
        """驗證數據完整性"""
        required_fields = {
            "company_name": "公司名稱",
            "coin": "持有代幣",
            "holding_qty": "持有數量", 
            "coin_id": "代幣ID"
        }
        
        missing_fields = []
        for field, description in required_fields.items():
            if field not in company_data or not company_data[field]:
                missing_fields.append(f"{description} ({field})")
        
        if missing_fields:
            return ValidationResult(
                company=ticker,
                test_name="數據完整性驗證",
                status=ValidationStatus.FAIL,
                message=f"缺少必要欄位: {', '.join(missing_fields)}",
                details={"missing_fields": missing_fields}
            )
        
        return ValidationResult(
            company=ticker,
            test_name="數據完整性驗證",
            status=ValidationStatus.PASS,
            message="所有必要欄位都存在",
            details={"fields_count": len(required_fields)}
        )
    
    def validate_trading_activity(self, ticker: str) -> ValidationResult:
        """驗證交易活動 - 確保股票有足夠的流動性"""
        try:
            stock = yf.Ticker(ticker)
            
            # 獲取最近5天的交易數據
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                return ValidationResult(
                    company=ticker,
                    test_name="交易活動驗證",
                    status=ValidationStatus.FAIL,
                    message=f"無法獲取 {ticker} 的交易數據"
                )
            
            # 檢查成交量
            avg_volume = hist['Volume'].mean()
            recent_volume = hist['Volume'].iloc[-1] if len(hist) > 0 else 0
            
            if avg_volume < self.volume_threshold:
                status = ValidationStatus.WARNING
                message = f"交易量偏低 (平均: {avg_volume:,.0f})"
            else:
                status = ValidationStatus.PASS
                message = f"交易活動正常 (平均: {avg_volume:,.0f})"
            
            return ValidationResult(
                company=ticker,
                test_name="交易活動驗證",
                status=status,
                message=message,
                details={
                    "avg_volume": avg_volume,
                    "recent_volume": recent_volume,
                    "trading_days": len(hist)
                }
            )
            
        except Exception as e:
            return ValidationResult(
                company=ticker,
                test_name="交易活動驗證",
                status=ValidationStatus.FAIL,
                message=f"驗證交易活動時出錯: {str(e)}"
            )
    
    def validate_company(self, ticker: str, company_data: Dict[str, Any], 
                        historical_data: Optional[Dict[str, Any]] = None) -> List[ValidationResult]:
        """對單一公司進行完整驗證"""
        results = []
        
        logger.info(f"🔍 開始驗證公司: {ticker}")
        
        # 1. 股票代碼驗證
        ticker_result = self.validate_stock_ticker(ticker)
        results.append(ticker_result)
        
        # 如果股票代碼無效，跳過後續驗證
        if ticker_result.status == ValidationStatus.FAIL:
            logger.warning(f"⚠️ {ticker} 股票代碼無效，跳過後續驗證")
            return results
        
        # 2. 數據完整性驗證
        completeness_result = self.validate_data_completeness(ticker, company_data)
        results.append(completeness_result)
        
        # 3. 交易活動驗證
        trading_result = self.validate_trading_activity(ticker)
        results.append(trading_result)
        
        # 4. 股價準確性驗證 (如果有歷史數據)
        if historical_data:
            for week, week_data in historical_data.items():
                if ticker in week_data.get('companies', {}):
                    company_week_data = week_data['companies'][ticker]
                    expected_price = company_week_data.get('stock_price', 0)
                    target_date = week_data.get('baseline_date', '')
                    
                    if expected_price and target_date:
                        price_result = self.validate_stock_price_accuracy(
                            ticker, expected_price, target_date
                        )
                        results.append(price_result)
                        
                        # 為了避免API限制，增加延遲
                        time.sleep(1)
        
        return results
    
    def validate_all_companies(self) -> Dict[str, List[ValidationResult]]:
        """驗證所有公司"""
        logger.info("🚀 開始完整數據驗證流程...")
        
        data = self.load_company_data()
        holdings = data["holdings"]
        historical = data["historical"].get("data", {})
        
        all_results = {}
        
        for ticker, company_info in holdings.items():
            try:
                results = self.validate_company(ticker, company_info, historical)
                all_results[ticker] = results
                self.validation_results.extend(results)
                
                # API限制延遲
                time.sleep(2)
                
            except Exception as e:
                error_result = ValidationResult(
                    company=ticker,
                    test_name="整體驗證",
                    status=ValidationStatus.FAIL,
                    message=f"驗證過程中出錯: {str(e)}"
                )
                all_results[ticker] = [error_result]
                self.validation_results.append(error_result)
                logger.error(f"❌ 驗證 {ticker} 時出錯: {e}")
        
        return all_results
    
    def generate_validation_report(self, results: Dict[str, List[ValidationResult]]) -> str:
        """生成驗證報告"""
        report_lines = [
            "=" * 80,
            "📊 數據驗證報告 - Data Validation Report",
            "=" * 80,
            f"生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"驗證公司數量: {len(results)}",
            ""
        ]
        
        # 統計
        total_tests = sum(len(company_results) for company_results in results.values())
        pass_count = sum(1 for result in self.validation_results if result.status == ValidationStatus.PASS)
        fail_count = sum(1 for result in self.validation_results if result.status == ValidationStatus.FAIL)
        warning_count = sum(1 for result in self.validation_results if result.status == ValidationStatus.WARNING)
        
        report_lines.extend([
            "📈 整體統計:",
            f"   總測試數: {total_tests}",
            f"   ✅ 通過: {pass_count}",
            f"   ❌ 失敗: {fail_count}",
            f"   ⚠️ 警告: {warning_count}",
            f"   成功率: {(pass_count/total_tests*100):.1f}%" if total_tests > 0 else "   成功率: N/A",
            ""
        ])
        
        # 各公司詳細結果
        report_lines.append("🏢 各公司驗證詳情:")
        report_lines.append("-" * 80)
        
        for company, company_results in results.items():
            report_lines.append(f"\n📋 {company}:")
            
            for result in company_results:
                status_icon = result.status.value.split()[0]  # 獲取表情符號
                report_lines.append(f"   {status_icon} {result.test_name}: {result.message}")
                
                if result.details and result.status in [ValidationStatus.FAIL, ValidationStatus.WARNING]:
                    for key, value in result.details.items():
                        if isinstance(value, (int, float)):
                            if isinstance(value, float):
                                report_lines.append(f"      {key}: {value:.2f}")
                            else:
                                report_lines.append(f"      {key}: {value:,}")
                        else:
                            report_lines.append(f"      {key}: {value}")
        
        # 建議和注意事項
        if fail_count > 0 or warning_count > 0:
            report_lines.extend([
                "",
                "⚠️ 需要關注的問題:",
                "-" * 50
            ])
            
            for result in self.validation_results:
                if result.status in [ValidationStatus.FAIL, ValidationStatus.WARNING]:
                    report_lines.append(f"• {result.company}: {result.message}")
        
        report_lines.extend([
            "",
            "=" * 80,
            "報告結束 - End of Report",
            "=" * 80
        ])
        
        return "\n".join(report_lines)
    
    def save_report(self, report: str, filename: str = None) -> str:
        """保存驗證報告"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"validation_report_{timestamp}.txt"
        
        report_path = self.base_dir / filename
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logger.info(f"📄 驗證報告已保存至: {report_path}")
        return str(report_path)
    
    def quick_validate_new_company(self, ticker: str, company_data: Dict[str, Any]) -> bool:
        """快速驗證新公司 - 返回是否通過基本驗證"""
        logger.info(f"🆕 快速驗證新公司: {ticker}")
        
        results = self.validate_company(ticker, company_data)
        
        # 檢查是否有失敗的關鍵驗證
        critical_failures = [
            result for result in results 
            if result.status == ValidationStatus.FAIL and result.test_name in [
                "股票代碼驗證", "數據完整性驗證"
            ]
        ]
        
        if critical_failures:
            logger.warning(f"⚠️ {ticker} 未通過關鍵驗證:")
            for failure in critical_failures:
                logger.warning(f"   ❌ {failure.message}")
            return False
        
        logger.info(f"✅ {ticker} 通過快速驗證")
        return True

def main():
    """主函數 - 執行完整驗證"""
    validator = DataValidator()
    
    print("🚀 啟動數據驗證系統...")
    
    # 執行完整驗證
    results = validator.validate_all_companies()
    
    # 生成報告
    report = validator.generate_validation_report(results)
    
    # 輸出到控制台
    print(report)
    
    # 保存報告
    validator.save_report(report)

if __name__ == "__main__":
    main()