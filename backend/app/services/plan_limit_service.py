# backend/app/services/plan_limit_service.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.database import prisma
from app.schemas.auth import AuthUser
import logging

logger = logging.getLogger(__name__)


class PlanLimitService:
    @staticmethod
    async def get_user_plan(user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザーのプラン情報を取得（無料プランの場合はデフォルトプランを返す）"""
        try:
            # ユーザーのサブスクリプションを取得
            subscription = await prisma.subscription.find_unique(
                where={"userId": user_id},
                include={"plan": True}
            )
            
            if subscription and subscription.status in ["active", "trialing"]:
                return {
                    "plan": subscription.plan,
                    "subscription": subscription
                }
            
            # サブスクリプションがない場合は無料プランを取得
            free_plan = await prisma.plan.find_first(
                where={"name": "free", "isActive": True}
            )
            
            if not free_plan:
                # 無料プランがない場合はデフォルト制限を返す
                logger.warning("No free plan found, using default limits")
                return {
                    "plan": None,
                    "default_limits": {
                        "max_file_size": 100 * 1024 * 1024,  # 100MB
                        "max_files_per_month": 10,
                        "max_storage_total": 1024 * 1024 * 1024,  # 1GB
                        "max_downloads_per_file": 1
                    }
                }
            
            return {
                "plan": free_plan,
                "subscription": None
            }
            
        except Exception as e:
            logger.error(f"Error getting user plan: {e}")
            raise
    
    @staticmethod
    async def check_file_size_limit(user: AuthUser, file_size: int) -> None:
        """ファイルサイズ制限をチェック"""
        try:
            plan_info = await PlanLimitService.get_user_plan(user.id)
            
            if plan_info.get("plan"):
                max_size = plan_info["plan"].maxFileSize
            else:
                max_size = plan_info["default_limits"]["max_file_size"]
            
            if file_size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File size ({file_size} bytes) exceeds plan limit ({max_size} bytes)"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking file size limit: {e}")
            raise
    
    @staticmethod
    async def check_monthly_upload_limit(user: AuthUser) -> None:
        """月間アップロード数制限をチェック"""
        try:
            plan_info = await PlanLimitService.get_user_plan(user.id)
            
            if plan_info.get("plan"):
                max_uploads = plan_info["plan"].maxFilesPerMonth
            else:
                max_uploads = plan_info["default_limits"]["max_files_per_month"]
            
            # 今月のアップロード数を計算
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            current_uploads = await prisma.file.count(
                where={
                    "userId": user.id,
                    "createdAt": {"gte": start_of_month},
                    "uploadStatus": "completed"
                }
            )
            
            if current_uploads >= max_uploads:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Monthly upload limit reached ({current_uploads}/{max_uploads})"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking monthly upload limit: {e}")
            raise
    
    @staticmethod
    async def check_total_storage_limit(user: AuthUser, additional_size: int = 0) -> None:
        """総ストレージ容量制限をチェック"""
        try:
            plan_info = await PlanLimitService.get_user_plan(user.id)
            
            if plan_info.get("plan"):
                max_storage = plan_info["plan"].maxStorageTotal
            else:
                max_storage = plan_info["default_limits"]["max_storage_total"]
            
            # 現在の使用量を計算
            user_files = await prisma.file.find_many(
                where={
                    "userId": user.id,
                    "uploadStatus": "completed"
                }
            )
            
            current_storage = sum(file.size for file in user_files)
            total_storage = current_storage + additional_size
            
            if total_storage > max_storage:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Storage limit exceeded ({total_storage}/{max_storage} bytes)"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking storage limit: {e}")
            raise
    
    @staticmethod
    async def check_download_limit(user: Optional[AuthUser], file_id: str) -> None:
        """ダウンロード数制限をチェック（ファイル所有者の場合）"""
        try:
            file = await prisma.file.find_unique(
                where={"id": file_id},
                include={"user": {"include": {"subscription": {"include": {"plan": True}}}}}
            )
            
            if not file or not file.user:
                # ファイルが存在しないまたは匿名アップロードの場合はデフォルト制限
                max_downloads = 1
            else:
                plan_info = await PlanLimitService.get_user_plan(file.user.id)
                if plan_info.get("plan"):
                    max_downloads = plan_info["plan"].maxDownloadsPerFile
                else:
                    max_downloads = plan_info["default_limits"]["max_downloads_per_file"]
            
            # 現在のダウンロード数を取得
            current_downloads = await prisma.downloadlog.count(
                where={"fileId": file_id}
            )
            
            if current_downloads >= max_downloads:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Download limit reached for this file ({current_downloads}/{max_downloads})"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking download limit: {e}")
            raise
    
    @staticmethod
    async def get_user_usage_stats(user: AuthUser) -> Dict[str, Any]:
        """ユーザーの使用量統計を取得"""
        try:
            plan_info = await PlanLimitService.get_user_plan(user.id)
            
            # プラン制限
            if plan_info.get("plan"):
                limits = {
                    "max_file_size": plan_info["plan"].maxFileSize,
                    "max_files_per_month": plan_info["plan"].maxFilesPerMonth,
                    "max_storage_total": plan_info["plan"].maxStorageTotal,
                    "max_downloads_per_file": plan_info["plan"].maxDownloadsPerFile
                }
            else:
                limits = plan_info["default_limits"]
            
            # 今月のアップロード数
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_uploads = await prisma.file.count(
                where={
                    "userId": user.id,
                    "createdAt": {"gte": start_of_month},
                    "uploadStatus": "completed"
                }
            )
            
            # 総ストレージ使用量
            user_files = await prisma.file.find_many(
                where={
                    "userId": user.id,
                    "uploadStatus": "completed"
                }
            )
            total_storage_used = sum(file.size for file in user_files)
            
            # 総ファイル数
            total_files = await prisma.file.count(
                where={
                    "userId": user.id,
                    "uploadStatus": "completed"
                }
            )
            
            return {
                "plan": {
                    "name": plan_info["plan"].name if plan_info.get("plan") else "free",
                    "display_name": plan_info["plan"].displayName if plan_info.get("plan") else "Free"
                },
                "limits": limits,
                "usage": {
                    "monthly_uploads": monthly_uploads,
                    "total_storage_used": total_storage_used,
                    "total_files": total_files
                },
                "subscription": {
                    "status": plan_info["subscription"].status if plan_info.get("subscription") else None,
                    "current_period_end": plan_info["subscription"].currentPeriodEnd if plan_info.get("subscription") else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting user usage stats: {e}")
            raise