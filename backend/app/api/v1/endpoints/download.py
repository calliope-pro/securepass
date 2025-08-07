# backend/app/api/v1/endpoints/download.py
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from app.core.database import prisma
from app.core.security import security
from app.core.storage import storage
from app.schemas.request import RequestStatus
from app.schemas.file import FileStatus
import logging
from typing import AsyncGenerator
import aioboto3
import urllib.parse

logger = logging.getLogger(__name__)
router = APIRouter()


def encode_filename_for_download(filename: str) -> str:
    """
    ファイル名をダウンロード用にエンコード
    RFC 6266に準拠したContent-Dispositionヘッダー用のエンコーディング
    """
    try:
        # ASCII文字のみの場合はそのまま使用
        filename.encode('ascii')
        return f'attachment; filename="{filename}"'
    except UnicodeEncodeError:
        # 非ASCII文字が含まれる場合はRFC 5987に準拠したエンコーディング
        encoded_filename = urllib.parse.quote(filename, safe='')
        return f"attachment; filename*=UTF-8''{encoded_filename}"


async def stream_file_from_r2(bucket_name: str, key: str) -> AsyncGenerator[bytes, None]:
    """R2からファイルをストリーミング"""
    session = aioboto3.Session()
    async with session.client(
        's3',
        endpoint_url=storage.endpoint,
        aws_access_key_id=storage.access_key_id,
        aws_secret_access_key=storage.secret_access_key,
        region_name='auto'
    ) as client:
        try:
            response = await client.get_object(Bucket=bucket_name, Key=key)
            async for chunk in response['Body'].iter_chunks():
                yield chunk
        except Exception as e:
            logger.error(f"Failed to stream file from R2: {e}")
            raise


@router.get("/{request_id}/file", operation_id="download_file")
async def download_file(request_id: str, req: Request):
    """
    承認されたリクエストでファイルをダウンロード
    
    - リクエストIDで認証
    - ダウンロード回数制限チェック
    - ストリーミングレスポンス
    """
    try:
        # リクエストを取得
        access_request = await prisma.accessrequest.find_unique(
            where={"requestId": request_id}
        )
        
        if not access_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        # 承認済みチェック
        if access_request.status != RequestStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Request not approved"
            )
        
        # ファイル情報を最新の状態で取得
        file = await prisma.file.find_unique(
            where={"id": access_request.fileId},
            include={"chunks": True}
        )
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # ファイルの状態チェック
        if file.uploadStatus != FileStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is not ready for download"
            )
        
        # ダウンロード禁止チェック
        if file.blocksDownloads:
            logger.warning(f"File {file.id} downloads are blocked")
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="File downloads are blocked"
            )
        
        # 有効期限チェック
        if security.is_expired(file.expiresAt):
            logger.warning(f"File {file.id} has expired. Expires at: {file.expiresAt}")
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="File has expired"
            )
        
        # ダウンロード回数チェック（ユニークなリクエストID数で制限）
        download_logs = await prisma.downloadlog.find_many(
            where={"fileId": file.id}
        )
        unique_request_count = len(set(log.requestId for log in download_logs))
        logger.info(f"File {file.id} unique request count: {unique_request_count}/{file.maxDownloads}")
        if unique_request_count >= file.maxDownloads:
            logger.warning(f"File {file.id} download limit exceeded: {unique_request_count}/{file.maxDownloads}")
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Download limit exceeded"
            )
        
        # IPアドレスをハッシュ化
        client_ip = req.client.host
        ip_hash = security.hash_ip(client_ip)
        
        # ダウンロードログを記録
        await prisma.downloadlog.create({
            "fileId": file.id,
            "requestId": access_request.id,  # AccessRequestテーブルのprimary key
            "ipHash": ip_hash
        })
        
        logger.info(f"Download log created for file {file.id}, request {access_request.requestId}")
        
        # チャンクが存在する場合は結合してストリーミング
        if file.chunks:
            # TODO: 複数チャンクの結合処理を実装
            # 現在は単一ファイルとして扱う
            pass
        
        # ファイルをストリーミング
        return StreamingResponse(
            stream_file_from_r2(storage.bucket_name, file.r2Key),
            media_type=file.mimeType,
            headers={
                "Content-Disposition": encode_filename_for_download(file.filename),
                "Content-Length": str(file.size),
                # キャッシュ無効化ヘッダー
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file"
        )


@router.post("/{request_id}/decrypt-key", operation_id="get_decrypt_key")
async def get_decrypt_key(request_id: str, response: Response):
    """
    承認されたリクエストで復号化キーを取得
    
    - ファイルダウンロード後に呼び出す
    - 一度だけ取得可能
    """
    try:
        # リクエストを取得
        access_request = await prisma.accessrequest.find_unique(
            where={"requestId": request_id}
        )
        
        if not access_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        # 承認済みチェック
        if access_request.status != RequestStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Request not approved"
            )
        
        # ファイル情報を最新の状態で取得
        file = await prisma.file.find_unique(
            where={"id": access_request.fileId}
        )
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # ダウンロード禁止チェック
        if file.blocksDownloads:
            logger.warning(f"File {file.id} downloads are blocked")
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="File downloads are blocked"
            )
        
        logger.info(f"Decrypt key accessed for request {request_id}")
        
        # キャッシュ無効化ヘッダーを設定
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
        return {
            "encrypted_key": file.encryptedKey
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get decrypt key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get decrypt key"
        )