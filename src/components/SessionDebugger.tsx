"use client"

import { useSession } from 'next-auth/react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useEffect, useState } from 'react'

interface SessionDebugInfo {
  nextAuthSession: any
  currentUser: any
  apiTestResults: {
    starBalance: { status: number, data: any }
    userProfile: { status: number, data: any }
    userStats: { status: number, data: any }
  }
}

export default function SessionDebugger() {
  const { data: session, status } = useSession()
  const { user: currentUser, isLoading } = useCurrentUser()
  const [debugInfo, setDebugInfo] = useState<SessionDebugInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const runDebugTests = async () => {
    if (!session?.user?.id) {
      console.log('❌ 无法运行调试测试：用户未登录')
      return
    }

    console.log('🔍 开始Session调试测试...')

    const apiTests = {
      starBalance: { status: 0, data: {} as any },
      userProfile: { status: 0, data: {} as any },
      userStats: { status: 0, data: {} as any }
    }

    // 测试Star余额API
    try {
      const response = await fetch('/api/stars/balance', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      apiTests.starBalance.status = response.status
      apiTests.starBalance.data = await response.json()
    } catch (error) {
      apiTests.starBalance.data = { error: (error as Error).message }
    }

    // 测试用户资料API
    try {
      const response = await fetch(`/api/user/profile/${session.user.id}`)
      apiTests.userProfile.status = response.status
      apiTests.userProfile.data = await response.json()
    } catch (error) {
      apiTests.userProfile.data = { error: (error as Error).message }
    }

    // 测试用户统计API
    try {
      const response = await fetch(`/api/user/stats?userId=${session.user.id}`)
      apiTests.userStats.status = response.status
      apiTests.userStats.data = await response.json()
    } catch (error) {
      apiTests.userStats.data = { error: (error as Error).message }
    }

    const debugData: SessionDebugInfo = {
      nextAuthSession: {
        status,
        user: session?.user,
        expires: session?.expires
      },
      currentUser: {
        user: currentUser,
        isLoading
      },
      apiTestResults: apiTests
    }

    setDebugInfo(debugData)
    console.log('📊 Session调试信息:', debugData)
  }

  useEffect(() => {
    if (session?.user?.id && !isLoading) {
      runDebugTests()
    }
  }, [session?.user?.id, isLoading])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 rounded text-xs z-50"
      >
        🐛 Session调试
      </button>
    )
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-50 overflow-auto">
      <div className="bg-white p-6 m-4 rounded">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Session调试信息</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-gray-500 text-white px-3 py-1 rounded"
          >
            关闭
          </button>
        </div>

        {debugInfo ? (
          <div className="space-y-4">
            {/* NextAuth Session */}
            <div>
              <h3 className="font-semibold text-green-600">NextAuth Session</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(debugInfo.nextAuthSession, null, 2)}
              </pre>
            </div>

            {/* Current User Hook */}
            <div>
              <h3 className="font-semibold text-blue-600">useCurrentUser Hook</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(debugInfo.currentUser, null, 2)}
              </pre>
            </div>

            {/* API测试结果 */}
            <div>
              <h3 className="font-semibold text-purple-600">API测试结果</h3>
              
              {/* Star余额API */}
              <div className="mb-2">
                <h4 className="font-medium">Star余额API (/api/stars/balance)</h4>
                <div className={`text-sm ${debugInfo.apiTestResults.starBalance.status === 200 ? 'text-green-600' : 'text-red-600'}`}>
                  状态: {debugInfo.apiTestResults.starBalance.status}
                </div>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(debugInfo.apiTestResults.starBalance.data, null, 2)}
                </pre>
              </div>

              {/* 用户资料API */}
              <div className="mb-2">
                <h4 className="font-medium">用户资料API (/api/user/profile/[id])</h4>
                <div className={`text-sm ${debugInfo.apiTestResults.userProfile.status === 200 ? 'text-green-600' : 'text-red-600'}`}>
                  状态: {debugInfo.apiTestResults.userProfile.status}
                </div>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(debugInfo.apiTestResults.userProfile.data, null, 2)}
                </pre>
              </div>

              {/* 用户统计API */}
              <div className="mb-2">
                <h4 className="font-medium">用户统计API (/api/user/stats)</h4>
                <div className={`text-sm ${debugInfo.apiTestResults.userStats.status === 200 ? 'text-green-600' : 'text-red-600'}`}>
                  状态: {debugInfo.apiTestResults.userStats.status}
                </div>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(debugInfo.apiTestResults.userStats.data, null, 2)}
                </pre>
              </div>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={runDebugTests}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              🔄 重新测试
            </button>
          </div>
        ) : (
          <div>加载调试信息中...</div>
        )}
      </div>
    </div>
  )
}
