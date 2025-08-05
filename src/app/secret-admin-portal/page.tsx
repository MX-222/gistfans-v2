"use client"

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SecretAdminPortalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('cmbdlobefxijuf@gmail.com')
  const [securityCode, setSecurityCode] = useState('')
  const [showSecurityCode, setShowSecurityCode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // 如果已经是管理员，直接跳转到管理员面板
    if (session?.user?.email === 'cmbdlobefxijuf@gmail.com' && session?.user?.role === 'ADMIN') {
      console.log('✅ 管理员已登录，重定向到管理员面板')
      router.push('/admin-dashboard')
    }
  }, [session, router])

  const handleSecureLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🔐 尝试管理员安全登录...')
      
      const response = await fetch('/api/admin/secure-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          securityCode
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ 管理员安全登录成功')
        setSuccess('安全验证成功！正在跳转到管理员面板...')
        
        // 存储管理员令牌
        if (data.token) {
          localStorage.setItem('admin-token', data.token)
        }
        
        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          router.push('/admin-dashboard')
        }, 1500)
      } else {
        console.error('❌ 管理员安全登录失败:', data.error)
        setError(data.error || '安全验证失败')
      }
    } catch (error) {
      console.error('❌ 管理员安全登录异常:', error)
      setError('网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('📧 尝试邮箱登录...')
      await signIn('email', { 
        email,
        callbackUrl: '/admin-dashboard',
        redirect: false
      })
      setSuccess('验证邮件已发送，请检查您的邮箱')
    } catch (error) {
      console.error('❌ 邮箱登录失败:', error)
      setError('邮箱登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">正在验证身份...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20"></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* 返回链接 */}
          <div className="mb-6">
            <Link 
              href="/auth/signin" 
              className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              返回登录页面
            </Link>
          </div>

          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                管理员安全入口
              </CardTitle>
              <p className="text-gray-400 text-sm">
                此页面仅供授权管理员访问
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <AlertDescription className="text-green-400">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSecureLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    管理员邮箱
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="输入管理员邮箱"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    安全验证码
                  </label>
                  <div className="relative">
                    <Input
                      type={showSecurityCode ? "text" : "password"}
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="输入安全验证码"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityCode(!showSecurityCode)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      disabled={isLoading}
                    >
                      {showSecurityCode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    请联系系统管理员获取安全验证码
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  disabled={isLoading || !securityCode.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      验证中...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock size={16} className="mr-2" />
                      安全验证登录
                    </div>
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">或</span>
                </div>
              </div>

              <Button
                onClick={handleEmailLogin}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={isLoading}
              >
                通过邮箱验证登录
              </Button>

              <div className="text-center text-xs text-gray-500">
                <p>⚠️ 未经授权访问此页面可能违反相关法律法规</p>
                <p className="mt-1">所有访问记录将被记录和监控</p>
              </div>
            </CardContent>
          </Card>

          {/* 开发信息 */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="mt-4 bg-yellow-900/20 border-yellow-700/50">
              <CardContent className="pt-4">
                <p className="text-yellow-400 text-sm text-center">
                  🚧 开发模式：安全验证码示例
                </p>
                <p className="text-yellow-300 text-xs text-center mt-1">
                  SECURE-2024-ADMIN | BACKUP-CODE-2024 | EMERGENCY-ACCESS-2024
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
