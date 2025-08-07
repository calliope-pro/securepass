# backend/app/schemas/file.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import StrEnum


class FileStatus(StrEnum):
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"


class FileBase(BaseModel):
    filename: str = Field(..., max_length=255)
    size: int = Field(..., gt=0)
    mime_type: str = Field(..., max_length=100)


class InitiateUploadRequest(BaseModel):
    """ファイルアップロード開始リクエスト"""
    filename: str = Field(..., max_length=255, description="ファイル名")
    size: int = Field(..., gt=0, description="ファイルサイズ（バイト）")
    mime_type: str = Field(..., max_length=100, description="MIMEタイプ")
    chunk_size: int = Field(
        default=5 * 1024 * 1024,  # 5MB
        ge=1024 * 1024,  # 最小1MB
        le=50 * 1024 * 1024,  # 最大50MB
        description="チャンクサイズ（バイト）"
    )
    expires_in_hours: int = Field(
        default=24 * 7,  # 1週間
        ge=1,
        le=30 * 24,  # 最大30日
        description="有効期限（時間）"
    )
    max_downloads: int = Field(
        default=1,
        ge=1,
        le=100,
        description="最大ダウンロード回数"
    )


class InitiateUploadResponse(BaseModel):
    """ファイルアップロード開始レスポンス"""
    file_id: str = Field(..., description="ファイルID")
    share_id: str = Field(..., description="共有ID（12文字）")
    session_key: str = Field(..., description="アップロードセッションキー")
    chunk_count: int = Field(..., description="総チャンク数")
    chunk_urls: list[str] = Field(..., description="チャンクアップロード用の署名付きURL")
    
    model_config = ConfigDict(from_attributes=True)


class ChunkUploadRequest(BaseModel):
    """チャンクアップロードリクエスト"""
    session_key: str = Field(..., description="セッションキー")
    chunk_index: int = Field(..., ge=0, description="チャンクインデックス")
    chunk_data: str = Field(..., description="Base64エンコードされた暗号化チャンク")


class ChunkUploadResponse(BaseModel):
    """チャンクアップロードレスポンス"""
    chunk_index: int = Field(..., description="アップロードされたチャンクインデックス")
    uploaded_chunks: int = Field(..., description="アップロード済みチャンク数")
    total_chunks: int = Field(..., description="総チャンク数")
    is_complete: bool = Field(..., description="アップロード完了フラグ")


class CompleteUploadRequest(BaseModel):
    """アップロード完了リクエスト"""
    session_key: str = Field(..., description="セッションキー")
    encrypted_key: str = Field(..., description="暗号化されたファイル鍵")


class FileUpdateRequest(BaseModel):
    """ファイル更新リクエスト"""
    blocks_requests: bool | None = Field(None, description="新規リクエスト受付停止フラグ")
    blocks_downloads: bool | None = Field(None, description="ダウンロード禁止フラグ")


class FileInfoResponse(BaseModel):
    """ファイル情報レスポンス"""
    file_id: str
    share_id: str
    filename: str
    size: int
    mime_type: str
    status: FileStatus
    created_at: datetime
    expires_at: datetime
    max_downloads: int
    download_count: int = 0
    blocks_requests: bool = False
    blocks_downloads: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class RecentFileItem(BaseModel):
    """最近のファイル項目"""
    file_id: str
    share_id: str
    filename: str
    size: int
    mime_type: str
    created_at: datetime
    expires_at: datetime
    max_downloads: int
    download_count: int
    request_count: int
    pending_request_count: int
    status: FileStatus
    blocks_requests: bool = False
    blocks_downloads: bool = False


class RecentFilesResponse(BaseModel):
    """最近のファイル一覧レスポンス"""
    files: list[RecentFileItem]
    total: int = Field(..., description="総ファイル数")
    limit: int = Field(..., description="取得制限数")
    offset: int = Field(..., description="取得開始位置")
    
    @property
    def has_next(self) -> bool:
        """次のページがあるかどうか"""
        return self.offset + self.limit < self.total
    
    @property
    def has_prev(self) -> bool:
        """前のページがあるかどうか"""
        return self.offset > 0