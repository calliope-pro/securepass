"""
バックグラウンドタスク
期限切れファイルのストレージクリーンアップ処理
"""

import asyncio
from datetime import datetime, timezone
import logging

import dramatiq
from dramatiq.brokers.redis import RedisBroker
from dramatiq.results import Results
from dramatiq.results.backends.redis import RedisBackend

from app.core.database import prisma
from app.core.storage import R2Storage
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis結果バックエンド設定
result_backend = RedisBackend(url=settings.REDIS_URL)

# Dramatiq Redisブローカー設定
redis_broker = RedisBroker(url=settings.REDIS_URL)
redis_broker.add_middleware(Results(backend=result_backend))
dramatiq.set_broker(redis_broker)


@dramatiq.actor(max_retries=3, min_backoff=300000)  # 5分後にリトライ、最大3回
def cleanup_expired_files_storage():
    """期限切れファイルのストレージクリーンアップタスク"""
    try:
        # 同期関数内で非同期処理を実行
        result = asyncio.run(_cleanup_expired_files_storage_async())
        logger.info(f"Storage cleanup completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Storage cleanup failed: {e}")
        raise  # Dramatiqが自動的にリトライを処理


@dramatiq.actor(max_retries=3, min_backoff=300000)  # 5分後にリトライ、最大3回
def cleanup_expired_upload_sessions():
    """期限切れアップロードセッションのクリーンアップタスク"""
    try:
        result = asyncio.run(_cleanup_expired_upload_sessions_async())
        logger.info(f"Upload session cleanup completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Upload session cleanup failed: {e}")
        raise  # Dramatiqが自動的にリトライを処理


async def _cleanup_expired_files_storage_async() -> dict:
    """期限切れファイルのストレージクリーンアップ（非同期実装）"""
    current_time = datetime.now(timezone.utc)
    
    # 常に新しい接続を作成（ワーカープロセス間の接続問題を回避）
    try:
        await prisma.connect()
    except Exception as e:
        logger.warning(f"Prisma already connected or connection failed: {e}")
    
    try:
        # 期限切れファイルを検索（DBレコードは残す、ストレージのみ削除）
        expired_files = await prisma.file.find_many(
            where={
                "expiresAt": {"lt": current_time},
                "isInvalidated": False  # まだ無効化されていないファイル
            },
            include={
                "chunks": True
            }
        )
        
        if not expired_files:
            logger.info("No expired files found")
            return {"processed_files": 0, "errors": []}
        
        logger.info(f"Found {len(expired_files)} expired files to clean up from storage")
        
        storage = R2Storage()
        processed_count = 0
        errors = []
        
        for file in expired_files:
            try:
                # R2からファイルチャンクを削除
                if file.chunks:
                    for chunk in file.chunks:
                        try:
                            await storage.delete_object(chunk.r2Key)
                            logger.debug(f"Deleted storage chunk: {chunk.r2Key}")
                        except Exception as e:
                            logger.warning(f"Failed to delete chunk {chunk.r2Key}: {e}")
                            errors.append(f"Storage deletion failed for chunk {chunk.id}: {e}")
                
                # ファイルを無効化としてマーク（DBレコードは保持）
                await prisma.file.update(
                    where={"id": file.id},
                    data={"isInvalidated": True}
                )
                
                processed_count += 1
                logger.info(f"Cleaned up storage for expired file: {file.filename} (ID: {file.id})")
                
            except Exception as e:
                logger.error(f"Failed to cleanup file {file.id}: {e}")
                errors.append(f"File {file.id}: {e}")
        
        return {
            "processed_files": processed_count,
            "total_expired": len(expired_files),
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Error in _cleanup_expired_files_storage_async: {e}")
        return {
            "processed_files": 0,
            "total_expired": 0,
            "errors": [str(e)]
        }


async def _cleanup_expired_upload_sessions_async() -> dict:
    """期限切れアップロードセッションのクリーンアップ（非同期実装）"""
    current_time = datetime.now(timezone.utc)
    
    # 常に新しい接続を作成（ワーカープロセス間の接続問題を回避）
    try:
        await prisma.connect()
    except Exception as e:
        logger.warning(f"Prisma already connected or connection failed: {e}")
        
    try:
        
        # 期限切れアップロードセッションを検索
        expired_sessions = await prisma.uploadsession.find_many(
            where={
                "expiresAt": {"lt": current_time},
                "status": {"in": ["active"]}  # アクティブなセッション
            }
        )
        
        if not expired_sessions:
            logger.info("No expired upload sessions found")
            return {"deleted_sessions": 0, "errors": []}
        
        logger.info(f"Found {len(expired_sessions)} expired upload sessions to clean up")
        
        deleted_count = 0
        errors = []
        
        for session in expired_sessions:
            try:
                # UploadSessionにはchunksがないため、メタデータをチェックしてクリーンアップ
                # 必要に応じてsession.metadataからファイル情報を取得してストレージから削除
                
                # セッションを削除（未完了セッションなのでDBからも削除）
                await prisma.uploadsession.delete(where={"id": session.id})
                
                deleted_count += 1
                logger.info(f"Deleted expired upload session: {session.id}")
                
            except Exception as e:
                logger.error(f"Failed to delete upload session {session.id}: {e}")
                errors.append(f"Session {session.id}: {e}")
        
        return {
            "deleted_sessions": deleted_count,
            "total_expired": len(expired_sessions), 
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Error in _cleanup_expired_upload_sessions_async: {e}")
        return {
            "deleted_sessions": 0,
            "total_expired": 0,
            "errors": [str(e)]
        }


# 手動実行用の関数（開発・デバッグ用）
async def manual_cleanup_expired_files_storage():
    """手動での期限切れファイルストレージクリーンアップ実行"""
    return await _cleanup_expired_files_storage_async()


async def manual_cleanup_expired_upload_sessions():
    """手動での期限切れアップロードセッションクリーンアップ実行"""  
    return await _cleanup_expired_upload_sessions_async()