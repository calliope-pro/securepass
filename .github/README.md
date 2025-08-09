# GitHub Actions デプロイメントガイド

## 概要

このプロジェクトは GitHub Actions と Railway CLI を使用してモノレポの3サービス（backend、frontend、worker）を自動デプロイします。

## サービス構成

- **backend**: FastAPI アプリケーション（ポート8000）
- **frontend**: Next.js アプリケーション（ポート3000）  
- **worker**: Dramatiq バックグラウンドワーカー

## 前提条件

### Railway プロジェクトのセットアップ

1. Railway でプロジェクトを作成
2. 3つのサービスを作成：
   - `backend`
   - `frontend`
   - `worker`

### データベースサービス

Railway で以下のサービスを追加：
- **PostgreSQL**: プライマリデータベース
- **Redis**: セッション管理とタスクキュー

## GitHub Secrets の設定

リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください：

### Railway 認証
- `RAILWAY_TOKEN`: Railway API トークン（railway auth から取得）

### バックエンド環境変数
- ~~`DATABASE_URL`~~: 自動生成（PostgreSQLサービスから取得）
- ~~`REDIS_URL`~~: 自動生成（Redisサービスから取得）
- `R2_ENDPOINT`: Cloudflare R2 エンドポイント
- `R2_ACCESS_KEY_ID`: R2 アクセスキー
- `R2_SECRET_ACCESS_KEY`: R2 シークレットキー
- `R2_BUCKET_NAME`: R2 バケット名
- `SECRET_KEY`: JWT 署名用のシークレットキー
- `IP_HASH_SALT`: IP アドレスハッシュ化用のソルト
- `AUTH0_DOMAIN`: Auth0 ドメイン
- `AUTH0_AUDIENCE`: Auth0 オーディエンス

### フロントエンド環境変数
- `NEXT_PUBLIC_AUTH0_DOMAIN`: Auth0 ドメイン（クライアント用）
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`: Auth0 クライアント ID
- `NEXT_PUBLIC_AUTH0_AUDIENCE`: Auth0 オーディエンス（クライアント用）
- `BACKEND_URL`: バックエンドの URL（オプション、動的に取得も可能）

## ワークフローの動作

### トリガー条件
- **main ブランチへの push**: デプロイを実行
- **develop ブランチへの push**: テストのみ実行
- **Pull Request**: テストのみ実行

### デプロイフロー

1. **依存関係のインストール**
   - Node.js セットアップ
   - Railway CLI インストール
   - フロントエンド依存関係インストール

2. **API クライアント生成** (条件付き)
   - バックエンドが既にデプロイされている場合のみ実行

3. **バックエンドデプロイ**
   - 環境変数の設定
   - サービスデプロイ
   - データベースマイグレーション（railway.toml の preDeployCommand で自動実行）

4. **ワーカーデプロイ**
   - バックエンドと同じ環境変数を設定
   - バックグラウンドタスク用サービスをデプロイ

5. **フロントエンドデプロイ**
   - バックエンド URL を取得
   - フロントエンド環境変数の設定
   - サービスデプロイ

### テストジョブ

すべてのブランチで以下を実行：
- バックエンドの pytest
- フロントエンドの ESLint
- バックエンドの ruff + mypy

## 初回デプロイ手順

### 1. Railway プロジェクト準備
```bash
# Railway にログイン
railway login

# プロジェクトを作成
railway new securepass-project

# プロジェクトに接続  
railway link <your-project-id>
```

### 2. ~~データベースサービス追加~~
GitHub Actions で自動的に以下が追加されます：
- PostgreSQL データベース
- Redis

### 3. 環境変数の設定
GitHub リポジトリで必要なシークレットを設定（上記参照）

### 4. 初回デプロイ
```bash
# main ブランチにプッシュしてデプロイ開始
git push origin main
```

**初回デプロイで自動的に実行される内容：**
1. PostgreSQL と Redis サービスの作成
2. データベース接続文字列の自動取得・設定
3. 3つのアプリケーションサービス（backend、frontend、worker）のデプロイ
4. データベースマイグレーションの実行

## トラブルシューティング

### API 生成エラー
初回デプロイ時は、バックエンドがまだデプロイされていないため API 生成がスキップされます。2回目以降のデプロイで自動的に生成されます。

### 環境変数の確認
```bash
railway service --name <service-name>
railway variables
```

### デプロイ状況の確認
```bash
railway service --name <service-name>
railway status
railway logs
```

### マイグレーション失敗時
```bash
railway service --name backend
railway shell
uv run prisma migrate deploy
```

## セキュリティ注意事項

- すべての機密情報は GitHub Secrets に保存
- プロダクション環境変数をコードにハードコードしない
- Railway API トークンは適切な権限設定で作成

## カスタマイズ

`railway.toml` ファイルで各サービスの設定をカスタマイズ可能：
- ビルドコマンド
- スタートコマンド
- ヘルスチェック設定
- 監視パターン