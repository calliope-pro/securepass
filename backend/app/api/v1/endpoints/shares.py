# backend/app/api/v1/endpoints/shares.py
from fastapi import APIRouter, HTTPException, status
from app.schemas.file import FileInfoResponse, FileStatus
from app.core.database import prisma
from app.core.security import security
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{share_id}", response_model=FileInfoResponse, operation_id="get_share_info")
async def get_share_info(share_id: str) -> FileInfoResponse:
    """
    共有IDからファイル情報を取得
    
    - ダウンロードには含まれない基本情報のみ
    - 有効期限切れチェック
    """
    try:
        # 共有IDの形式チェック
        if len(share_id) != 12:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid share ID format"
            )
        
        # ファイルを取得
        file = await prisma.file.find_unique(
            where={"shareId": share_id},
            include={
                "downloads": True
            }
        )
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Share not found"
            )
        
        # アップロード完了チェック
        if file.uploadStatus != FileStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File upload is not completed"
            )
        
        # 有効期限チェック
        if security.is_expired(file.expiresAt):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This share has expired"
            )
        
        return FileInfoResponse(
            file_id=file.id,
            share_id=file.shareId,
            filename=file.filename,
            size=file.size,
            mime_type=file.mimeType,
            status=FileStatus(file.uploadStatus),
            created_at=file.createdAt,
            expires_at=file.expiresAt,
            max_downloads=file.maxDownloads,
            download_count=len(set(download.requestId for download in file.downloads))
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get share info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get share info"
        )