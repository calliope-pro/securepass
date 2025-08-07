# backend/app/api/v1/endpoints/files.py
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.file import (
    InitiateUploadRequest,
    InitiateUploadResponse,
    ChunkUploadRequest,
    ChunkUploadResponse,
    CompleteUploadRequest,
    FileInfoResponse,
    FileStatus,
    RecentFilesResponse,
    RecentFileItem,
    FileUpdateRequest
)
from app.schemas.auth import AuthUser
from app.core.database import prisma
from app.core.security import security
from app.core.storage import storage
from app.core.config import settings
from app.core.auth import require_auth
from datetime import datetime, timezone
import base64
import json
import math
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload/initiate", response_model=InitiateUploadResponse, operation_id="initiate_upload")
async def initiate_upload(
    request: InitiateUploadRequest,
    current_user: AuthUser = Depends(require_auth)
) -> InitiateUploadResponse:
    """
    ファイルアップロードを開始
    
    1. ファイルレコードを作成
    2. アップロードセッションを作成
    3. チャンク用の署名付きURLを生成
    """
    try:
        # ファイルサイズチェック
        if request.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
            )
        
        # チャンク数を計算
        chunk_count = math.ceil(request.size / request.chunk_size)
        
        # 共有IDとセッションキーを生成
        share_id = security.generate_share_id()
        session_key = security.generate_session_key()
        
        # ファイルレコードを作成（ユーザーIDを関連付け）
        file = await prisma.file.create({
            "shareId": share_id,
            "filename": request.filename,
            "size": request.size,
            "mimeType": request.mime_type,
            "encryptedKey": "",  # 後で更新
            "r2Key": "",  # 後で更新
            "uploadStatus": FileStatus.UPLOADING.value,
            "chunkCount": chunk_count,
            "uploadedChunks": 0,
            "expiresAt": security.calculate_expiry(request.expires_in_hours),
            "maxDownloads": request.max_downloads,
            "userId": current_user.id  # 認証済みユーザーのIDを設定
        })
        
        # アップロードセッションを作成
        session = await prisma.uploadsession.create({
            "sessionKey": session_key,
            "fileId": file.id,
            "status": "active",
            "expiresAt": security.calculate_expiry(settings.UPLOAD_SESSION_EXPIRE_HOURS),
            "metadata": json.dumps({
                "chunk_size": request.chunk_size,
                "total_chunks": chunk_count
            })
        })
        
        # チャンク用の署名付きURLを生成
        chunk_urls = []
        for i in range(chunk_count):
            r2_key = security.generate_r2_key(file.id, i)
            presigned_url = await storage.generate_presigned_url(
                key=r2_key,
                operation='put_object',
                expires_in=3600  # 1時間
            )
            chunk_urls.append(presigned_url)
            
            # チャンクレコードを作成
            await prisma.filechunk.create({
                "fileId": file.id,
                "chunkIndex": i,
                "size": min(request.chunk_size, request.size - i * request.chunk_size),
                "r2Key": r2_key
            })
        
        return InitiateUploadResponse(
            file_id=file.id,
            share_id=share_id,
            session_key=session_key,
            chunk_count=chunk_count,
            chunk_urls=chunk_urls
        )
        
    except Exception as e:
        logger.error(f"Failed to initiate upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate upload"
        )


@router.post("/upload/chunk", response_model=ChunkUploadResponse, operation_id="upload_chunk")
async def upload_chunk(request: ChunkUploadRequest) -> ChunkUploadResponse:
    """
    ファイルチャンクをアップロード
    
    1. セッションの検証
    2. チャンクデータをR2に保存
    3. 進捗を更新
    """
    try:
        # セッションを取得
        session = await prisma.uploadsession.find_unique(
            where={"sessionKey": request.session_key}
        )
        if not session or session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired session"
            )
        
        # 有効期限チェック
        if security.is_expired(session.expiresAt):
            await prisma.uploadsession.update(
                where={"id": session.id},
                data={"status": "expired"}
            )
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Upload session expired"
            )
        
        # ファイルとチャンク情報を取得
        file = await prisma.file.find_unique(
            where={"id": session.fileId},
            include={"chunks": True}
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # チャンクインデックスの検証
        if request.chunk_index >= file.chunkCount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid chunk index"
            )
        
        # 該当チャンクを取得
        chunk = next(
            (c for c in file.chunks if c.chunkIndex == request.chunk_index),
            None
        )
        if not chunk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chunk not found"
            )
        
        # 既にアップロード済みかチェック
        if chunk.uploadedAt:
            return ChunkUploadResponse(
                chunk_index=request.chunk_index,
                uploaded_chunks=file.uploadedChunks,
                total_chunks=file.chunkCount,
                is_complete=file.uploadedChunks == file.chunkCount
            )
        
        # Base64デコード
        try:
            chunk_data = base64.b64decode(request.chunk_data)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid base64 encoded data"
            )
        
        # R2にアップロード
        success = await storage.upload_chunk(chunk.r2Key, chunk_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload chunk to storage"
            )
        
        # チャンクとファイルの状態を更新
        await prisma.filechunk.update(
            where={"id": chunk.id},
            data={"uploadedAt": datetime.now(timezone.utc)}
        )
        
        # アップロード済みチャンク数を更新
        uploaded_chunks = file.uploadedChunks + 1
        is_complete = uploaded_chunks == file.chunkCount
        
        await prisma.file.update(
            where={"id": file.id},
            data={
                "uploadedChunks": uploaded_chunks,
                "uploadStatus": FileStatus.COMPLETED.value if is_complete else FileStatus.UPLOADING.value
            }
        )
        
        # 完了した場合はセッションを終了
        if is_complete:
            await prisma.uploadsession.update(
                where={"id": session.id},
                data={"status": "completed"}
            )
        
        return ChunkUploadResponse(
            chunk_index=request.chunk_index,
            uploaded_chunks=uploaded_chunks,
            total_chunks=file.chunkCount,
            is_complete=is_complete
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload chunk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload chunk"
        )


@router.post("/upload/complete", operation_id="complete_upload")
async def complete_upload(
    request: CompleteUploadRequest,
    current_user: AuthUser = Depends(require_auth)
):
    """
    アップロードを完了し、暗号化キーを保存
    """
    try:
        # セッションを取得
        session = await prisma.uploadsession.find_unique(
            where={"sessionKey": request.session_key}
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid session"
            )
        
        # ファイルを取得（ユーザーの所有権を確認）
        file = await prisma.file.find_unique(
            where={"id": session.fileId}
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # ファイルの所有者であることを確認
        if file.userId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to complete this upload"
            )
        
        # 全チャンクがアップロードされているか確認
        if file.uploadedChunks != file.chunkCount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not all chunks have been uploaded"
            )
        
        # チャンクを結合してR2に最終ファイルをアップロード
        r2_key = security.generate_r2_key(file.id)
        
        # 全チャンクを取得してソート
        chunks = await prisma.filechunk.find_many(
            where={"fileId": file.id},
            order={"chunkIndex": "asc"}
        )
        
        # チャンクデータを結合
        combined_data = bytearray()
        for chunk in chunks:
            chunk_data = await storage.download_chunk(chunk.r2Key)
            if chunk_data is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to retrieve chunk {chunk.chunkIndex}"
                )
            combined_data.extend(chunk_data)
        
        # 結合されたファイルをR2にアップロード
        success = await storage.upload_file(r2_key, bytes(combined_data))
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload final file to storage"
            )
        
        # 暗号化キーを保存
        await prisma.file.update(
            where={"id": file.id},
            data={
                "encryptedKey": request.encrypted_key,
                "r2Key": r2_key,
                "uploadStatus": FileStatus.COMPLETED.value
            }
        )
        
        # チャンクファイルを削除（オプション）
        for chunk in chunks:
            await storage.delete_chunk(chunk.r2Key)
        
        # セッションを完了
        await prisma.uploadsession.update(
            where={"id": session.id},
            data={"status": "completed"}
        )
        
        return {"message": "Upload completed successfully", "share_id": file.shareId}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to complete upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete upload"
        )


@router.get("/recent", response_model=RecentFilesResponse, operation_id="get_recent_files")
async def get_recent_files(
    limit: int = 10,
    offset: int = 0,
    current_user: AuthUser = Depends(require_auth)
) -> RecentFilesResponse:
    """認証されたユーザーの最近アップロードされたファイル一覧を取得（最新順）"""
    try:
        logger.info(f"Fetching recent {limit} files for user {current_user.id} with offset {offset}")
        
        # 総数を取得
        total_count = await prisma.file.count(
            where={"userId": current_user.id}
        )
        
        files = await prisma.file.find_many(
            where={"userId": current_user.id},  # ユーザーのファイルのみ
            take=limit,
            skip=offset,
            order={"createdAt": "desc"},  # 最新順
            include={
                "downloads": True,
                "requests": True  # 全てのリクエスト（pending, approved, rejected）をカウント
            }
        )
        
        logger.info(f"Found {len(files)} files")
        
        result = []
        for file in files:
            # 全リクエスト数とpendingリクエスト数を計算
            all_requests = len(file.requests)
            pending_requests = len([req for req in file.requests if req.status == "pending"])
            
            item = RecentFileItem(
                file_id=file.id,
                share_id=file.shareId,
                filename=file.filename,
                size=file.size,
                mime_type=file.mimeType,
                created_at=file.createdAt,
                expires_at=file.expiresAt,
                max_downloads=file.maxDownloads,
                download_count=len(file.downloads),
                request_count=all_requests,
                pending_request_count=pending_requests,
                status=FileStatus(file.uploadStatus),
                blocks_requests=file.blocksRequests,
                blocks_downloads=file.blocksDownloads
            )
            result.append(item)
        
        return RecentFilesResponse(
            files=result,
            total=total_count,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error(f"Failed to get recent files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recent files"
        )


@router.get("/{file_id}", response_model=FileInfoResponse, operation_id="get_file_info")
async def get_file_info(file_id: str) -> FileInfoResponse:
    """ファイル情報を取得"""
    try:
        file = await prisma.file.find_unique(
            where={"id": file_id},
            include={
                "downloads": True
            }
        )
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
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
            download_count=len(file.downloads),
            blocks_requests=file.blocksRequests,
            blocks_downloads=file.blocksDownloads
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get file info"
        )


@router.patch("/{file_id}", response_model=FileInfoResponse, operation_id="update_file")
async def update_file(
    file_id: str,
    request: FileUpdateRequest,
    current_user: AuthUser = Depends(require_auth)
) -> FileInfoResponse:
    """ファイルを更新（現在は無効化のみ対応）"""
    try:
        # ファイルを取得
        file = await prisma.file.find_unique(
            where={"id": file_id},
            include={
                "downloads": True
            }
        )
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # ファイルの所有者であることを確認
        if file.userId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this file"
            )
        
        # 期限切れファイルの更新を禁止
        if security.is_expired(file.expiresAt):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Cannot update expired file"
            )
        
        # ファイルを更新
        update_data = {}
        if request.blocks_requests is not None:
            update_data["blocksRequests"] = request.blocks_requests
        if request.blocks_downloads is not None:
            update_data["blocksDownloads"] = request.blocks_downloads
            
        updated_file = await prisma.file.update(
            where={"id": file_id},
            data=update_data,
            include={
                "downloads": True
            }
        )
        
        return FileInfoResponse(
            file_id=updated_file.id,
            share_id=updated_file.shareId,
            filename=updated_file.filename,
            size=updated_file.size,
            mime_type=updated_file.mimeType,
            status=FileStatus(updated_file.uploadStatus),
            created_at=updated_file.createdAt,
            expires_at=updated_file.expiresAt,
            max_downloads=updated_file.maxDownloads,
            download_count=len(updated_file.downloads),
            blocks_requests=updated_file.blocksRequests,
            blocks_downloads=updated_file.blocksDownloads
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update file"
        )