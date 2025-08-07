# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import prisma

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    logger.info("Starting up SecurePass API...")
    await prisma.connect()
    logger.info("Database connected")
    
    yield
    
    # 終了時
    logger.info("Shutting down SecurePass API...")
    await prisma.disconnect()
    logger.info("Database disconnected")

# FastAPIアプリケーション作成
app = FastAPI(
    title="SecurePass API",
    description="Zero-Knowledge File Sharing Platform",
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIルーターを登録
app.include_router(api_router, prefix="/api/v1")

# ヘルスチェックエンドポイント
@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    try:
        # データベース接続確認
        await prisma.execute_raw("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "version": "0.1.0",
        "services": {
            "database": db_status,
            "api": "healthy"
        }
    }

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Welcome to SecurePass API",
        "docs": "/docs",
        "health": "/health"
    }