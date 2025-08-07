  Railway デプロイ手順

  Railwayは複数サービスのmonorepoデプロイをサポートしています。各
  サービスを個別のRailwayサービスとして作成する必要があります。

  1. 必要なサービス

  4つのRailwayサービスを作成：
  - backend - FastAPI API サーバー
  - frontend - Next.js フロントエンド
  - worker - Dramatiqワーカー
  - scheduler - タスクスケジューラー

  2. 各サービスの設定

  Backend Service:
  - Root Directory: backend
  - Watch Paths: backend/**
  - Build Command: uv sync && uv run prisma generate
  - Start Command: uv run uvicorn app.main:app --host 0.0.0.0 
  --port $PORT

  Frontend Service:
  - Root Directory: frontend
  - Watch Paths: frontend/**
  - Build Command: yarn install && yarn build
  - Start Command: yarn start

  Worker Service:
  - Root Directory: backend
  - Watch Paths: backend/app/background/**
  - Start Command: uv run dramatiq app.background.tasks

  Scheduler Service:
  - Root Directory: backend
  - Watch Paths: backend/app/background/**
  - Start Command: uv run python -m app.background.scheduler

  3. 環境変数設定

  共通環境変数（全サービス）:
  DATABASE_URL=postgresql://...
  REDIS_URL=redis://...
  R2_ENDPOINT=...
  R2_ACCESS_KEY_ID=...
  R2_SECRET_ACCESS_KEY=...
  R2_BUCKET_NAME=...
  SECRET_KEY=...
  IP_HASH_SALT=...
  AUTH0_DOMAIN=...
  AUTH0_AUDIENCE=...

  Frontend固有:
  NEXT_PUBLIC_AUTH0_DOMAIN=...
  NEXT_PUBLIC_AUTH0_CLIENT_ID=...
  NEXT_PUBLIC_AUTH0_AUDIENCE=...
  NEXT_PUBLIC_API_URL=https://your-backend.railway.app

  4. データベース・Redis設定

  PostgreSQLプラグイン:
  - Railway内でPostgreSQLプラグインを追加
  - DATABASE_URLは自動で設定される

  Redisプラグイン:
  - Railway内でRedisプラグインを追加
  - REDIS_URLは自動で設定される

  5. デプロイ手順

  1. GitHubリポジトリを接続
  2. 4つのサービスを作成し、各々の設定を行う
  3. プラグイン（PostgreSQL, Redis）を追加
  4. 環境変数を各サービスに設定
  5. デプロイ

  注意点:
  - Docker
  Composeファイルは使用できない（個別サービス設定が必要）
  - 各サービスは独立してスケールできる
  - Watch Pathsにより不要な再ビルドを防げる