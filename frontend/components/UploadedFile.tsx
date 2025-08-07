// frontend/components/UploadedFiles.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Share2, Link, Users, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/utils'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import type { RecentFileItem, RecentFilesResponse } from '@/lib/api/generated'

interface UploadedFilesProps {
  defaultLimit?: number
  showPagination?: boolean
  showViewAllButton?: boolean
}

export function UploadedFiles({ 
  defaultLimit = 6, 
  showPagination = true, 
  showViewAllButton = false 
}: UploadedFilesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  
  const page = showPagination ? parseInt(searchParams.get('page') || '1') : 1
  const limit = defaultLimit
  const offset = showPagination ? (page - 1) * limit : 0
  
  // APIから最新のファイル一覧を取得（ページング対応）
  const { data: filesResponse, isLoading } = useQuery({
    queryKey: ['uploaded-files', page, limit, showPagination],
    queryFn: () => api.getRecentFiles(limit, showPagination ? offset : undefined),
    refetchInterval: 5000, // 5秒ごとに更新
  })

  const files = filesResponse?.files || []
  const total = filesResponse?.total || 0
  const hasNext = showPagination && offset + limit < total
  const hasPrev = showPagination && page > 1

  const copyShareLink = (shareId: string) => {
    const url = `${window.location.origin}/share/${shareId}`
    navigator.clipboard.writeText(url)
    setCopiedId(shareId)
    toast.success('共有リンクをコピーしました')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    if (newPage === 1) {
      params.delete('page')
    } else {
      params.set('page', newPage.toString())
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-8 modern-shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (files.length === 0) {
    return null
  }

  return (
    <div className="glass rounded-2xl p-8 modern-shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          アップロード済みファイル
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 font-medium">
            {showPagination 
              ? `${total}件中 ${offset + 1}-${Math.min(offset + limit, total)}件を表示`
              : `${files.length}件のファイル`
            }
          </span>
          {showViewAllButton && total > defaultLimit && (
            <button
              onClick={() => router.push('/files')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              すべて表示 →
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {files.map((file: RecentFileItem) => (
          <div
            key={file.file_id}
            className="glass-dark rounded-xl p-6 hover-lift transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{file.filename}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">サイズ:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatBytes(file.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">作成日:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatDate(file.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">有効期限:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatDate(file.expires_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ダウンロード:</span>
                    <span className="ml-2 font-bold text-blue-600">{file.download_count} / {file.max_downloads}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 ml-6">
                <button
                  onClick={() => copyShareLink(file.share_id)}
                  className="p-3 glass rounded-xl hover:scale-105 active:scale-95 transition-all duration-200"
                  title="共有リンクをコピー"
                >
                  {copiedId === file.share_id ? (
                    <Link className="h-5 w-5 text-green-600" />
                  ) : (
                    <Share2 className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                
                <a
                  href={`/request/${file.file_id}`}
                  className="p-3 glass rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 relative"
                  title="リクエスト管理"
                >
                  <Users className="h-5 w-5 text-gray-600" />
                  {file.request_count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 animated-gradient text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {file.request_count}
                    </span>
                  )}
                </a>
                
                <a
                  href={`/share/${file.share_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 glass rounded-xl hover:scale-105 active:scale-95 transition-all duration-200"
                  title="共有ページを開く"
                >
                  <ExternalLink className="h-5 w-5 text-gray-600" />
                </a>
              </div>
            </div>
          </div>
        ))}
        
        {/* ページネーション */}
        {showPagination && total > limit && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              ページ {page} / {Math.ceil(total / limit)}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updatePage(page - 1)}
                disabled={!hasPrev}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="前のページ"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {/* ページ番号 */}
              <div className="flex space-x-1">
                {(() => {
                  const totalPages = Math.ceil(total / limit)
                  const maxVisiblePages = Math.min(5, totalPages)
                  
                  // 表示する開始ページを計算
                  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
                  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                  
                  // 終端に合わせて開始ページを調整
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }
                  
                  const pages = []
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i)
                  }
                  
                  return pages.map((pageNum) => (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => updatePage(pageNum)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))
                })()}
              </div>
              
              <button
                onClick={() => updatePage(page + 1)}
                disabled={!hasNext}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="次のページ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}