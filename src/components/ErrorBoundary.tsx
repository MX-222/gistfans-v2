"use client"

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // 如果是 NextAuth 相关错误，尝试刷新页面
    if (error.message.includes('CLIENT_FETCH_ERROR') || 
        error.message.includes('session') ||
        error.message.includes('Failed to fetch')) {
      console.log('检测到 NextAuth session 错误，尝试恢复...')
      
      // 延迟刷新，给用户一个提示
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 max-w-md w-full backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">
                应用遇到了问题
              </h2>
              <p className="text-gray-300 mb-4">
                正在尝试自动恢复...页面将在几秒钟后刷新
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  立即刷新
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  返回首页
                </button>
              </div>
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-sm text-gray-400 cursor-pointer">
                    技术详情
                  </summary>
                  <pre className="text-xs text-red-400 mt-2 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 