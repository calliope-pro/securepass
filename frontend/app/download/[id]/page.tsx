// frontend/app/download/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Download, Shield, Lock, CheckCircle, FileText, Key, Sparkles, ArrowDown, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { crypto } from '@/lib/crypto'
import { formatBytes } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DownloadPage() {
  const params = useParams()
  const requestId = params.id as string
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)

  // リクエスト状態をリアルタイム監視（キャッシュ無効化）
  const { data: requestStatus } = useQuery({
    queryKey: ['request-status', requestId],
    queryFn: () => api.getRequestStatus(requestId),
    refetchInterval: 5000, // 5秒ごとに更新
    enabled: !!requestId,
    staleTime: 0, // データを常に古いものとして扱う
    gcTime: 0, // ガベージコレクション時間を0に設定
  })

  // ファイル名と承認状態を取得
  const fileName = requestStatus?.file_info?.filename || 'ファイル'
  const isApproved = requestStatus?.status === 'approved'
  const downloadAvailable = requestStatus?.download_available === true

  // ファイルをダウンロードして即座保存
  const downloadMutation = useMutation({
    mutationFn: async () => {
      setIsDownloading(true)
      try {
        // 1. リクエスト情報からファイル情報を取得
        const requestStatus = await api.getRequestStatus(requestId)
        const fileInfo = requestStatus.file_info
        
        // 2. 暗号化されたファイルをダウンロード
        const downloadResult = await api.downloadFile(requestId)
        const encryptedBlob = downloadResult.blob
        
        // Content-Dispositionヘッダーからファイル名を取得（優先）
        const finalFileName = downloadResult.filename || fileInfo.filename
        
        // 3. 復号化キーを取得
        const { encrypted_key } = await api.getDecryptKey(requestId)
        
        // 4. ファイルを復号化
        setIsDecrypting(true)
        const encryptedData = await encryptedBlob.arrayBuffer()
        const decryptedData = await crypto.decryptData(encryptedData, encrypted_key)
        
        // 5. 正しいMIMEタイプでBlobを作成して即座保存
        const decryptedBlob = new Blob([decryptedData], { type: fileInfo.mime_type })
        
        // 即座ダウンロード実行
        const url = URL.createObjectURL(decryptedBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = finalFileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        setDownloadComplete(true)
        return true
      } finally {
        setIsDownloading(false)
        setIsDecrypting(false)
      }
    },
    onSuccess: () => {
      toast.success('ファイルのダウンロードが完了しました')
    },
    onError: (error: any) => {
      console.error('Download error:', error)
      
      // APIErrorの詳細メッセージを表示
      if (error?.response?.status === 410) {
        const errorMessage = error?.response?.data?.detail || 'ファイルの有効期限が切れているか、ダウンロード回数上限に達しています'
        toast.error(errorMessage)
      } else if (error?.response?.status === 403) {
        toast.error('このリクエストは承認されていません')
      } else if (error?.response?.status === 404) {
        toast.error('リクエストが見つかりません')
      } else {
        toast.error(`ダウンロードに失敗しました: ${error?.message || '不明なエラー'}`)
      }
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full mb-6">
            <Download className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-black gradient-text mb-4">
            セキュアダウンロード
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            リクエスト状況を確認して、暗号化されたファイルを安全にダウンロードしてください。
          </p>
        </div>

        {/* Main Download Card */}
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-8 modern-shadow hover-lift">
            <div className="text-center mb-8">
              <div className="inline-flex p-6 animated-gradient rounded-2xl mb-6">
                <FileText className="h-12 w-12 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {fileName}
              </h2>
              
              <div className="flex items-center justify-center space-x-2 text-sm">
                {isApproved && downloadAvailable ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">承認済み・ダウンロード可能</span>
                  </>
                ) : isApproved && !downloadAvailable ? (
                  <>
                    <XCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-orange-600">承認済み・ダウンロード禁止中</span>
                  </>
                ) : requestStatus ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">
                      {requestStatus.status === 'pending' ? '承認待ち' : 
                       requestStatus.status === 'rejected' ? '拒否されました' : 'アクセス不可'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span className="text-gray-600">状態確認中...</span>
                  </>
                )}
              </div>
            </div>

            {/* Download Process */}
            <div className="space-y-6">
              {!downloadComplete ? (
                <div className="space-y-4">
                  <button
                    onClick={() => downloadMutation.mutate()}
                    disabled={isDownloading || !downloadAvailable}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300
                      flex items-center justify-center space-x-3
                      ${isDownloading || !downloadAvailable
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'animated-gradient text-white hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>{isDecrypting ? '復号化中...' : 'ダウンロード中...'}</span>
                      </>
                    ) : !downloadAvailable ? (
                      <>
                        <XCircle className="h-5 w-5" />
                        <span>
                          {!isApproved ? 'ダウンロード不可' : 
                           requestStatus?.file_info?.blocks_downloads ? 'ダウンロード禁止中' :
                           'ダウンロード不可'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-5 w-5" />
                        <span>ダウンロード</span>
                      </>
                    )}
                  </button>
                </div>
              ) : downloadAvailable ? (
                <div className="text-center space-y-6">
                  <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full">
                    <Sparkles className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ダウンロード完了！</h3>
                    <p className="text-gray-600">
                      ファイルが正常にダウンロードされました。<br />
                      承認が有効な間は、このページから再度ダウンロード可能です。
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setDownloadComplete(false)
                      downloadMutation.mutate()
                    }}
                    disabled={!downloadAvailable}
                    className={`px-8 py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] active:scale-98 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center space-x-3 ${
                      downloadAvailable 
                        ? 'animated-gradient text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Download className="h-5 w-5" />
                    <span>再ダウンロード</span>
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="inline-flex p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">アクセス不可</h3>
                    <p className="text-gray-600">
                      {requestStatus?.status === 'pending' ? 
                        'このリクエストはまだ承認されていません。承認をお待ちください。' :
                       requestStatus?.status === 'rejected' ? 
                        'このリクエストは拒否されました。' :
                       isApproved && requestStatus?.file_info?.blocks_downloads ?
                        'ファイル送信者によってダウンロードが禁止されています。' :
                       isApproved && requestStatus?.file_info?.expires_at ?
                        'ファイルの有効期限が切れています。' :
                        'アクセスできません。'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

        {/* Security & Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Security Notice */}
          <div className="glass rounded-2xl p-6 modern-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-bold text-gray-900">エンドツーエンド暗号化</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              このファイルは送信者によって暗号化され、あなたのデバイスで復号化されます。
              SecurePassのサーバーはファイルの内容を知ることができません。
            </p>
          </div>

          {/* Security Tips */}
          <div className="glass rounded-2xl p-6 modern-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-bold text-gray-900">セキュリティのヒント</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>ファイルを安全な場所に保存</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>内容確認後に開く</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>必要に応じてウイルススキャン</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}