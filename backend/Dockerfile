# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# uvをインストール
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# pyproject.tomlとuv.lockをコピー（存在する場合）
COPY pyproject.toml uv.lock* ./

# 依存関係をインストール
RUN uv sync --frozen --no-cache

# アプリケーションコードをコピー
COPY . .

# Prismaクライアントを生成
RUN uv run prisma generate

# ポート8000を公開
EXPOSE 8000

# 起動コマンド（マイグレーション実行、初期プラン作成後にサーバー起動）
CMD ["sh", "-c", "uv run prisma migrate deploy && uv run create-initial-plans && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
