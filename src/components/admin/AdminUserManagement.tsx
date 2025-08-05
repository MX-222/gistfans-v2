"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  User, 
  Settings, 
  Shield, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  Search,
  Filter,
  MoreHorizontal
} from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
  isVerified: boolean
  githubLogin: string | null
  createdAt: string
  updatedAt: string
  _count: {
    generatedInviteCodes: number
  }
}

interface UserStats {
  total: number
  admins: number
  verified: number
  github: number
}

interface ApiResponse {
  success: boolean
  users: User[]
  stats: UserStats
  timestamp: string
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({ total: 0, admins: 0, verified: 0, github: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      
      // 获取管理员令牌
      const adminToken = localStorage.getItem('admin-token')
      const headers: Record<string, string> = {
        'x-dev-admin': 'true' // 开发模式下的管理员权限
      }

      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`
        headers['x-admin-token'] = adminToken
      }
      
      const response = await fetch('/api/admin/users', { headers })
      
      if (response.ok) {
        const data: ApiResponse = await response.json()
        setUsers(data.users || [])
        setStats(data.stats || { total: 0, admins: 0, verified: 0, github: 0 })
        console.log('✅ 用户数据加载成功')
      } else {
        console.error('❌ 用户数据加载失败:', response.status)
        setAlert({ type: 'error', message: '加载用户数据失败' })
      }
    } catch (error) {
      console.error('❌ 加载用户数据异常:', error)
      setAlert({ type: 'error', message: '加载用户数据失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setIsUpdating(true)
      
      const adminToken = localStorage.getItem('admin-token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-admin': 'true' // 开发模式下的管理员权限
      }

      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`
        headers['x-admin-token'] = adminToken
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'updateRole',
          userId,
          role: newRole
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setAlert({ type: 'success', message: `用户角色已更新为 ${newRole}` })
        loadUsers() // 重新加载数据
        setSelectedUser(null)
      } else {
        setAlert({ type: 'error', message: data.error || '更新用户角色失败' })
      }
    } catch (error) {
      console.error('❌ 更新用户角色异常:', error)
      setAlert({ type: 'error', message: '更新用户角色失败' })
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleUserVerification = async (userId: string, isVerified: boolean) => {
    try {
      setIsUpdating(true)
      
      const adminToken = localStorage.getItem('admin-token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-admin': 'true' // 开发模式下的管理员权限
      }

      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`
        headers['x-admin-token'] = adminToken
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'updateVerification',
          userId,
          isVerified: !isVerified
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setAlert({ 
          type: 'success', 
          message: `用户验证状态已${!isVerified ? '启用' : '禁用'}` 
        })
        loadUsers() // 重新加载数据
        setSelectedUser(null)
      } else {
        setAlert({ type: 'error', message: data.error || '更新用户验证状态失败' })
      }
    } catch (error) {
      console.error('❌ 更新用户验证状态异常:', error)
      setAlert({ type: 'error', message: '更新用户验证状态失败' })
    } finally {
      setIsUpdating(false)
    }
  }

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.githubLogin?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-2 text-white">加载用户数据中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 警告提示 */}
      {alert && (
        <Alert className={`${alert.type === 'success' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className={alert.type === 'success' ? 'text-green-400' : 'text-red-400'}>
              {alert.message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium">总用户数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium">管理员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.admins}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium">已验证</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.verified}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium">GitHub用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.github}</div>
          </CardContent>
        </Card>
      </div>

      {/* 用户管理主面板 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            用户管理
          </CardTitle>
          
          {/* 搜索和筛选 */}
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="搜索用户名、邮箱或GitHub用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="筛选角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有角色</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
                <SelectItem value="USER">普通用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">用户</TableHead>
                  <TableHead className="text-slate-300">角色</TableHead>
                  <TableHead className="text-slate-300">状态</TableHead>
                  <TableHead className="text-slate-300">邀请码</TableHead>
                  <TableHead className="text-slate-300">注册时间</TableHead>
                  <TableHead className="text-slate-300">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-700">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-300" />
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {user.name || 'Unknown'}
                          </div>
                          <div className="text-slate-400 text-sm">
                            {user.email}
                          </div>
                          {user.githubLogin && (
                            <div className="text-slate-500 text-xs">
                              @{user.githubLogin}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.isVerified ? (
                          <Badge variant="outline" className="text-green-400 border-green-500">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            已验证
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                            <Shield className="h-3 w-3 mr-1" />
                            未验证
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-300">
                        {user._count.generatedInviteCodes}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-300">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            className="text-slate-300 hover:text-white hover:bg-slate-700"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">管理用户</DialogTitle>
                            <DialogDescription className="text-slate-300">
                              修改用户角色和验证状态
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedUser && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-white text-sm font-medium">用户角色</label>
                                <Select 
                                  value={selectedUser.role} 
                                  onValueChange={(value: string) => updateUserRole(selectedUser.id, value)}
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USER">普通用户</SelectItem>
                                    <SelectItem value="ADMIN">管理员</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-white text-sm font-medium">验证状态</label>
                                <Button
                                  onClick={() => toggleUserVerification(selectedUser.id, selectedUser.isVerified)}
                                  disabled={isUpdating}
                                  variant={selectedUser.isVerified ? "destructive" : "default"}
                                  className="w-full"
                                >
                                  {isUpdating ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  ) : null}
                                  {selectedUser.isVerified ? '取消验证' : '验证用户'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">没有找到匹配的用户</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
