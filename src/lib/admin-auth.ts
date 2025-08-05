import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 管理员邮箱配置
export const ADMIN_EMAIL = 'cmbdlobefxijuf@gmail.com'

// 管理员权限验证结果接口
export interface AdminAuthResult {
  success: boolean
  method?: 'session' | 'token' | 'development'
  userId?: string
  adminId?: string
  adminEmail?: string
  error?: string
  user?: {
    id: string
    email: string | null
    name: string | null
    role: string
    isVerified: boolean
  }
}

/**
 * 统一的管理员权限验证函数
 * 支持多种验证方式：NextAuth会话、管理员令牌
 */
export async function verifyAdminAccess(request: Request): Promise<AdminAuthResult> {
  try {
    console.log('🔐 开始管理员权限验证...')

    // 方法1: 检查NextAuth会话
    const session = await getServerSession(authOptions)
    if (session?.user?.email === ADMIN_EMAIL) {
      console.log('🔍 检查NextAuth会话...')

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true
        }
      })

      if (user?.role === 'ADMIN' && user?.isVerified) {
        console.log('✅ NextAuth会话验证成功')
        return {
          success: true,
          method: 'session',
          userId: user.id,
          adminId: user.id,
          adminEmail: user.email || undefined,
          user
        }
      } else {
        console.log('❌ 用户角色或验证状态不符合要求', {
          role: user?.role,
          isVerified: user?.isVerified
        })
      }
    }

    // 方法2: 检查管理员令牌
    const adminToken = request.headers.get('authorization') ||
                      request.headers.get('x-admin-token')

    if (adminToken && adminToken.includes('admin-session-')) {
      console.log('🔍 检查管理员令牌...')

      // 验证令牌格式（简单验证）
      const tokenParts = adminToken.replace('Bearer ', '').split('-')
      if (tokenParts.length >= 3 && tokenParts[0] === 'admin' && tokenParts[1] === 'session') {
        // 获取管理员用户信息
        const adminUser = await prisma.user.findUnique({
          where: { email: ADMIN_EMAIL },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isVerified: true
          }
        })

        if (adminUser && adminUser.role === 'ADMIN' && adminUser.isVerified) {
          console.log('✅ 管理员令牌验证成功')
          return {
            success: true,
            method: 'token',
            userId: adminUser.id,
            adminId: adminUser.id,
            adminEmail: adminUser.email || undefined,
            user: adminUser
          }
        }
      }
    }

    // 方法3: 开发模式下的宽松验证（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      const devHeader = request.headers.get('x-dev-admin')
      if (devHeader === 'true') {
        console.log('🚧 开发模式管理员验证')
        
        // 确保管理员用户存在
        let adminUser = await prisma.user.findUnique({
          where: { email: ADMIN_EMAIL }
        })

        if (!adminUser) {
          adminUser = await prisma.user.create({
            data: {
              email: ADMIN_EMAIL,
              name: '开发模式管理员',
              role: 'ADMIN',
              isVerified: true,
              emailVerified: new Date()
            }
          })
          console.log('🆕 创建开发模式管理员账户')
        }

        return {
          success: true,
          method: 'development',
          userId: adminUser.id,
          adminId: adminUser.id, // 添加adminId字段
          adminEmail: adminUser.email || ADMIN_EMAIL,
          user: {
            id: adminUser.id,
            email: adminUser.email || ADMIN_EMAIL,
            name: adminUser.name,
            role: adminUser.role,
            isVerified: adminUser.isVerified
          }
        }
      }
    }

    console.log('❌ 所有验证方法都失败')
    return { success: false, error: '权限不足：需要管理员权限' }

  } catch (error) {
    console.error('❌ 管理员权限验证过程出错:', error)
    return { success: false, error: '验证过程出错' }
  }
}

/**
 * 客户端管理员权限检查
 */
export function isAdminUser(session: any): boolean {
  return session?.user?.email === ADMIN_EMAIL && session?.user?.role === 'ADMIN'
}

/**
 * 记录管理员操作日志
 */
export async function logAdminAction(data: {
  userId: string
  action: string
  target?: string
  targetType?: string
  targetId?: string
  details?: any
  ip?: string
  userAgent?: string
}) {
  try {
    console.log('📝 记录管理员操作:', {
      userId: data.userId,
      action: data.action,
      target: data.target,
      timestamp: new Date().toISOString(),
      ip: data.ip,
      userAgent: data.userAgent?.substring(0, 100) // 限制长度
    })

    // TODO: 实现管理员操作日志存储
    // 可以存储到数据库或日志文件
    
  } catch (error) {
    console.error('❌ 记录管理员操作日志失败:', error)
  }
}

/**
 * 生成管理员令牌
 */
export function generateAdminToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `admin-session-${timestamp}-${random}`
}

/**
 * 验证管理员令牌格式
 */
export function validateAdminTokenFormat(token: string): boolean {
  if (!token || !token.includes('admin-session-')) {
    return false
  }
  
  const tokenParts = token.replace('Bearer ', '').split('-')
  return tokenParts.length >= 3 && tokenParts[0] === 'admin' && tokenParts[1] === 'session'
}
