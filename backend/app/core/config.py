# backend/app/core/config.py
import os
from typing import Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 基本設定
    PROJECT_NAME: str = "SecurePass"
    VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "production"] = "development"

    # セキュリティ
    SECRET_KEY: str = os.environ["SECRET_KEY"]
    
    # データベース
    DATABASE_URL: str = os.environ["DATABASE_URL"]
    
    # Redis
    REDIS_URL: str = os.environ["REDIS_URL"]

    # Cloudflare R2
    R2_ENDPOINT: str = os.environ["R2_ENDPOINT"]
    R2_ACCESS_KEY_ID: str = os.environ["R2_ACCESS_KEY_ID"]
    R2_SECRET_ACCESS_KEY: str = os.environ["R2_SECRET_ACCESS_KEY"]
    R2_BUCKET_NAME: str = os.environ["R2_BUCKET_NAME"]
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://*.up.railway.app",  # Railway本番環境（新形式）
    ]
    
    # ファイルアップロード設定
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    CHUNK_SIZE: int = 5 * 1024 * 1024  # 5MB
    UPLOAD_SESSION_EXPIRE_HOURS: int = 24
    
    
    # セキュリティ用Salt
    IP_HASH_SALT: str = os.environ["IP_HASH_SALT"]
    
    # Auth0認証
    AUTH0_DOMAIN: str = os.environ["AUTH0_DOMAIN"]
    AUTH0_AUDIENCE: str = os.environ["AUTH0_AUDIENCE"]


    class Config:
        case_sensitive = True

settings = Settings()

print("values")
for key, value in settings.model_dump().items():
    print(f"{key}: {value}")
