'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FilesService } from '@/lib/api/generated'
import { ShieldOff, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from './ConfirmModal'
import { isExpired } from '@/lib/utils'

interface BlockDownloadsButtonProps {
  fileId: string
  filename: string
  blocksDownloads: boolean
  expiresAt: string
  disabled?: boolean
}

export default function BlockDownloadsButton({ 
  fileId, 
  filename, 
  blocksDownloads, 
  expiresAt,
  disabled = false 
}: BlockDownloadsButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const queryClient = useQueryClient()
  
  // 期限切れチェック
  const fileExpired = isExpired(expiresAt)

  // ダウンロード禁止のMutation
  const blockDownloadsMutation = useMutation({
    mutationFn: (blocksDownloads: boolean) => FilesService.updateFile(fileId, {
      blocks_downloads: blocksDownloads
    }),
    onSuccess: (data) => {
      const action = data.blocks_downloads ? 'ダウンロード禁止' : 'ダウンロード許可'
      toast.success(`${action}しました`)
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['file-info', fileId] })
      queryClient.invalidateQueries({ queryKey: ['recent-files'] })
      setShowConfirmModal(false)
    },
    onError: (error: any) => {
      const action = blocksDownloads ? 'ダウンロード許可' : 'ダウンロード禁止'
      toast.error(`${action}に失敗しました`)
      console.error('File block downloads error:', error)
      setShowConfirmModal(false)
    },
  })

  const handleToggleBlockDownloads = () => {
    const newBlocksDownloadsState = !blocksDownloads
    blockDownloadsMutation.mutate(newBlocksDownloadsState)
  }

  const handleOpenModal = () => {
    setShowConfirmModal(true)
  }

  const handleCloseModal = () => {
    setShowConfirmModal(false)
  }

  // 期限切れファイルの場合は無効なボタンを表示
  if (fileExpired) {
    return (
      <button
        disabled={true}
        className="inline-flex items-center space-x-3 px-8 py-4 bg-gray-400 text-white rounded-xl font-semibold text-lg cursor-not-allowed opacity-50"
      >
        <AlertTriangle className="h-5 w-5" />
        <span>期限切れ</span>
      </button>
    )
  }

  // ダウンロード禁止済みの場合のボタン
  if (blocksDownloads) {
    return (
      <>
        <button
          onClick={handleOpenModal}
          disabled={disabled || blockDownloadsMutation.isPending || fileExpired}
          className="inline-flex items-center space-x-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <CheckCircle className="h-5 w-5" />
          <span>
            {blockDownloadsMutation.isPending ? '処理中...' : 'ダウンロード許可'}
          </span>
        </button>

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={handleCloseModal}
          onConfirm={handleToggleBlockDownloads}
          title="ダウンロードを許可しますか？"
          message={`「${filename}」のダウンロードを許可します。許可後は承認済みリクエストでダウンロードできるようになります。`}
          confirmText="ダウンロード許可"
          type="success"
          isLoading={blockDownloadsMutation.isPending}
        />
      </>
    )
  }

  // ダウンロード禁止前のボタン
  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled || blockDownloadsMutation.isPending || fileExpired}
        className="inline-flex items-center space-x-3 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <ShieldOff className="h-5 w-5" />
        <span>
          {blockDownloadsMutation.isPending ? '処理中...' : 'ダウンロード禁止'}
        </span>
      </button>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCloseModal}
        onConfirm={handleToggleBlockDownloads}
        title="ダウンロードを禁止しますか？"
        message={
          <div className="text-left space-y-4">
            <div className="flex items-center space-x-3">
              <p className="font-semibold text-gray-900">「{filename}」のダウンロードを禁止します</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">禁止の影響：</p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>承認済みリクエストでもダウンロードできなくなります</li>
                <li>復号化キーへのアクセスも制限されます</li>
                <li>ファイル自体は削除されません</li>
                <li>後からダウンロードを許可することも可能です</li>
              </ul>
            </div>
          </div>
        }
        confirmText="ダウンロード禁止"
        type="danger"
        isLoading={blockDownloadsMutation.isPending}
      />
    </>
  )
}