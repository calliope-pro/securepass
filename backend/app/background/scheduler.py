"""
ARQ クライアント用ユーティリティ
API側からタスクを簡単にスケジューリングするためのヘルパー関数
"""

import asyncio
import logging
from datetime import datetime

from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings

logger = logging.getLogger(__name__)


def schedule_file_cleanup_task(file_id: str, expires_at: datetime) -> None:
    """
    FastAPI BackgroundTasks用のファイルクリーンアップスケジューリング
    """
    try:
        asyncio.run(_schedule_file_cleanup_internal(file_id, expires_at))
    except Exception as e:
        logger.error(f"Failed to schedule file cleanup for {file_id}: {e}")


def schedule_session_cleanup_task(session_id: str, expires_at: datetime) -> None:
    """
    FastAPI BackgroundTasks用のセッションクリーンアップスケジューリング
    """
    try:
        asyncio.run(_schedule_session_cleanup_internal(session_id, expires_at))
    except Exception as e:
        logger.error(f"Failed to schedule session cleanup for {session_id}: {e}")


async def _schedule_file_cleanup_internal(file_id: str, expires_at: datetime) -> None:
    """
    内部用：ファイル期限切れクリーンアップタスクをARQにスケジューリング
    """
    redis = None
    try:
        redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        job = await redis.enqueue_job(
            'cleanup_expired_files_storage',
            defer_until=expires_at
        )
        logger.info(f"Scheduled file cleanup for {file_id} at {expires_at} (job_id: {job.job_id})")
    except Exception as e:
        logger.error(f"Failed to schedule file cleanup for {file_id}: {e}")
    finally:
        if redis:
            try:
                await redis.close()
            except Exception:
                pass


async def _schedule_session_cleanup_internal(session_id: str, expires_at: datetime) -> None:
    """
    内部用：セッション期限切れクリーンアップタスクをARQにスケジューリング
    """
    redis = None
    try:
        redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        job = await redis.enqueue_job(
            'cleanup_expired_upload_sessions', 
            defer_until=expires_at
        )
        logger.info(f"Scheduled session cleanup for {session_id} at {expires_at} (job_id: {job.job_id})")
    except Exception as e:
        logger.error(f"Failed to schedule session cleanup for {session_id}: {e}")
    finally:
        if redis:
            try:
                await redis.close()
            except Exception:
                pass