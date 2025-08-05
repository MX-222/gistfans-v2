/**
 * NextAuth 认证配置 - 统一认证管理中心
 *
 * 用途：配置和管理用户认证流程，包括Email+Password认证、会话管理和数据库适配
 *
 * 核心功能：
 * - Email+Password认证集成
 * - 自动用户注册功能
 * - 用户会话管理和持久化
 * - 认证回调和事件处理
 * - 数据库策略配置
 * - 简化的认证流程
 *
 * 系统架构位置：认证层核心组件，连接前端认证状态和后端用户数据
 *
 * 主要依赖：
 * - NextAuth.js - 认证框架
 * - Credentials Provider - Email+Password认证提供商
 * - bcryptjs - 密码加密
 *
 * 使用示例：
 * ```typescript
 * import { authOptions } from '@/lib/auth'
 * import { getServerSession } from 'next-auth'
 *
 * const session = await getServerSession(authOptions)
 * ```
 *
 * @author GistFans Team
 * @version 2.0
 * @since 2025-08-04
 */

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/database/unified-prisma"

// 管理员配置
const ADMIN_EMAIL = 'cmbdlobefxijuf@gmail.com'



export const authOptions: NextAuthOptions = {
  debug: false, // 关闭调试模式，使用简单可靠的配置
  // 使用JWT策略，不需要adapter
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // 查找用户
          let user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            // 用户不存在，自动注册
            console.log('用户不存在，自动注册:', credentials.email)
            const hashedPassword = await bcrypt.hash(credentials.password, 12)

            user = await prisma.user.create({
              data: {
                email: credentials.email,
                password: hashedPassword,
                name: credentials.email.split('@')[0], // 使用邮箱前缀作为默认用户名
                isVerified: true,
                onboardingComplete: true,
                role: 'USER',
                userType: 'USER'
              } as any
            })

            console.log('自动注册成功:', user.email)
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            }
          }

          // 用户存在，验证密码
          const userWithPassword = user as any
          if (!userWithPassword.password) {
            // 如果用户没有密码（可能是OAuth用户），为其设置密码
            const hashedPassword = await bcrypt.hash(credentials.password, 12)
            await prisma.user.update({
              where: { id: user.id },
              data: { password: hashedPassword } as any
            })
            console.log('为现有用户设置密码:', user.email)
          } else {
            // 验证密码
            const isPasswordValid = await bcrypt.compare(credentials.password, userWithPassword.password)
            if (!isPasswordValid) {
              console.log('密码验证失败:', credentials.email)
              return null
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error('认证错误:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // 简单的重定向逻辑：登录成功后重定向到feed页面
      if (url.startsWith('/') && !url.startsWith('//')) {
        return baseUrl + url
      }
      return baseUrl + '/feed'
    },
    async jwt({ token, user }) {
      // JWT策略：在token中存储用户信息
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
        token.isVerified = true
        token.role = "USER"
        token.userType = 'USER'
        token.onboardingComplete = true
      }
      return token
    },
    async session({ session, token }) {
      // JWT策略：从token构建session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.image as string
        session.user.isVerified = token.isVerified as boolean
        session.user.role = token.role as string
        session.user.userType = token.userType as string
        session.user.onboardingComplete = token.onboardingComplete as boolean
      }
      return session
    },
    // 数据库策略不需要JWT回调
    async signIn({ user, account }) {
      console.log('🔑 SignIn callback:', {
        provider: account?.provider,
        email: user.email
      })

      // 如果没有account信息，说明是session刷新，允许
      if (!account) {
        return true
      }

      try {
        // Credentials provider登录处理
        if (account.provider === 'credentials') {
          console.log('✅ Email+Password登录成功:', user.email)
          return true
        }

        // 管理员邮箱特殊处理
        if (account.provider === 'email' && user.email === ADMIN_EMAIL) {
          console.log('👑 管理员邮箱登录')
          return true
        }

        // 默认允许登录
        return true

      } catch (error) {
        console.error('❌ SignIn callback error:', error)
        return true
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    // 🎯 移除newUser配置，避免干扰重定向
    // newUser: "/feed",
  },
  session: {
    strategy: "jwt", // 使用JWT策略，支持Credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30天
    updateAge: 24 * 60 * 60, // 24小时更新一次
  },
  // 调试模式配置已在顶部设置
  logger: {
    error(code, metadata) {
      console.error('🚨 NextAuth Error:', code, metadata)
      
      // 特殊处理客户端错误
      if (typeof metadata === 'object' && metadata !== null && 'error' in metadata) {
        const errorObj = metadata as { error: any }
        if (errorObj.error && errorObj.error.toString().includes('fetch')) {
          console.error('🌐 网络连接问题，请检查服务器状态')
        }
      }
    },
    warn(code) {
      console.warn('⚠️  NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 NextAuth Debug:', code, metadata)
      }
    }
  },
  // 🔧 修复：优化cookie配置，确保在Vercel生产环境正确工作
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // 🔧 修复：在生产环境中不设置domain，让浏览器自动处理
        ...(process.env.NODE_ENV === 'development' && { domain: 'localhost' }),
        maxAge: 30 * 24 * 60 * 60 // 30天
      }
    },
    // 🔧 添加：确保所有必要的cookie都正确配置
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 // 24小时
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 // 24小时
      }
    }
  },
  events: {
      async signIn({ user, account, isNewUser }) {
        console.log('📊 用户登录事件:', {
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          isNewUser,
          timestamp: new Date().toISOString()
        })

        // 触发每日登录奖励
        if (user.id && account?.provider) {
          try {
            const { starService } = await import('@/lib/starService')
            const starResult = await starService.handleDailyLogin(user.id)
            if (starResult.success) {
              console.log(`⭐ 登录Star奖励成功:`, {
                userId: user.id,
                earned: starResult.earned,
                message: starResult.message
              })
            } else {
              console.log(`ℹ️ 登录Star奖励跳过:`, {
                userId: user.id,
                message: starResult.message
              })
            }
          } catch (starError) {
            console.warn('⚠️ 登录Star奖励失败:', starError)
            // 不影响登录主流程
          }
        }
      },
    async signOut({ session }) {
      console.log('📤 用户登出事件:', {
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// 移除直接管理员登录功能，只保留安全的隐藏页面+邮箱+安全码方式

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isVerified?: boolean
      role?: string
      githubLogin?: string | null
      userType?: string | null
      onboardingComplete?: boolean
    }
  }
}

 