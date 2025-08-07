// frontend/lib/api.ts
import { 
  OpenAPI, 
  FilesService, 
  SharesService, 
  RequestsService, 
  DownloadService,
  StatsService,
  DashboardService,
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
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_AUTH0_DOMAIN?: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
console.log('API_URL configured as:', API_URL)
OpenAPI.BASE = API_URL

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
    return RequestsService.getRequestStatus(requestId)
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
    // JWT トークンを取得
    const token = typeof OpenAPI.TOKEN === 'function' ? await (OpenAPI.TOKEN as Function)() : OpenAPI.TOKEN
    
    // 直接fetchを使用してBlobレスポンスを処理（OpenAPIクライアントと同じ設定を使用）
    const response = await fetch(`${OpenAPI.BASE}/api/v1/download/${requestId}/file`, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
        // 認証ヘッダーを追加
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })
    
    if (!response.ok) {
      // OpenAPIクライアントと同様のエラーハンドリング
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const blob = await response.blob()
    
    // Content-Dispositionヘッダーからファイル名を抽出
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename: string | undefined
    
    if (contentDisposition) {
      // RFC 6266に準拠したファイル名の抽出
      const filenameMatch = contentDisposition.match(/filename\*?=([^;]+)/)
      if (filenameMatch) {
        const rawFilename = filenameMatch[1].trim()
        // UTF-8エンコードされた形式（filename*=UTF-8''encoded_name）の処理
        if (rawFilename.startsWith("UTF-8''")) {
          filename = decodeURIComponent(rawFilename.slice(7))
        } else {
          // 通常の形式（filename="name"）の処理
          filename = rawFilename.replace(/['"]/g, '')
        }
      }
    }
    
    return { blob, filename }
  },

  async getDecryptKey(requestId: string) {
    return DownloadService.getDecryptKey(requestId)
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
}

export default api