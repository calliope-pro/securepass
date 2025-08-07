import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardService, RequestsService } from '@/lib/api/generated'
import type { 
  DashboardStatsResponse, 
  FileActivity, 
  RequestInfo, 
  ApproveRequestRequest,
  RejectRequestRequest 
} from '@/lib/api/generated'

// ダッシュボード統計情報を取得するフック
export const useDashboardStats = (enabled: boolean = true) => {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      console.log('Calling dashboard stats API...')
      try {
        const result = await DashboardService.getDashboardStatsApiV1DashboardStatsGet()
        console.log('Dashboard stats API success:', result)
        return result
      } catch (error) {
        console.error('Dashboard stats API error:', error)
        throw error
      }
    },
    enabled, // 認証後のみ実行
    staleTime: 30000, // 30秒間キャッシュ
    refetchOnWindowFocus: false,
    retry: false // 一時的にリトライを無効化
  })
}

// ファイルアクティビティを取得するフック
export const useFileActivities = (limit: number = 10, enabled: boolean = true) => {
  return useQuery<FileActivity[]>({
    queryKey: ['dashboard', 'files', limit],
    queryFn: async () => {
      console.log('Calling file activities API...')
      try {
        const result = await DashboardService.getFileActivitiesApiV1DashboardFilesGet(limit)
        console.log('File activities API success:', result)
        return result
      } catch (error) {
        console.error('File activities API error:', error)
        throw error
      }
    },
    enabled, // 認証後のみ実行
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: false // 一時的にリトライを無効化
  })
}

// 特定のファイルのアクセス要求一覧を取得するフック
export const useFileRequests = (fileId: string, page: number = 1, perPage: number = 20) => {
  return useQuery({
    queryKey: ['requests', 'file', fileId, page, perPage],
    queryFn: () => RequestsService.getFileRequests(fileId, page, perPage, 'pending'),
    enabled: !!fileId,
    staleTime: 10000, // 10秒間キャッシュ
    refetchOnWindowFocus: false
  })
}

// すべてのファイルの承認待ちリクエストを取得（ダッシュボード用）
export const usePendingRequests = () => {
  const { data: activities } = useFileActivities(50) // より多くのファイルを取得
  
  return useQuery({
    queryKey: ['dashboard', 'pending-requests'],
    queryFn: async () => {
      if (!activities || activities.length === 0) {
        return []
      }

      // 各ファイルの承認待ちリクエストを取得
      const requestPromises = activities.map(file => 
        RequestsService.getFileRequests(file.id, 1, 50, 'pending')
          .then(response => response.requests)
          .catch(() => [])
      )

      const allRequests = await Promise.all(requestPromises)
      return allRequests.flat()
    },
    enabled: !!activities && activities.length > 0,
    staleTime: 10000,
    refetchOnWindowFocus: false
  })
}

// リクエスト承認のミューテーション
export const useApproveRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: ApproveRequestRequest }) =>
      RequestsService.approveRequest(requestId, data),
    onSuccess: () => {
      // 関連するクエリを再取得
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
    }
  })
}

// リクエスト拒否のミューテーション
export const useRejectRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data?: RejectRequestRequest }) =>
      RequestsService.rejectRequest(requestId, data || null),
    onSuccess: () => {
      // 関連するクエリを再取得
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
    }
  })
}