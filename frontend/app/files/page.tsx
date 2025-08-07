'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth0 } from '@/contexts/Auth0Context'
import { useQuery } from '@tanstack/react-query'
import { FilesService, RecentFileItem } from '@/lib/api/generated'
import { FileText, Calendar, Download, Eye, ChevronLeft, ChevronRight, FolderOpen, Shield, ArrowRight, Activity, Upload, RefreshCw, ShieldOff } from 'lucide-react'
import { formatBytes } from '@/lib/utils'

function FilesPageContent() {
  const { isAuthenticated, isLoading } = useAuth0()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  
  // ページング設定
  const limit = 10
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const offset = (currentPage - 1) * limit

  // ファイル一覧取得 (リアルタイム更新)
  const { data: filesData, isLoading: loading, error, isFetching } = useQuery({
    queryKey: ['files', currentPage, limit],
    queryFn: () => FilesService.getRecentFiles(limit, offset),
    enabled: isAuthenticated,
    staleTime: 5000, // 5秒間は新しいデータとして扱う
    refetchInterval: 10000, // 10秒ごとにリアルタイム更新
    refetchOnWindowFocus: true, // ウィンドウフォーカス時に更新
  })

  const files = filesData?.files || []
  const total = filesData?.total || 0
  const totalPages = Math.ceil(total / limit)

  // ページ変更
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(`/files?page=${page}`)
    }
  }


  // 日時のフォーマット
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 認証チェック
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center modern-shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">ファイル一覧を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass rounded-2xl p-8 text-center modern-shadow">
            <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-6">
              <Shield className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">認証が必要です</h2>
            <p className="text-gray-600 mb-6">ファイル一覧を表示するにはログインが必要です</p>
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
            <FolderOpen className="h-12 w-12 text-blue-600" />
          </div>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <h1 className="text-5xl font-black gradient-text">ファイル管理</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            アップロードしたファイルを安全に管理・共有
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="glass rounded-2xl p-6 modern-shadow">
            <div className="flex items-center space-x-3">
              <div className="inline-flex p-2 bg-red-500/10 rounded-full">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">{error?.message || 'エラーが発生しました'}</p>
            </div>
          </div>
        )}

        {/* ローディング表示 */}
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center modern-shadow">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">ファイル一覧を読み込み中...</p>
          </div>
        ) : (
          <>
            {/* ファイル一覧 */}
            <div className="space-y-6">
              {files.length === 0 ? (
                <div className="glass rounded-2xl text-center py-16 modern-shadow">
                  <div className="inline-flex p-6 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-full mb-6">
                    <FileText className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">ファイルがありません</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    まだファイルをアップロードしていません。<br />
                    最初のファイルを共有してみましょう。
                  </p>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center space-x-3 px-6 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300"
                  >
                    <Upload className="h-5 w-5" />
                    <span>ファイルをアップロード</span>
                  </button>
                </div>
              ) : (
                <>
                  {files.map((file: RecentFileItem) => (
                    <div key={file.file_id} className="glass rounded-2xl p-4 sm:p-6 modern-shadow hover:bg-white/50 transition-all duration-200 group">
                      <div className="space-y-4">
                        {/* ファイル情報 */}
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-2 break-words">{file.filename}</h3>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-600 truncate">{file.mime_type}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-blue-600">{formatBytes(file.size)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-600 truncate">{formatDate(file.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ステータス */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm font-bold ${
                              file.status === 'completed' ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700' :
                              file.status === 'failed' ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700' :
                              'bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                file.status === 'completed' ? 'bg-green-500' :
                                file.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                              }`}></div>
                              {file.status === 'completed' ? 'アップロード完了' :
                               file.status === 'failed' ? 'アップロード失敗' : 
                               file.status === 'uploading' ? 'アップロード中' : file.status}
                            </span>

                            {/* 無効化状態表示 */}
                            {file.is_invalidated && (
                              <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700">
                                <ShieldOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                無効化済み
                              </span>
                            )}
                          </div>

                          {/* 操作ボタン */}
                          <button
                            onClick={() => router.push(`/files/${file.file_id}`)}
                            className="inline-flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300 text-sm sm:text-base"
                          >
                            <span>詳細</span>
                            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>

                        {/* 統計情報 */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
                              <Download className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="text-sm">
                              <div className="font-bold text-gray-900">{file.download_count} / {file.max_downloads}</div>
                              <div className="text-gray-500 text-xs">ダウンロード</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg">
                              <Eye className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="text-sm">
                              <div className="font-bold text-gray-900">
                                {file.request_count}
                                {file.pending_request_count > 0 && (
                                  <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                                    {file.pending_request_count}件待機
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-500 text-xs">リクエスト</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* ページネーション */}
            
              <div className="glass rounded-2xl p-6 modern-shadow">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">
                    {total > 0 && (
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span>
                          全 <span className="font-bold text-blue-600">{total}</span> 件中 {offset + 1} - {Math.min(offset + limit, total)} 件を表示
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* 前へボタン */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold glass-dark rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>前へ</span>
                    </button>

                    {/* ページ番号 */}
                    <div className="flex space-x-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${
                              currentPage === pageNum
                                ? 'animated-gradient text-white hover:scale-105'
                                : 'glass-dark text-gray-700 hover:scale-105'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    {/* 次へボタン */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold glass-dark rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span>次へ</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            
          </>
        )}
      </div>
    </div>
  )
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FilesPageContent />
    </Suspense>
  )
}