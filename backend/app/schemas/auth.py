# backend/app/schemas/auth.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """ユーザー作成リクエスト"""
    id: str = Field(..., description="User UUID")
    email: str = Field(..., description="メールアドレス")
    full_name: Optional[str] = Field(None, max_length=100, description="フルネーム")
    avatar_url: Optional[str] = Field(None, max_length=500, description="アバターURL")


class UserUpdate(BaseModel):
    """ユーザー更新リクエスト"""
    full_name: Optional[str] = Field(None, max_length=100, description="フルネーム")
    avatar_url: Optional[str] = Field(None, max_length=500, description="アバターURL")


class UserResponse(BaseModel):
    """ユーザー情報レスポンス"""
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AuthUser(BaseModel):
    """認証済みユーザー情報"""
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SignUpRequest(BaseModel):
    """サインアップリクエスト"""
    email: str = Field(..., description="メールアドレス")
    password: str = Field(..., min_length=6, description="パスワード（6文字以上）")


class SignInRequest(BaseModel):
    """サインインリクエスト"""
    email: str = Field(..., description="メールアドレス")
    password: str = Field(..., description="パスワード")


class CheckUserRequest(BaseModel):
    """ユーザー存在確認リクエスト"""
    email: str = Field(..., description="メールアドレス")


class CheckUserResponse(BaseModel):
    """ユーザー存在確認レスポンス"""
    exists: bool = Field(..., description="ユーザーが存在するかどうか")
    in_backend: bool = Field(..., description="バックエンドにユーザーが存在するかどうか")