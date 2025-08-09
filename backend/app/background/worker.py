#!/usr/bin/env python3
"""
ARQワーカー - オブジェクト指向でクリーンな実装
リアクティブタスクのみを処理
"""

import logging
import sys

from arq import run_worker
from arq.connections import RedisSettings

from app.background.tasks import cleanup_expired_files_storage, cleanup_expired_upload_sessions
from app.core.config import settings

logger = logging.getLogger(__name__)


class WorkerSettings:
    """ARQ ワーカー設定"""
    
    # 実行するタスク関数
    functions = [
        cleanup_expired_files_storage,
        cleanup_expired_upload_sessions,
    ]
    
    # Redis接続設定
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    
    # ワーカー設定
    job_timeout = 300  # 5分タイムアウト
    keep_result = 3600  # 結果を1時間保持
    max_jobs = 10  # 同時実行ジョブ数
    
    # ログ設定
    log_level = "INFO"


def main():
    """ARQワーカーのメイン関数"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    
    logger.info("Starting ARQ worker (reactive tasks only)")
    
    try:
        # ARQワーカーを起動
        run_worker(WorkerSettings)
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received, shutting down gracefully")
    except Exception as e:
        logger.error(f"Worker error: {e}")
        return 1
    
    logger.info("ARQ worker stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())