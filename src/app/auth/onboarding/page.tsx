"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import GistFansLoader from "@/components/GistFansLoader"

const userTypes = [
  {
    id: 'CODER',
    title: 'Coder',
    subtitle: '创造者·开发者',
    description: '分享技术知识，提供编程指导，获得收益',
    features: [
      '发布技术教程和项目',
      '提供一对一编程指导',
      '接受订阅和打赏',
      '远程协助和代码审查',
      '建立个人技术品牌'
    ],
    icon: '👩‍💻',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400'
  },
  {
    id: 'LEARNER',
    title: 'Learner',
    subtitle: '探索者·学习者',
    description: '学习编程技能，获得专业指导，提升技术能力',
    features: [
      '订阅喜欢的开发者',
      '获得个性化学习建议',
      '参与实时编程会话',
      '访问专属学习资源',
      '加入技术讨论社区'
    ],
    icon: '🎓',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200 hover:border-green-400'
  }
]

export default function OnboardingPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAnimation, setShowAnimation] = useState(true)
  const [isTestMode, setIsTestMode] = useState(false)
  const [testUser, setTestUser] = useState<{id: string, name: string, email: string, image: string} | null>(null)
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // 检查是否是开发测试模式
    const checkTestMode = () => {
      if (typeof window !== 'undefined') {
        const testFlowUser = localStorage.getItem('test_invite_flow_user')
        const testFlowStage = localStorage.getItem('test_invite_flow_stage')
        
        if (testFlowUser && testFlowStage === 'onboarding') {
          console.log('🧪 测试模式已激活：角色选择页面')
          setIsTestMode(true)
          setTestUser(JSON.parse(testFlowUser))
          return true
        }
      }
      return false
    }

    const isTest = checkTestMode()
    
    // 如果不是测试模式，进行正常的用户检查
    if (!isTest) {
    // 如果用户未登录，重定向到登录页
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
      }
    }
    
    // 只在非测试模式下检查用户状态
    if (!isTest) {
    // 检查用户状态
    const checkUserStatus = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user/status/${session.user.id}`)
          if (response.ok) {
            const userData = await response.json()
            if (userData.onboardingComplete) {
              router.push('/feed')
              return
            }
            if (!userData.inviteCode) {
              // 用户未验证邀请码，跳转到邀请码验证页面
              router.push('/auth/invite-verification')
              return
            }
          }
        } catch (error) {
          console.error('检查用户状态失败:', error)
        }
      }
    }
    
    checkUserStatus()
    }

    // 显示欢迎动画
    const timer = setTimeout(() => {
      setShowAnimation(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [session, status, router])

  const handleSelectType = async () => {
    if (!selectedType) return

    setIsLoading(true)

    try {
      if (isTestMode) {
        // 测试模式：模拟完成引导并直接跳转
        console.log('🧪 测试模式：模拟完成引导')
        localStorage.removeItem('test_invite_flow_user')
        localStorage.removeItem('test_invite_flow_stage')
        console.log('🧪 测试模式完成，已清除测试数据')
        
        // 短暂延迟后跳转到feed页面
        setTimeout(() => {
          router.push('/feed')
        }, 1000)
      } else {
        // 正常模式：实际API调用
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userType: selectedType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
          // 完成引导，检查是否需要显示动画
          if (data.shouldShowAnimation) {
            // 跳转到动画页面
            router.push('/auth/invite-verification?showAnimation=true')
          } else {
            // 直接跳转到feed页面
            router.push('/feed')
          }
      } else {
        console.error('完成引导失败:', data.error || '未知错误')
        }
      }
    } catch (error) {
      console.error('完成引导错误:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 如果是测试模式，显示测试模式指示器
  const displayUser = isTestMode ? testUser : session?.user
  const displayName = displayUser?.name || '开发者'

  // 加载状态
  if (status === 'loading' && !isTestMode) {
    return <GistFansLoader />
  }

  // 欢迎动画
  if (showAnimation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            🎊 恭喜 {displayName}！
          </h1>
          <p className="text-xl text-gray-300">
            邀请验证成功，现在选择您的角色...
          </p>
          {isTestMode && (
            <div className="mt-4">
              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30">
                🧪 开发测试模式
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            选择您的角色
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            欢迎加入 GistFans 技术社区！
          </p>
          <p className="text-gray-400">
            选择最适合您的角色，开始您的技术之旅
          </p>
          {isTestMode && (
            <div className="mt-4">
              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30">
                🧪 开发测试模式
              </span>
            </div>
          )}
        </div>

        {/* User Type Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {userTypes.map((type) => (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                selectedType === type.id 
                  ? 'border-blue-400 bg-blue-500/10 scale-105'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800/70'
              }`}
              onClick={() => setSelectedType(type.id)}
            >
              <CardHeader className="text-center">
                <div className="text-6xl mb-4">{type.icon}</div>
                <CardTitle className="text-white text-2xl">{type.title}</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  {type.subtitle}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4 text-center">
                  {type.description}
                </p>
                <ul className="space-y-2">
                  {type.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button 
            onClick={handleSelectType}
            disabled={!selectedType || isLoading}
            className={`px-8 py-3 text-lg font-semibold rounded-full transition-all duration-300 ${
              selectedType
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                处理中...
              </div>
            ) : (
              '确认选择并开始旅程 🚀'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 