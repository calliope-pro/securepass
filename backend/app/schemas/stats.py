# backend/app/schemas/stats.py
from pydantic import BaseModel
from typing import Optional


class UserStatsResponse(BaseModel):
    """ユーザー統計情報のレスポンス"""
    total_files: int = 0
    total_requests: int = 0  
    active_files: int = 0
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "total_files": 5,
                "total_requests": 12,
                "active_files": 3
            }
        }