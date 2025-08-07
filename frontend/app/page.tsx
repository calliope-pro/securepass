// frontend/app/page.tsx
'use client'

import FileUploader from '@/components/FileUploader'
import { Shield, Upload, Lock, Zap, Users, CheckCircle, Eye, Clock, Sparkles, ArrowRight, Star, FileText, Activity } from 'lucide-react'
import Link from 'next/link'
import { useAuth0 } from '@/contexts/Auth0Context'
import { useQuery } from '@tanstack/react-query'
import { FilesService } from '@/lib/api/generated'
import { formatBytes } from '@/lib/utils'

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
  { number: '100%', label: 'プライバシー保護' }
]

export default function HomePage() {
  const { isAuthenticated } = useAuth0()

  // 最近のファイル3件を取得
  const { data: recentFilesData } = useQuery({
    queryKey: ['recent-files-preview'],
    queryFn: () => FilesService.getRecentFiles(3, 0),
    enabled: isAuthenticated,
    staleTime: 0, // データを常に最新として扱う
    refetchInterval: 5000, // 5秒ごとに自動更新
    refetchIntervalInBackground: false, // バックグラウンドでは更新しない
    refetchOnWindowFocus: true, // ウィンドウフォーカス時に更新
    refetchOnMount: true, // マウント時に更新
  })

  const recentFiles = recentFilesData?.files || []

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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

        {/* Recent Files Section */}
        {isAuthenticated && recentFiles.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full mb-4">
                <Activity className="h-8 w-8 gradient-text" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">最近アップロードしたファイル</h2>
              <p className="text-gray-600">直近にアップロードされたファイルの確認と管理</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {recentFiles.map((file: any) => (
                <div key={file.file_id} className="glass rounded-xl p-6 modern-shadow group">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 break-words line-clamp-2">{file.filename}</h3>
                        <p className="text-sm text-gray-600">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{formatDate(file.created_at)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        file.status === 'completed' ? 'bg-green-100 text-green-700' :
                        file.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {file.status === 'completed' ? '完了' :
                         file.status === 'failed' ? '失敗' : 
                         file.status === 'uploading' ? '中' : file.status}
                      </span>
                    </div>
                    
                    <Link 
                      href={`/files/${file.file_id}`}
                      className="inline-flex items-center space-x-2 w-full justify-center px-4 py-2 animated-gradient text-white rounded-lg font-medium text-sm hover:scale-105 transition-all duration-300"
                    >
                      <span>詳細を見る</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <Link 
                href="/files"
                className="inline-flex items-center space-x-2 px-6 py-3 glass-dark rounded-xl font-semibold hover:scale-105 transition-all duration-300 modern-shadow"
              >
                <span>すべてのファイルを見る</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="glass rounded-2xl p-8 modern-shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="glass rounded-2xl p-12 modern-shadow">
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