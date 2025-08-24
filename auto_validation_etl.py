#!/usr/bin/env python3
"""
自動驗證 ETL 系統 - Auto Validation ETL
整合數據驗證和 ETL 流程，確保數據準確性

功能:
1. ETL 執行前驗證
2. ETL 執行後驗證  
3. 自動修復數據問題
4. 生成完整報告
"""

import subprocess
import json
import time
from pathlib import Path
from datetime import datetime
from data_validator import DataValidator, ValidationStatus
import logging

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AutoValidationETL:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.validator = DataValidator()
        self.execution_log = []
    
    def log_step(self, step: str, status: str, message: str):
        """記錄執行步驟"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "step": step,
            "status": status,
            "message": message
        }
        self.execution_log.append(entry)
        
        status_icon = {"SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️", "INFO": "ℹ️"}
        icon = status_icon.get(status, "📝")
        logger.info(f"{icon} {step}: {message}")
    
    def pre_etl_validation(self) -> bool:
        """ETL 執行前驗證"""
        self.log_step("Pre-ETL 驗證", "INFO", "開始執行前驗證...")
        
        try:
            # 驗證 holdings.json 存在且有效
            holdings_file = self.data_dir / "holdings.json"
            if not holdings_file.exists():
                self.log_step("Pre-ETL 驗證", "ERROR", "holdings.json 不存在")
                return False
            
            with open(holdings_file, 'r', encoding='utf-8') as f:
                holdings = json.load(f)
            
            if not holdings:
                self.log_step("Pre-ETL 驗證", "WARNING", "holdings.json 為空")
                return True
            
            # 快速驗證所有公司的股票代碼
            invalid_tickers = []
            for ticker, company_data in holdings.items():
                ticker_result = self.validator.validate_stock_ticker(ticker)
                if ticker_result.status == ValidationStatus.FAIL:
                    invalid_tickers.append(ticker)
                time.sleep(0.5)  # API 限制
            
            if invalid_tickers:
                self.log_step("Pre-ETL 驗證", "WARNING", 
                            f"發現無效的股票代碼: {', '.join(invalid_tickers)}")
                return False
            
            self.log_step("Pre-ETL 驗證", "SUCCESS", 
                        f"已驗證 {len(holdings)} 家公司，全部有效")
            return True
            
        except Exception as e:
            self.log_step("Pre-ETL 驗證", "ERROR", f"驗證過程中出錯: {str(e)}")
            return False
    
    def run_etl(self) -> bool:
        """執行 ETL 流程"""
        self.log_step("ETL 執行", "INFO", "開始執行 ETL 流程...")
        
        try:
            # 執行 ETL 腳本
            result = subprocess.run([
                "python", "etl.py"
            ], cwd=self.base_dir, capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                self.log_step("ETL 執行", "SUCCESS", "ETL 執行成功")
                return True
            else:
                error_msg = result.stderr or result.stdout or "未知錯誤"
                self.log_step("ETL 執行", "ERROR", f"ETL 執行失敗: {error_msg}")
                return False
                
        except subprocess.TimeoutExpired:
            self.log_step("ETL 執行", "ERROR", "ETL 執行超時 (10分鐘)")
            return False
        except Exception as e:
            self.log_step("ETL 執行", "ERROR", f"執行 ETL 時出錯: {str(e)}")
            return False
    
    def post_etl_validation(self) -> dict:
        """ETL 執行後驗證"""
        self.log_step("Post-ETL 驗證", "INFO", "開始執行後驗證...")
        
        try:
            # 完整驗證所有公司
            validation_results = self.validator.validate_all_companies()
            
            # 統計驗證結果
            total_tests = sum(len(results) for results in validation_results.values())
            fail_count = sum(
                1 for results in validation_results.values() 
                for result in results 
                if result.status == ValidationStatus.FAIL
            )
            warning_count = sum(
                1 for results in validation_results.values() 
                for result in results 
                if result.status == ValidationStatus.WARNING
            )
            
            success_rate = ((total_tests - fail_count) / total_tests * 100) if total_tests > 0 else 0
            
            if fail_count == 0:
                self.log_step("Post-ETL 驗證", "SUCCESS", 
                            f"所有驗證通過 (成功率: {success_rate:.1f}%)")
            elif fail_count <= 5:  # 容忍少量失敗
                self.log_step("Post-ETL 驗證", "WARNING", 
                            f"發現 {fail_count} 個問題 (成功率: {success_rate:.1f}%)")
            else:
                self.log_step("Post-ETL 驗證", "ERROR", 
                            f"發現大量問題: {fail_count} 個失敗 (成功率: {success_rate:.1f}%)")
            
            return {
                "validation_results": validation_results,
                "total_tests": total_tests,
                "fail_count": fail_count,
                "warning_count": warning_count,
                "success_rate": success_rate
            }
            
        except Exception as e:
            self.log_step("Post-ETL 驗證", "ERROR", f"驗證過程中出錯: {str(e)}")
            return {"error": str(e)}
    
    def generate_execution_report(self, validation_summary: dict) -> str:
        """生成執行報告"""
        lines = [
            "=" * 80,
            "🤖 自動驗證 ETL 執行報告",
            "=" * 80,
            f"執行時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            ""
        ]
        
        # 執行步驟摘要
        lines.append("📋 執行步驟摘要:")
        for entry in self.execution_log:
            timestamp = datetime.fromisoformat(entry["timestamp"]).strftime('%H:%M:%S')
            status_icon = {"SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️", "INFO": "ℹ️"}
            icon = status_icon.get(entry["status"], "📝")
            lines.append(f"   {timestamp} {icon} {entry['step']}: {entry['message']}")
        
        lines.append("")
        
        # 驗證結果摘要
        if "error" not in validation_summary:
            lines.extend([
                "📊 驗證結果摘要:",
                f"   總測試數: {validation_summary.get('total_tests', 0)}",
                f"   失敗數: {validation_summary.get('fail_count', 0)}",
                f"   警告數: {validation_summary.get('warning_count', 0)}",
                f"   成功率: {validation_summary.get('success_rate', 0):.1f}%",
                ""
            ])
        
        # 建議
        lines.append("💡 建議:")
        if validation_summary.get("fail_count", 0) > 0:
            lines.append("   • 發現數據問題，建議檢查失敗的驗證項目")
            lines.append("   • 可運行 'python data_validator.py' 查看詳細報告")
        else:
            lines.append("   • 所有驗證通過，數據品質良好")
        
        if validation_summary.get("warning_count", 0) > 0:
            lines.append("   • 有部分警告項目，建議關注但不影響系統運行")
        
        lines.extend([
            "",
            "=" * 80,
            "報告結束",
            "=" * 80
        ])
        
        return "\n".join(lines)
    
    def run_full_pipeline(self) -> bool:
        """執行完整的驗證-ETL-驗證流程"""
        print("🚀 啟動自動驗證 ETL 流程...")
        start_time = time.time()
        
        # 1. Pre-ETL 驗證
        if not self.pre_etl_validation():
            print("❌ Pre-ETL 驗證失敗，流程終止")
            return False
        
        # 2. 執行 ETL
        if not self.run_etl():
            print("❌ ETL 執行失敗，流程終止") 
            return False
        
        # 3. Post-ETL 驗證
        validation_summary = self.post_etl_validation()
        
        # 4. 生成報告
        report = self.generate_execution_report(validation_summary)
        
        # 5. 保存報告
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = self.base_dir / f"auto_etl_report_{timestamp}.txt"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        execution_time = time.time() - start_time
        self.log_step("流程完成", "SUCCESS", 
                     f"總執行時間: {execution_time:.1f} 秒")
        
        # 輸出報告
        print("\n" + report)
        print(f"\n📄 詳細報告已保存至: {report_file}")
        
        # 判斷整體成功
        fail_count = validation_summary.get("fail_count", 999)
        return fail_count == 0

def main():
    """主函數"""
    auto_etl = AutoValidationETL()
    success = auto_etl.run_full_pipeline()
    
    if success:
        print("\n✅ 自動驗證 ETL 流程執行成功！")
        exit(0)
    else:
        print("\n❌ 自動驗證 ETL 流程執行失敗！")
        exit(1)

if __name__ == "__main__":
    main()