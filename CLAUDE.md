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

# Docker Compose経由でのバックエンド操作（推奨）
docker compose exec backend uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
docker compose exec backend uv run pytest
docker compose exec backend uv run black .
docker compose exec backend uv run ruff check .
docker compose exec backend uv run mypy .
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

必要な環境変数:
- `DATABASE_URL`: PostgreSQL接続文字列
- `REDIS_URL`: Redis接続文字列  
- `R2_*`: Cloudflare R2認証情報とバケット
- `SECRET_KEY`: JWT署名キー
- `IP_HASH_SALT`: IPアドレスハッシュ化用ソルト

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

## TODO
- サインアップとサインインが同じ関数処理になっているので処理を分ける

- username, passwordの変更
- ファイル削除用の定期実行パッチ
- deploy
- ファイルの無効化
