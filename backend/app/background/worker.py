#!/usr/bin/env python3
"""
Dramatiqワーカーのみを実行するスクリプト
スケジューラーを使わず、リアクティブタスクのみを処理
"""

import logging
import signal
import sys
import threading
import time

import dramatiq
from dramatiq import Worker

logger = logging.getLogger(__name__)


def main():
    """ワーカーのメイン関数 - dramatiq APIを使用"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    
    logger.info("Starting Dramatiq worker (reactive tasks only)")
    
    # tasksモジュールをインポートしてアクターを登録
    from app.background import tasks
    
    # ブローカーを取得
    broker = dramatiq.get_broker()
    
    # ワーカーを作成
    worker = Worker(broker, worker_processes=1, worker_threads=1)
    
    # グレースフルシャットダウン用フラグ
    shutdown_event = threading.Event()
    
    def signal_handler(signum, frame):
        """シグナルハンドラー"""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        shutdown_event.set()
        worker.stop()
    
    # シグナルハンドラーを設定
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        logger.info("Worker started and ready to process tasks")
        # ワーカーを開始
        worker.start()
        
        # シャットダウンシグナルが来るまで待機
        while not shutdown_event.is_set():
            time.sleep(0.1)
            
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received")
    except Exception as e:
        logger.error(f"Worker error: {e}")
        return 1
    finally:
        logger.info("Stopping worker...")
        worker.stop()
        logger.info("Worker stopped")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())