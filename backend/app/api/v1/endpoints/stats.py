# backend/app/api/v1/endpoints/stats.py
from fastapi import APIRouter, Depends
from app.schemas.stats import UserStatsResponse
from app.schemas.auth import AuthUser
from app.core.auth import require_auth
from app.services.stats import stats_service

router = APIRouter()


@router.get(
    "/user", 
    response_model=UserStatsResponse,
    summary="ユーザー統計情報取得",
    description="認証されたユーザーの統計情報（ファイル数、要求数、アクティブファイル数）を取得します。"
)
async def get_user_stats(
    current_user: AuthUser = Depends(require_auth)
) -> UserStatsResponse:
    """ユーザーの統計情報を取得"""
    return await stats_service.get_user_stats(current_user.id)