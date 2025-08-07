#!/usr/bin/env python3
"""
DramatiqワーカーとAPSchedulerを統合したメインプロセス
1つのプロセスでワーカーとスケジューラーの両方を実行
"""

import logging
import signal
import sys
import threading
import time
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from dramatiq.cli import main as dramatiq_main

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.background.tasks import cleanup_expired_files_storage, cleanup_expired_upload_sessions

logger = logging.getLogger(__name__)


class WorkerWithScheduler:
    """DramatiqワーカーとAPSchedulerを統合したクラス"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.dramatiq_thread = None
        self.running = True
        
    def setup_scheduler(self):
        """定期タスクの設定"""
        # 期限切れファイルのストレージクリーンアップ（1時間ごと）
        self.scheduler.add_job(
            func=lambda: cleanup_expired_files_storage.send(),
            # trigger=IntervalTrigger(hours=1),
            trigger=IntervalTrigger(seconds=30),
            id='cleanup_expired_files',
            name='期限切れファイルのストレージクリーンアップ',
            replace_existing=True
        )
        
        # 期限切れアップロードセッションのクリーンアップ（30分ごと）
        self.scheduler.add_job(
            func=lambda: cleanup_expired_upload_sessions.send(),
            # trigger=IntervalTrigger(minutes=30),
            trigger=IntervalTrigger(seconds=30),
            id='cleanup_expired_sessions',
            name='期限切れアップロードセッションのクリーンアップ',
            replace_existing=True
        )
        
        logger.info("定期タスクの設定が完了しました")
        
    def start_dramatiq_worker(self):
        """Dramatiqワーカーを別スレッドで起動"""
        def run_dramatiq():
            # Dramatiqワーカーをプログラム的に起動
            try:
                sys.argv = ['dramatiq', 'app.background.tasks']
                dramatiq_main()
            except Exception as e:
                logger.error(f"Dramatiq worker error: {e}")
                
        self.dramatiq_thread = threading.Thread(target=run_dramatiq, daemon=True)
        self.dramatiq_thread.start()
        logger.info("Dramatiqワーカーが開始されました")
        
    def start(self):
        """ワーカーとスケジューラーを開始"""
        self.setup_scheduler()
        self.scheduler.start()
        logger.info("APSchedulerが開始されました")
        
        self.start_dramatiq_worker()
        
        # シグナルハンドラーを設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # メインループ
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("KeyboardInterruptを受信しました")
        finally:
            self.shutdown()
            
    def _signal_handler(self, signum, _frame):
        """シグナルハンドラー"""
        logger.info(f"Signal {signum} received, shutting down...")
        self.running = False
        
    def shutdown(self):
        """クリーンアップ処理"""
        logger.info("Shutting down scheduler and worker...")
        
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("APSchedulerが停止されました")
            
        # Dramatiqワーカーの停止は自動的に行われる（daemon thread）
        logger.info("Worker with scheduler shutdown complete")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    
    worker_scheduler = WorkerWithScheduler()
    worker_scheduler.start()