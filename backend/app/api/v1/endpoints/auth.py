# backend/app/api/v1/endpoints/auth.py
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Annotated
import jwt
import httpx
from app.core.database import prisma
from app.schemas.auth import AuthUser, CheckUserRequest, CheckUserResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)




class AuthService:
    def __init__(self):
        # 認証設定は現在Auth0を使用
        pass
    
    async def verify_token_without_auto_create(self, token: str) -> Optional[AuthUser]:
        """Auth0 JWTトークンを検証してユーザー情報を返す（自動作成なし）"""
        try:
            # Auth0の公開キーを使ってJWTトークンを検証（実装は後でAuth0用に変更必要）
            # 現在は簡易実装
            payload = jwt.decode(
                token, 
                options={"verify_signature": False},  # 一時的に署名検証を無効化
                algorithms=["RS256"]
            )
            
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id or not email:
                return None
            
            # データベースからユーザー情報を取得（自動作成しない）
            user = await prisma.user.find_unique(where={"id": user_id})
            
            if not user:
                return None  # ユーザーが存在しない場合はNoneを返す
            
            return AuthUser(
                id=user.id,
                email=user.email,
                full_name=user.fullName,
                avatar_url=user.avatarUrl
            )
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    async def create_user_from_token(self, token: str) -> Optional[AuthUser]:
        """サインアップ用：Auth0トークンからユーザーを作成"""
        try:
            # Auth0の公開キーを使ってJWTトークンを検証（実装は後でAuth0用に変更必要）
            # 現在は簡易実装
            payload = jwt.decode(
                token, 
                options={"verify_signature": False},  # 一時的に署名検証を無効化
                algorithms=["RS256"]
            )
            
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id or not email:
                return None
            
            # ユーザーが既に存在するかチェック
            existing_user = await prisma.user.find_unique(where={"id": user_id})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already exists"
                )
            
            # 新しいユーザーを作成
            user = await prisma.user.create({
                "id": user_id,
                "email": email,
                "fullName": payload.get("user_metadata", {}).get("full_name"),
                "avatarUrl": payload.get("user_metadata", {}).get("avatar_url"),
            })
            
            return AuthUser(
                id=user.id,
                email=user.email,
                full_name=user.fullName,
                avatar_url=user.avatarUrl
            )
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating user from token: {e}")
            return None


auth_service = AuthService()


@router.post("/signup", response_model=AuthUser)
async def signup(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
):
    """サインアップエンドポイント：トークンからユーザーを作成"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.create_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token or unable to create user"
        )
    
    return user


@router.post("/signin", response_model=AuthUser)
async def signin(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
):
    """サインインエンドポイント：既存ユーザーの認証のみ"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.verify_token_without_auto_create(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_user_no_auto_create(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> Optional[AuthUser]:
    """現在認証されているユーザーを取得（自動作成なし）"""
    if not credentials:
        return None
    
    return await auth_service.verify_token_without_auto_create(credentials.credentials)


async def require_auth_no_auto_create(
    current_user: Annotated[Optional[AuthUser], Depends(get_current_user_no_auto_create)]
) -> AuthUser:
    """認証が必須のエンドポイント用（自動作成なし）"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


@router.post("/check-user", response_model=CheckUserResponse)
async def check_user_exists(request: CheckUserRequest):
    """ユーザー存在確認エンドポイント"""
    try:
        # バックエンドでユーザー存在確認
        backend_user = await prisma.user.find_first(where={"email": request.email})
        in_backend = backend_user is not None
        
        # バックエンドでの存在確認のみ
        exists = in_backend
        
        return CheckUserResponse(
            exists=exists,
            in_backend=in_backend
        )
        
    except Exception as e:
        logger.error(f"Error checking user exists: {e}")
        return CheckUserResponse(
            exists=False,
            in_backend=False
        )


