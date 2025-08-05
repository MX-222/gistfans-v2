import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ConnectionMonitor from '@/components/admin/ConnectionMonitor'

export const metadata: Metadata = {
  title: '连接池监控 - GistFans Admin',
  description: '实时监控和管理数据库连接池状态',
}

// 检查管理员权限
async function checkAdminAccess() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return false
  }

  // 检查是否为管理员邮箱
  const adminEmails = ['cmbdlobefxijuf@gmail.com'] // 可以从环境变量读取
  return adminEmails.includes(session.user.email)
}

export default async function ConnectionMonitorPage() {
  // 检查管理员权限
  const hasAdminAccess = await checkAdminAccess()
  
  if (!hasAdminAccess) {
    redirect('/auth/signin?callbackUrl=/admin/connection-monitor')
  }

  return (
    <div className="container mx-auto py-8">
      <ConnectionMonitor />
    </div>
  )
}
