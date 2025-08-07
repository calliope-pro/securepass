# backend/app/api/v1/endpoints/users.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Annotated, Optional
from app.schemas.auth import UserResponse, UserUpdate, AuthUser
from app.core.database import prisma
from app.core.auth import get_current_user, require_auth
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/me", response_model=UserResponse, operation_id="get_current_user_profile")
async def get_current_user_profile(
    current_user: Annotated[AuthUser, Depends(require_auth)]
) -> UserResponse:
    """現在のユーザープロフィールを取得"""
    try:
        user = await prisma.user.find_unique(where={"id": current_user.id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.fullName,
            avatar_url=user.avatarUrl,
            created_at=user.createdAt,
            updated_at=user.updatedAt
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.put("/me", response_model=UserResponse, operation_id="update_user_profile")
async def update_user_profile(
    update_data: UserUpdate,
    current_user: Annotated[AuthUser, Depends(require_auth)]
) -> UserResponse:
    """ユーザープロフィールを更新"""
    try:
        # 更新データを準備
        update_fields = {}
        if update_data.full_name is not None:
            update_fields["fullName"] = update_data.full_name
        if update_data.avatar_url is not None:
            update_fields["avatarUrl"] = update_data.avatar_url
        
        if not update_fields:
            # 何も更新することがない場合は現在の情報を返す
            user = await prisma.user.find_unique(where={"id": current_user.id})
        else:
            # ユーザー情報を更新
            user = await prisma.user.update(
                where={"id": current_user.id},
                data=update_fields
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.fullName,
            avatar_url=user.avatarUrl,
            created_at=user.createdAt,
            updated_at=user.updatedAt
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.get("/me/files", operation_id="get_user_files")
async def get_user_files(
    current_user: Annotated[AuthUser, Depends(require_auth)],
    page: int = 1,
    per_page: int = 20
):
    """ユーザーがアップロードしたファイル一覧を取得"""
    try:
        skip = (page - 1) * per_page
        
        # ユーザーのファイル一覧を取得
        files = await prisma.file.find_many(
            where={"userId": current_user.id},
            skip=skip,
            take=per_page,
            order={"createdAt": "desc"},
            include={
                "downloads": True,
                "requests": {"where": {"status": "pending"}}
            }
        )
        
        # 総数を取得
        total = await prisma.file.count(where={"userId": current_user.id})
        
        return {
            "files": files,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
        
    except Exception as e:
        logger.error(f"Failed to get user files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user files"
        )


@router.delete("/me", operation_id="delete_user_account")
async def delete_user_account(
    current_user: Annotated[AuthUser, Depends(require_auth)]
):
    """ユーザーアカウントを削除"""
    try:
        # ユーザーに関連するファイルを削除（カスケード削除）
        await prisma.user.delete(where={"id": current_user.id})
        
        return {"message": "User account deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete user account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account"
        )