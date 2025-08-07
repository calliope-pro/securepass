# backend/app/core/storage.py
import aioboto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class R2Storage:
    """Cloudflare R2ストレージ操作"""
    
    def __init__(self):
        self.endpoint = settings.R2_ENDPOINT
        self.access_key_id = settings.R2_ACCESS_KEY_ID
        self.secret_access_key = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = settings.R2_BUCKET_NAME
        self.session = aioboto3.Session()
    
    async def generate_presigned_url(
        self, 
        key: str, 
        operation: str = 'put_object',
        expires_in: int = 3600
    ) -> str:
        """署名付きURLを生成"""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto'
        ) as client:
            try:
                url = await client.generate_presigned_url(
                    ClientMethod=operation,
                    Params={
                        'Bucket': self.bucket_name,
                        'Key': key
                    },
                    ExpiresIn=expires_in
                )
                return url
            except ClientError as e:
                logger.error(f"Failed to generate presigned URL: {e}")
                raise
    
    async def upload_chunk(self, key: str, data: bytes) -> bool:
        """チャンクをアップロード"""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto'
        ) as client:
            try:
                await client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=data,
                    ContentType='application/octet-stream'
                )
                return True
            except ClientError as e:
                logger.error(f"Failed to upload chunk: {e}")
                return False
    
    async def download_chunk(self, key: str) -> bytes:
        """チャンクをダウンロード"""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto'
        ) as client:
            try:
                response = await client.get_object(
                    Bucket=self.bucket_name,
                    Key=key
                )
                data = await response['Body'].read()
                return data
            except ClientError as e:
                logger.error(f"Failed to download chunk: {e}")
                return None
    
    async def upload_file(self, key: str, data: bytes) -> bool:
        """ファイルをアップロード"""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto'
        ) as client:
            try:
                await client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=data,
                    ContentType='application/octet-stream'
                )
                return True
            except ClientError as e:
                logger.error(f"Failed to upload file: {e}")
                return False

    async def delete_object(self, key: str) -> bool:
        """オブジェクトを削除"""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto'
        ) as client:
            try:
                await client.delete_object(
                    Bucket=self.bucket_name,
                    Key=key
                )
                return True
            except ClientError as e:
                logger.error(f"Failed to delete object: {e}")
                return False
    
    async def delete_chunk(self, key: str) -> bool:
        """チャンクを削除"""
        return await self.delete_object(key)
    
    async def create_bucket_if_not_exists(self):
        """バケットが存在しない場合は作成"""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto'
        ) as client:
            try:
                await client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"Bucket {self.bucket_name} already exists")
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    logger.info(f"Creating bucket {self.bucket_name}")
                    await client.create_bucket(Bucket=self.bucket_name)
                else:
                    raise


# シングルトンインスタンス
storage = R2Storage()