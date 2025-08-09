# backend/app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import auth, files, shares, requests, download, users, stats, dashboard, subscription

api_router = APIRouter()

# 各エンドポイントをルーターに登録
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(shares.router, prefix="/shares", tags=["shares"])
api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
api_router.include_router(download.router, prefix="/download", tags=["download"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(subscription.router, prefix="/subscription", tags=["subscription"])
