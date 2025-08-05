"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * OAuth重定向测试页面 v3.0
 * 基于历史经验的OAuth重定向问题诊断和测试工具
 * 
 * 参考：
 * - 2025-07-31 GitHub OAuth重定向问题修复
 * - 2025-08-01 GitHub OAuth重定向问题修复 v2.0
 */
export default function TestOAuthRedirectV3() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<any>({})

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    setLogs(prev => [...prev, logEntry])
    console.log(logEntry)
  }

  useEffect(() => {
    addLog('🔍 OAuth重定向测试页面 v3.0 初始化')
    addLog(`Session状态: ${status}`)
    addLog(`当前路径: ${window.location.pathname}`)
    addLog(`URL参数: ${window.location.search}`)
    
    // 检查sessionStorage中的OAuth标记
    const oauthSuccess = sessionStorage.getItem('oauth_redirect_success')
    const oauthTimestamp = sessionStorage.getItem('oauth_redirect_timestamp')
    
    if (oauthSuccess) {
      addLog(`✅ 发现OAuth成功标记，时间戳: ${oauthTimestamp}`)
    }
  }, [status])

  const runOAuthTests = async () => {
    addLog('🧪 开始运行OAuth重定向测试...')
    
    const results: any = {
      timestamp: new Date().toISOString(),
      sessionStatus: status,
      hasSession: !!session,
      currentUrl: window.location.href,
      tests: {}
    }

    // 测试1: NextAuth配置检查
    try {
      addLog('🔍 测试1: 检查NextAuth配置...')
      const response = await fetch('/api/debug-oauth')
      const data = await response.json()
      results.tests.nextAuthConfig = {
        status: response.status,
        data: data
      }
      addLog(`✅ NextAuth配置检查完成: ${response.status}`)
    } catch (error) {
      addLog(`❌ NextAuth配置检查失败: ${error}`)
      results.tests.nextAuthConfig = { error: error }
    }

    // 测试2: Session API检查
    try {
      addLog('🔍 测试2: 检查Session API...')
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      results.tests.sessionApi = {
        status: response.status,
        data: data
      }
      addLog(`✅ Session API检查完成: ${response.status}`)
    } catch (error) {
      addLog(`❌ Session API检查失败: ${error}`)
      results.tests.sessionApi = { error: error }
    }

    // 测试3: Providers API检查
    try {
      addLog('🔍 测试3: 检查Providers API...')
      const response = await fetch('/api/auth/providers')
      const data = await response.json()
      results.tests.providersApi = {
        status: response.status,
        data: data
      }
      addLog(`✅ Providers API检查完成: ${response.status}`)
    } catch (error) {
      addLog(`❌ Providers API检查失败: ${error}`)
      results.tests.providersApi = { error: error }
    }

    setTestResults(results)
    addLog('🎯 OAuth重定向测试完成')
  }

  const testRedirectLogic = () => {
    addLog('🔄 测试重定向逻辑...')
    
    // 模拟OAuth成功后的重定向
    sessionStorage.setItem('oauth_redirect_success', 'true')
    sessionStorage.setItem('oauth_redirect_timestamp', Date.now().toString())
    
    addLog('✅ 设置OAuth成功标记')
    addLog('🚀 3秒后重定向到Feed页面...')
    
    setTimeout(() => {
      router.push('/feed')
    }, 3000)
  }

  const clearOAuthMarkers = () => {
    sessionStorage.removeItem('oauth_redirect_success')
    sessionStorage.removeItem('oauth_redirect_timestamp')
    addLog('🧹 已清理OAuth标记')
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth重定向测试 v3.0</h1>
        
        {/* 状态信息 */}
        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">当前状态</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Session状态:</strong> {status}</p>
              <p><strong>用户已登录:</strong> {session ? '是' : '否'}</p>
              <p><strong>用户邮箱:</strong> {session?.user?.email || '未登录'}</p>
            </div>
            <div>
              <p><strong>当前路径:</strong> {typeof window !== 'undefined' ? window.location.pathname : '加载中...'}</p>
              <p><strong>URL参数:</strong> {typeof window !== 'undefined' ? window.location.search || '无' : '加载中...'}</p>
            </div>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={runOAuthTests}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            运行OAuth测试
          </button>
          <button
            onClick={testRedirectLogic}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg"
          >
            测试重定向逻辑
          </button>
          <button
            onClick={clearOAuthMarkers}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg"
          >
            清理OAuth标记
          </button>
        </div>

        {/* 测试结果 */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-gray-900 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* 日志输出 */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">测试日志</h2>
          <div className="bg-black p-4 rounded text-sm font-mono max-h-96 overflow-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* 历史经验参考 */}
        <div className="bg-gray-900 p-6 rounded-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">历史经验参考</h2>
          <div className="text-sm space-y-2">
            <p><strong>2025-07-31修复:</strong> NEXTAUTH_URL配置错误，redirect回调逻辑错误</p>
            <p><strong>2025-08-01修复:</strong> 移除错误的GitHub回调检查，增强重定向机制</p>
            <p><strong>当前v3.0修复:</strong> 强化OAuth成功检测，多重重定向机制，延迟处理</p>
          </div>
        </div>
      </div>
    </div>
  )
}
