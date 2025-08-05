import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 管理员会话验证API
export async function GET(request: Request) {
  try {
    console.log('🔍 检查管理员会话状态...')

    // 方法1: 检查NextAuth会话
    const session = await getServerSession(authOptions)
    if (session?.user?.email === 'cmbdlobefxijuf@gmail.com') {
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
        console.log('✅ NextAuth管理员会话有效')
        return NextResponse.json({
          success: true,
          method: 'nextauth',
          user,
          isAdmin: true
        })
      }
    }

    // 方法2: 检查管理员令牌
    const adminToken = request.headers.get('authorization') || 
                      request.headers.get('x-admin-token')
    
    if (adminToken && adminToken.includes('admin-session-')) {
      console.log('🔍 验证管理员令牌...')
      
      // 验证令牌格式
      const tokenParts = adminToken.replace('Bearer ', '').split('-')
      if (tokenParts.length >= 3 && tokenParts[0] === 'admin' && tokenParts[1] === 'session') {
        // 检查令牌是否在数据库中有效
        const account = await prisma.account.findFirst({
          where: {
            provider: 'admin-secure',
            access_token: adminToken.replace('Bearer ', ''),
            expires_at: {
              gt: Math.floor(Date.now() / 1000)
            }
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isVerified: true
              }
            }
          }
        })
        
        if (account && account.user.role === 'ADMIN' && account.user.isVerified) {
          console.log('✅ 管理员令牌验证成功')
          return NextResponse.json({
            success: true,
            method: 'token',
            user: account.user,
            isAdmin: true
          })
        }
      }
    }

    console.log('❌ 管理员会话验证失败')
    return NextResponse.json({
      success: false,
      error: '无效的管理员会话'
    }, { status: 401 })

  } catch (error) {
    console.error('❌ 管理员会话验证异常:', error)
    return NextResponse.json({
      success: false,
      error: '会话验证失败'
    }, { status: 500 })
  }
}

// 创建管理员会话
export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    if (!token || !token.includes('admin-session-')) {
      return NextResponse.json({
        success: false,
        error: '无效的管理员令牌'
      }, { status: 400 })
    }

    // 验证令牌并获取用户信息
    const account = await prisma.account.findFirst({
      where: {
        provider: 'admin-secure',
        access_token: token,
        expires_at: {
          gt: Math.floor(Date.now() / 1000)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isVerified: true
          }
        }
      }
    })

    if (!account || account.user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: '无效的管理员令牌'
      }, { status: 403 })
    }

    console.log('✅ 管理员会话创建成功')
    return NextResponse.json({
      success: true,
      user: account.user,
      isAdmin: true
    })

  } catch (error) {
    console.error('❌ 管理员会话创建失败:', error)
    return NextResponse.json({
      success: false,
      error: '会话创建失败'
    }, { status: 500 })
  }
}

// 销毁管理员会话
export async function DELETE(request: Request) {
  try {
    const adminToken = request.headers.get('authorization') || 
                      request.headers.get('x-admin-token')
    
    if (adminToken && adminToken.includes('admin-session-')) {
      // 删除令牌记录
      await prisma.account.deleteMany({
        where: {
          provider: 'admin-secure',
          access_token: adminToken.replace('Bearer ', '')
        }
      })
      
      console.log('✅ 管理员会话已销毁')
    }

    return NextResponse.json({
      success: true,
      message: '会话已销毁'
    })

  } catch (error) {
    console.error('❌ 管理员会话销毁失败:', error)
    return NextResponse.json({
      success: false,
      error: '会话销毁失败'
    }, { status: 500 })
  }
}
