# backend/app/core/security.py
import hashlib
import secrets
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.core.config import settings


class SecurityManager:
    """セキュリティ関連の処理を管理"""
    
    def __init__(self):
        self.salt = settings.IP_HASH_SALT
    
    def hash_ip(self, ip: str) -> str:
        """IPアドレスをハッシュ化（プライバシー保護）"""
        return hashlib.sha256(f"{ip}{self.salt}".encode()).hexdigest()
    
    def generate_share_id(self) -> str:
        """12文字の共有ID生成"""
        # URL安全な文字のみ使用（-と_を除外して混乱を避ける）
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return ''.join(secrets.choice(alphabet) for _ in range(12))
    
    def generate_request_id(self) -> str:
        """12文字のリクエストID生成"""
        # 共有IDと同じ形式
        return self.generate_share_id()
    
    def generate_session_key(self) -> str:
        """アップロードセッション用の鍵生成"""
        return secrets.token_urlsafe(48)
    
    def calculate_expiry(self, hours: int) -> datetime:
        """有効期限を計算"""
        return datetime.now(timezone.utc) + timedelta(hours=hours)

    def is_expired(self, expires_at: datetime) -> bool:
        """有効期限切れチェック"""
        return datetime.now(timezone.utc) > expires_at

    def generate_r2_key(self, file_id: str, chunk_index: Optional[int] = None) -> str:
        """R2ストレージ用のキー生成"""
        if chunk_index is not None:
            return f"files/{file_id}/chunks/{chunk_index:04d}"
        return f"files/{file_id}/file"


# シングルトンインスタンス
security = SecurityManager()