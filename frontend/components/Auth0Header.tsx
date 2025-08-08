// frontend/components/Auth0Header.tsx
'use client'

import Link from 'next/link'
import { Shield, Zap, Lock, User, LogOut, FileText, BarChart3, Crown } from 'lucide-react'
import { useAuth0 } from '@/contexts/Auth0Context'
import { useState } from 'react'

export function Auth0Header() {
  const { user, signOut, signUp, signIn, isLoading, isAuthenticated } = useAuth0()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-2xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold gradient-text">SecurePass</span>
              <span className="text-xs text-gray-500 -mt-1">Ultra-Secure File Sharing</span>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-8">
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className="group flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-200"
              >
                <Zap className="h-4 w-4 text-blue-500 group-hover:text-blue-600" />
                <span className="font-medium text-gray-700 group-hover:text-gray-900">アップロード</span>
              </Link>
              <Link 
                href="/about" 
                className="group flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-200"
              >
                <Lock className="h-4 w-4 text-purple-500 group-hover:text-purple-600" />
                <span className="font-medium text-gray-700 group-hover:text-gray-900">使い方</span>
              </Link>
              <Link 
                href="/pricing" 
                className="group flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-200"
              >
                <Crown className="h-4 w-4 text-yellow-500 group-hover:text-yellow-600" />
                <span className="font-medium text-gray-700 group-hover:text-gray-900">料金</span>
              </Link>
            </div>

            {/* Authentication / User Menu */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    {user.picture ? (
                      <img 
                        src={user.picture} 
                        alt={user.name || 'User'} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name || 'ユーザー'}
                    </p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-lg modern-shadow">
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>ダッシュボード</span>
                      </Link>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>アカウント情報</span>
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={() => {
                          signOut()
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>ログアウト</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={signIn}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-white/50 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  ログイン
                </button>
                <button
                  onClick={signUp}
                  disabled={isLoading}
                  className="inline-flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  <span>今すぐ開始</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-xl hover:bg-white/50 transition-colors"
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <div className={`w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded transition-transform ${showMobileMenu ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                  <div className={`w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded transition-opacity ${showMobileMenu ? 'opacity-0' : ''}`}></div>
                  <div className={`w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded transition-transform ${showMobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
              </button>
            </div>
          </nav>
        </div>
        
        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/20">
            <div className="px-4 pt-4 space-y-2">
              <Link 
                href="/" 
                className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/50 transition-all duration-200"
                onClick={() => setShowMobileMenu(false)}
              >
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-700">アップロード</span>
              </Link>
              <Link 
                href="/about" 
                className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/50 transition-all duration-200"
                onClick={() => setShowMobileMenu(false)}
              >
                <Lock className="h-5 w-5 text-purple-500" />
                <span className="font-medium text-gray-700">使い方</span>
              </Link>
              <Link 
                href="/pricing" 
                className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/50 transition-all duration-200"
                onClick={() => setShowMobileMenu(false)}
              >
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-700">料金</span>
              </Link>
              
              {isAuthenticated && user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/50 transition-all duration-200"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-gray-700">ダッシュボード</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/50 transition-all duration-200"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <User className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-gray-700">アカウント情報</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut()
                      setShowMobileMenu(false)
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-red-50 transition-all duration-200 text-left"
                  >
                    <LogOut className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-600">ログアウト</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      signIn()
                      setShowMobileMenu(false)
                    }}
                    disabled={isLoading}
                    className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-white/50 transition-all duration-200 text-left disabled:opacity-50"
                  >
                    <User className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-700">ログイン</span>
                  </button>
                  <button
                    onClick={() => {
                      signUp()
                      setShowMobileMenu(false)
                    }}
                    disabled={isLoading}
                    className="flex items-center space-x-3 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                    <span>今すぐ開始</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-4 right-20 w-1 h-1 bg-purple-400 rounded-full opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-2 right-40 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-25 animate-pulse delay-500"></div>
      </div>

    </header>
  )
}