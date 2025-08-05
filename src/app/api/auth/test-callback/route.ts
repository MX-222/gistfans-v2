import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  console.log('🔍 测试回调接收到的参数:', {
    code: code ? `${code.substring(0, 10)}...` : null,
    state: state ? `${state.substring(0, 10)}...` : null,
    error,
    fullUrl: request.url,
    headers: Object.fromEntries(request.headers.entries())
  })
  
  return NextResponse.json({
    message: '回调测试成功',
    params: {
      code: code ? `${code.substring(0, 10)}...` : null,
      state: state ? `${state.substring(0, 10)}...` : null,
      error,
      timestamp: new Date().toISOString()
    }
  })
}
