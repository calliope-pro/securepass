# SecurePass Backend

## セットアップ

```bash
# uvがインストールされていない場合
curl -LsSf https://astral.sh/uv/install.sh | sh

# 依存関係のインストール
uv sync

# データベースマイグレーション
uv run prisma migrate dev

# 開発サーバーの起動
make dev
```

## コマンド一覧

```bash
make help       # ヘルプを表示
make install    # 依存関係をインストール
make migrate    # Prismaマイグレーションを実行
make generate   # Prismaクライアントを生成
make dev        # 開発サーバーを起動
make test       # テストを実行
make format     # コードをフォーマット
make lint       # リンターを実行
```
