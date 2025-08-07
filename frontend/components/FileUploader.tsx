// frontend/components/FileUploader.tsx
'use client'

import React, { useState } from 'react'
import { Upload, Shield, Zap, Star, CheckCircle, AlertCircle } from 'lucide-react'
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

    const progressId = Date.now().toString()
    
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
        expires_in_hours: 24,
        max_downloads: 10
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

  const handleFiles = async (files: FileList | File[]) => {
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

    setIsUploading(true)
    
    // 並列アップロード（最大3ファイル同時）
    const uploadPromises = fileArray.map(file => uploadFile(file))
    
    try {
      await Promise.all(uploadPromises)
    } finally {
      setIsUploading(false)
    }
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

      {/* Upload Area */}
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