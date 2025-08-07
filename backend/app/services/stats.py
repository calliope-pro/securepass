# backend/app/services/stats.py
from datetime import datetime, UTC
from app.core.database import prisma
from app.schemas.stats import UserStatsResponse
import logging

logger = logging.getLogger(__name__)


class StatsService:
    """ユーザー統計情報サービス"""
    
    @staticmethod
    async def get_user_stats(user_id: str) -> UserStatsResponse:
        """ユーザーの統計情報を取得"""
        try:
            logger.info(f"Getting stats for user: {user_id}")
            
            # ユーザーがアップロードしたファイル総数
            total_files = await prisma.file.count(
                where={
                    "userId": user_id
                }
            )
            logger.info(f"Total files for user {user_id}: {total_files}")
            
            # ユーザーのファイルに対するアクセス要求総数
            total_requests = await prisma.accessrequest.count(
                where={
                    "file": {
                        "userId": user_id
                    }
                }
            )
            logger.info(f"Total requests for user {user_id}: {total_requests}")
            
            # 現在有効な（期限切れしていない）ファイル数
            current_time = datetime.now(UTC)
            active_files = await prisma.file.count(
                where={
                    "userId": user_id,
                    "expiresAt": {
                        "gt": current_time
                    }
                    # deletedAtフィールドはスキーマに存在しないためコメントアウト
                    # "deletedAt": None
                }
            )
            logger.info(f"Active files for user {user_id}: {active_files} (current time: {current_time})")
            
            result = UserStatsResponse(
                total_files=total_files,
                total_requests=total_requests,
                active_files=active_files
            )
            logger.info(f"Stats result for user {user_id}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting user stats for {user_id}: {e}")
            # エラー時は0で初期化
            return UserStatsResponse(
                total_files=0,
                total_requests=0,
                active_files=0
            )


stats_service = StatsService()