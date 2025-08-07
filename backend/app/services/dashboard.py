# backend/app/services/dashboard.py
from datetime import datetime, UTC
from app.core.database import prisma
from app.schemas.dashboard import DashboardStatsResponse, RecentActivityItem, FileActivity
from typing import List
import logging

logger = logging.getLogger(__name__)


class DashboardService:
    """ダッシュボード情報サービス"""
    
    @staticmethod
    async def get_dashboard_stats(user_id: str) -> DashboardStatsResponse:
        """ダッシュボード統計情報を取得"""
        try:
            logger.info(f"Getting dashboard stats for user: {user_id}")
            
            # 基本統計
            total_files = await prisma.file.count(
                where={"userId": user_id}
            )
            
            total_requests = await prisma.accessrequest.count(
                where={"file": {"userId": user_id}}
            )
            
            current_time = datetime.now(UTC)
            active_files = await prisma.file.count(
                where={
                    "userId": user_id,
                    "expiresAt": {"gt": current_time}
                }
            )
            
            # 今月のアップロード数
            month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            this_month_uploads = await prisma.file.count(
                where={
                    "userId": user_id,
                    "createdAt": {"gte": month_start}
                }
            )
            
            # 最近のアクティビティを取得
            recent_activity = await DashboardService._get_recent_activity(user_id)
            
            return DashboardStatsResponse(
                total_files=total_files,
                total_requests=total_requests,
                active_files=active_files,
                this_month_uploads=this_month_uploads,
                recent_activity=recent_activity
            )
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats for {user_id}: {e}")
            # エラー時は空の統計を返す
            return DashboardStatsResponse()
    
    @staticmethod
    async def _get_recent_activity(user_id: str, limit: int = 10) -> List[RecentActivityItem]:
        """最近のアクティビティを取得"""
        try:
            activities = []
            
            # 最近のファイルアップロード
            recent_files = await prisma.file.find_many(
                where={"userId": user_id},
                order=[{"createdAt": "desc"}],
                take=5
            )
            
            for file in recent_files:
                activities.append(RecentActivityItem(
                    id=f"file_{file.id}",
                    type="file_upload",
                    title=f"ファイルをアップロードしました",
                    description=file.filename,
                    created_at=file.createdAt,
                    file_id=file.id
                ))
            
            # 最近のアクセス要求
            recent_requests = await prisma.accessrequest.find_many(
                where={"file": {"userId": user_id}},
                order=[{"createdAt": "desc"}],
                take=5,
                include={"file": True}
            )
            
            for request in recent_requests:
                if request.file:
                    activities.append(RecentActivityItem(
                        id=f"request_{request.id}",
                        type="access_request",
                        title=f"アクセス要求を受信しました",
                        description=f"{request.file.filename}への要求",
                        created_at=request.createdAt,
                        request_id=request.id,
                        file_id=request.fileId
                    ))
            
            # 日時でソートして制限
            activities.sort(key=lambda x: x.created_at, reverse=True)
            return activities[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recent activity for {user_id}: {e}")
            return []
    
    @staticmethod
    async def get_file_activities(user_id: str, limit: int = 20) -> List[FileActivity]:
        """ファイルアクティビティを取得"""
        try:
            files = await prisma.file.find_many(
                where={"userId": user_id},
                order=[{"createdAt": "desc"}],
                take=limit,
                include={
                    "requests": True,
                    "downloads": True
                }
            )
            
            activities = []
            for file in files:
                activities.append(FileActivity(
                    id=file.id,
                    filename=file.filename,
                    created_at=file.createdAt,
                    status=file.uploadStatus,
                    share_id=file.shareId,
                    request_count=len(file.requests) if file.requests else 0,
                    download_count=len(file.downloads) if file.downloads else 0
                ))
            
            return activities
            
        except Exception as e:
            logger.error(f"Error getting file activities for {user_id}: {e}")
            return []


dashboard_service = DashboardService()