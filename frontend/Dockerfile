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

RUN yarn build

# ポート3000を公開
EXPOSE 3000

# サーバーを起動
CMD ["yarn", "start"]
