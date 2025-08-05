/**
 * GistFansLoader - 轻量级加载动画组件
 *
 * 用途：为应用提供统一的加载状态视觉反馈，提升用户体验
 *
 * 核心功能：
 * - 轻量级CSS动画加载器
 * - 响应式设计适配
 * - 可自定义大小和颜色
 * - 渐进式加载提示文本
 *
 * 系统架构位置：UI组件层，通用加载状态组件
 *
 * 主要依赖：
 * - React - 组件框架
 * - Tailwind CSS - 样式框架
 *
 * 使用示例：
 * ```typescript
 * import { GistFansLoader } from '@/components/GistFansLoader'
 *
 * {loading && <GistFansLoader />}
 * ```
 *
 * 设计特点：
 * - 简洁的圆形旋转动画
 * - 品牌色彩搭配
 * - 流畅的60fps动画
 * - 智能加载提示文本
 *
 * @author GistFans Team
 * @version 1.0
 * @since 2025-08-02
 */

"use client"

import { useEffect, useState } from 'react'

interface GistFansLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
  className?: string
}

export default function GistFansLoader({ 
  text = "Loading...", 
  size = 'md',
  fullScreen = false,
  className = ""
}: GistFansLoaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const sizeClasses = {
    sm: {
      logo: 'text-2xl',
      spinner: 'w-6 h-6',
      container: 'p-4'
    },
    md: {
      logo: 'text-4xl',
      spinner: 'w-8 h-8', 
      container: 'p-6'
    },
    lg: {
      logo: 'text-6xl',
      spinner: 'w-12 h-12',
      container: 'p-8'
    }
  }

  const currentSize = sizeClasses[size]

  const containerClass = fullScreen 
    ? "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
    : `flex items-center justify-center ${currentSize.container} ${className}`

  if (!mounted) {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className={`animate-spin rounded-full border-2 border-gray-600 border-t-blue-500 ${currentSize.spinner} mx-auto mb-2`}></div>
          <div className="text-gray-400 text-sm">{text}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <div className="text-center">
        {/* GistFans Logo with gradient */}
        <div className="mb-4">
          <h1 className={`font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent ${currentSize.logo}`}>
            GistFans
          </h1>
        </div>

        {/* Animated spinner */}
        <div className="relative mb-4">
          <div className={`animate-spin rounded-full border-2 border-gray-700 border-t-blue-500 ${currentSize.spinner} mx-auto`}></div>
          
          {/* Pulsing dots */}
          <div className="flex justify-center space-x-1 mt-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Loading text */}
        <div className="text-gray-400 text-sm font-medium">
          {text}
        </div>
      </div>

      {/* Background particles for full screen */}
      {fullScreen && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-30"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '2s' }}></div>
        </div>
      )}
    </div>
  )
}

// 便捷的全屏加载组件
export function GistFansFullScreenLoader({ text = "Loading..." }: { text?: string }) {
  return <GistFansLoader text={text} size="lg" fullScreen />
}

// 便捷的小型加载组件
export function GistFansSmallLoader({ text = "Loading..." }: { text?: string }) {
  return <GistFansLoader text={text} size="sm" />
}
