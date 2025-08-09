// frontend/app/about/page.tsx
import { Shield, Upload, Send, Check, Download, Lock, Sparkles, Zap, Users, Clock, Eye, HelpCircle } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    title: 'ファイルをアップロード',
    description: 'ファイルをドラッグ&ドロップまたは選択。自動的にクライアントサイドで暗号化されます。',
  },
  {
    icon: Send,
    title: '共有リンクを送信',
    description: '生成された共有リンクを受信者に送信。メール、メッセージ、どんな方法でもOK。',
  },
  {
    icon: Lock,
    title: 'アクセスリクエスト',
    description: '受信者が共有リンクにアクセスすると、ダウンロードリクエストが送信されます。',
  },
  {
    icon: Check,
    title: 'リクエストを承認',
    description: '送信者がリクエストを確認し、承認または拒否を選択します。',
  },
  {
    icon: Download,
    title: 'ファイルダウンロード',
    description: '承認されると、受信者はファイルをダウンロードして復号化できます。',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero */}
        <div className="text-center space-y-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-6">
            <Sparkles className="h-12 w-12 text-yellow-600" />
          </div>
          <h1 className="text-6xl font-black gradient-text">
            SecurePassの使い方
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 max-w-4xl mx-auto leading-tight">
            世界最高レベルのセキュリティで、シンプルで安全なファイル共有を実現
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            5つの簡単ステップで、プロレベルのセキュリティでファイル共有を開始
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 font-medium">
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Zero-Knowledge暗号化</span>
            </div>
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <Users className="h-4 w-4 text-blue-500" />
              <span>完全匿名</span>
            </div>
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <Zap className="h-4 w-4 text-purple-500" />
              <span>超高速</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">5つの簡単ステップ</h2>
            <p className="text-gray-600">誰でも簡単に、プロレベルのセキュリティでファイル共有</p>
          </div>
          
          <div className="relative">
            {/* Background connector line */}
            <div className="hidden lg:block absolute top-[72px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 z-0"></div>
            
            <div className="grid lg:grid-cols-5 gap-6 relative z-10">
              {steps.map((step, index) => (
                <div key={index} className="relative h-full">
                  <div className="glass rounded-2xl p-6 modern-shadow text-center bg-white/95 backdrop-blur-sm border border-white/50 h-full flex flex-col">
                    {/* Step number badge */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>
                    
                    {/* Icon */}
                    <div className="flex justify-center mb-4 mt-2">
                      <div className="inline-flex p-3 animated-gradient rounded-full">
                        <step.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col space-y-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed flex-1 flex items-center justify-center">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="glass rounded-2xl p-8 modern-shadow">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">なぜSecurePassが選ばれるのか</h2>
            <p className="text-gray-600">エンタープライズグレードのセキュリティを、誰でも簡単に</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-dark rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg">
                  <Lock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  クライアントサイド暗号化
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                ファイルはあなたのブラウザで暗号化されてからアップロードされます。
                サーバーに送信される前に既に暗号化されているため、運営者でさえ内容を見ることはできません。
              </p>
            </div>
            
            <div className="glass-dark rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  完全匿名
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                アカウント登録は不要。受信者は完全に匿名でアクセスリクエストを送信できます。
                IPアドレスもハッシュ化されて保存されます。
              </p>
            </div>
            
            <div className="glass-dark rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
                  <Check className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  承認制アクセス
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                送信者が明示的に承認した受信者のみがファイルをダウンロードできます。
                不正なアクセスを防ぎます。
              </p>
            </div>
            
            <div className="glass-dark rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  自動削除
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                設定した有効期限が過ぎると、ファイルは自動的に削除されます。
                データの永続的な保存を防ぎます。
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="glass rounded-2xl p-8 modern-shadow">
          <div className="text-center mb-12">
            <div className="inline-flex p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full mb-4">
              <HelpCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">よくある質問</h2>
            <p className="text-gray-600">お客様からよく寄せられる質問にお答えします</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-dark rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <span className="text-blue-500">Q:</span>
                <span>最大ファイルサイズは？</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                <span className="text-green-500 font-medium">A:</span> 現在、最大500MBまでのファイルをアップロードできます。
                大容量ファイルも安全に共有できます。
              </p>
            </div>
            
            <div className="glass-dark rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <span className="text-blue-500">Q:</span>
                <span>ファイルはどのくらい保存されますか？</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                <span className="text-green-500 font-medium">A:</span> デフォルトでは7日間ですが、1日から30日まで設定可能です。
                自動削除でプライバシーを保護します。
              </p>
            </div>
            
            <div className="glass-dark rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <span className="text-blue-500">Q:</span>
                <span>本当に運営者もファイルを見れないのですか？</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                <span className="text-green-500 font-medium">A:</span> はい。ファイルはブラウザで暗号化されてからサーバーに送信されるため、
                暗号化キーを持たない運営者はファイルの内容を見ることができません。
              </p>
            </div>
            
            <div className="glass-dark rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <span className="text-blue-500">Q:</span>
                <span>商用利用は可能ですか？</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                <span className="text-green-500 font-medium">A:</span> はい、商用・非商用問わず完全無料でご利用いただけます。
                ビジネスでも安心してお使いください。
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="glass rounded-2xl p-12 modern-shadow">
            <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-8">
              <Sparkles className="h-12 w-12 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">今すぐ始めよう</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              簡単なアカウント登録で、世界最高レベルのセキュリティでファイル共有を開始できます。
            </p>
            <a
              href="/"
              className="inline-flex items-center space-x-3 px-8 py-4 animated-gradient text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Shield className="h-6 w-6" />
              <span>SecurePassを使ってみる</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}