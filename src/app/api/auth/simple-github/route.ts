import { NextRequest, NextResponse } from 'next/server'

// 简化的GitHub OAuth处理，绕过网络问题
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
  }

  try {
    console.log('🔄 简化GitHub OAuth处理:', { code: code.substring(0, 10) + '...', state })

    // 尝试获取访问令牌，使用更短的超时
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

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ GitHub令牌获取成功:', { 
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type 
    })

    if (!tokenData.access_token) {
      throw new Error('No access token received')
    }

    // 获取用户信息，使用更短的超时
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GistFans/1.0'
      },
      signal: AbortSignal.timeout(5000) // 5秒超时
    })

    if (!userResponse.ok) {
      throw new Error(`User request failed: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    console.log('✅ GitHub用户信息获取成功:', { 
      id: userData.id, 
      login: userData.login, 
      email: userData.email 
    })

    // 创建简化的用户会话
    const userSession = {
      id: userData.id.toString(),
      name: userData.name || userData.login,
      email: userData.email,
      image: userData.avatar_url,
      provider: 'github',
      githubLogin: userData.login,
      accessToken: tokenData.access_token
    }

    // 重定向到成功页面，携带用户信息
    const successUrl = new URL('/auth/success', request.nextUrl.origin)
    successUrl.searchParams.set('user', JSON.stringify(userSession))
    
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('❌ 简化GitHub OAuth失败:', error)
    
    // 重定向到错误页面
    const errorUrl = new URL('/auth/error', request.nextUrl.origin)
    errorUrl.searchParams.set('error', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.redirect(errorUrl)
  }
}
