# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) への指針を提供します。

## プロジェクト概要

SecurePassは、エンドツーエンド暗号化を備えたゼロナレッジファイル共有プラットフォームです。ファイルはアップロード前にクライアント側で暗号化され、サーバーは復号化キーにアクセスできません。
以下のdocsにも仕様・設計が書かれています。
- `securepass-design-doc.md`
- `securepass-mvp-structure.md`
- `securepass-spec.md`

**アーキテクチャ:**
- **バックエンド**: PostgreSQLとPrisma ORM、Cloudflare R2ストレージ、Redisキャッシュを使用したFastAPIアプリケーション
- **フロントエンド**: TypeScript、状態管理にTanStack Query、Tailwind CSSを使用したNext.jsアプリケーション
- **データベース**: ファイルメタデータ、アクセス要求、ダウンロード追跡のためのPrismaマイグレーション付きPostgreSQL
- **ストレージ**: 暗号化されたファイルチャンク用のCloudflare R2（S3互換）
- **セキュリティ**: クライアント側暗号化、プライバシー保護のためのIPハッシュ化、アクセス要求システム

## 開発コマンド

### バックエンド（Python/FastAPI）
```bash
cd backend

# セットアップ
uv sync                    # 依存関係のインストール
uv run prisma migrate dev  # データベースマイグレーションの実行
uv run prisma generate     # Prismaクライアントの生成

# 開発(uvで直接たたくのが推奨)
make dev                   # 開発サーバーの起動（ポート8000）
make test                  # pytestテストの実行
make format                # black + ruffでフォーマット
make lint                  # ruff + mypyでリント

# 代替コマンド
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest
uv run black .
uv run ruff check .
uv run mypy .

# バックグラウンドタスク関連
uv run dramatiq app.background.tasks                    # Dramatiqワーカーの起動
uv run python -m app.background.scheduler               # タスクスケジューラーの起動

# Docker Compose経由でのバックエンド操作（推奨）
docker compose exec backend uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
docker compose exec backend uv run pytest
docker compose exec backend uv run black .
docker compose exec backend uv run ruff check .
docker compose exec backend uv run mypy .

# Docker Compose経由でのバックグラウンドタスク操作
docker compose exec dramatiq-worker uv run dramatiq app.background.tasks
docker compose exec task-scheduler uv run python -m app.background.scheduler
```

### フロントエンド（Next.js/TypeScript）
```bash
cd frontend

# セットアップ
yarn install              # 依存関係のインストール

# 開発
yarn dev                   # 開発サーバーの起動（ポート3000）
yarn build                 # プロダクションビルド
yarn lint                  # ESLint
yarn generate-api         # OpenAPIクライアントの生成（バックエンドの実行が必要）
                           # 新しいAPIエンドポイント追加後は必ず実行すること

# Docker Compose経由でのフロントエンド操作（推奨）
docker compose exec frontend yarn dev
docker compose exec frontend yarn build
docker compose exec frontend yarn lint
docker compose exec frontend yarn generate-api
```

### フルスタック開発
```bash
# 全サービスの起動（.env設定が必要）
docker-compose up -d       # PostgreSQL + Redis + バックエンド + フロントエンドの起動
```

## コードアーキテクチャ

### バックエンド構造
- `app/main.py`: CORSとライフサイクル管理を備えたFastAPIアプリケーションのエントリーポイント
- `app/api/v1/`: 機能別に整理されたAPIエンドポイント（files、requests、shares、downloads）
- `app/core/`: コア設定、データベース、セキュリティ、ストレージユーティリティ
- `app/models/`: Prismaが生成したデータベースモデル
- `app/schemas/`: リクエスト/レスポンス検証用のPydanticスキーマ
- `app/services/`: ビジネスロジック層
- `prisma/schema.prisma`: File、AccessRequest、DownloadLogモデルを含むデータベーススキーマ

### フロントエンド構造
- `app/`: Next.js App RouterページとAPIルート
- `components/`: 再利用可能なReactコンポーネント（FileUploader、ProgressBarなど）
- `lib/api/`: APIクライアントと生成されたOpenAPIタイプ
- `lib/crypto.ts`: クライアント側暗号化ユーティリティ
- `hooks/`: カスタムReactフック（useFileUpload）

### 主要データフロー
1. ファイルはAES-256-GCMでクライアント側で暗号化
2. 暗号化されたファイルは署名付きURLを介してR2にチャンク単位でアップロード
3. 理由付きのアクセス要求が作成され、承認が必要
4. ダウンロードリンクは要求承認後にのみ生成
5. すべてのIPアドレスはプライバシー保護のためソルト付きでハッシュ化

## 環境設定

### 環境変数の基本ルール

**Next.js環境変数の重要な違い**:

1. **`NEXT_PUBLIC_`プレフィックス付き**:
   - クライアント側（ブラウザ）で利用可能
   - ビルド時にJavaScriptバンドルに埋め込まれる
   - Reactコンポーネント、Context、フックで使用可能
   - 例: `process.env.NEXT_PUBLIC_AUTH0_DOMAIN!`

2. **`NEXT_PUBLIC_`プレフィックスなし**:
   - サーバー側のみで利用可能
   - API Routes、middleware、getServerSideProps等で使用
   - クライアント側では`undefined`
   - 例: `process.env.DATABASE_URL!`

**重要な注意点**:
- 環境変数は必ず `process.env.VARIABLE_NAME!` の形式で呼び出すこと（TypeScript非null演算子使用）
- フォールバック値（`||` 演算子）は使わず、必要な環境変数は明示的に設定すること
- Dockerビルド時にクライアント側環境変数を利用するには、DockerfileでARG/ENV宣言が必要

### Docker環境での環境変数設定

**フロントエンドDockerfile**:
```dockerfile
# ビルド時に必要な環境変数を宣言
ARG NEXT_PUBLIC_AUTH0_DOMAIN
ARG NEXT_PUBLIC_AUTH0_CLIENT_ID
ARG NEXT_PUBLIC_AUTH0_AUDIENCE
ARG NEXT_PUBLIC_API_URL

# 環境変数として設定
ENV NEXT_PUBLIC_AUTH0_DOMAIN=$NEXT_PUBLIC_AUTH0_DOMAIN
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID=$NEXT_PUBLIC_AUTH0_CLIENT_ID
ENV NEXT_PUBLIC_AUTH0_AUDIENCE=$NEXT_PUBLIC_AUTH0_AUDIENCE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN yarn build
```

### 必要な環境変数一覧

**バックエンド（サーバー側のみ）**:
- `DATABASE_URL`: PostgreSQL接続文字列
- `REDIS_URL`: Redis接続文字列  
- `R2_ENDPOINT`: Cloudflare R2エンドポイント
- `R2_ACCESS_KEY_ID`: R2アクセスキー
- `R2_SECRET_ACCESS_KEY`: R2シークレットキー
- `R2_BUCKET_NAME`: R2バケット名
- `SECRET_KEY`: JWT署名キー
- `IP_HASH_SALT`: IPアドレスハッシュ化用ソルト
- `AUTH0_DOMAIN`: Auth0ドメイン（サーバー側検証用）
- `AUTH0_AUDIENCE`: Auth0オーディエンス（サーバー側検証用）

**フロントエンド（クライアント側で利用）**:
- `NEXT_PUBLIC_AUTH0_DOMAIN`: Auth0ドメイン（ブラウザでの認証用）
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`: Auth0クライアントID
- `NEXT_PUBLIC_AUTH0_AUDIENCE`: Auth0オーディエンス（APIスコープ）
- `NEXT_PUBLIC_API_URL`: バックエンドAPIのベースURL

### デプロイ時の注意点

**Railway等のプラットフォーム**:
1. ビルド時とランタイム両方で環境変数が利用可能である必要がある
2. `NEXT_PUBLIC_`変数はビルド時に埋め込まれるため、デプロイ環境で正しく設定されていることを確認
3. 環境変数設定後は必ず再デプロイを実行すること

## データベース操作

アプリケーションはPostgreSQL付きのPrismaを使用します。主要モデル:
- `File`: 暗号化キーとR2ストレージ情報を含むコアファイルメタデータ
- `AccessRequest`: ファイルダウンロード用の権限システム
- `DownloadLog`: ファイルアクセスの監査証跡
- `FileChunk`: チャンク分割アップロードの追跡
- `UploadSession`: マルチパートアップロード用のセッション管理

マイグレーション実行: `uv run prisma migrate dev`
データベースリセット: `uv run prisma migrate reset`

## Docker Compose経由でのデータベース操作

```bash
# Prismaマイグレーション
docker compose exec backend uv run prisma migrate dev
docker compose exec backend uv run prisma migrate reset
docker compose exec backend uv run prisma generate

# データベース確認・デバッグ
docker compose exec backend uv run python -c "
import sys
sys.path.append('.')
from app.core.database import prisma
import asyncio

async def check_db():
    await prisma.connect()
    try:
        user_count = await prisma.user.count()
        file_count = await prisma.file.count()
        print(f'Users: {user_count}, Files: {file_count}')
    finally:
        await prisma.disconnect()

asyncio.run(check_db())
"
```

## API開発ガイドライン

- **重要**: フロントエンドでは手動でfetchを使用せず、生成されたOpenAPIクライアントを使用すること
- 新しいAPIエンドポイント追加後は `(docker compose) yarn generate-api` でクライアントを再生成すること
- 型安全性を保つため、生成されたクライアントの型定義を活用すること
- 認証が必要なエンドポイントは `OpenAPI.TOKEN` 設定により自動的にJWTトークンが付与される

### HTTPメソッドの使い分け

RESTful API設計において、適切なHTTPメソッドの選択は重要です。以下のガイドラインに従ってください。

#### PUT vs POST vs PATCH

**PUT (リソース全体の置換)**:
- **用途**: リソース全体を完全に置き換える
- **冪等性**: あり（同じリクエストを複数回実行しても結果は同じ）
- **使用例**: ユーザープロフィール全体の更新、ファイルメタデータ全体の置換

```python
@router.put("/users/{user_id}")
async def update_user_profile(user_id: str, user_data: UserProfileUpdate):
    # ユーザープロフィール全体を置き換える
    pass
```

**POST (新規作成・状態変更アクション)**:
- **用途**: 新しいリソースの作成、状態変更を伴うアクション実行
- **冪等性**: なし（同じリクエストを複数回実行すると異なる結果になる可能性がある）
- **使用例**: ファイルアップロード、アクセスリクエスト承認/拒否、ファイル無効化

```python
@router.post("/files/upload")
async def upload_file(file_data: FileUploadRequest):
    # 新しいファイルを作成
    pass

@router.post("/files/{file_id}/invalidate")
async def invalidate_file(file_id: str):
    # ファイルを無効化する（状態変更アクション）
    pass

@router.post("/requests/{request_id}/approve")
async def approve_request(request_id: str):
    # リクエストを承認する（状態変更アクション）
    pass
```

**PATCH (リソースの部分更新)**:
- **用途**: リソースの一部フィールドのみを更新
- **冪等性**: 一般的にあり（実装により異なる）
- **使用例**: ユーザー設定の一部変更、ファイル名のみの変更

```python
@router.patch("/files/{file_id}")
async def update_file_metadata(file_id: str, updates: FileMetadataUpdate):
    # ファイルの一部メタデータのみを更新
    pass
```

#### 判断基準とプロジェクト方針

1. **リソース作成**: `POST /resource`
2. **リソース全体置換**: `PUT /resource/{id}`
3. **リソース部分更新**: `PATCH /resource/{id}`
4. **状態変更アクション（冪等でない）**: `POST /resource/{id}/action`
5. **状態変更（冪等）**: `PUT /resource/{id}/state` または `PATCH /resource/{id}`

#### 具体的な操作とメソッドの選択

**ファイル無効化の場合**:
```python
# オプション1: PATCH（部分更新として扱う）- 推奨
@router.patch("/files/{file_id}")
async def update_file(file_id: str, update: FileUpdate):
    # {"isInvalidated": true} のような部分更新
    pass

# オプション2: PUT（状態設定として扱う）
@router.put("/files/{file_id}/invalidated")
async def set_file_invalidated(file_id: str):
    # ファイルの無効化状態を設定（冪等）
    pass
```

**本プロジェクトでの実装例**:
- ✅ `POST /files/upload/initiate` - ファイルアップロード開始（新規作成）
- ✅ `POST /requests/{id}/approve` - リクエスト承認（非冪等・ログ重要）
- ✅ `POST /requests/{id}/reject` - リクエスト拒否（非冪等・ログ重要）
- 🆕 `PATCH /files/{id}` - ファイル無効化（冪等・部分更新）

#### 冪等性による判断

**冪等な操作（何度実行しても同じ結果）**:
- ファイル無効化: 無効→無効（変化なし）
- ユーザー設定変更: 同じ値に何度設定しても同じ
- → `PUT` または `PATCH` を使用

**非冪等な操作（実行の度に状態が変わる可能性）**:
- リクエスト承認: 承認日時の記録、通知送信など副作用がある
- ファイルアップロード: 新しいリソースが毎回作成される
- → `POST` を使用

**ファイル無効化の設計決定**:
無効化は冪等な操作（何度実行しても結果は同じ）なので、`PATCH /files/{file_id}` で `{"isInvalidated": true}` を送信する方式を採用します。

## UI開発ガイドライン

- **重要**: UI/UXの改善や新規作成時は、実際のAPIとデータを使用してください
- ダミーデータやモックデータは作成せず、必要に応じて適切なローディング状態やエラーハンドリングを実装してください
- ユーザーエクスペリエンスを向上させるため、実データに基づいた適切なフォールバック表示を提供してください

## バックグラウンドタスク

期限切れファイルの自動クリーンアップシステムが実装されています：

### 実装内容
- **Dramatiq**: バックグラウンドタスク処理ライブラリ
- **APScheduler**: 定期タスクのスケジューリング
- **Redis**: タスクキューとして使用

### 自動実行されるタスク
1. **期限切れファイルのストレージクリーンアップ** (1時間ごと)
   - 有効期限切れのファイルをR2ストレージから削除
   - DBレコードは保持し、`isInvalidated`フラグを`true`に設定
   
2. **期限切れアップロードセッションのクリーンアップ** (30分ごと)
   - 未完了の期限切れアップロードセッションを削除
   - 関連するチャンクファイルもストレージから削除

### サービス構成
- `dramatiq-worker`: タスクを実際に実行するワーカープロセス
- `task-scheduler`: 定期タスクをスケジュールするプロセス

## TODO
- サインアップとサインインが同じ関数処理になっているので処理を分ける
- username, passwordの変更
- deploy
- ファイルの無効化
