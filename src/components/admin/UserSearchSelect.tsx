"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { User, Search, X, Star, Mail, Github } from "lucide-react"

interface UserInfo {
  id: string
  name: string | null
  email: string | null
  githubLogin: string | null
  role: string
  isVerified: boolean
  starBalance?: {
    availableStars: number
    totalStars: number
  }
}

interface UserSearchSelectProps {
  onUserSelect: (user: UserInfo) => void
  selectedUser: UserInfo | null
  onClear: () => void
}

export default function UserSearchSelect({ onUserSelect, selectedUser, onClear }: UserSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<UserInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const adminToken = localStorage.getItem('admin-token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-admin': 'true' // 开发模式下的管理员权限
      }

      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`
        headers['x-admin-token'] = adminToken
      }

      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, {
        headers
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
        setShowResults(true)
      } else {
        console.error('用户搜索失败:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('用户搜索异常:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // 防抖搜索
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // 选择用户
  const handleUserSelect = (user: UserInfo) => {
    onUserSelect(user)
    setSearchTerm('')
    setShowResults(false)
    setSearchResults([])
  }

  // 清除选择
  const handleClear = () => {
    onClear()
    setSearchTerm('')
    setShowResults(false)
    setSearchResults([])
  }

  return (
    <div className="space-y-4">
      {/* 已选择的用户 */}
      {selectedUser && (
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-slate-300" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    {selectedUser.name || 'Unknown User'}
                  </div>
                  <div className="text-slate-300 text-sm flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {selectedUser.email}
                  </div>
                  {selectedUser.githubLogin && (
                    <div className="text-slate-400 text-xs flex items-center gap-1">
                      <Github className="h-3 w-3" />
                      @{selectedUser.githubLogin}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={selectedUser.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                  {selectedUser.role}
                </Badge>
                {selectedUser.starBalance && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                    <Star className="h-3 w-3 mr-1" />
                    {selectedUser.starBalance.availableStars}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索输入框 */}
      {!selectedUser && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索用户名、邮箱或GitHub用户名..."
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* 搜索结果 */}
          {showResults && searchResults.length > 0 && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border-slate-700 max-h-60 overflow-y-auto">
              <CardContent className="p-0">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-300" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {user.name || 'Unknown User'}
                          </div>
                          <div className="text-slate-300 text-xs">
                            {user.email}
                          </div>
                          {user.githubLogin && (
                            <div className="text-slate-400 text-xs">
                              @{user.githubLogin}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge 
                          variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {user.role}
                        </Badge>
                        {user.starBalance && (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-500 text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {user.starBalance.availableStars}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 无搜索结果 */}
          {showResults && searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-slate-400 text-sm">
                  没有找到匹配的用户
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 搜索提示 */}
      {!selectedUser && searchTerm.length < 2 && (
        <div className="text-slate-400 text-sm">
          请输入至少2个字符开始搜索用户
        </div>
      )}
    </div>
  )
}
