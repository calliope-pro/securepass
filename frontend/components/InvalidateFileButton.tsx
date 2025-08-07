'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FilesService } from '@/lib/api/generated'
import { ShieldOff, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from './ConfirmModal'

interface InvalidateFileButtonProps {
  fileId: string
  filename: string
  isInvalidated: boolean
  disabled?: boolean
}

export default function InvalidateFileButton({ 
  fileId, 
  filename, 
  isInvalidated, 
  disabled = false 
}: InvalidateFileButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const queryClient = useQueryClient()

  // ファイル無効化のMutation
  const invalidateMutation = useMutation({
    mutationFn: (invalidated: boolean) => FilesService.updateFile(fileId, {
      is_invalidated: invalidated
    }),
    onSuccess: (data) => {
      const action = data.is_invalidated ? '無効化' : '無効化解除'
      toast.success(`ファイルを${action}しました`)
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['file-info', fileId] })
      queryClient.invalidateQueries({ queryKey: ['recent-files'] })
      setShowConfirmModal(false)
    },
    onError: (error: any) => {
      const action = isInvalidated ? '無効化解除' : '無効化'
      toast.error(`ファイルの${action}に失敗しました`)
      console.error('File invalidation error:', error)
      setShowConfirmModal(false)
    },
  })

  const handleToggleInvalidation = () => {
    const newInvalidatedState = !isInvalidated
    invalidateMutation.mutate(newInvalidatedState)
  }

  const handleOpenModal = () => {
    setShowConfirmModal(true)
  }

  const handleCloseModal = () => {
    setShowConfirmModal(false)
  }

  // 無効化済みの場合のボタン
  if (isInvalidated) {
    return (
      <>
        <button
          onClick={handleOpenModal}
          disabled={disabled || invalidateMutation.isPending}
          className="inline-flex items-center space-x-3 px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <CheckCircle className="h-5 w-5" />
          <span>
            {invalidateMutation.isPending ? '処理中...' : '無効化を解除'}
          </span>
        </button>

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={handleCloseModal}
          onConfirm={handleToggleInvalidation}
          title="ファイルの無効化を解除しますか？"
          message={`「${filename}」の無効化を解除します。解除後は再びアクセスリクエストを受け付けるようになります。`}
          confirmText="無効化を解除"
          type="success"
          isLoading={invalidateMutation.isPending}
        />
      </>
    )
  }

  // 無効化前のボタン
  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled || invalidateMutation.isPending}
        className="inline-flex items-center space-x-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <ShieldOff className="h-5 w-5" />
        <span>
          {invalidateMutation.isPending ? '処理中...' : 'ファイルを無効化'}
        </span>
      </button>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCloseModal}
        onConfirm={handleToggleInvalidation}
        title="ファイルを無効化しますか？"
        message={
          <div className="text-left space-y-4">
            <div className="flex items-center space-x-3">
              <p className="font-semibold text-gray-900">「{filename}」を無効化します</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">無効化の影響：</p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>新しいアクセスリクエストが作成できなくなります</li>
                <li>既に承認済みのリクエストは影響を受けません</li>
                <li>ファイル自体は削除されません</li>
                <li>後から無効化を解除することも可能です</li>
              </ul>
            </div>
          </div>
        }
        confirmText="ファイルを無効化"
        type="danger"
        isLoading={invalidateMutation.isPending}
      />
    </>
  )
}