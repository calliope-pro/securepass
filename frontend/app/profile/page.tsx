'use client'

import { useAuth0 } from '@/contexts/Auth0Context'
import { User, Mail, Calendar, Shield, Settings, ExternalLink, ArrowRight, Sparkles, Activity, Lock, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, linkAccount } = useAuth0()
  const router = useRouter()

  useEffect(() => {
    console.log('Profile auth check:', { isLoading, isAuthenticated, user })
    
    // 認証状態が確定するまで少し待つ
    const checkAuthWithDelay = setTimeout(() => {
      if (!isLoading && !isAuthenticated) {
        console.log('Redirecting to home because not authenticated')
        router.push('/')
      }
    }, 100)

    return () => clearTimeout(checkAuthWithDelay)
  }, [isAuthenticated, isLoading, router, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center modern-shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">アカウント情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass rounded-2xl p-8 text-center modern-shadow">
            <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-6">
              <Shield className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">認証が必要です</h2>
            <p className="text-gray-600 mb-6">アカウント情報を表示するにはログインが必要です</p>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center space-x-2 px-6 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300"
            >
              <span>ホームに戻る</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-6">
            <User className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-5xl font-black gradient-text mb-4">アカウント情報</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            アカウント情報とセキュリティ設定
          </p>
        </div>

          {/* Profile Card */}
          <div className="glass rounded-2xl p-8 mb-6 modern-shadow">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Image */}
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name || 'User'} 
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-white" />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {user.name || 'ユーザー'}
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                  {user.email_verified && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 text-sm">メール認証済み</span>
                    </div>
                  )}
                  {user.updated_at && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 text-sm">
                        最終更新: {new Date(user.updated_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Account Settings */}
        <div className="glass rounded-2xl p-8 modern-shadow ">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-4">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">アカウント設定</h3>
            <p className="text-gray-600">セキュリティと連携オプション</p>
          </div>
          
          <div className="space-y-6">
            {/* Account Linking */}
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl">
                    <ExternalLink className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">アカウント連携</h4>
                    <p className="text-gray-600 leading-relaxed">
                      他のサービス（GitHub、Googleなど）とアカウントを連携して、<br />
                      より安全なログインを実現できます。
                    </p>
                  </div>
                </div>
                <button
                  onClick={linkAccount}
                  className="inline-flex items-center space-x-3 px-6 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300 whitespace-nowrap"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>連携する</span>
                </button>
              </div>
            </div>

            {/* Security Info */}
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl">
                  <Lock className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">セキュリティ情報</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">ユーザーID</span>
                      <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg text-gray-800 max-w-xs truncate">
                        {user.sub}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">認証プロバイダー</span>
                      <span className="font-semibold text-gray-900">
                        {user.sub?.includes('github') && 'GitHub'}
                        {user.sub?.includes('google') && 'Google'}
                        {user.sub?.includes('auth0') && 'メール/パスワード'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">メール認証</span>
                      <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                        user.email_verified 
                          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700' 
                          : 'bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          user.email_verified ? 'bg-green-500' : 'bg-orange-500'
                        }`}></div>
                        <span>{user.email_verified ? '認証済み' : '未認証'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pro Features CTA */}
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full mb-6">
                <Sparkles className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">さらなるセキュリティ機能</h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                より大きなファイル、長期保存、高度な分析機能で、<br />
                ビジネスレベルのセキュリティを体験しませんか？
              </p>
              <button className="inline-flex items-center space-x-3 px-8 py-4 animated-gradient text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl">
                <Sparkles className="h-6 w-6" />
                <span>Pro機能を見る</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}