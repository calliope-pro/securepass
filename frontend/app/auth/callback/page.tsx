'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@/contexts/Auth0Context'

export default function Auth0Callback() {
  const router = useRouter()
  const { isLoading, isAuthenticated, user } = useAuth0()
  const [processingComplete, setProcessingComplete] = useState(false)

  useEffect(() => {
    // Auth0の初期化とコールバック処理を待つ
    if (!isLoading) {
      if (isAuthenticated && user) {
        console.log('Authentication successful, redirecting to home...')
        setProcessingComplete(true)
        setTimeout(() => {
          router.push('/')
        }, 1000)
      } else {
        console.log('Authentication failed, redirecting to home...')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600">
          {processingComplete ? 'ログイン完了！' : '認証処理中...'}
        </p>
        <p className="text-sm text-gray-500">
          {processingComplete ? 'ホームページに移動します' : '少々お待ちください'}
        </p>
        {isAuthenticated && user && (
          <p className="text-sm text-green-600">
            ようこそ、{user.name || user.email}さん！
          </p>
        )}
      </div>
    </div>
  )
}