"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import GistFansLoader from "@/components/GistFansLoader"

export default function Home() {
  const { data: session, status } = useSession()

  // 🔧 临时修复：如果OAuth配置有问题，不要无限显示Loading
  // 检查是否是配置错误导致的永久loading状态
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false)

  useEffect(() => {
    // 如果5秒后还在loading，可能是配置问题，显示页面内容
    const timer = setTimeout(() => {
      if (status === "loading") {
        setShowLoadingTimeout(true)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [status])

  // 只在短时间内显示LoadingScreen，避免OAuth配置问题导致的永久loading
  if (status === "loading" && !showLoadingTimeout) {
    return <GistFansLoader />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              GistFans
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 🔧 OAuth配置状态提示 */}
            {status === "loading" && showLoadingTimeout && (
              <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 px-3 py-1 rounded-full text-sm">
                ⚠️ OAuth配置中...
              </div>
            )}

            {session ? (
              <>
                <img 
                  src={session.user.image || ""} 
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-blue-500"
                />
                <span className="text-white font-medium">Welcome, {session.user.name}</span>
                <Button 
                  onClick={() => signOut()} 
                  variant="outline" 
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex space-x-3">
                <Button 
                  onClick={() => signIn("github", { callbackUrl: '/feed' })} 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  Sign In with GitHub
                </Button>
                <Button 
                  onClick={() => window.location.href = '/auth/signin'}
                  variant="outline"
                  className="border-2 border-white/20 text-white hover:bg-white/10 font-semibold px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  登录
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          {/* Main Hero Content */}
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Connect with
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Expert Developers
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              The exclusive platform where programming beginners get personalized mentorship, 
              remote assistance, and direct access to experienced open source contributors.
            </p>
            
            {!session && (
              <div className="space-y-4">
                <Button 
                  onClick={() => signIn("github", { callbackUrl: '/feed' })} 
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-lg px-12 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl"
                >
                  Start Your Journey
                </Button>
                <p className="text-gray-400 text-sm">Join thousands of developers already learning</p>
                <div className="mt-6">
                  <Button 
                    onClick={() => window.location.href = '/test-onboarding'}
                    variant="outline" 
                    className="border-purple-500 text-purple-400 hover:bg-purple-900/30 px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
                  >
                    🎬 预览引导动画
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">🖥️</span>
                </div>
                <CardTitle className="text-white text-xl min-h-[3.5rem] flex items-center justify-center text-center">Remote Assistance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <CardDescription className="text-gray-300 leading-relaxed text-center">
                  Get hands-on help with screen sharing and remote control. 
                  Watch experts solve your problems in real-time and learn their techniques.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">💬</span>
                </div>
                <CardTitle className="text-white text-xl min-h-[3.5rem] flex items-center justify-center text-center">Exclusive Access</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <CardDescription className="text-gray-300 leading-relaxed text-center">
                  Private conversations with your subscribed developers plus exclusive 
                  group discussions. Get answers that you can't find anywhere else.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">⚡</span>
                </div>
                <CardTitle className="text-white text-xl min-h-[3.5rem] flex items-center justify-center text-center">GitHub Integration</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <CardDescription className="text-gray-300 leading-relaxed text-center">
                  Seamless integration with your repositories. Get code reviews, 
                  contributions, and learn how to build professional-grade projects.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-3xl p-12 mb-20 border border-gray-700">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-white mb-2">1,000+</div>
                <div className="text-gray-400">Expert Developers</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">50,000+</div>
                <div className="text-gray-400">Learning Sessions</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">95%</div>
                <div className="text-gray-400">Success Rate</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">24/7</div>
                <div className="text-gray-400">Support Available</div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="text-center mb-20">
            <h3 className="text-4xl font-bold text-white mb-12">How GistFans Works</h3>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                  1
                </div>
                <h4 className="text-xl font-semibold text-white mb-4 min-h-[3.5rem] flex items-center justify-center">Choose Your Developer</h4>
                <p className="text-gray-300">Browse profiles of expert developers and subscribe to those who match your learning goals.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                  2
                </div>
                <h4 className="text-xl font-semibold text-white mb-4 min-h-[3.5rem] flex items-center justify-center">Start Learning</h4>
                <p className="text-gray-300">Chat directly, share screens, and get personalized help with your coding challenges.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                  3
                </div>
                <h4 className="text-xl font-semibold text-white mb-4 min-h-[3.5rem] flex items-center justify-center">Level Up</h4>
                <p className="text-gray-300">Build real projects, contribute to open source, and advance your programming career.</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          {session && (
            <div className="text-center">
              <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500/30 backdrop-blur-sm max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-white text-2xl">Welcome back, {session.user.name}!</CardTitle>
                  <CardDescription className="text-gray-300">
                    Ready to continue your learning journey?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      onClick={() => window.location.href = '/feed'}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-full"
                    >
                      Go to Dashboard
                    </Button>
                    <Button 
                      onClick={() => window.location.href = '/test-onboarding'}
                      variant="outline" 
                      className="w-full border-purple-500 text-purple-400 hover:bg-purple-900/30 py-3 rounded-full"
                    >
                      🎬 预览引导动画
                    </Button>
                    {session.user.userType === 'LEARNER' && (
                      <Button 
                        variant="outline" 
                        className="w-full border-gray-600 text-white hover:bg-gray-800 py-3 rounded-full"
                      >
                        Become a Developer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black/50 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="text-xl font-bold text-white">GistFans</span>
          </div>
          <p className="text-gray-400">
            © 2024 GistFans. Connecting developers worldwide.
          </p>
        </div>
      </footer>
    </div>
  )
}
