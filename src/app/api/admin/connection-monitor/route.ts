import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return false
  }

  // 检查是否为管理员邮箱
  const adminEmails = ['cmbdlobefxijuf@gmail.com'] // 可以从环境变量读取
  return adminEmails.includes(session.user.email)
}

// GET - 获取连接健康状态
export async function GET() {
  try {
    // 检查管理员权限
    if (!(await checkAdminPermission())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // 调用数据库函数获取连接状态
    const { data, error } = await supabase.rpc('monitor_connections')

    if (error) {
      console.error('Failed to monitor connections:', error)
      return NextResponse.json(
        { error: 'Failed to fetch connection status', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No connection data available' },
        { status: 404 }
      )
    }

    const result = data[0]

    return NextResponse.json({
      success: true,
      health: {
        status: result.status,
        totalConnections: result.total_conn,
        activeConnections: result.active_conn,
        idleConnections: result.idle_conn,
        zombieConnections: result.zombie_conn,
        longIdleConnections: result.long_idle_conn,
        utilizationPercentage: parseFloat(result.utilization_pct),
        maxConnections: result.max_conn,
        lastCheck: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Connection monitor API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - 执行连接清理操作
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    if (!(await checkAdminPermission())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      action = 'cleanup',
      idleThreshold = 15,
      maxTerminations = 10
    } = body

    let result

    switch (action) {
      case 'cleanup':
        // 执行标准清理
        const { data: cleanupData, error: cleanupError } = await supabase.rpc(
          'terminate_idle_connections',
          {
            idle_threshold_minutes: idleThreshold,
            max_terminations: maxTerminations
          }
        )

        if (cleanupError) {
          throw cleanupError
        }

        result = {
          action: 'cleanup',
          result: cleanupData[0],
          message: `Successfully terminated ${cleanupData[0].terminated_count} idle connections`
        }
        break

      case 'emergency':
        // 执行紧急重置
        const { data: emergencyData, error: emergencyError } = await supabase.rpc(
          'terminate_idle_connections',
          {
            idle_threshold_minutes: 0,
            max_terminations: 50
          }
        )

        if (emergencyError) {
          throw emergencyError
        }

        result = {
          action: 'emergency',
          result: emergencyData[0],
          message: `Emergency reset completed - terminated ${emergencyData[0].terminated_count} connections`
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action', availableActions: ['cleanup', 'emergency'] },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Connection cleanup API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to perform connection cleanup',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
