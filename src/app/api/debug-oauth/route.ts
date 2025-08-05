import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 OAuth配置调试检查...')
    
    // 检查环境变量
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'NOT_SET',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
    }
    
    // 检查NextAuth配置
    const configCheck = {
      hasProviders: authOptions.providers?.length > 0,
      hasGithubProvider: authOptions.providers?.some(p => p.id === 'github'),
      hasCallbacks: !!authOptions.callbacks,
      hasPages: !!authOptions.pages
    }
    
    // 检查当前请求信息
    const requestInfo = {
      url: request.url,
      origin: request.nextUrl.origin,
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent')
    }
    
    return NextResponse.json({
      status: 'OAuth配置调试信息',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      nextAuthConfig: configCheck,
      request: requestInfo,
      expectedCallbackUrl: `${request.nextUrl.origin}/api/auth/callback/github`
    }, { status: 200 })
    
  } catch (error) {
    console.error('❌ OAuth配置检查失败:', error)
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}