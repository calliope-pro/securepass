// frontend/components/FileUploader.tsx
'use client'

import React, { useState } from 'react'
import { Upload, Shield, Zap, Star, CheckCircle, AlertCircle, Settings, Clock, Download, FileText, X, Play } from 'lucide-react'
import { useAuth0 } from '@/contexts/Auth0Context'
import { FilesService } from '@/lib/api/generated'
import { crypto } from '@/lib/crypto'
import toast from 'react-hot-toast'

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  sessionKey?: string
  error?: string
}

const FileUploader: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [expiryHours, setExpiryHours] = useState(24)
  const [maxDownloads, setMaxDownloads] = useState(10)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)

  // デバッグ用ログ
  console.log('FileUploader auth state:', { isAuthenticated, isLoading, user: !!user })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const uploadFile = async (file: File) => {
    if (!crypto.isSupported()) {
      toast.error('このブラウザは暗号化機能をサポートしていません')
      return
    }

    // 進捗状態を初期化
    setUploadProgress(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }])

    try {
      // Step 1: ファイル暗号化
      console.log('Encrypting file:', file.name)
      const encryptionResult = await crypto.encryptFile(file)
      
      // Step 2: アップロード開始
      console.log('Initiating upload')
      const initiateResponse = await FilesService.initiateUpload({
        filename: file.name,
        size: encryptionResult.encryptedData.byteLength,
        mime_type: file.type || 'application/octet-stream',
        chunk_size: 1024 * 1024, // 1MB chunks
        expires_in_hours: expiryHours,
        max_downloads: maxDownloads === -1 ? 9999 : maxDownloads
      })

      const sessionKey = initiateResponse.session_key
      
      // 進捗更新
      setUploadProgress(prev => prev.map(p => 
        p.file === file ? { ...p, sessionKey, progress: 20 } : p
      ))

      // Step 3: チャンク分割アップロード
      const chunkSize = 1024 * 1024 // 1MB
      const encryptedData = encryptionResult.encryptedData
      const totalChunks = Math.ceil(encryptedData.byteLength / chunkSize)
      
      console.log(`Uploading ${totalChunks} chunks`)
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize
        const end = Math.min(start + chunkSize, encryptedData.byteLength)
        const chunk = encryptedData.slice(start, end)
        
        // Base64エンコード
        const chunkBase64 = crypto.arrayBufferToBase64(chunk)
        
        // チャンクアップロード
        await FilesService.uploadChunk({
          session_key: sessionKey,
          chunk_index: chunkIndex,
          chunk_data: chunkBase64
        })

        // 進捗更新
        const progress = 20 + Math.floor(((chunkIndex + 1) / totalChunks) * 70)
        setUploadProgress(prev => prev.map(p => 
          p.file === file ? { ...p, progress } : p
        ))
      }

      // Step 4: アップロード完了
      console.log('Completing upload')
      await FilesService.completeUpload({
        session_key: sessionKey,
        encrypted_key: encryptionResult.keyString
      })

      // 完了状態に更新
      setUploadProgress(prev => prev.map(p => 
        p.file === file ? { ...p, progress: 100, status: 'completed' } : p
      ))

      toast.success(`${file.name} のアップロードが完了しました`)

    } catch (error) {
      console.error('File upload error:', error)
      
      // エラー状態に更新
      setUploadProgress(prev => prev.map(p => 
        p.file === file ? { 
          ...p, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'アップロードに失敗しました'
        } : p
      ))

      toast.error(`${file.name} のアップロードに失敗しました`)
    }
  }

  const handleFiles = (files: FileList | File[]) => {
    if (isUploading) {
      toast.error('他のファイルのアップロード中です')
      return
    }

    const fileArray = Array.from(files)
    
    // ファイルサイズチェック (500MB制限)
    const maxSize = 500 * 1024 * 1024
    const oversizedFiles = fileArray.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      toast.error(`ファイルサイズが上限(500MB)を超えています: ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    // ファイル選択後に確認画面を表示
    setSelectedFiles(fileArray)
    setShowConfirmation(true)
  }

  const handleConfirmUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setShowConfirmation(false)
    
    // 並列アップロード（最大3ファイル同時）
    const uploadPromises = selectedFiles.map(file => uploadFile(file))
    
    try {
      await Promise.all(uploadPromises)
    } finally {
      setIsUploading(false)
      setSelectedFiles([])
    }
  }

  const handleCancelUpload = () => {
    setSelectedFiles([])
    setShowConfirmation(false)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center space-y-6">
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-xl border border-gray-200/50 backdrop-blur-sm p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Ultra-Secure File Sharing
            </h2>
            <p className="text-lg text-gray-600">
              エンドツーエンド暗号化でファイルを安全に共有。<br/>
              <span className="text-blue-600 font-semibold">Zero-Knowledge</span>アーキテクチャで完全プライバシー保護
            </p>
            <p className="text-gray-500">
              まずはアカウントを作成してください。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-xl border border-gray-200/50 backdrop-blur-sm p-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Ultra-Secure File Sharing
        </h2>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          エンドツーエンド暗号化でファイルを安全に共有。<br/>
          <span className="text-blue-600 font-semibold">Zero-Knowledge</span>アーキテクチャで完全プライバシー保護
        </p>
      </div>

      {/* File Confirmation Screen */}
      {showConfirmation && selectedFiles.length > 0 && (
        <div className="border border-blue-200 rounded-xl p-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">アップロード確認</h3>
              <p className="text-gray-600">選択されたファイルと設定を確認してください</p>
            </div>

            {/* Selected Files */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>選択ファイル ({selectedFiles.length}件)</span>
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/70 rounded-lg p-3 border">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-sm text-gray-600">{formatFileSize(file.size)} • {file.type || 'Unknown type'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="ファイルを削除"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Settings Preview */}
            <div className="bg-white/70 rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>アップロード設定</span>
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">有効期限</p>
                    <p className="text-lg font-bold text-gray-900">
                      {expiryHours === 1 ? '1時間' : 
                       expiryHours === 6 ? '6時間' :
                       expiryHours === 24 ? '24時間' :
                       expiryHours === 168 ? '7日間' : '30日間'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg">
                    <Download className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">最大ダウンロード回数</p>
                    <p className="text-lg font-bold text-gray-900">
                      {maxDownloads === -1 ? '無制限' : `${maxDownloads}回`}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Settings Edit Section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">有効期限を変更</label>
                    <select
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
                    >
                      <option value={1}>1時間</option>
                      <option value={6}>6時間</option>
                      <option value={24}>24時間（推奨）</option>
                      <option value={168}>7日間</option>
                      <option value={720}>30日間</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">ダウンロード制限を変更</label>
                    <select
                      value={maxDownloads}
                      onChange={(e) => setMaxDownloads(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
                    >
                      <option value={1}>1回</option>
                      <option value={3}>3回</option>
                      <option value={5}>5回</option>
                      <option value={10}>10回（推奨）</option>
                      <option value={50}>50回</option>
                      <option value={-1}>無制限</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handleCancelUpload}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                <X className="h-5 w-5" />
                <span>キャンセル</span>
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={selectedFiles.length === 0}
                className="flex items-center space-x-2 px-8 py-3 animated-gradient text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Play className="h-5 w-5" />
                <span>アップロード開始 ({selectedFiles.length}件)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!showConfirmation && (
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-out transform hover:scale-[1.02]
            ${isDragging 
              ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg scale-[1.02]' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        <input 
          type="file" 
          multiple 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
        />
        
        {/* Animated Upload Icon */}
        <div className="relative">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 transition-all duration-300 ${isDragging ? 'animate-pulse' : ''}`}></div>
          <Upload className={`relative mx-auto h-16 w-16 transition-all duration-300 ${isDragging ? 'text-blue-500 scale-110' : 'text-gray-400'}`} />
        </div>
        
        <div className="space-y-3 mt-6">
          <p className={`text-2xl font-bold transition-colors duration-300 ${isDragging ? 'text-blue-600' : 'text-gray-700'}`}>
            {isDragging ? '✨ ドロップして暗号化開始！' : 'ファイルをドラッグ&ドロップ'}
          </p>
          <p className="text-gray-500 text-lg">
            または、<span className="text-blue-600 font-semibold underline decoration-2 underline-offset-2">クリックしてファイルを選択</span>
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mt-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>最大500MB</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>複数ファイル対応</span>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* アップロード進捗表示 */}
      {uploadProgress.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">アップロード状況</h3>
          {uploadProgress.map((upload, index) => (
            <div key={index} className="bg-white/50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {upload.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : upload.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  )}
                  <span className="font-medium text-gray-900">{upload.file.name}</span>
                  <span className="text-sm text-gray-500">({(upload.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{upload.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    upload.status === 'error' ? 'bg-red-500' : 
                    upload.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                ></div>
              </div>
              {upload.error && (
                <p className="text-sm text-red-600 mt-2">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default FileUploader