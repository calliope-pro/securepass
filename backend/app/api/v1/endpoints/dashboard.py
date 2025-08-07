# backend/app/api/v1/endpoints/dashboard.py
from fastapi import APIRouter, Depends
from app.schemas.dashboard import DashboardStatsResponse, FileActivity
from app.schemas.auth import AuthUser
from app.core.auth import require_auth
from app.services.dashboard import dashboard_service
from typing import List

router = APIRouter()


@router.get(
    "/stats", 
    response_model=DashboardStatsResponse,
    summary="ダッシュボード統計情報取得",
    description="認証されたユーザーのダッシュボード統計情報（ファイル数、要求数、最近のアクティビティ）を取得します。"
)
async def get_dashboard_stats(
    current_user: AuthUser = Depends(require_auth)
) -> DashboardStatsResponse:
    """ダッシュボードの統計情報を取得"""
    return await dashboard_service.get_dashboard_stats(current_user.id)


@router.get(
    "/files",
    response_model=List[FileActivity],
    summary="ファイルアクティビティ取得",
    description="認証されたユーザーのファイルアクティビティ一覧を取得します。"
)
async def get_file_activities(
    limit: int = 20,
    current_user: AuthUser = Depends(require_auth)
) -> List[FileActivity]:
    """ファイルアクティビティを取得"""
    return await dashboard_service.get_file_activities(current_user.id, limit)