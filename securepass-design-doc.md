# SecurePass MVP - 基本・詳細設計書

## 1. システム概要

### 1.1 システムアーキテクチャ
```mermaid
graph TB
    subgraph "Frontend (Next.js 15)"
        A[React Components] --> B[API Client<br/>OpenAPI Generated]
        B --> C[Service Worker<br/>Background Upload]
        A --> D[Web Crypto API<br/>Encryption]
    end
    
    subgraph "Backend (FastAPI)"
        E[FastAPI Routes] --> F[Business Logic]
        F --> G[Prisma ORM]
        F --> H[Cloudflare R2<br/>Storage]
        E --> I[OpenAPI Schema<br/>Auto-generated]
    end
    
    subgraph "Infrastructure"
        J[(PostgreSQL)]
        K[Redis<br/>Job Queue]
        L[Cloudflare R2<br/>Object Storage]
    end
    
    B -->|HTTPS| E
    G --> J
    F --> K
    H --> L
```

### 1.2 技術スタック比較

#### ORM選択: Prisma vs SQLAlchemy + Alembic

| 項目 | Prisma | SQLAlchemy + Alembic |
|------|--------|---------------------|
| **型安全性** | ◎ 完全な型安全性 | △ 部分的 |
| **マイグレーション** | ◎ 自動生成、履歴管理 | ○ 手動調整が必要 |
| **パフォーマンス** | ○ 良好 | ◎ より細かい制御可能 |
| **Python統合** | ○ Prisma Client Python | ◎ ネイティブ |
| **開発体験** | ◎ スキーマ駆動、直感的 | ○ 従来型 |
| **コミュニティ** | ○ 成長中 | ◎ 成熟 |

**推奨**: **Prisma**を採用
- 理由: 型安全性、開発速度、スキーマ駆動開発がMVPに最適

### 1.3 OpenAPI統合戦略

```python
# FastAPIは自動的にOpenAPI仕様を生成
# /docs でSwagger UI、/redoc でReDoc利用可能

# フロントエンドでの型生成
# openapi-typescript-codegen を使用
```

## 2. 詳細設計

### 2.1 データベース設計 (Prisma Schema)

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider             = "prisma-client-py"
  recursive_type_depth = 5
}

model File {
  id           String   @id @default(uuid())
  shareId      String   @unique @db.VarChar(12)
  filename     String   @db.VarChar(255)
  size         BigInt
  mimeType     String   @db.VarChar(100)
  encryptedKey String   @db.Text // 暗号化された共有鍵
  r2Key        String   @db.VarChar(255)
  uploadStatus String   @default("uploading") // uploading, completed, failed
  chunkCount   Int      @default(0)
  uploadedChunks Int    @default(0)
  createdAt    DateTime @default(now())
  expiresAt    DateTime
  maxDownloads Int      @default(1)
  
  requests     AccessRequest[]
  downloads    DownloadLog[]
  chunks       FileChunk[]
  
  @@index([shareId])
  @@index([createdAt])
}

model FileChunk {
  id        String   @id @default(uuid())
  fileId    String
  chunkIndex Int
  size      Int
  r2Key     String   @db.VarChar(255)
  uploadedAt DateTime?
  
  file      File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  
  @@unique([fileId, chunkIndex])
  @@index([fileId])
}

model AccessRequest {
  id          String   @id @default(uuid())
  requestId   String   @unique @db.VarChar(12)
  fileId      String
  reason      String?  @db.Text
  status      String   @default("pending") // pending, approved, rejected
  approvedAt  DateTime?
  rejectedAt  DateTime?
  createdAt   DateTime @default(now())
  ipHash      String   @db.VarChar(64) // SHA256(IP + Salt)
  
  file        File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  downloads   DownloadLog[]
  
  @@index([requestId])
  @@index([fileId, status])
}

model DownloadLog {
  id           String   @id @default(uuid())
  fileId       String
  requestId    String
  downloadedAt DateTime @default(now())
  ipHash       String   @db.VarChar(64)
  
  file         File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  request      AccessRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  @@index([fileId])
  @@index([requestId])
}

model UploadSession {
  id          String   @id @default(uuid())
  sessionKey  String   @unique @db.VarChar(64)
  fileId      String?
  status      String   @default("active") // active, completed, expired
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  metadata    Json?    // チャンク情報など
  
  @@index([sessionKey])
  @@index([status, expiresAt])
}
```

### 2.2 API設計 (OpenAPI/FastAPI)

```python
# app/api/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class FileStatus(str, Enum):
    uploading = "uploading"
    completed = "completed"
    failed = "failed"

class RequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# Request Models
class InitiateUploadRequest(BaseModel):
    filename: str = Field(..., max_length=255)
    size: int = Field(..., gt=0)
    mime_type: str = Field(..., max_length=100)
    chunk_size: int = Field(default=5*1024*1024)  # 5MB
    expires_in_hours: int = Field(default=24*7, ge=1, le=30*24)
    max_downloads: int = Field(default=1, ge=1, le=100)

class ChunkUploadRequest(BaseModel):
    session_key: str
    chunk_index: int
    chunk_data: str  # Base64 encoded encrypted chunk
    
class CreateAccessRequestRequest(BaseModel):
    share_id: str = Field(..., min_length=12, max_length=12)
    reason: Optional[str] = Field(None, max_length=500)

class ApproveRequestRequest(BaseModel):
    encrypted_key: str  # 受信者用に暗号化された鍵

# Response Models
class FileUploadResponse(BaseModel):
    file_id: str
    share_id: str
    session_key: str
    chunk_count: int
    r2_upload_urls: List[str]  # Pre-signed URLs for direct upload

class AccessRequestResponse(BaseModel):
    request_id: str
    status: RequestStatus
    created_at: datetime

class FileInfoResponse(BaseModel):
    filename: str
    size: int
    mime_type: str
    created_at: datetime
    expires_at: datetime
    download_count: int
    max_downloads: int
    
class RequestListResponse(BaseModel):
    requests: List[dict]  # 詳細は別途定義
```

### 2.3 セキュリティ設計

#### 2.3.1 暗号化フロー

```typescript
// frontend/lib/crypto.ts
interface EncryptionResult {
  encryptedData: ArrayBuffer;
  key: CryptoKey;
  iv: Uint8Array;
  salt: Uint8Array;
}

class SecurePassCrypto {
  // ファイル暗号化（AES-256-GCM）
  async encryptFile(file: File): Promise<EncryptionResult> {
    const key = await this.generateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );
    
    return { encryptedData, key, iv, salt: new Uint8Array() };
  }
  
  // 鍵の生成
  private async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // 鍵のエクスポート（共有用）
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('jwk', key);
    return btoa(JSON.stringify(exported));
  }
}
```

#### 2.3.2 アクセス制御

```python
# backend/app/core/security.py
from typing import Optional
import hashlib
import secrets
from datetime import datetime, timedelta

class SecurityManager:
    def __init__(self, salt: str):
        self.salt = salt
    
    def hash_ip(self, ip: str) -> str:
        """IPアドレスをハッシュ化（プライバシー保護）"""
        return hashlib.sha256(f"{ip}{self.salt}".encode()).hexdigest()
    
    def generate_share_id(self) -> str:
        """12文字の共有ID生成"""
        # URL安全な文字のみ使用
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return ''.join(secrets.choice(alphabet) for _ in range(12))
    
    def generate_session_key(self) -> str:
        """アップロードセッション用の鍵生成"""
        return secrets.token_urlsafe(48)
    
    def verify_request_limit(self, ip_hash: str, window_minutes: int = 60) -> bool:
        """レート制限チェック"""
        # Redis等でIPごとのリクエスト数を管理
        pass
```

### 2.4 バックグラウンドアップロード設計

```typescript
// frontend/lib/upload-manager.ts
interface UploadChunk {
  index: number;
  start: number;
  end: number;
  blob: Blob;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retries: number;
}

class UploadManager {
  private chunks: Map<string, UploadChunk[]> = new Map();
  private workers: Map<string, Worker> = new Map();
  
  async initiateUpload(file: File, encryptedData: ArrayBuffer) {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const chunks = this.createChunks(encryptedData, chunkSize);
    
    // バックエンドから事前署名URLを取得
    const response = await api.initiateUpload({
      filename: file.name,
      size: encryptedData.byteLength,
      mime_type: file.type,
      chunk_count: chunks.length
    });
    
    // Service Workerに登録
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`upload-${response.file_id}`);
    }
    
    // Web Workerでアップロード実行
    this.startUploadWorker(response.file_id, chunks, response.r2_upload_urls);
  }
  
  private startUploadWorker(fileId: string, chunks: UploadChunk[], urls: string[]) {
    const worker = new Worker('/upload.worker.js');
    this.workers.set(fileId, worker);
    
    worker.postMessage({
      type: 'START_UPLOAD',
      fileId,
      chunks,
      urls
    });
    
    worker.onmessage = (e) => {
      if (e.data.type === 'PROGRESS') {
        this.updateProgress(fileId, e.data.progress);
      }
    };
  }
}
```

### 2.5 フロントエンドアーキテクチャ

```typescript
// frontend/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

// frontend/components/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}
```

## 3. 開発環境構成

### 3.1 Docker Compose設定

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: securepass
      POSTGRES_PASSWORD: securepass_dev
      POSTGRES_DB: securepass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://securepass:securepass_dev@postgres:5432/securepass
      REDIS_URL: redis://redis:6379
      R2_ENDPOINT: ${R2_ENDPOINT}
      R2_ACCESS_KEY: ${R2_ACCESS_KEY}
      R2_SECRET_KEY: ${R2_SECRET_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

### 3.2 OpenAPI クライアント生成

```json
// frontend/package.json
{
  "scripts": {
    "generate-api": "openapi-typescript-codegen --input http://localhost:8000/openapi.json --output ./lib/api/generated --client fetch"
  },
  "devDependencies": {
    "openapi-typescript-codegen": "^0.25.0"
  }
}
```

### 3.3 Prisma セットアップ

```bash
# backend/setup_prisma.sh
#!/bin/bash

# Prisma Client Python のインストール
pip install prisma

# Prismaスキーマの初期化
prisma init

# マイグレーション実行
prisma migrate dev --name init

# クライアント生成
prisma generate
```

## 4. 実装優先順位

### Phase 1: 基盤構築（3-4日）
1. Docker環境構築
2. Prismaスキーマ定義・マイグレーション
3. FastAPI基本構造とOpenAPI生成
4. Next.js 15プロジェクト初期化
5. OpenAPIクライアント自動生成設定

### Phase 2: コア機能（1週間）
1. ファイル暗号化機能（Web Crypto API）
2. チャンク分割アップロードAPI
3. Cloudflare R2統合
4. バックグラウンドアップロード実装
5. 基本的なUI実装

### Phase 3: 承認フロー（4-5日）
1. アクセスリクエストAPI
2. 承認/拒否機能
3. リクエスト管理UI
4. 通知機能（ポーリングまたはSSE）

### Phase 4: ダウンロード機能（3日）
1. ダウンロードAPI
2. 復号化処理
3. ダウンロード制限実装

### Phase 5: 仕上げ（3日）
1. エラーハンドリング強化
2. ロギング・モニタリング
3. セキュリティ監査
4. パフォーマンス最適化

## 5. セキュリティチェックリスト

- [ ] すべての通信はHTTPS
- [ ] クライアントサイド暗号化の実装
- [ ] SQLインジェクション対策（Prismaが自動対応）
- [ ] XSS対策（React/Next.jsが自動対応）
- [ ] CSRF対策
- [ ] レート制限実装
- [ ] 適切なCORSヘッダー設定
- [ ] セキュアなセッション管理
- [ ] 入力値検証（Pydantic）
- [ ] エラーメッセージの情報漏洩防止

## 6. パフォーマンス目標

- ファイルアップロード: 100MBを1分以内
- 暗号化処理: 100MBを10秒以内
- API応答時間: 95%ile < 200ms
- 同時接続数: 1000クライアント
- ストレージ効率: 重複排除なし（セキュリティ優先）