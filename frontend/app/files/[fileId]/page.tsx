'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth0 } from '@/contexts/Auth0Context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FilesService, RequestsService } from '@/lib/api/generated'
import { FileText, Calendar, Download, Eye, Share2, ChevronLeft, Clock, CheckCircle, XCircle, AlertCircle, Shield, ArrowRight, Activity, Users, Copy } from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

export default function FileDetailPage() {
  const { fileId } = useParams<{ fileId: string }>()
  const { isAuthenticated, isLoading } = useAuth0()
  const router = useRouter()
  
  const [shareUrlCopied, setShareUrlCopied] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'approve' | 'reject'
    requestId: string
    reason?: string
  }>({ isOpen: false, type: 'approve', requestId: '' })
  const queryClient = useQueryClient()

  // ファイル情報を取得
  const { data: fileInfo, isLoading: fileLoading, error: fileError } = useQuery({
    queryKey: ['file-info', fileId],
    queryFn: () => FilesService.getFileInfo(fileId),
    enabled: isAuthenticated && !!fileId,
    staleTime: 30000,
  })

  // アクセスリクエスト一覧を取得
  const { data: requestsData, isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['file-requests', fileId],
    queryFn: () => RequestsService.getFileRequests(fileId),
    enabled: isAuthenticated && !!fileId,
    staleTime: 10000, // リクエストはより頻繁に更新
  })

  const requests = requestsData?.requests || []
  const loading = fileLoading || requestsLoading
  const error = fileError || requestsError

  // リクエスト承認のMutation
  const approveMutation = useMutation({
    mutationFn: (requestId: string) => RequestsService.approveRequest(requestId, {
      encrypted_key: "temp_encrypted_key" // TODO: 実際は受信者の公開鍵で暗号化した鍵
    }),
    onSuccess: () => {
      toast.success('リクエストを承認しました')
      queryClient.invalidateQueries({ queryKey: ['file-requests', fileId] })
      setConfirmModal({ isOpen: false, type: 'approve', requestId: '' })
    },
    onError: () => {
      toast.error('リクエストの承認に失敗しました')
      setConfirmModal({ isOpen: false, type: 'approve', requestId: '' })
    },
  })

  // リクエスト拒否のMutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => RequestsService.rejectRequest(requestId),
    onSuccess: () => {
      toast.success('リクエストを拒否しました')
      queryClient.invalidateQueries({ queryKey: ['file-requests', fileId] })
      setConfirmModal({ isOpen: false, type: 'reject', requestId: '' })
    },
    onError: () => {
      toast.error('リクエストの拒否に失敗しました')
      setConfirmModal({ isOpen: false, type: 'reject', requestId: '' })
    },
  })

  // 共有URLをコピー
  const handleCopyShareUrl = () => {
    const shareUrl = `${window.location.origin}/share/${fileInfo?.share_id}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareUrlCopied(true)
      setTimeout(() => setShareUrlCopied(false), 2000)
    })
  }

  // 確認モーダルのハンドリング
  const handleApproveClick = (requestId: string, reason?: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'approve',
      requestId,
      reason
    })
  }

  const handleRejectClick = (requestId: string, reason?: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'reject',
      requestId,
      reason
    })
  }

  const handleConfirm = () => {
    if (confirmModal.type === 'approve') {
      approveMutation.mutate(confirmModal.requestId)
    } else {
      rejectMutation.mutate(confirmModal.requestId)
    }
  }

  const handleCloseModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }))
  }


  // ステータスアイコンとテキスト
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: '承認待ち' }
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: '承認済み' }
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', text: '拒否' }
      default:
        return { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-100', text: status }
    }
  }

  // 認証チェック
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center modern-shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">ファイル詳細を読み込み中...</p>
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
            <p className="text-gray-600 mb-6">ファイル詳細を表示するにはログインが必要です</p>
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
        {/* 戻るボタン */}
        <button
          onClick={() => router.push('/files')}
          className="inline-flex items-center space-x-3 glass-dark px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300 modern-shadow"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>ファイル一覧に戻る</span>
        </button>

        {/* エラー表示 */}
        {error && (
          <div className="glass rounded-2xl p-6 modern-shadow">
            <div className="flex items-center space-x-3">
              <div className="inline-flex p-2 bg-red-500/10 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">{error?.message || 'エラーが発生しました'}</p>
            </div>
          </div>
        )}

        {/* ローディング表示 */}
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center modern-shadow">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">ファイル詳細を読み込み中...</p>
          </div>
        ) : fileInfo ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-6">
                <FileText className="h-12 w-12 gradient-text" />
              </div>
              <h1 className="text-4xl font-black gradient-text mb-4">{fileInfo.filename}</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                安全なファイル共有とアクセス管理
              </p>
            </div>

            {/* ファイル詳細カード */}
            <div className="glass rounded-2xl p-8 modern-shadow  mb-8">
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="glass-dark rounded-xl p-6 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl mb-4">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">ファイルサイズ</p>
                    <p className="text-2xl font-black gradient-text">{formatBytes(fileInfo.size)}</p>
                  </div>
                </div>
                <div className="glass-dark rounded-xl p-6 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl mb-4">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">ファイル形式</p>
                    <p className="text-2xl font-black gradient-text">{fileInfo.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                  </div>
                </div>
                <div className="glass-dark rounded-xl p-6 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl mb-4">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">作成日</p>
                    <p className="text-lg font-bold text-gray-900">{formatDate(fileInfo.created_at).split(' ')[0]}</p>
                    <p className="text-sm text-gray-500">{formatDate(fileInfo.created_at).split(' ')[1]}</p>
                  </div>
                </div>
                <div className="glass-dark rounded-xl p-6 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl mb-4">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">有効期限</p>
                    <p className="text-lg font-bold text-gray-900">{formatDate(fileInfo.expires_at).split(' ')[0]}</p>
                    <p className="text-sm text-gray-500">{formatDate(fileInfo.expires_at).split(' ')[1]}</p>
                  </div>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="mt-8 pt-8 border-t border-gray-200/50">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl">
                      <Download className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">ダウンロード統計</p>
                      <p className="text-xl font-bold text-gray-900">{fileInfo.download_count} / {fileInfo.max_downloads}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl">
                      <Eye className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">アクセスリクエスト</p>
                      <p className="text-xl font-bold text-gray-900">{requests.length} 件</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 共有ボタン */}
              <div className="mt-8 pt-8 border-t border-gray-200/50 text-center">
                <div className="inline-flex p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full mb-4">
                  <Share2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">安全なファイル共有</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  このURLを相手に送信して、ファイルへのアクセスリクエストを送ってもらいます
                </p>
                <button
                  onClick={handleCopyShareUrl}
                  className="inline-flex items-center space-x-3 px-8 py-4 animated-gradient text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Copy className="h-5 w-5" />
                  <span>{shareUrlCopied ? 'コピーしました！' : '共有URLをコピー'}</span>
                </button>
              </div>
            </div>

            {/* アクセスリクエスト一覧 */}
            <div className="glass rounded-2xl modern-shadow ">
              <div className="p-8 border-b border-gray-200/50">
                <div className="text-center">
                  <div className="inline-flex p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full mb-4">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">アクセスリクエスト</h2>
                  <p className="text-gray-600">ファイルへのアクセスを要求しているユーザー一覧</p>
                </div>
              </div>

              <div className="p-8">
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex p-6 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-full mb-6">
                      <Eye className="h-16 w-16 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">リクエストがありません</h3>
                    <p className="text-gray-600">まだファイルへのアクセスリクエストはありません</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {requests.map((request) => {
                      const statusInfo = getStatusInfo(request.status)
                      const StatusIcon = statusInfo.icon

                      return (
                        <div key={request.request_id} className="border border-gray-200 rounded-xl p-6 bg-white/50">
                          <div className="space-y-4">
                            {/* ステータスとID */}
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                <StatusIcon className="h-4 w-4 mr-2" />
                                {statusInfo.text}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                ID: {request.request_id}
                              </span>
                            </div>
                            
                            {/* リクエスト理由 */}
                            {request.reason && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-700 mb-1">リクエスト理由:</p>
                                <p className="text-gray-900">{request.reason}</p>
                              </div>
                            )}
                            
                            {/* 日時とアクション */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(request.created_at)}</span>
                              </div>
                              
                              {(request.status === 'pending' || request.status === 'approved') && (
                                <div className="flex space-x-2">
                                  {request.status === 'pending' && (
                                    <button
                                      onClick={() => handleApproveClick(request.request_id, request.reason)}
                                      disabled={approveMutation.isPending || rejectMutation.isPending}
                                      className="inline-flex items-center space-x-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      <span>承認</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRejectClick(request.request_id, request.reason)}
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                    className="inline-flex items-center space-x-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span>{request.status === 'approved' ? '承認取消' : '拒否'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 確認モーダル */}
            <ConfirmModal
              isOpen={confirmModal.isOpen}
              onClose={handleCloseModal}
              onConfirm={handleConfirm}
              title={confirmModal.type === 'approve' ? 'リクエストを承認しますか？' : (
                requests.find(r => r.request_id === confirmModal.requestId)?.status === 'approved' 
                  ? '承認を取り消しますか？' 
                  : 'リクエストを拒否しますか？'
              )}
              message={
                confirmModal.type === 'approve'
                  ? confirmModal.reason
                    ? `理由「${confirmModal.reason}」のアクセスリクエストを承認し、ファイルへのアクセスを許可します。`
                    : 'このアクセスリクエストを承認し、ファイルへのアクセスを許可します。'
                  : requests.find(r => r.request_id === confirmModal.requestId)?.status === 'approved'
                    ? confirmModal.reason
                      ? `理由「${confirmModal.reason}」で承認したアクセスリクエストを取り消し、ファイルへのアクセスを拒否します。`
                      : '承認したアクセスリクエストを取り消し、ファイルへのアクセスを拒否します。'
                    : confirmModal.reason
                      ? `理由「${confirmModal.reason}」のアクセスリクエストを拒否します。`
                      : 'このアクセスリクエストを拒否します。'
              }
              confirmText={confirmModal.type === 'approve' ? '承認する' : (
                requests.find(r => r.request_id === confirmModal.requestId)?.status === 'approved' 
                  ? '承認を取り消す' 
                  : '拒否する'
              )}
              type={confirmModal.type === 'approve' ? 'success' : 'danger'}
              isLoading={approveMutation.isPending || rejectMutation.isPending}
            />
          </>
        ) : (
          <div className="glass rounded-2xl p-12 text-center modern-shadow">
            <div className="inline-flex p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-full mb-6">
              <FileText className="h-16 w-16 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ファイルが見つかりません</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              指定されたファイルは存在しないか、削除されています。<br />
              URLが正しいか確認してください。
            </p>
            <button
              onClick={() => router.push('/files')}
              className="inline-flex items-center space-x-3 px-6 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300"
            >
              <ArrowRight className="h-5 w-5" />
              <span>ファイル一覧に戻る</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}