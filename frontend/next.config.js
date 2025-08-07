/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本番環境でstandalone出力を有効化（Dockerで最適化）
  output: 'standalone',
  
  // 画像最適化の設定
  images: {
    domains: ['localhost'],
    unoptimized: true, // Railway環境での互換性向上
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;