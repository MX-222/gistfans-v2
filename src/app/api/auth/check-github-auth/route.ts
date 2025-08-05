import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 检查GitHub授权状态...')
    
    // 检查是否有NextAuth会话
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token')
    
    if (sessionToken) {
      console.log('✅ 发现NextAuth会话token')
      return NextResponse.json({
        hasAuth: true,
        authType: 'nextauth',
        message: '已有有效的NextAuth会话'
      })
    }
    
    // 检查是否有GitHub OAuth相关的cookies
    const githubState = cookieStore.get('next-auth.state')
    const githubPkce = cookieStore.get('next-auth.pkce.code_verifier')
    
    if (githubState || githubPkce) {
      console.log('🔄 发现GitHub OAuth进行中的状态')
      return NextResponse.json({
        hasAuth: false,
        authType: 'github-pending',
        message: 'GitHub OAuth授权进行中',
        suggestion: '可能遇到网络问题，建议重试或直接进入应用'
      })
    }
    
    // 检查URL参数中是否有GitHub回调信息
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (code && state) {
      console.log('🔍 发现GitHub回调参数，尝试手动验证...')
      
      try {
        // 尝试使用GitHub API验证这个code是否有效
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'GistFans/1.0'
          },
          body: new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID!,
            client_secret: process.env.GITHUB_CLIENT_SECRET!,
            code: code,
          }),
          signal: AbortSignal.timeout(5000) // 5秒超时
        })

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          
          if (tokenData.access_token) {
            console.log('✅ GitHub授权码有效，可以获取访问令牌')
            return NextResponse.json({
              hasAuth: true,
              authType: 'github-valid',
              message: 'GitHub授权成功，但NextAuth会话创建失败',
              suggestion: '可以直接进入应用或重新创建会话',
              accessToken: tokenData.access_token.substring(0, 10) + '...' // 只显示前缀用于调试
            })
          }
        }
      } catch (error) {
        console.log('⚠️ GitHub授权码验证失败:', error)
      }
    }
    
    return NextResponse.json({
      hasAuth: false,
      authType: 'none',
      message: '未发现有效的授权信息',
      suggestion: '需要重新进行GitHub登录'
    })
    
  } catch (error) {
    console.error('❌ 检查GitHub授权状态失败:', error)
    return NextResponse.json({
      hasAuth: false,
      authType: 'error',
      message: '检查授权状态时发生错误',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
