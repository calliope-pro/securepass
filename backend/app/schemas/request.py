# backend/app/schemas/request.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CreateAccessRequestRequest(BaseModel):
    """アクセスリクエスト作成リクエスト"""
    share_id: str = Field(
        ..., 
        min_length=12, 
        max_length=12,
        description="共有ID"
    )
    reason: Optional[str] = Field(
        None, 
        max_length=500,
        description="リクエスト理由（任意）"
    )


class CreateAccessRequestResponse(BaseModel):
    """アクセスリクエスト作成レスポンス"""
    request_id: str = Field(..., description="リクエストID（12文字）")
    status: RequestStatus = Field(..., description="リクエストステータス")
    created_at: datetime = Field(..., description="作成日時")
    
    model_config = ConfigDict(from_attributes=True)


class ApproveRequestRequest(BaseModel):
    """リクエスト承認リクエスト"""
    encrypted_key: str = Field(..., description="受信者用に暗号化された鍵")


class ApproveRequestResponse(BaseModel):
    """リクエスト承認レスポンス"""
    request_id: str
    status: RequestStatus
    approved_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RejectRequestRequest(BaseModel):
    """リクエスト拒否リクエスト"""
    reason: Optional[str] = Field(None, max_length=200, description="拒否理由")


class RequestInfo(BaseModel):
    """リクエスト情報"""
    request_id: str
    file_id: str
    filename: str
    reason: Optional[str]
    status: RequestStatus
    created_at: datetime
    ip_hash: str
    
    model_config = ConfigDict(from_attributes=True)


class AccessRequestItem(BaseModel):
    """ファイル詳細ページ用のアクセスリクエスト項目"""
    request_id: str
    reason: Optional[str]
    status: RequestStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RequestListResponse(BaseModel):
    """リクエスト一覧レスポンス"""
    requests: List[RequestInfo]
    total: int
    page: int
    per_page: int


class FileRequestListResponse(BaseModel):
    """ファイル詳細ページ用のリクエスト一覧レスポンス"""
    requests: List[AccessRequestItem]