'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FilesService } from '@/lib/api/generated'
import { ShieldOff, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from './ConfirmModal'
import { isExpired } from '@/lib/utils'

interface BlockRequestsButtonProps {
  fileId: string
  filename: string
  blocksRequests: boolean
  expiresAt: string
  disabled?: boolean
}

export default function BlockRequestsButton({ 
  fileId, 
  filename, 
  blocksRequests, 
  expiresAt,
  disabled = false 
}: BlockRequestsButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const queryClient = useQueryClient()
  
  // 期限切れチェック
  const fileExpired = isExpired(expiresAt)

  // リクエスト受付停止のMutation
  const blockRequestsMutation = useMutation({
    mutationFn: (blocksRequests: boolean) => FilesService.updateFile(fileId, {
      blocks_requests: blocksRequests
    }),
    onSuccess: (data) => {
      const action = data.blocks_requests ? 'リクエスト受付停止' : 'リクエスト受付再開'
      toast.success(`${action}しました`)
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['file-info', fileId] })
      queryClient.invalidateQueries({ queryKey: ['recent-files'] })
      setShowConfirmModal(false)
    },
    onError: (error: any) => {
      const action = blocksRequests ? 'リクエスト受付再開' : 'リクエスト受付停止'
      toast.error(`${action}に失敗しました`)
      console.error('File block requests error:', error)
      setShowConfirmModal(false)
    },
  })

  const handleToggleBlockRequests = () => {
    const newBlocksRequestsState = !blocksRequests
    blockRequestsMutation.mutate(newBlocksRequestsState)
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

  // リクエスト受付停止済みの場合のボタン
  if (blocksRequests) {
    return (
      <>
        <button
          onClick={handleOpenModal}
          disabled={disabled || blockRequestsMutation.isPending || fileExpired}
          className="inline-flex items-center space-x-3 px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <CheckCircle className="h-5 w-5" />
          <span>
            {blockRequestsMutation.isPending ? '処理中...' : 'リクエスト受付再開'}
          </span>
        </button>

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={handleCloseModal}
          onConfirm={handleToggleBlockRequests}
          title="リクエスト受付を再開しますか？"
          message={`「${filename}」のリクエスト受付を再開します。再開後は新しいアクセスリクエストを受け付けるようになります。`}
          confirmText="リクエスト受付再開"
          type="success"
          isLoading={blockRequestsMutation.isPending}
        />
      </>
    )
  }

  // リクエスト受付停止前のボタン
  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled || blockRequestsMutation.isPending || fileExpired}
        className="inline-flex items-center space-x-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <ShieldOff className="h-5 w-5" />
        <span>
          {blockRequestsMutation.isPending ? '処理中...' : 'リクエスト受付停止'}
        </span>
      </button>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCloseModal}
        onConfirm={handleToggleBlockRequests}
        title="リクエスト受付を停止しますか？"
        message={
          <div className="text-left space-y-4">
            <div className="flex items-center space-x-3">
              <p className="font-semibold text-gray-900">「{filename}」のリクエスト受付を停止します</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">停止の影響：</p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>新しいアクセスリクエストを受け付けなくなります</li>
                <li>既に承認済みのリクエストは影響を受けません</li>
                <li>ファイル自体は削除されません</li>
                <li>後からリクエスト受付を再開することも可能です</li>
              </ul>
            </div>
          </div>
        }
        confirmText="リクエスト受付停止"
        type="danger"
        isLoading={blockRequestsMutation.isPending}
      />
    </>
  )
}