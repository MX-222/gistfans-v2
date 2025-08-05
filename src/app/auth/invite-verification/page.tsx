"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
// import { SciFiInviteAnimation } from '@/components/InviteSuccessAnimation' // 已删除
import GistFansLoader from '@/components/GistFansLoader'

function InviteVerificationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) {
      // 未登录用户重定向到登录页
      router.push('/auth/signin')
      return
    }

    const checkUserStatus = async () => {
      try {
        const response = await fetch(`/api/user/status/${session.user.id}`)
        if (response.ok) {
          const userData = await response.json()
          console.log('邀请验证页面 - 用户状态:', userData)
          
          if (userData.onboardingComplete) {
            // 用户已经完成注册，直接跳转到feed页面
            console.log('用户已完成注册，跳转到feed页面')
            router.push('/feed')
            return
          }
          
          // 检查是否应该显示动画
          const showAnimation = searchParams.get('showAnimation') === 'true'
          
          if (userData.inviteCode && showAnimation) {
            // 用户有邀请码且请求显示动画
            setShouldShowAnimation(true)
          } else if (userData.inviteCode) {
            // 用户有邀请码但不需要动画，直接跳转到引导页面
            router.push('/auth/onboarding')
          } else {
            // 用户没有邀请码，跳转到邀请码输入页面
            router.push('/invite-code')
          }
        } else {
          console.error('获取用户状态失败')
          router.push('/auth/signin')
        }
      } catch (error) {
        console.error('检查用户状态时出错:', error)
        router.push('/auth/signin')
      } finally {
        setIsChecking(false)
      }
    }

    checkUserStatus()
  }, [session, searchParams, router])

  const handleAnimationComplete = () => {
    console.log('动画播放完成，跳转到引导页面')
    router.push('/auth/onboarding')
  }

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-lg">检查邀请码状态...</div>
      </div>
    )
  }

  // Show animation if everything is ready
  if (shouldShowAnimation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* <SciFiInviteAnimation // 已删除邀请码功能
          userName={session?.user?.name || '用户'}
          onComplete={() => {
            setTimeout(() => {
              router.push('/feed')
            }, 1000)
          }}
        */ }
        <div className="flex items-center justify-center min-h-screen">
          <GistFansLoader />
        </div>
      </div>
    )
  }

  // This shouldn't happen, but as a fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-white text-lg">处理中...</div>
    </div>
  )
}

function LoadingFallback() {
  return <GistFansLoader />
}

export default function InviteVerificationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InviteVerificationContent />
    </Suspense>
  )
} 