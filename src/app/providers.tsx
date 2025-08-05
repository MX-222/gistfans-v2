"use client"

import { SessionProvider } from "next-auth/react"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { PostProvider } from "@/contexts/PostContext"
import { StarProvider } from "@/contexts/StarContext"
import { CommentProvider } from "@/contexts/CommentContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        refetchInterval={10 * 60} // 优化：每10分钟刷新一次session，减少频繁请求
        refetchOnWindowFocus={false} // 优化：窗口聚焦时不自动刷新，减少不必要的请求
        refetchWhenOffline={false} // 优化：离线时不刷新
        basePath="/api/auth"
      >
        <LanguageProvider>
              <StarProvider>
                <PostProvider>
                  <CommentProvider>
                  {/* 🎯 暂时移除OAuthRedirectHandler，让NextAuth自己处理重定向 */}
                  {children}
                  </CommentProvider>
                </PostProvider>
              </StarProvider>
        </LanguageProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}