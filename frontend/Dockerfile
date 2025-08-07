# frontend/Dockerfile
FROM node:24-alpine

WORKDIR /app

# gitをインストール
RUN apk add --no-cache git

# yarnをインストール
RUN npm install -g corepack && yarn init -2 && yarn set version stable

# package.jsonとyarn.lockをコピー
COPY package.json yarn.lock ./

# 依存関係をインストール
RUN yarn

# アプリケーションコードをコピー
COPY . .

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

# ポート3000を公開
EXPOSE 3000

# サーバーを起動（Railway の動的ポート対応）
CMD ["sh", "-c", "PORT=${PORT:-3000} yarn start"]
