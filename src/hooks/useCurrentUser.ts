import { useSession } from 'next-auth/react'
// import { useTestSession } from '@/contexts/TestSessionContext' // 已删除

export function useCurrentUser() {
  const { data: session, status } = useSession()
  // const { testSession, isTestMode } = useTestSession() // 已删除测试会话功能
  const testSession: any = null
  const isTestMode = false

  // 如果在测试模式下，返回测试会话
  if (isTestMode && testSession?.user) {
    return {
      user: testSession.user,
      isLoading: false,
      isTestMode: true
    }
  }

  // 否则返回真实会话
  return {
    user: session?.user || null,
    isLoading: status === 'loading', // 修复：只有在loading状态时才是loading
    isTestMode: false
  }
}
 