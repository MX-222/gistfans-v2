'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

import GistFansLoader from '@/components/GistFansLoader'

function AuthSuccessContent() {
  const searchParams = useSearchParams()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const userParam = searchParams.get('user')
    if (userParam) {
      try {
        const user = JSON.parse(userParam)
        setUserInfo(user)
        setStatus('success')
        
        // 尝试创建NextAuth会话
        console.log('🔄 尝试创建NextAuth会话...')
        // 这里我们可以调用一个API来创建会话
        
      } catch (error) {
        console.error('解析用户信息失败:', error)
        setStatus('error')
      }
    } else {
      setStatus('error')
    }
  }, [searchParams])

  const handleContinue = () => {
    // 重定向到主页面
    window.location.href = '/feed'
  }

  const handleRetry = () => {
    // 重新尝试GitHub登录
    window.location.href = '/auth/signin'
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">处理登录信息...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">登录失败</h3>
            <p className="mt-1 text-sm text-gray-500">
              无法处理GitHub登录信息，请重试。
            </p>
            <div className="mt-6">
              <button
                onClick={handleRetry}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                重新登录
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">登录成功！</h3>
          <p className="mt-1 text-sm text-gray-500">
            欢迎回来，{userInfo?.name || userInfo?.githubLogin}！
          </p>
          
          {userInfo && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                {userInfo.image && (
                  <img 
                    src={userInfo.image} 
                    alt="头像" 
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                  <p className="text-sm text-gray-500">@{userInfo.githubLogin}</p>
                  {userInfo.email && (
                    <p className="text-sm text-gray-500">{userInfo.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <button
              onClick={handleContinue}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              继续使用 GistFans
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<GistFansLoader />}>
      <AuthSuccessContent />
    </Suspense>
  )
}
