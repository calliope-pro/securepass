// frontend/app/download/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Download, Shield, Lock, CheckCircle, FileText, Key, Sparkles, ArrowDown } from 'lucide-react'
import { api } from '@/lib/api'
import { crypto } from '@/lib/crypto'
import { formatBytes } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DownloadPage() {
  const params = useParams()
  const requestId = params.id as string
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [downloadedFile, setDownloadedFile] = useState<Blob | null>(null)
  const [fileName, setFileName] = useState<string>('')

  // ファイルをダウンロード
  const downloadMutation = useMutation({
    mutationFn: async () => {
      setIsDownloading(true)
      try {
        // 1. リクエスト情報からファイル情報を取得
        const requestStatus = await api.getRequestStatus(requestId)
        const fileInfo = requestStatus.file_info
        setFileName(fileInfo.filename)
        
        // 2. 暗号化されたファイルをダウンロード
        const downloadResult = await api.downloadFile(requestId)
        const encryptedBlob = downloadResult.blob
        
        // Content-Dispositionヘッダーからファイル名を取得（優先）
        if (downloadResult.filename) {
          setFileName(downloadResult.filename)
        }
        
        // 3. 復号化キーを取得
        const { encrypted_key } = await api.getDecryptKey(requestId)
        
        // 4. ファイルを復号化
        setIsDecrypting(true)
        const encryptedData = await encryptedBlob.arrayBuffer()
        const decryptedData = await crypto.decryptData(encryptedData, encrypted_key)
        
        // 5. 正しいMIMEタイプでBlobを作成
        const decryptedBlob = new Blob([decryptedData], { type: fileInfo.mime_type })
        setDownloadedFile(decryptedBlob)
        
        return decryptedBlob
      } finally {
        setIsDownloading(false)
        setIsDecrypting(false)
      }
    },
    onSuccess: (blob: Blob) => {
      toast.success('ファイルのダウンロードと復号化が完了しました')
      // 自動的にダウンロードを開始
      saveFile(blob)
    },
    onError: (error: any) => {
      console.error('Download error:', error)
      
      // APIErrorの詳細メッセージを表示
      if (error?.response?.status === 410) {
        toast.error('ファイルの有効期限が切れているか、ダウンロード回数上限に達しています')
      } else if (error?.response?.status === 403) {
        toast.error('このリクエストは承認されていません')
      } else if (error?.response?.status === 404) {
        toast.error('リクエストが見つかりません')
      } else {
        toast.error(`ダウンロードに失敗しました: ${error?.message || '不明なエラー'}`)
      }
    },
  })

  const saveFile = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
            リクエストが承認されました。暗号化されたファイルを安全にダウンロードできます。
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
                {fileName || 'ファイル'}
              </h2>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>承認済み・ダウンロード可能</span>
              </div>
            </div>

            {/* Download Process */}
            <div className="space-y-6">
              {!downloadedFile ? (
                <div className="space-y-4">
                  {/* Progress Steps */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className={`flex items-center space-x-2 p-3 rounded-xl transition-all ${
                      isDownloading ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <Download className="h-4 w-4" />
                      <span className="text-xs font-medium">ダウンロード</span>
                    </div>
                    <div className={`flex items-center space-x-2 p-3 rounded-xl transition-all ${
                      isDecrypting ? 'bg-purple-500/10 text-purple-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <Key className="h-4 w-4" />
                      <span className="text-xs font-medium">復号化</span>
                    </div>
                    <div className={`flex items-center space-x-2 p-3 rounded-xl transition-all ${
                      downloadedFile ? 'bg-green-500/10 text-green-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">完了</span>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadMutation.mutate()}
                    disabled={isDownloading}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300
                      flex items-center justify-center space-x-3
                      ${isDownloading
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
                    ) : (
                      <>
                        <ArrowDown className="h-5 w-5" />
                        <span>ダウンロード & 復号化</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="inline-flex p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full">
                    <Sparkles className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ダウンロード完了！</h3>
                    <p className="text-gray-600">ファイルが正常に復号化されました</p>
                  </div>
                  
                  <button
                    onClick={() => saveFile(downloadedFile)}
                    className="animated-gradient text-white px-8 py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] active:scale-98 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
                  >
                    <Download className="h-5 w-5" />
                    <span>再ダウンロード</span>
                  </button>
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