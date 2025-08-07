// frontend/app/request/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Shield, Check, X, Clock, User, FileText, Settings, Eye, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function RequestPage() {
  const params = useParams()
  const fileId = params.id as string
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)

  // ファイル情報とリクエスト一覧を取得
  const { data: fileInfo } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => api.getFileInfo(fileId),
  })

  const { data: requests, refetch } = useQuery({
    queryKey: ['requests', fileId],
    queryFn: () => api.getFileRequests(fileId),
    refetchInterval: 10000, // 10秒ごとに更新
  })

  // リクエスト承認
  const approveMutation = useMutation({
    mutationFn: (requestId: string) => api.approveRequest(requestId),
    onSuccess: () => {
      toast.success('リクエストを承認しました')
      refetch()
    },
    onError: () => {
      toast.error('承認に失敗しました')
    },
  })

  // リクエスト拒否
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => api.rejectRequest(requestId),
    onSuccess: () => {
      toast.success('リクエストを拒否しました')
      refetch()
    },
    onError: () => {
      toast.error('拒否に失敗しました')
    },
  })

  const pendingRequests = requests?.requests.filter(r => r.status === 'pending') || []
  const processedRequests = requests?.requests.filter(r => r.status !== 'pending') || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full mb-6">
            <Settings className="h-12 w-12 gradient-text" />
          </div>
          <h1 className="text-4xl font-black gradient-text mb-4">
            リクエスト管理
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            ファイルへのアクセスリクエストを管理し、安全な共有を実現
          </p>
        </div>

        {/* File Info Header */}
        {fileInfo && (
          <div className="glass rounded-2xl p-8 modern-shadow hover-lift mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="p-4 animated-gradient rounded-2xl">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{fileInfo.filename}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>共有ID: <code className="glass-dark rounded px-2 py-1 font-mono text-xs">{fileInfo.share_id}</code></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="glass-dark rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-600">作成日</p>
                  <p className="text-sm font-bold text-gray-900">{formatDate(fileInfo.created_at)}</p>
                </div>
                <div className="glass-dark rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-600">有効期限</p>
                  <p className="text-sm font-bold text-gray-900">{formatDate(fileInfo.expires_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Pending Requests */}
          <div className="lg:col-span-2 space-y-6">
            {pendingRequests.length > 0 ? (
              <div className="glass rounded-2xl p-6 modern-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">承認待ちのリクエスト</h3>
                      <p className="text-sm text-gray-600">{pendingRequests.length}件の新しいリクエスト</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    <span>自動更新中</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.request_id}
                      className="glass-dark rounded-xl p-6 hover:scale-[1.01] transition-all duration-200"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">匿名ユーザー</p>
                              <p className="text-xs text-gray-600 font-mono">リクエストID: {request.request_id}</p>
                            </div>
                          </div>
                          
                          {request.reason && (
                            <div className="glass rounded-lg p-4 mb-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">リクエスト理由:</p>
                              <p className="text-sm text-gray-600 leading-relaxed">{request.reason}</p>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-600 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(request.created_at)}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => approveMutation.mutate(request.request_id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">承認</span>
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(request.request_id)}
                            disabled={rejectMutation.isPending}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">拒否</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center modern-shadow">
                <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">すべて処理完了</h3>
                <p className="text-gray-600">現在、承認待ちのリクエストはありません</p>
              </div>
            )}

            {/* Processed Requests History */}
            {processedRequests.length > 0 && (
              <div className="glass rounded-2xl p-6 modern-shadow">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">処理済みリクエスト</h3>
                    <p className="text-sm text-gray-600">{processedRequests.length}件の履歴</p>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processedRequests.map((request) => (
                    <div
                      key={request.request_id}
                      className="glass-dark rounded-lg p-4 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">匿名ユーザー</p>
                            <p className="text-xs text-gray-600 font-mono">リクエストID: {request.request_id}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-gray-600">{formatDate(request.created_at)}</span>
                          {request.status === 'approved' ? (
                            <span className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 text-green-600 rounded-lg text-xs">
                              <CheckCircle className="h-3 w-3" />
                              <span>承認済み</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 px-2 py-1 bg-red-500/10 text-red-600 rounded-lg text-xs">
                              <XCircle className="h-3 w-3" />
                              <span>拒否済み</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Statistics & Info */}
          <div className="space-y-6">
            {/* Statistics Card */}
            <div className="glass rounded-2xl p-6 modern-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">統計情報</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
                  <span className="text-sm font-medium text-gray-700">保留中</span>
                  <span className="text-lg font-bold text-yellow-600">{pendingRequests.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
                  <span className="text-sm font-medium text-gray-700">承認済み</span>
                  <span className="text-lg font-bold text-green-600">
                    {processedRequests.filter(r => r.status === 'approved').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
                  <span className="text-sm font-medium text-gray-700">拒否済み</span>
                  <span className="text-lg font-bold text-red-600">
                    {processedRequests.filter(r => r.status === 'rejected').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 glass-dark rounded-lg">
                  <span className="text-sm font-medium text-gray-700">合計</span>
                  <span className="text-lg font-bold text-gray-900">
                    {(requests?.requests.length || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {requests?.requests.length === 0 && (
          <div className="lg:col-span-3">
            <div className="glass rounded-2xl p-12 text-center modern-shadow">
              <div className="inline-flex p-4 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-full mb-6">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">リクエストはありません</h3>
              <p className="text-gray-600 mb-6">まだ誰もこのファイルへのアクセスをリクエストしていません</p>
              <div className="glass-dark rounded-xl p-4 inline-block">
                <p className="text-sm text-gray-600">
                  共有URLを使用してファイルにアクセスすると
                  <br />
                  リクエストがここに表示されます
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}