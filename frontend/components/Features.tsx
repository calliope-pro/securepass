// frontend/components/Features.tsx
import { Shield, Lock, Users, Zap } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Zero-Knowledge暗号化',
    description: 'ファイルは完全にクライアントサイドで暗号化。運営者でさえ内容を知ることはできません。',
  },
  {
    icon: Lock,
    title: '承認制アクセス',
    description: '送信者が明示的に承認した受信者のみがファイルをダウンロード可能。',
  },
  {
    icon: Users,
    title: '完全匿名',
    description: 'アカウント作成不要。受信者は完全に匿名でアクセスリクエストを送信。',
  },
  {
    icon: Zap,
    title: '高速・安全',
    description: 'Cloudflare R2を活用した高速配信。チャンク分割で大容量ファイルにも対応。',
  },
]

export function Features() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {features.map((feature, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}