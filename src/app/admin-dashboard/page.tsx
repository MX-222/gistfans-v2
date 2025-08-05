"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"
import { useLanguage } from '@/contexts/LanguageContext'
import StarGrantPanel from '@/components/admin/StarGrantPanel'
import AdminUserManagement from '@/components/admin/AdminUserManagement'
import GistFansLoader from '@/components/GistFansLoader'

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [users, setUsers] = useState<any[]>([])
  const [inviteCodes, setInviteCodes] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInviteCodes: 0,
    usedInviteCodes: 0,
    adminUsers: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // 检查管理员权限 - 严格验证
    if (status === 'loading') return

    // 检查管理员令牌会话（优先级更高）
    const checkAdminToken = async () => {
      const adminToken = localStorage.getItem('admin-token')
      if (adminToken) {
        try {
          const response = await fetch('/api/admin/session', {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'x-admin-token': adminToken
            }
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.isAdmin) {
              console.log('✅ 管理员令牌会话有效，加载管理员数据')
              loadAdminData()
              return
            }
          }

          // 令牌无效，清除本地存储
          console.log('❌ 管理员令牌无效，清除本地存储')
          localStorage.removeItem('admin-token')
        } catch (error) {
          console.error('❌ 管理员令牌验证失败:', error)
          localStorage.removeItem('admin-token')
        }
      }
    }

    if (!session?.user) {
      // 先检查管理员令牌
      checkAdminToken().then(() => {
        // 如果令牌验证失败，重定向到安全入口
        const adminToken = localStorage.getItem('admin-token')
        if (!adminToken) {
          console.log('❌ 未登录用户访问管理员面板，重定向到安全入口')
          router.push('/secret-admin-portal')
        }
      })
      return
    }

    // 只允许真正的管理员邮箱
    if (session.user.email !== 'cmbdlobefxijuf@gmail.com' || session.user.role !== 'ADMIN') {
      console.log('❌ 非管理员用户访问管理员面板，重定向到安全入口', {
        email: session.user.email,
        role: session.user.role
      })
      router.push('/secret-admin-portal')
      return
    }

    console.log('✅ 管理员权限验证通过，加载管理员数据')
    // 加载管理员数据
    loadAdminData()
  }, [session, status, router])

  const loadAdminData = async () => {
    try {
      setIsLoading(true)

      // 获取管理员令牌
      const adminToken = localStorage.getItem('admin-token')

      const headers: Record<string, string> = {
        'x-dev-admin': 'true' // 开发模式下的管理员权限
      }

      // 如果有管理员令牌，添加到请求头
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`
        headers['x-admin-token'] = adminToken
      }
      
      // 加载用户数据
      const usersResponse = await fetch('/api/admin/users', { headers })
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
        setStats(prev => ({ ...prev, totalUsers: usersData.users?.length || 0 }))
        console.log('✅ 用户数据加载成功')
      } else {
        console.error('❌ 用户数据加载失败:', usersResponse.status)
      }
      
      // 邀请码功能已移除，设置默认值
      setInviteCodes([])
      setStats(prev => ({
        ...prev,
        totalInviteCodes: 0,
        usedInviteCodes: 0
      }))
      console.log('ℹ️ 邀请码功能已移除')
      
    } catch (error) {
      console.error('❌ 加载管理员数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    if (session?.user) {
      signOut({ callbackUrl: '/secret-admin-portal' })
    } else {
      router.push('/secret-admin-portal')
    }
  }

  const generateInviteCode = async () => {
    // 邀请码功能已移除
    alert('ℹ️ 邀请码功能已移除，用户可直接通过GitHub OAuth注册')
  }

  if (status === 'loading' || isLoading) {
    return <GistFansLoader />
  }

  const tabs = [
    { id: 'overview', name: t('overview'), icon: '📊' },
    { id: 'users', name: t('user_management'), icon: '👥' },
    { id: 'invites', name: t('invite_codes'), icon: '📧' },
    { id: 'stars', name: 'Star管理', icon: '⭐' },
    { id: 'settings', name: t('settings'), icon: '⚙️' }
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 顶部导航栏 */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🔐</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{t('gistfans_admin_panel')}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <span className="text-sm text-slate-300">{t('welcome_back')},</span>
                <span className="font-medium">
                  {session?.user?.name || 'GistFans Administrator (开发模式)'}
                </span>
              </div>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                {session?.user ? t('logout_or_return') : t('return_to_login')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 选项卡导航 */}
        <div className="flex space-x-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* 概览面板 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium">{t('total_users')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium">{t('total_invite_codes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.totalInviteCodes}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium">{t('used_invite_codes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.usedInviteCodes}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium">{t('admin_users')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {users.filter(user => user.role === 'ADMIN').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 快速操作 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">{t('quick_actions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={generateInviteCode}
                    disabled={true}
                    className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
                  >
                    邀请码功能已移除
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 用户管理面板 */}
        {activeTab === 'users' && (
          <AdminUserManagement />
        )}

        {/* 邀请码管理面板 */}
        {activeTab === 'invites' && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t('invite_code_management')}</CardTitle>
              <CardDescription className="text-slate-300">
                {t('manage_and_generate_invite_codes')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={generateInviteCode}
                  disabled={true}
                  className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
                >
                  邀请码功能已移除
                </Button>
                
                <div className="space-y-3">
                  {inviteCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div>
                        <div className="text-white font-mono text-lg">{code.code}</div>
                        <div className="text-slate-300 text-sm">
                          {t('usage_status')}: {code.usedCount}/{code.maxUses}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={code.isActive ? 'secondary' : 'destructive'}>
                          {code.isActive ? t('active') : t('disabled')}
                        </Badge>
                        <Badge variant="outline" className="text-slate-300">
                          {new Date(code.expiresAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Star管理面板 */}
        {activeTab === 'stars' && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Star治理系统管理</CardTitle>
                <CardDescription className="text-slate-300">
                  管理员可以为优质内容和有价值的贡献赠送Star
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StarGrantPanel />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}