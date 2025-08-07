# backend/app/core/auth.py
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Annotated
import jwt
import httpx
from app.core.config import settings
from app.core.database import prisma
from app.schemas.auth import AuthUser
import logging

logger = logging.getLogger(__name__)

# HTTPBearerスキームでJWTトークンを取得
security = HTTPBearer(auto_error=False)


class AuthService:
    def __init__(self):
        self.auth0_domain = settings.AUTH0_DOMAIN
        self.auth0_audience = settings.AUTH0_AUDIENCE
        self._jwks_cache = None
        
        # 初期化時に設定を確認
        logger.info(f"Auth0 Service initialized:")
        logger.info(f"  Domain: {self.auth0_domain}")
        logger.info(f"  Audience: {self.auth0_audience}")
        
        if not self.auth0_domain or not self.auth0_audience:
            logger.error("Auth0 configuration missing! Check AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.")
    
    async def get_auth0_jwks(self):
        """Auth0のJWKSを取得（キャッシュ付き）"""
        if self._jwks_cache is None:
            jwks_url = f"https://{self.auth0_domain}/.well-known/jwks.json"
            logger.info(f"Fetching JWKS from: {jwks_url}")
            
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(jwks_url)
                    response.raise_for_status()
                    self._jwks_cache = response.json()
                    logger.info(f"JWKS fetched successfully. Keys count: {len(self._jwks_cache.get('keys', []))}")
            except Exception as e:
                logger.error(f"Failed to fetch JWKS from {jwks_url}: {e}")
                raise
        return self._jwks_cache
    
    async def verify_token(self, token: str) -> Optional[AuthUser]:
        """Auth0 JWTトークンを検証してユーザー情報を返す"""
        try:
            logger.info("Starting token verification")
            
            # JWTヘッダーからkidを取得
            unverified_header = jwt.get_unverified_header(token)
            logger.info(f"JWT header: {unverified_header}")
            
            kid = unverified_header.get("kid")
            alg = unverified_header.get("alg")
            
            logger.info(f"JWT algorithm: {alg}, Key ID: {kid}")
            
            if not kid:
                logger.warning("JWT token missing kid in header")
                return None
            
            if alg != "RS256":
                logger.warning(f"Unexpected JWT algorithm: {alg}. Expected RS256")
                return None
            
            # JWKSから対応する公開鍵を取得
            jwks = await self.get_auth0_jwks()
            rsa_key = None
            available_kids = [key.get("kid") for key in jwks["keys"]]
            logger.info(f"Available key IDs: {available_kids}")
            
            for key in jwks["keys"]:
                if key["kid"] == kid:
                    logger.info(f"Found matching key for kid: {kid}")
                    rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    break
            
            if not rsa_key:
                logger.warning(f"Unable to find appropriate key for kid: {kid}")
                return None
            
            # JWTトークンを検証・デコード
            logger.info("Decoding JWT token...")
            logger.info(f"Expected audience: {self.auth0_audience}")
            logger.info(f"Expected issuer: https://{self.auth0_domain}/")
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=self.auth0_audience,
                issuer=f"https://{self.auth0_domain}/"
            )
            
            logger.info(f"JWT payload decoded successfully. Claims: {list(payload.keys())}")
            
            user_id = payload.get("sub")
            
            if not user_id:
                logger.warning("JWT token missing required claim (sub)")
                return None
            
            # JWTペイロードから追加のユーザー情報を取得
            user_email = payload.get("email", "")
            user_name = payload.get("name", "")
            user_picture = payload.get("picture", "")
            
            # データベースからユーザー情報を取得または作成
            user = await prisma.user.find_unique(where={"id": user_id})
            
            if not user:
                # Auth0ユーザーが初回ログインの場合、ユーザーを作成
                # emailが空またはNullの場合は、user_idを基にした一意のemailを生成
                if not user_email:
                    user_email = f"user_{user_id.replace('|', '_')}@securepass.local"
                
                user = await prisma.user.create(
                    data={
                        "id": user_id,
                        "email": user_email,
                        "fullName": user_name,
                        "avatarUrl": user_picture
                    }
                )
                logger.info(f"Created new user: {user_id} with email: {user_email}")
            else:
                # 既存ユーザーの場合、情報を更新（Auth0側で変更があった場合に備えて）
                updated_data = {}
                if user_email and user_email != user.email:
                    updated_data["email"] = user_email
                if user_name and user_name != user.fullName:
                    updated_data["fullName"] = user_name  
                if user_picture and user_picture != user.avatarUrl:
                    updated_data["avatarUrl"] = user_picture
                
                if updated_data:
                    user = await prisma.user.update(
                        where={"id": user_id},
                        data=updated_data
                    )
                    logger.info(f"Updated user info for: {user_id}")
            
            return AuthUser(
                id=user.id,
                email=user.email or "",
                full_name=user.fullName or "",
                avatar_url=user.avatarUrl or ""
            )
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except jwt.InvalidAudienceError as e:
            logger.warning(f"JWT audience validation failed: {e}")
            logger.info(f"Expected audience: {self.auth0_audience}")
            return None
        except jwt.InvalidIssuerError as e:
            logger.warning(f"JWT issuer validation failed: {e}")
            logger.info(f"Expected issuer: https://{self.auth0_domain}/")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None


auth_service = AuthService()


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> Optional[AuthUser]:
    """現在認証されているユーザーを取得（オプショナル）"""
    if not credentials:
        return None
    
    return await auth_service.verify_token(credentials.credentials)


async def require_auth(
    current_user: Annotated[Optional[AuthUser], Depends(get_current_user)]
) -> AuthUser:
    """認証が必須のエンドポイント用"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user