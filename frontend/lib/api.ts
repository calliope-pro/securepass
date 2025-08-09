// frontend/lib/api.ts
import { 
  OpenAPI, 
  FilesService, 
  SharesService, 
  RequestsService, 
  DownloadService,
  StatsService,
  DashboardService,
  SubscriptionService,
  type InitiateUploadRequest,
  type ChunkUploadRequest,
  type CompleteUploadRequest,
  type CreateAccessRequestRequest,
  type ApproveRequestRequest,
  type RejectRequestRequest,
} from './api/generated'
// Auth0 JWT トークン取得用（動的インポート）

// API設定
declare const process: {
  env: {
    NEXT_PUBLIC_API_DOMAIN?: string;
    NEXT_PUBLIC_AUTH0_DOMAIN?: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID?: string;
  };
};

// ドメインからAPIのベースURLを構築
function buildApiUrl(domain: string): string {
  // localhost/127.0.0.1の場合はhttpを使用、それ以外はhttpsを使用
  const protocol = domain.includes('localhost') || domain.includes('127.0.0.1') ? 'http' : 'https'
  return `${protocol}://${domain}`
}

const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN!
const API_URL = buildApiUrl(API_DOMAIN)
console.log('API_URL configured as:', API_URL)

// OpenAPI.BASEを即座に設定（Auth0Context.tsxでも設定されるが、タイミング問題を防ぐため）
OpenAPI.BASE = API_URL

// キャッシュ無効化ヘッダー
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
} as const


// Auth0 JWT トークンの自動付与
OpenAPI.TOKEN = async () => {
  try {
    // 動的インポートでAuth0Clientを取得
    if (typeof window !== 'undefined') {
      // フロントエンドでのみ実行
      const { createAuth0Client } = await import('@auth0/auth0-spa-js')
      const auth0Client = await createAuth0Client({
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
        clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
        authorizationParams: {
          redirect_uri: `${window.location.origin}/auth/callback`,
        },
      })
      
      const isAuthenticated = await auth0Client.isAuthenticated()
      if (isAuthenticated) {
        return await auth0Client.getTokenSilently()
      }
    }
    return undefined
  } catch (error) {
    console.error('Error getting Auth0 token for API:', error)
    return undefined
  }
}

export const api = {
  // Files
  async initiateUpload(data: InitiateUploadRequest) {
    return FilesService.initiateUpload(data)
  },

  async uploadChunk(data: ChunkUploadRequest) {
    return FilesService.uploadChunk(data)
  },

  async completeUpload(data: CompleteUploadRequest) {
    return FilesService.completeUpload(data)
  },

  async getFileInfo(fileId: string) {
    return FilesService.getFileInfo(fileId)
  },

  async getRecentFiles(limit: number = 10, offset?: number) {
    return FilesService.getRecentFiles(limit, offset)
  },

  // Shares
  async getShareInfo(shareId: string) {
    return SharesService.getShareInfo(shareId)
  },

  // Requests
  async createAccessRequest(shareId: string, reason?: string) {
    const data: CreateAccessRequestRequest = {
      share_id: shareId,
      reason,
    }
    return RequestsService.createAccessRequest(data)
  },

  async getFileRequests(fileId: string) {
    return RequestsService.getFileRequests(fileId)
  },

  async getRequestStatus(requestId: string) {
    const originalHeaders = OpenAPI.HEADERS
    OpenAPI.HEADERS = { ...originalHeaders, ...NO_CACHE_HEADERS }
    
    try {
      return await RequestsService.getRequestStatus(requestId)
    } finally {
      OpenAPI.HEADERS = originalHeaders
    }
  },

  async approveRequest(requestId: string, encryptedKey?: string) {
    const data: ApproveRequestRequest = {
      encrypted_key: encryptedKey || 'dummy-key', // TODO: 実際の暗号化キー実装
    }
    return RequestsService.approveRequest(requestId, data)
  },

  async rejectRequest(requestId: string, reason?: string) {
    const data: RejectRequestRequest = {
      reason,
    }
    return RequestsService.rejectRequest(requestId, data)
  },

  // Download
  async downloadFile(requestId: string): Promise<{ blob: Blob; filename?: string }> {
    const originalHeaders = OpenAPI.HEADERS
    OpenAPI.HEADERS = { ...originalHeaders, ...NO_CACHE_HEADERS }
    
    try {
      // OpenAPIクライアントでファイルをダウンロード
      const response = await DownloadService.downloadFile(requestId)
      
      // レスポンスがBlobかどうか確認
      if (response instanceof Blob) {
        return { blob: response }
      }
      
      // レスポンスが期待通りでない場合は直接fetchを使用
      const token = typeof OpenAPI.TOKEN === 'function' ? await (OpenAPI.TOKEN as Function)() : OpenAPI.TOKEN
      
      const fetchResponse = await fetch(`${API_URL}/api/v1/download/${requestId}/file`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
          ...NO_CACHE_HEADERS,
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })
      
      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text()
        throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`)
      }
      
      const blob = await fetchResponse.blob()
      
      // Content-Dispositionヘッダーからファイル名を抽出
      const contentDisposition = fetchResponse.headers.get('Content-Disposition')
      let filename: string | undefined
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=([^;]+)/)
        if (filenameMatch) {
          const rawFilename = filenameMatch[1].trim()
          if (rawFilename.startsWith("UTF-8''")) {
            filename = decodeURIComponent(rawFilename.slice(7))
          } else {
            filename = rawFilename.replace(/['"]/g, '')
          }
        }
      }
      
      return { blob, filename }
    } finally {
      OpenAPI.HEADERS = originalHeaders
    }
  },

  async getDecryptKey(requestId: string) {
    const originalHeaders = OpenAPI.HEADERS
    OpenAPI.HEADERS = { ...originalHeaders, ...NO_CACHE_HEADERS }
    
    try {
      return await DownloadService.getDecryptKey(requestId)
    } finally {
      OpenAPI.HEADERS = originalHeaders
    }
  },

  // Stats
  async getUserStats() {
    return StatsService.getUserStatsApiV1StatsUserGet()
  },

  // Dashboard
  async getDashboardStats() {
    return DashboardService.getDashboardStatsApiV1DashboardStatsGet()
  },

  async getFileActivities(limit: number = 20) {
    return DashboardService.getFileActivitiesApiV1DashboardFilesGet(limit)
  },

  // Subscription
  async getPlans() {
    return SubscriptionService.getPlansApiV1SubscriptionPlansGet()
  },

  async getCurrentSubscription() {
    return SubscriptionService.getCurrentSubscriptionApiV1SubscriptionSubscriptionGet()
  },

  async getUserUsage() {
    return SubscriptionService.getUserUsageApiV1SubscriptionUsageGet()
  },

  async createCheckoutSession(data: { plan_id: string; success_url: string; cancel_url: string }) {
    return SubscriptionService.createCheckoutSessionApiV1SubscriptionCheckoutPost(data)
  },

  async createCustomerPortalSession(data: { return_url: string }) {
    return SubscriptionService.createCustomerPortalSessionApiV1SubscriptionCustomerPortalPost(data)
  },
}

export default api