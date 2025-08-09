#!/usr/bin/env python3
"""
Dramatiqワーカーのみを実行するスクリプト
スケジューラーを使わず、リアクティブタスクのみを処理
"""

import logging
import sys
from pathlib import Path

from dramatiq.cli import main as dramatiq_main

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    
    logger.info("Starting Dramatiq worker (reactive tasks only)")
    
    # Dramatiqワーカーを起動
    sys.argv = ['dramatiq', 'app.background.tasks']
    dramatiq_main()