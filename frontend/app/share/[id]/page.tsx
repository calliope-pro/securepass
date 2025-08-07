// frontend/app/share/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Shield, Download, Clock, FileText, Send, Lock, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatBytes, formatDate, isExpired } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SharePage() {
  const params = useParams()
  const shareId = params.id as string
  const [reason, setReason] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)

  // 共有情報を取得
  const { data: shareInfo, isLoading, error } = useQuery({
    queryKey: ['share', shareId],
    queryFn: () => api.getShareInfo(shareId),
    retry: false,
  })

  // アクセスリクエストを送信
  const requestMutation = useMutation({
    mutationFn: () => api.createAccessRequest(shareId, reason),
    onSuccess: (data) => {
      setRequestId(data.request_id)
      toast.success('アクセスリクエストを送信しました')
    },
    onError: () => {
      toast.error('リクエストの送信に失敗しました')
    },
  })

  // リクエストステータスを確認
  const { data: requestStatus } = useQuery({
    queryKey: ['request-status', requestId],
    queryFn: () => requestId ? api.getRequestStatus(requestId) : null,
    enabled: !!requestId,
    refetchInterval: requestId ? 5000 : false, // 5秒ごとに確認
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !shareInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass rounded-2xl p-8 text-center modern-shadow">
            <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-6">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              ファイルが見つかりません
            </h2>
            <p className="text-gray-600 leading-relaxed">
              URLが正しいか確認してください。<br />
              ファイルが削除されたか、有効期限が切れている可能性があります。
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isApproved = requestStatus?.status === 'approved'
  const fileExpired = shareInfo && isExpired(shareInfo.expires_at)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-6">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-black gradient-text mb-4">
            セキュアファイル共有
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            エンドツーエンド暗号化でファイルを安全に受け取る
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* File Info Card */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-8 modern-shadow hover-lift">
              <div className="flex items-start space-x-6">
                <div className="p-4 animated-gradient rounded-2xl flex-shrink-0">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {shareInfo.filename}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">ファイルサイズ</p>
                        <p className="text-lg font-bold text-gray-900">{formatBytes(shareInfo.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">ファイル形式</p>
                        <p className="text-lg font-bold text-gray-900">{shareInfo.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">有効期限</p>
                        <p className="text-lg font-bold text-gray-900">{formatDate(shareInfo.expires_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl">
                      <Download className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">残り回数</p>
                        <p className="text-lg font-bold text-gray-900">{shareInfo.max_downloads - shareInfo.download_count}/{shareInfo.max_downloads}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Info */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 modern-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="h-6 w-6 text-green-500" />
                <h3 className="text-lg font-bold text-gray-900">セキュリティ</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">Zero-Knowledge暗号化</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">エンドツーエンド保護</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">一時的な共有</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Request Form or Status */}
        <div className="mt-12">
          {fileExpired ? (
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-8 modern-shadow">
                <div className="text-center py-8">
                  <div className="inline-flex p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-full mb-6">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">ファイルの有効期限が切れています</h3>
                  <div className="space-y-2 text-gray-600 mb-6">
                    <p>• 新しいアクセスリクエストは受け付けられません</p>
                    <p>• 承認済みリクエストでもダウンロードできません</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    有効期限: {formatDate(shareInfo.expires_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : !requestId ? (
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-8 modern-shadow">
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-4">
                    <Send className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    アクセスリクエスト
                  </h2>
                  <p className="text-gray-600">
                    このファイルをダウンロードするには、送信者の承認が必要です
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      リクエスト理由（任意）
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="ダウンロードが必要な理由を記入してください..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
                      rows={4}
                    />
                  </div>
                  
                  <button
                    onClick={() => requestMutation.mutate()}
                    disabled={requestMutation.isPending}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300
                      flex items-center justify-center space-x-3 text-lg
                      ${requestMutation.isPending
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'animated-gradient text-white hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {requestMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>送信中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>リクエストを送信</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-8 modern-shadow">
                {requestStatus?.status === 'pending' && (
                  <div className="text-center py-8">
                    <div className="inline-flex p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full mb-6 animate-pulse-slow">
                      <Clock className="h-12 w-12 text-yellow-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">承認待ち</h3>
                    <p className="text-gray-600 mb-6">
                      送信者があなたのリクエストを確認しています
                    </p>
                    <div className="glass-dark rounded-xl p-4 inline-block">
                      <p className="text-sm text-gray-600">
                        リクエストID: <span className="font-mono text-gray-800">{requestId}</span>
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span>自動更新中...</span>
                    </div>
                  </div>
                )}
                
                {requestStatus?.status === 'approved' && (
                  <div className="text-center py-8">
                    <div className="inline-flex p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full mb-6">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">承認されました！</h3>
                    {fileExpired ? (
                      <>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                          <div className="flex items-center justify-center space-x-2 text-red-600 mb-2">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-semibold">ファイルの有効期限が切れています</span>
                          </div>
                          <p className="text-sm text-red-700">承認済みリクエストでもダウンロードできません</p>
                        </div>
                        <button
                          disabled
                          className="bg-gray-300 text-gray-500 px-8 py-4 rounded-xl font-semibold text-lg cursor-not-allowed inline-flex items-center space-x-3"
                        >
                          <Download className="h-6 w-6" />
                          <span>ダウンロード不可（期限切れ）</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-600 mb-8">
                          リクエストが承認されました。ファイルをダウンロードできます。
                        </p>
                        <button
                          onClick={() => window.location.href = `/download/${requestId}`}
                          className="animated-gradient text-white px-8 py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] active:scale-98 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
                        >
                          <Download className="h-6 w-6" />
                          <span>ファイルをダウンロード</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
                
                {requestStatus?.status === 'rejected' && (
                  <div className="text-center py-8">
                    <div className="inline-flex p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-full mb-6">
                      <XCircle className="h-12 w-12 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">リクエストが拒否されました</h3>
                    <p className="text-gray-600">
                      送信者によってリクエストが拒否されました
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}