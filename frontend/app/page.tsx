// frontend/app/page.tsx
'use client'

import FileUploader from '@/components/FileUploader'
import { Shield, Upload, Lock, Zap, Users, CheckCircle, Eye, Clock, Sparkles, ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Shield,
    title: 'Zero-Knowledge暗号化',
    description: '運営者でさえファイル内容を見ることができない完全プライベート',
    color: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-blue-600'
  },
  {
    icon: Users,
    title: '完全匿名',
    description: 'アカウント不要。受信者も完全匿名でアクセス可能',
    color: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-600'
  },
  {
    icon: Lock,
    title: '承認制アクセス',
    description: '送信者による明示的承認で不正アクセスを完全ブロック',
    color: 'from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-600'
  },
  {
    icon: Clock,
    title: '自動削除',
    description: '設定期間後に自動削除でデータ永続化を防止',
    color: 'from-orange-500/10 to-red-500/10',
    iconColor: 'text-orange-600'
  }
]

const stats = [
  { number: '500MB', label: '最大ファイルサイズ' },
  { number: '30日', label: '最大保存期間' },
  { number: '100%', label: 'プライバシー保護' },
  { number: '0円', label: '完全無料' }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-6 animate-pulse-slow">
            <Shield className="h-16 w-16 gradient-text" />
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl font-black gradient-text">
              SecurePass
            </h1>
            <h2 className="text-3xl font-bold text-gray-900 max-w-4xl mx-auto leading-tight">
              世界最高レベルのセキュリティで<br className="hidden sm:block" />
              ファイルを安全に共有
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              運営者でさえファイル内容を知ることができない、真にプライベートなファイル共有プラットフォーム
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-gray-700">Zero-Knowledge暗号化</span>
            </div>
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-gray-700">完全匿名</span>
            </div>
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="text-gray-700">超高速</span>
            </div>
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2 modern-shadow">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-700">完全無料</span>
            </div>
          </div>
        </div>

        {/* File Uploader Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-4">
              <Upload className="h-8 w-8 gradient-text" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">今すぐファイルを共有</h2>
            <p className="text-gray-600">アカウント不要。数秒で世界最高レベルのセキュリティを開始</p>
          </div>
          <FileUploader />
        </div>

        {/* Statistics */}
        <div className="glass rounded-2xl p-8 modern-shadow hover-lift">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-black gradient-text mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">なぜSecurePassなのか</h2>
            <p className="text-xl text-gray-600">エンタープライズグレードのセキュリティを、誰でも簡単に</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="glass rounded-2xl p-8 modern-shadow ">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 bg-gradient-to-r ${feature.color} rounded-xl `}>
                    <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 ">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="glass rounded-2xl p-12 modern-shadow hover-lift">
            <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-8">
              <Sparkles className="h-12 w-12 gradient-text" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">使い方を詳しく知りたい？</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              5つの簡単ステップで、プロレベルのセキュリティでファイル共有を開始
            </p>
            <Link
              href="/about"
              className="inline-flex items-center space-x-3 px-8 py-4 animated-gradient text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Shield className="h-6 w-6" />
              <span>使い方を見る</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}