"""
定期タスクスケジューラー
APSchedulerを使用してDramatiqタスクを定期実行
"""

import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.background.tasks import cleanup_expired_files_storage, cleanup_expired_upload_sessions

logger = logging.getLogger(__name__)


class TaskScheduler:
    """定期タスクスケジューラー"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        
    def setup_jobs(self):
        """定期タスクの設定"""
        
        # 期限切れファイルのストレージクリーンアップ（1時間ごと）
        self.scheduler.add_job(
            func=lambda: cleanup_expired_files_storage.send(),
            # trigger=IntervalTrigger(hours=1),
            trigger=IntervalTrigger(seconds=10),
            id='cleanup_expired_files',
            name='期限切れファイルのストレージクリーンアップ',
            replace_existing=True
        )
        
        # 期限切れアップロードセッションのクリーンアップ（30分ごと）
        self.scheduler.add_job(
            func=lambda: cleanup_expired_upload_sessions.send(),
            # trigger=IntervalTrigger(minutes=30),
            trigger=IntervalTrigger(seconds=10),
            id='cleanup_expired_sessions',
            name='期限切れアップロードセッションのクリーンアップ',
            replace_existing=True
        )
        
        logger.info("定期タスクの設定が完了しました")
        
    def start(self):
        """スケジューラーを開始"""
        self.setup_jobs()
        self.scheduler.start()
        logger.info("タスクスケジューラーが開始されました")
        
    def shutdown(self):
        """スケジューラーを停止"""
        self.scheduler.shutdown()
        logger.info("タスクスケジューラーが停止されました")


async def run_scheduler():
    """スケジューラーを実行"""
    scheduler = TaskScheduler()
    scheduler.start()
    
    try:
        # スケジューラーを実行し続ける
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("KeyboardInterruptを受信しました。スケジューラーを停止します")
        scheduler.shutdown()


if __name__ == "__main__":
    # スケジューラーの単独実行
    asyncio.run(run_scheduler())