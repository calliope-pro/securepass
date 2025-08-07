'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Auth0Client, createAuth0Client, User as Auth0User } from '@auth0/auth0-spa-js'
import toast from 'react-hot-toast'
import { OpenAPI } from '@/lib/api/generated'

interface Auth0ContextType {
  auth0Client: Auth0Client | null
  user: Auth0User | null
  isLoading: boolean
  isAuthenticated: boolean
  signUp: () => Promise<void>
  signIn: () => Promise<void>
  signInWithProvider: (provider: 'github' | 'google') => Promise<void>
  signOut: () => Promise<void>
  linkAccount: () => Promise<void>
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined)

export const useAuth0 = () => {
  const context = useContext(Auth0Context)
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider')
  }
  return context
}

interface Auth0ProviderProps {
  children: React.ReactNode
}

export const Auth0Provider: React.FC<Auth0ProviderProps> = ({ children }) => {
  const [auth0Client, setAuth0Client] = useState<Auth0Client | null>(null)
  const [user, setUser] = useState<Auth0User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Auth0設定
  const auth0Config = {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
    authorizationParams: {
      redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
      scope: 'openid profile email',
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE!
    },
    useRefreshTokens: true,
    cacheLocation: 'localstorage' as const
  }

  // デバッグ用：環境変数の確認
  console.log('Auth0 Environment Variables:', {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    hasValues: !!(process.env.NEXT_PUBLIC_AUTH0_DOMAIN && process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID)
  })

  useEffect(() => {
    const initAuth0 = async () => {
      console.log('Initializing Auth0 with config:', auth0Config)
      try {
        const auth0Instance = await createAuth0Client(auth0Config)
        console.log('Auth0 client created successfully')
        setAuth0Client(auth0Instance)

        // URLにcodeパラメータがある場合はコールバック処理
        if (window.location.search.includes('code=')) {
          try {
            await auth0Instance.handleRedirectCallback()
            // URLをクリーンにする
            window.history.replaceState({}, document.title, window.location.pathname)
            toast.success('ログインしました')
          } catch (error) {
            console.error('Auth0 callback error:', error)
            toast.error('認証に失敗しました')
          }
        }

        // OpenAPI設定
        OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        
        // 認証状態をチェック
        const isAuth = await auth0Instance.isAuthenticated()
        console.log('Auth0 authentication status:', isAuth)
        setIsAuthenticated(isAuth)

        if (isAuth) {
          const userData = await auth0Instance.getUser()
          console.log('Auth0 user data:', userData)
          setUser(userData || null)
          
          // OpenAPIクライアントにAuth0トークンを設定
          try {
            const token = await auth0Instance.getTokenSilently()
            OpenAPI.TOKEN = token
            console.log('Auth0 token set for OpenAPI client')
          } catch (error) {
            console.error('Failed to get Auth0 token:', error)
          }
        } else {
          setUser(null)
          // トークンをクリア
          OpenAPI.TOKEN = undefined
        }
      } catch (error) {
        console.error('Auth0 initialization error:', error)
        toast.error('認証システムの初期化に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth0()
  }, [])

  const signUp = async () => {
    console.log('signUp called, auth0Client:', !!auth0Client)
    if (!auth0Client) {
      console.error('Auth0 client not initialized')
      toast.error('認証システムが初期化されていません')
      return
    }
    
    try {
      console.log('Starting Auth0 signup redirect...')
      await auth0Client.loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
          prompt: 'consent'
        }
      })
    } catch (error) {
      console.error('Sign up error:', error)
      toast.error('サインアップに失敗しました')
    }
  }

  const signIn = async () => {
    console.log('signIn called, auth0Client:', !!auth0Client)
    if (!auth0Client) {
      console.error('Auth0 client not initialized')
      toast.error('認証システムが初期化されていません')
      return
    }
    
    try {
      console.log('Starting Auth0 redirect...')
      await auth0Client.loginWithRedirect({
        authorizationParams: {
          screen_hint: 'login'
        }
      })
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('サインインに失敗しました')
    }
  }

  const signInWithProvider = async (provider: 'github' | 'google') => {
    if (!auth0Client) return
    
    try {
      await auth0Client.loginWithRedirect({
        authorizationParams: {
          connection: provider
        }
      })
    } catch (error) {
      console.error(`${provider} sign in error:`, error)
      toast.error(`${provider}サインインに失敗しました`)
    }
  }

  const signOut = async () => {
    if (!auth0Client) return
    
    try {
      await auth0Client.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      })
      setUser(null)
      setIsAuthenticated(false)
      OpenAPI.TOKEN = undefined
      toast.success('ログアウトしました')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('ログアウトに失敗しました')
    }
  }

  const linkAccount = async () => {
    if (!auth0Client || !isAuthenticated) return
    
    try {
      // アカウント連携のためのログインリダイレクト
      await auth0Client.loginWithRedirect({
        authorizationParams: {
          prompt: 'login',
          // Auth0のAccount Link Extension用のパラメータ
          login_hint: user?.email
        }
      })
    } catch (error) {
      console.error('Account linking error:', error)
      toast.error('アカウント連携に失敗しました')
    }
  }

  const value = {
    auth0Client,
    user,
    isLoading,
    isAuthenticated,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    linkAccount
  }

  return (
    <Auth0Context.Provider value={value}>
      {children}
    </Auth0Context.Provider>
  )
}