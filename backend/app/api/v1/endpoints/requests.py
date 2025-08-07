# backend/app/api/v1/endpoints/requests.py
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi import status
from app.schemas.request import (
    CreateAccessRequestRequest,
    CreateAccessRequestResponse,
    ApproveRequestRequest,
    ApproveRequestResponse,
    RejectRequestRequest,
    RequestInfo,
    AccessRequestItem,
    RequestListResponse,
    FileRequestListResponse,
    RequestStatus
)
from app.schemas.file import FileStatus
from app.core.database import prisma
from app.core.security import security
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=CreateAccessRequestResponse, operation_id="create_access_request")
async def create_access_request(
    request: CreateAccessRequestRequest,
    req: Request
) -> CreateAccessRequestResponse:
    """
    アクセスリクエストを作成
    
    - 共有IDからファイルを特定
    - 匿名でリクエスト可能
    - IPアドレスはハッシュ化して保存
    """
    try:
        # ファイルを取得
        file = await prisma.file.find_unique(
            where={"shareId": request.share_id}
        )
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Share not found"
            )
        
        # ファイルの状態チェック
        if file.uploadStatus != FileStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is not available yet"
            )
        
        # 有効期限チェック
        if security.is_expired(file.expiresAt):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This share has expired"
            )
        
        # ダウンロード数チェック
        download_count = await prisma.downloadlog.count(
            where={"fileId": file.id}
        )
        if download_count >= file.maxDownloads:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Download limit exceeded"
            )
        
        # IPアドレスを取得してハッシュ化
        client_ip = req.client.host
        ip_hash = security.hash_ip(client_ip)
        
        # 同じIPから同じファイルへの重複リクエストチェック
        existing_request = await prisma.accessrequest.find_first(
            where={
                "fileId": file.id,
                "ipHash": ip_hash,
                "status": RequestStatus.PENDING.value
            }
        )
        
        if existing_request:
            return CreateAccessRequestResponse(
                request_id=existing_request.requestId,
                status=RequestStatus(existing_request.status),
                created_at=existing_request.createdAt
            )
        
        # リクエストIDを生成
        request_id = security.generate_request_id()
        
        # アクセスリクエストを作成
        access_request = await prisma.accessrequest.create({
            "requestId": request_id,
            "fileId": file.id,
            "reason": request.reason,
            "status": RequestStatus.PENDING.value,
            "ipHash": ip_hash
        })
        
        return CreateAccessRequestResponse(
            request_id=access_request.requestId,
            status=RequestStatus(access_request.status),
            created_at=access_request.createdAt
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create access request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create access request"
        )


@router.get("/file/{file_id}", response_model=FileRequestListResponse, operation_id="get_file_requests")
async def get_file_requests(
    file_id: str
) -> FileRequestListResponse:
    """
    ファイルに対するアクセスリクエスト一覧を取得
    
    - 送信者がリクエストを確認するため
    """
    try:
        # ファイルの存在確認
        file = await prisma.file.find_unique(
            where={"id": file_id}
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # リクエスト一覧を取得
        requests = await prisma.accessrequest.find_many(
            where={"fileId": file_id},
            order={"createdAt": "desc"}
        )
        
        # レスポンス形式に変換
        access_request_items = []
        for req in requests:
            access_request_items.append(AccessRequestItem(
                request_id=req.requestId,
                reason=req.reason,
                status=RequestStatus(req.status),
                created_at=req.createdAt
            ))
        
        return FileRequestListResponse(
            requests=access_request_items
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get file requests"
        )


@router.post("/{request_id}/approve", response_model=ApproveRequestResponse, operation_id="approve_request")
async def approve_request(
    request_id: str,
    body: ApproveRequestRequest
) -> ApproveRequestResponse:
    """
    アクセスリクエストを承認
    
    - 送信者のみが承認可能（認証実装後）
    - 暗号化された鍵を渡す
    """
    try:
        # リクエストを取得
        access_request = await prisma.accessrequest.find_unique(
            where={"requestId": request_id},
            include={"file": True}
        )
        
        if not access_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        # ステータスチェック
        if access_request.status != RequestStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request is already {access_request.status}"
            )
        
        # ファイルの有効期限チェック
        if security.is_expired(access_request.file.expiresAt):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="File has expired"
            )
        
        # リクエストを承認
        from datetime import datetime
        updated_request = await prisma.accessrequest.update(
            where={"id": access_request.id},
            data={
                "status": RequestStatus.APPROVED.value,
                "approvedAt": datetime.utcnow()
            }
        )
        
        # TODO: 暗号化された鍵を安全に保存する仕組みを実装
        # 現在は簡易的にファイルの encryptedKey フィールドを使用
        
        return ApproveRequestResponse(
            request_id=updated_request.requestId,
            status=RequestStatus(updated_request.status),
            approved_at=updated_request.approvedAt
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to approve request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve request"
        )


@router.post("/{request_id}/reject", operation_id="reject_request")
async def reject_request(
    request_id: str,
    body: Optional[RejectRequestRequest] = None
):
    """
    アクセスリクエストを拒否
    
    - 送信者のみが拒否可能（認証実装後）
    - 理由は任意
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
        
        # ステータスチェック
        if access_request.status != RequestStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request is already {access_request.status}"
            )
        
        # リクエストを拒否
        from datetime import datetime
        await prisma.accessrequest.update(
            where={"id": access_request.id},
            data={
                "status": RequestStatus.REJECTED.value,
                "rejectedAt": datetime.utcnow()
            }
        )
        
        return {"message": "Request rejected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reject request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject request"
        )


@router.get("/{request_id}/status", operation_id="get_request_status")
async def get_request_status(request_id: str):
    """
    リクエストのステータスを確認
    
    - 受信者がステータスを確認するため
    - 承認された場合はダウンロード可能
    """
    try:
        # リクエストを取得
        access_request = await prisma.accessrequest.find_unique(
            where={"requestId": request_id},
            include={"file": True}
        )
        
        if not access_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        response = {
            "request_id": access_request.requestId,
            "status": access_request.status,
            "created_at": access_request.createdAt,
            "file_info": {
                "filename": access_request.file.filename,
                "size": access_request.file.size,
                "mime_type": access_request.file.mimeType
            }
        }
        
        # 承認済みの場合はダウンロード情報を含める
        if access_request.status == RequestStatus.APPROVED.value:
            response["approved_at"] = access_request.approvedAt
            response["download_available"] = True
            # TODO: ダウンロード用の一時的なトークンを生成
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get request status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get request status"
        )