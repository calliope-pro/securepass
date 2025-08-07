'use client'

import { useState, useEffect } from 'react'
import { useAuth0 } from '@/contexts/Auth0Context'
import { useQuery } from '@tanstack/react-query'
import { FileText, Upload, Shield, Activity, Eye, Clock, Download, Users, Sparkles, ArrowRight, TrendingUp, BarChart3, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardService } from '@/lib/api/generated/services/DashboardService'
import { formatDate } from '@/lib/utils'

const quickActions = [
  {
    href: '/',
    label: '新しいファイルをアップロード',
    icon: Upload,
    color: 'animated-gradient',
    description: 'ファイルを安全にアップロードして共有'
  },
  {
    href: '/files',
    label: 'ファイル一覧を見る',
    icon: Eye,
    color: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
    description: 'アップロードしたファイルを管理'
  },
  {
    href: '/profile',
    label: 'プロファイル設定',
    icon: Users,
    color: 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700',
    description: 'アカウント設定を変更'
  }
]


export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth0()
  const router = useRouter()

  // ダッシュボード統計情報の取得
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => DashboardService.getDashboardStatsApiV1DashboardStatsGet(),
    enabled: isAuthenticated,
    staleTime: 30000, // 30秒間キャッシュ
  })

  // ファイルアクティビティの取得
  const { data: fileActivities, isLoading: filesLoading, error: filesError } = useQuery({
    queryKey: ['file-activities'],
    queryFn: () => DashboardService.getFileActivitiesApiV1DashboardFilesGet(6), // 6個のファイルを取得
    enabled: isAuthenticated,
    staleTime: 30000,
  })

  useEffect(() => {
    console.log('Dashboard auth check:', { isLoading, isAuthenticated, user })
    
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
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center modern-shadow">
          <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-6">
            <Shield className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">認証が必要です</h2>
          <p className="text-gray-600 mb-6">ダッシュボードにアクセスするにはログインが必要です</p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-6 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300"
          >
            <span>ホームに戻る</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Hero */}
        <div className="text-center">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-6">
            <BarChart3 className="h-12 w-12 gradient-text" />
          </div>
          <h1 className="text-5xl font-black gradient-text mb-4">ダッシュボード</h1>
          <p className="text-xl text-gray-600">
            ようこそ、<span className="font-semibold text-gray-900">{user.name || user.email}</span>さん
          </p>
        </div>

        {/* Statistics Cards */}
        {statsLoading ? (
          <div className="glass rounded-2xl p-12 text-center modern-shadow">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">統計情報を読み込み中...</p>
          </div>
        ) : statsError ? (
          <div className="glass rounded-2xl p-6 modern-shadow">
            <div className="flex items-center space-x-3">
              <div className="inline-flex p-2 bg-red-500/10 rounded-full">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">統計情報の読み込みに失敗しました</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="glass rounded-2xl p-6 modern-shadow ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">総アップロード数</p>
                  <p className="text-3xl font-black gradient-text">{dashboardStats?.total_files || 0}</p>
                  <p className="text-sm text-blue-600 font-medium mt-1">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    安全に管理
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl ">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 modern-shadow ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">アクティブファイル</p>
                  <p className="text-3xl font-black gradient-text">{dashboardStats?.active_files || 0}</p>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    <Activity className="h-3 w-3 inline mr-1" />
                    有効期限内
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl ">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 modern-shadow ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">今月のアップロード</p>
                  <p className="text-3xl font-black gradient-text">{dashboardStats?.this_month_uploads || 0}</p>
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    <Upload className="h-3 w-3 inline mr-1" />
                    ファイル
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl ">
                  <Upload className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 modern-shadow ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">アクセスリクエスト</p>
                  <p className="text-3xl font-black gradient-text">{dashboardStats?.total_requests || 0}</p>
                  <p className="text-sm text-orange-600 font-medium mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    総数
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl ">
                  <Eye className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="glass rounded-2xl p-8 modern-shadow">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">クイックアクション</h2>
            <p className="text-gray-600">よく使う機能に素早くアクセス</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="glass-dark rounded-2xl p-6 modern-shadow hover:scale-105 transition-all duration-300"
              >
                <div className="text-center space-y-4">
                  <div className={`p-4 ${action.color.includes('animated') ? 'animated-gradient' : action.color} rounded-xl inline-flex `}>
                    <action.icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 ">
                      {action.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Uploaded Files */}
        <div className="glass rounded-2xl p-8 modern-shadow">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">アップロードファイル</h2>
              <p className="text-gray-600">最近アップロードしたファイル</p>
            </div>
          <div className="flex items-center justify-end mb-6">
            <Link
              href="/files"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1 hover:underline"
            >
              <span>すべて見る</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {filesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">ファイル情報を読み込み中...</p>
            </div>
          ) : filesError ? (
            <div className="text-center py-8">
              <div className="inline-flex p-3 bg-red-500/10 rounded-full mb-4">
                <Shield className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">ファイル情報の読み込みに失敗しました</p>
            </div>
          ) : !fileActivities || fileActivities.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-6 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-full mb-6">
                <FileText className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">ファイルがありません</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                まだファイルをアップロードしていません。<br />
                最初のファイルを共有してみましょう。
              </p>
              <Link
                href="/"
                className="inline-flex items-center space-x-3 px-6 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300"
              >
                <Upload className="h-5 w-5" />
                <span>ファイルをアップロード</span>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fileActivities.slice(0, 6).map((file) => (
                <Link key={file.id} href={`/files/${file.id}`} className="glass-dark rounded-2xl p-6 modern-shadow hover:scale-105 transition-all duration-300 block">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl ">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate mb-1 ">
                        {file.filename}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        uploaded: {formatDate(file.created_at)}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          file.status === 'active' ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700' :
                          file.status === 'expired' ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700' :
                          'bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            file.status === 'active' ? 'bg-green-500' :
                            file.status === 'expired' ? 'bg-red-500' : 'bg-gray-500'
                          }`}></div>
                          {file.status === 'active' ? 'アクティブ' :
                           file.status === 'expired' ? '期限切れ' : file.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{file.request_count || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Download className="h-4 w-4" />
                          <span>{file.download_count || 0}</span>
                        </div>
                        <div className="inline-flex items-center space-x-1 text-blue-600 font-medium">
                          <span>詳細を見る</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pro Features CTA */}
        <div className="glass rounded-2xl p-8 modern-shadow text-center">
          <div className="inline-flex p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full mb-6">
            <Shield className="h-12 w-12 gradient-text" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">さらに高度なセキュリティ機能</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            より大きなファイル、長期保存、高度な分析機能で、
            ビジネスレベルのセキュリティを体験しませんか？
          </p>
          <button className="inline-flex items-center space-x-3 px-8 py-4 animated-gradient text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl">
            <Sparkles className="h-6 w-6" />
            <span>Pro機能を見る</span>
          </button>
        </div>
      </div>
    </div>
  )
}