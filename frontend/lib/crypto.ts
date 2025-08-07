// frontend/lib/crypto.ts
export interface EncryptionResult {
  encryptedData: ArrayBuffer
  key: CryptoKey
  keyString: string
  iv: Uint8Array
}

export class SecurePassCrypto {
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  /**
   * Web Crypto APIが利用可能かチェック（公開メソッド）
   */
  isSupported(): boolean {
    return this.isWebCryptoSupported()
  }

  /**
   * Web Crypto APIが利用可能かチェック
   */
  private isWebCryptoSupported(): boolean {
    if (typeof window === 'undefined') {
      // サーバーサイドでは利用不可
      return false
    }
    
    if (!window.crypto || !window.crypto.subtle) {
      // Web Crypto API未対応
      return false
    }
    
    // セキュアコンテキストチェック（HTTPS or localhost）
    if (!window.isSecureContext) {
      return false
    }
    
    return true
  }

  /**
   * Web Crypto APIの利用可能性をチェックし、エラーを投げる
   */
  private ensureWebCryptoSupport(): void {
    if (!this.isWebCryptoSupported()) {
      throw new Error(
        'Web Crypto APIが利用できません。HTTPS接続またはlocalhost環境で実行してください。'
      )
    }
  }

  /**
   * ファイルを暗号化
   */
  async encryptFile(file: File): Promise<EncryptionResult> {
    this.ensureWebCryptoSupport()
    
    // 暗号化キーを生成
    const key = await this.generateKey()
    
    // 初期化ベクトルを生成
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    
    // ファイルをArrayBufferとして読み込み
    const fileBuffer = await file.arrayBuffer()
    
    // AES-GCMで暗号化
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      fileBuffer
    )
    
    // キーをエクスポート
    const keyString = await this.exportKey(key)
    
    // IVを暗号化データの先頭に付加
    const combined = new ArrayBuffer(iv.length + encryptedData.byteLength)
    const combinedView = new Uint8Array(combined)
    combinedView.set(iv, 0)
    combinedView.set(new Uint8Array(encryptedData), iv.length)
    
    return {
      encryptedData: combined,
      key,
      keyString,
      iv,
    }
  }

  /**
   * データを復号化
   */
  async decryptData(
    encryptedData: ArrayBuffer,
    keyString: string
  ): Promise<ArrayBuffer> {
    this.ensureWebCryptoSupport()
    
    // キーをインポート
    const key = await this.importKey(keyString)
    
    // IVと暗号化データを分離
    const dataView = new Uint8Array(encryptedData)
    const iv = dataView.slice(0, 12)
    const ciphertext = dataView.slice(12)
    
    // 復号化
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    )
    
    return decryptedData
  }

  /**
   * 暗号化キーを生成
   */
  private async generateKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * キーをBase64文字列としてエクスポート
   */
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  /**
   * Base64文字列からキーをインポート
   */
  private async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0))
    return window.crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * ArrayBufferをBase64に変換
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Base64をArrayBufferに変換
   */
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

export const crypto = new SecurePassCrypto()