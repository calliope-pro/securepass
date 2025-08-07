# SecurePass MVP - プロジェクト構造と実装計画

## プロジェクト構造

```
securepass/
├── frontend/               # Next.js 15.x
│   ├── app/               # App Router
│   │   ├── page.tsx       # ホームページ（アップロード）
│   │   ├── share/[id]/page.tsx  # 共有ページ
│   │   ├── request/[id]/page.tsx # リクエスト確認ページ
│   │   └── api/           # API Routes
│   ├── components/
│   │   ├── FileUploader.tsx
│   │   ├── RequestList.tsx
│   │   └── DownloadArea.tsx
│   ├── lib/
│   │   ├── crypto.ts      # 暗号化処理
│   │   ├── upload.ts      # アップロード管理
│   │   └── api.ts         # APIクライアント
│   └── hooks/
│       ├── useFileUpload.ts
│       └── useBackgroundJob.ts
│
├── backend/                # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── api/
│   │   │   ├── files.py
│   │   │   ├── shares.py
│   │   │   └── requests.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── storage.py  # Cloudflare R2
│   │   └── background/
│   │       └── tasks.py     # Celery tasks
│   ├── alembic/           # DB migrations
│   └── requirements.txt
│
└── docker-compose.yml
```

## 実装の優先順位

### Phase 1: 基本機能（1-2週間）
1. **ファイルアップロード基盤**
   - ドラッグ&ドロップUI
   - チャンク分割アップロード
   - プログレス表示
   - ブラウザタブ維持での継続

2. **暗号化システム**
   - Web Crypto API (Frontend)
   - AES-256-GCM実装
   - 鍵生成・管理

3. **基本的なAPI**
   - ファイルアップロード
   - 共有ID生成
   - メタデータ保存

### Phase 2: 承認フロー（1週間）
1. **リクエスト機能**
   - 匿名リクエスト送信
   - リクエストID生成
   - リクエスト一覧表示

2. **承認機能**
   - 承認/拒否UI
   - 承認状態管理
   - 通知システム

### Phase 3: ダウンロード機能（3-4日）
1. **セキュアダウンロード**
   - 承認確認
   - 復号処理
   - ダウンロード回数制限

## 技術的な実装ポイント

### バックグラウンドアップロード
```typescript
// Service Workerを使用してバックグラウンド実行
// タブを閉じても継続可能に
interface UploadJob {
  id: string;
  file: File;
  chunks: Chunk[];
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}
```

### Cloudflare R2統合
```python
# S3互換APIを使用
from boto3 import client

class R2Storage:
    def __init__(self):
        self.client = client('s3',
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY,
            aws_secret_access_key=settings.R2_SECRET_KEY
        )
```

### データベース設計
```sql
-- 主要テーブル
CREATE TABLE files (
    id UUID PRIMARY KEY,
    share_id VARCHAR(12) UNIQUE,
    filename VARCHAR(255),
    size BIGINT,
    mime_type VARCHAR(100),
    encrypted_key TEXT,
    r2_key VARCHAR(255),
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE access_requests (
    id UUID PRIMARY KEY,
    request_id VARCHAR(12) UNIQUE,
    file_id UUID REFERENCES files(id),
    reason TEXT,
    status VARCHAR(20), -- pending, approved, rejected
    created_at TIMESTAMP
);

CREATE TABLE download_logs (
    id UUID PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    request_id UUID REFERENCES access_requests(id),
    downloaded_at TIMESTAMP,
    ip_hash VARCHAR(64)
);
```

## セキュリティ考慮事項

1. **Zero-Knowledge原則**
   - ファイルは必ずクライアントサイドで暗号化
   - サーバーは暗号化されたデータのみ保存
   - 復号鍵はクライアントが管理

2. **レート制限**
   - アップロード: 10ファイル/時間
   - リクエスト: 100回/時間/IP
   - ダウンロード: 承認されたもののみ

3. **データ保護**
   - IPアドレスはハッシュ化して保存
   - 個人情報は一切保存しない
   - 自動削除機能の実装

## 開発環境セットアップ

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Database
docker-compose up -d postgres
alembic upgrade head

# Redis (for Celery)
docker-compose up -d redis
celery -A app.background worker --loglevel=info
```

## 次のステップ

1. 基本的なNext.js 15プロジェクトのセットアップ
2. FastAPIの基本構造作成
3. ファイルアップロードUIの実装
4. 暗号化機能の実装

どの部分から始めましょうか？