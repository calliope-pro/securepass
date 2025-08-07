'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth0 } from '@/contexts/Auth0Context'
import { useQuery } from '@tanstack/react-query'
import { FilesService } from '@/lib/api/generated'
import { FileText, Calendar, Download, Eye, ChevronLeft, ChevronRight, FolderOpen, Shield, ArrowRight, Activity, Clock, Upload } from 'lucide-react'
import { formatBytes } from '@/lib/utils'

export default function FilesPage() {
  const { isAuthenticated, isLoading } = useAuth0()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  
  // ページング設定
  const limit = 10
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const offset = (currentPage - 1) * limit

  // ファイル一覧取得
  const { data: filesData, isLoading: loading, error } = useQuery({
    queryKey: ['files', currentPage, limit],
    queryFn: () => FilesService.getRecentFiles(limit, offset),
    enabled: isAuthenticated,
    staleTime: 30000,
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
            <FolderOpen className="h-12 w-12 gradient-text" />
          </div>
          <h1 className="text-5xl font-black gradient-text mb-4">ファイル管理</h1>
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
              <p className="text-red-600 font-medium">{error}</p>
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
            {/* ファイル一覧テーブル */}
            <div className="glass rounded-2xl overflow-hidden modern-shadow ">
              {files.length === 0 ? (
                <div className="text-center py-16">
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="glass-dark border-b border-gray-200/50">
                      <tr>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">ファイル名</th>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">サイズ</th>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">作成日時</th>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">ステータス</th>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">ダウンロード</th>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">リクエスト</th>
                        <th className="text-left py-6 px-8 font-bold text-gray-800">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.file_id} className="border-b border-gray-100/50 hover:bg-white/50 transition-all duration-200 group">
                          <td className="py-6 px-8">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                <FileText className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-lg">{file.filename}</p>
                                <p className="text-sm text-gray-500 font-medium">{file.mime_type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="font-semibold text-gray-900">
                              {formatBytes(file.size)}
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{formatDate(file.created_at).split(' ')[0]}</div>
                                <div className="text-sm text-gray-500">{formatDate(file.created_at).split(' ')[1]}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold ${
                              file.status === 'active' ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700' :
                              file.status === 'expired' ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700' :
                              'bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-3 ${
                                file.status === 'active' ? 'bg-green-500' :
                                file.status === 'expired' ? 'bg-red-500' : 'bg-gray-500'
                              }`}></div>
                              {file.status === 'active' ? 'アクティブ' :
                               file.status === 'expired' ? '期限切れ' : file.status}
                            </span>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
                                <Download className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{file.download_count} / {file.max_downloads}</div>
                                <div className="text-sm text-gray-500">ダウンロード</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg">
                                <Eye className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{file.request_count}</div>
                                <div className="text-sm text-gray-500">リクエスト</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <button
                              onClick={() => router.push(`/files/${file.file_id}`)}
                              className="inline-flex items-center space-x-2 px-4 py-2 animated-gradient text-white rounded-lg font-semibold text-sm hover:scale-105 transition-all duration-300"
                            >
                              <span>詳細</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
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
                        let pageNum
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
            )}
          </>
        )}
      </div>
    </div>
  )
}