#!/usr/bin/env python3
"""
Historical Data Management Script
Run this MANUALLY when you need to update historical baseline data
DO NOT run this in automated weekly processes
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from convert_data import convert_weekly_to_historical

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_historical_baseline():
    """Update historical baseline data from current weekly stats"""
    logger.info("=== MANUAL HISTORICAL DATA UPDATE ===")
    logger.info("This script updates historical baseline data from weekly_stats.json")
    logger.info("Only run this when you want to add new historical data points")
    
    try:
        # Use the existing convert_data logic
        convert_weekly_to_historical()
        
        # Verify the update
        base_dir = Path(__file__).parent
        historical_file = base_dir / "public" / "data" / "complete_historical_baseline.json"
        
        if historical_file.exists():
            with open(historical_file, 'r') as f:
                data = json.load(f)
            
            weeks_count = len(data.get('data', {}))
            logger.info(f"✅ Historical data updated successfully")
            logger.info(f"   Total weeks in database: {weeks_count}")
            logger.info(f"   Period: {data.get('period', 'Unknown')}")
            
            return True
        else:
            logger.error("❌ Historical data file was not created")
            return False
            
    except Exception as e:
        logger.error(f"❌ Failed to update historical data: {e}")
        return False

def main():
    """Main execution with user confirmation"""
    print("\n" + "="*60)
    print("🏛️  HISTORICAL DATA MANAGEMENT TOOL")
    print("="*60)
    print("\nThis tool updates the historical baseline data file.")
    print("It should be run MANUALLY, not in automated processes.")
    print("\nCurrent weekly data will be added to historical baseline.")
    print("\n⚠️  WARNING: This will modify complete_historical_baseline.json")
    
    # Ask for confirmation in interactive mode
    try:
        response = input("\nDo you want to continue? [y/N]: ").strip().lower()
        if response not in ['y', 'yes']:
            print("Operation cancelled.")
            return 0
    except (EOFError, KeyboardInterrupt):
        # Running in non-interactive mode (like CI), skip confirmation
        print("\nRunning in non-interactive mode, proceeding...")
    
    print("\nUpdating historical data...")
    success = update_historical_baseline()
    
    if success:
        print("\n✅ Historical data update completed successfully!")
        print("   The dashboard now has updated historical trend data.")
        return 0
    else:
        print("\n❌ Historical data update failed!")
        print("   Check the logs above for error details.")
        return 1

if __name__ == "__main__":
    exit(main())