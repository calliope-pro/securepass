// frontend/hooks/useFileUpload.ts
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { crypto } from '@/lib/crypto'
import { ApiError } from '@/lib/api/generated'

interface UploadProgress {
  percent: number
  uploadedChunks: number
  totalChunks: number
}

interface UploadSettings {
  expiresInHours: number
  maxDownloads: number
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [isCryptoSupported, setIsCryptoSupported] = useState(false)

  useEffect(() => {
    // クライアントサイドでのみ暗号化サポートをチェック
    setIsCryptoSupported(crypto.isSupported())
  }, [])

  const uploadFile = useCallback(async (file: File, settings: UploadSettings) => {
    if (!isCryptoSupported) {
      throw new Error(
        'Web Crypto APIが利用できません。HTTPS接続またはlocalhost環境で実行してください。'
      )
    }

    setIsUploading(true)
    setUploadProgress({ percent: 0, uploadedChunks: 0, totalChunks: 0 })

    try {
      // 1. ファイルを暗号化
      console.log('Encrypting file...')
      const encryptionResult = await crypto.encryptFile(file)
      
      // 2. アップロードを開始
      const chunkSize = 5 * 1024 * 1024 // 5MB
      const initResponse = await api.initiateUpload({
        filename: file.name,
        size: encryptionResult.encryptedData.byteLength,
        mime_type: file.type,
        chunk_size: chunkSize,
        expires_in_hours: settings.expiresInHours,
        max_downloads: settings.maxDownloads,
      })

      console.log('Upload initiated:', initResponse)
      
      // 3. チャンクごとにアップロード
      const totalChunks = initResponse.chunk_count
      const encryptedBytes = new Uint8Array(encryptionResult.encryptedData)
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, encryptedBytes.length)
        const chunk = encryptedBytes.slice(start, end)
        
        // チャンクをBase64エンコード
        const chunkBase64 = crypto.arrayBufferToBase64(chunk.buffer)
        
        // チャンクをアップロード
        await api.uploadChunk({
          session_key: initResponse.session_key,
          chunk_index: i,
          chunk_data: chunkBase64,
        })
        
        // 進捗を更新
        const progress = {
          percent: Math.round(((i + 1) / totalChunks) * 100),
          uploadedChunks: i + 1,
          totalChunks: totalChunks,
        }
        setUploadProgress(progress)
        console.log(`Chunk ${i + 1}/${totalChunks} uploaded`)
      }
      
      // 4. アップロードを完了
      await api.completeUpload({
        session_key: initResponse.session_key,
        encrypted_key: encryptionResult.keyString,
      })
      
      // 5. アップロード完了 - ファイル情報はデータベースで管理
      
      return {
        fileId: initResponse.file_id,
        shareId: initResponse.share_id,
        shareUrl: `${window.location.origin}/share/${initResponse.share_id}`,
      }
    } catch (error) {
      console.error('Upload failed:', error)
      
      if (error instanceof ApiError) {
        throw new Error(`アップロードエラー: ${error.message}`)
      } else if (error instanceof Error) {
        throw new Error(`アップロードエラー: ${error.message}`)
      } else {
        throw new Error('アップロードエラー: 不明なエラーが発生しました')
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }, [isCryptoSupported])

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    isCryptoSupported,
  }
}