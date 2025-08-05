"use client"

import { signIn, getProviders, useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import OAuthRedirectHandler from "@/components/OAuthRedirectHandler"

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [providers, setProviders] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { data: session, status } = useSession()
  const router = useRouter()

  // 简化重定向逻辑：已认证用户重定向到feed页面
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/feed')
    }
  }, [status, session, router])

  useEffect(() => {
    const getAuthProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    getAuthProviders()
  }, [])

  // 处理email+password登录
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('邮箱或密码错误')
      } else {
        router.push('/feed')
      }
    } catch (error) {
      setError('登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 🔄 显示加载状态，避免在认证检查期间显示登录表单
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">正在检查登录状态...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* OAuth重定向处理器 */}
      <OAuthRedirectHandler />

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
              <h1 className="text-4xl font-bold">GistFans</h1>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Sign up to support your
            <br />
            favorite developers
          </h2>
          
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Connect with expert developers, get personalized mentorship, 
            and accelerate your programming journey.
          </p>
          
          <div className="space-y-4 text-blue-100">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              <span>Direct access to experienced developers</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              <span>Real-time screen sharing and remote assistance</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              <span>Exclusive coding tutorials and mentorship</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">GistFans</h1>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">Log in</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleCredentialsLogin} className="space-y-6">
                {/* Email Input */}
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-red-600 text-sm text-center">{error}</div>
                )}

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full"
                  disabled={isLoading}
                >
                  {isLoading ? '登录中...' : 'LOG IN'}
                </Button>
              </form>

              {/* Terms */}
              <p className="text-sm text-gray-500 text-center">
                By logging in and using GistFans, you agree to our{" "}
                <a href="#" className="text-blue-500 hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>
                , and confirm that you are at least 18 years old.
              </p>

              {/* Links */}
              <div className="flex justify-center space-x-4 text-sm">
                <a href="#" className="text-blue-500 hover:underline">Forgot password?</a>
                <span className="text-gray-400">•</span>
                <Link href="/auth/register" className="text-blue-500 hover:underline">Sign up for GistFans</Link>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or continue with</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full h-12 bg-gray-300 hover:bg-gray-400 text-gray-600 font-semibold rounded-full flex items-center justify-center space-x-3"
                  disabled
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>SIGN IN WITH GITHUB (COMING SOON)</span>
                </Button>

                <Button
                  className="w-full h-12 bg-gray-300 hover:bg-gray-400 text-gray-600 font-semibold rounded-full border border-gray-300 flex items-center justify-center space-x-3"
                  disabled
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>SIGN IN WITH GOOGLE (COMING SOON)</span>
                </Button>

                <Button
                  className="w-full h-12 bg-gray-300 hover:bg-gray-400 text-gray-600 font-semibold rounded-full flex items-center justify-center space-x-3"
                  disabled
                >
                  <span className="text-xl">👆</span>
                  <span>PASSWORDLESS SIGN IN (COMING SOON)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mt-8">
            <p className="text-gray-500 text-sm">
              New to GistFans?{" "}
              <a href="/" className="text-blue-500 hover:underline font-semibold">
                Learn more
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 