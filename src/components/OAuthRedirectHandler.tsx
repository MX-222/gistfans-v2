"use client"

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * OAuth重定向处理器 - 简化版本
 *
 * 用途：处理OAuth认证成功后的重定向逻辑
 *
 * 核心功能：
 * - 检测OAuth认证成功状态
 * - 自动重定向到Feed页面
 * - 清理URL参数
 *
 * @author GistFans Team
 * @version 2.0 - 简化版本，移除复杂逻辑
 * @since 2025-08-02
 */
export default function OAuthRedirectHandler() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // 🔧 基于历史经验的OAuth重定向处理 v3.0
    // 参考：2025-07-31和2025-08-01的成功修复经验
    const handleOAuthRedirect = () => {
      if (typeof window === 'undefined') return

      const currentPath = window.location.pathname
      const urlParams = new URLSearchParams(window.location.search)
      const hasOAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('oauth_success')

      console.log('🔍 OAuth重定向检查 v3.0:', {
        sessionStatus: status,
        hasSession: !!session,
        currentPath,
        hasOAuthParams,
        urlParams: Object.fromEntries(urlParams.entries())
      })

      // 🔧 历史经验：强化OAuth成功后的重定向逻辑
      if (status === 'authenticated' && session) {
        const shouldRedirectToFeed =
          currentPath === '/auth/signin' ||
          currentPath === '/auth/register' ||
          currentPath === '/' ||
          currentPath.includes('/auth/callback') ||
          currentPath.includes('/api/auth/callback') ||
          hasOAuthParams ||
          urlParams.has('oauth_success')

        if (shouldRedirectToFeed && currentPath !== '/feed') {
          console.log('🎯 OAuth成功检测到，执行强制重定向到Feed页面')

          // 🔧 历史经验：使用sessionStorage标记OAuth成功状态
          sessionStorage.setItem('oauth_redirect_success', 'true')
          sessionStorage.setItem('oauth_redirect_timestamp', Date.now().toString())

          // 🔧 历史经验：延迟重定向确保session状态完全更新
          setTimeout(() => {
            console.log('🚀 执行延迟重定向到Feed页面')
            router.replace('/feed')
          }, 100)

          return
        }
      }

      // 🔧 历史经验：处理OAuth失败或中断的情况
      if (status === 'unauthenticated') {
        // 如果在回调页面但认证失败，重定向到登录页面
        if (currentPath.includes('/auth/callback') || currentPath.includes('/api/auth/callback')) {
          console.log('⚠️ OAuth认证失败，重定向到登录页面')
          router.push('/auth/signin?error=oauth_failed')
          return
        }

        // 如果有OAuth参数但未认证，可能是认证过程中断
        if (hasOAuthParams && currentPath !== '/auth/signin') {
          console.log('⚠️ OAuth过程中断，重定向到登录页面')
          router.push('/auth/signin?error=oauth_interrupted')
          return
        }
      }

      // 🔧 历史经验：URL清理机制
      if (status === 'authenticated' && hasOAuthParams && currentPath === '/feed') {
        console.log('🧹 清理OAuth URL参数')
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
    }

    // 🔧 历史经验：多重检查机制
    if (status !== 'loading') {
      handleOAuthRedirect()

      // 额外的延迟检查，确保处理所有边缘情况
      const delayedCheck = setTimeout(() => {
        handleOAuthRedirect()
      }, 500)

      return () => clearTimeout(delayedCheck)
    }
  }, [status, session, router])

  // 这个组件不渲染任何内容，只处理重定向逻辑
  return null
}
