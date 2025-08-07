# backend/app/schemas/dashboard.py
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class RecentActivityItem(BaseModel):
    """最近のアクティビティアイテム"""
    id: str
    type: str  # 'file_upload', 'access_request', 'file_download'
    title: str
    description: str
    created_at: datetime
    file_id: Optional[str] = None
    request_id: Optional[str] = None

class DashboardStatsResponse(BaseModel):
    """ダッシュボード統計情報のレスポンス"""
    total_files: int = 0
    total_requests: int = 0  
    active_files: int = 0
    this_month_uploads: int = 0
    recent_activity: List[RecentActivityItem] = []

class FileActivity(BaseModel):
    """ファイルアクティビティ"""
    id: str
    filename: str
    created_at: datetime
    status: str
    share_id: str
    request_count: int = 0
    download_count: int = 0