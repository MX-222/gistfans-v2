"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Send, MessageSquare, Heart, ArrowLeft, Lightbulb } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Suggestion {
  id: string
  content: string
  author: {
    id: string
    name: string
    image: string
  }
  likes: number
  isLiked: boolean
  createdAt: Date
}

export default function SuggestionBoardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [newSuggestion, setNewSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 加载建议列表
  useEffect(() => {
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/suggestions')
      const data = await response.json()
      
      if (data.success) {
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('加载建议失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitSuggestion = async () => {
    // 1. 前端验证 - 与项目统一的验证规则
    if (!session?.user) {
      alert('请先登录后再提交建议')
      return
    }

    const trimmedContent = newSuggestion.trim()

    if (!trimmedContent) {
      alert('请输入建议内容')
      return
    }

    if (trimmedContent.length < 5) {
      alert('建议内容至少需要5个字符')
      return
    }

    if (trimmedContent.length > 500) {
      alert('建议内容不能超过500字符')
      return
    }

    try {
      setSubmitting(true)

      // 2. API调用 - 增强错误处理
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: trimmedContent
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewSuggestion('')
        await loadSuggestions() // 重新加载列表
        console.log('✅ 建议提交成功:', data.message)

        // 成功提示 - 更友好的用户反馈
        if (data.message) {
          // 可以在这里添加toast通知，暂时使用alert
          alert(data.message)
        }
      } else {
        // 3. 错误处理 - 根据不同错误类型提供不同提示
        let errorMessage = data.error || '提交失败，请重试'

        if (response.status === 401) {
          errorMessage = '登录已过期，请重新登录'
        } else if (response.status === 429) {
          errorMessage = '提交过于频繁，请稍后再试'
        } else if (response.status === 400) {
          errorMessage = data.error || '输入内容有误，请检查后重试'
        }

        alert(errorMessage)
      }
    } catch (error) {
      console.error('提交建议失败:', error)
      alert('网络错误，请检查网络连接后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeSuggestion = async (suggestionId: string) => {
    if (!session?.user) {
      alert('请先登录后再点赞')
      return
    }

    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/like`, {
        method: 'POST'
      })

      const data = await response.json()
      
      if (data.success) {
        // 更新本地状态
        setSuggestions(prev => prev.map(suggestion => 
          suggestion.id === suggestionId 
            ? { 
                ...suggestion, 
                likes: data.likes,
                isLiked: data.isLiked 
              }
            : suggestion
        ))
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white">正在加载...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 头部导航 */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="flex items-center space-x-2">
                <Lightbulb size={24} className="text-yellow-400" />
                <h1 className="text-xl font-bold">社区建议板</h1>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {suggestions.length} 条建议
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 欢迎信息 */}
        <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Lightbulb size={24} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">💡 分享你的想法</h2>
                <p className="text-gray-300 mb-4">
                  这里是我们的社区建议板！你的每一个想法都很珍贵，无论是新功能建议、改进意见还是使用体验反馈，
                  我们都非常期待听到你的声音。让我们一起打造更好的社区平台！
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>🚀 功能建议</span>
                  <span>🐛 问题反馈</span>
                  <span>💬 使用体验</span>
                  <span>🎨 界面优化</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 提交建议表单 */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare size={20} className="text-blue-400" />
              <span>提交新建议</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session?.user ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <img
                      src={session.user.image || "/default-avatar.png"}
                      alt={session.user.name || ""}
                      className="rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/default-avatar.png"
                      }}
                    />
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={newSuggestion}
                      onChange={(e) => setNewSuggestion(e.target.value)}
                      placeholder="分享你的建议或想法..."
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-4">
                        <span className={`text-xs ${
                          newSuggestion.length > 450 ? 'text-red-400' :
                          newSuggestion.length > 400 ? 'text-yellow-400' :
                          'text-gray-500'
                        }`}>
                          {newSuggestion.length}/500
                        </span>
                        {newSuggestion.trim().length > 0 && newSuggestion.trim().length < 5 && (
                          <span className="text-xs text-red-400">
                            至少需要5个字符
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={handleSubmitSuggestion}
                        disabled={
                          submitting ||
                          !newSuggestion.trim() ||
                          newSuggestion.trim().length < 5 ||
                          newSuggestion.length > 500
                        }
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            提交中...
                          </>
                        ) : (
                          <>
                            <Send size={16} className="mr-2" />
                            提交建议
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">请先登录后再提交建议</p>
                <Button
                  onClick={() => router.push('/auth/signin')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  立即登录
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 建议列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">正在加载建议...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="text-center py-12">
                <Lightbulb size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">还没有建议</p>
                <p className="text-gray-500">成为第一个分享想法的人吧！</p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10">
                      <img
                        src={suggestion.author.image || "/default-avatar.png"}
                        alt={suggestion.author.name}
                        className="rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/default-avatar.png"
                        }}
                      />
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-white">{suggestion.author.name}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(suggestion.createdAt, { 
                            addSuffix: true, 
                            locale: zhCN 
                          })}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap mb-3">
                        {suggestion.content}
                      </p>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLikeSuggestion(suggestion.id)}
                          className={`flex items-center space-x-1 ${
                            suggestion.isLiked 
                              ? 'text-red-400 hover:text-red-300' 
                              : 'text-gray-400 hover:text-red-400'
                          }`}
                        >
                          <Heart 
                            size={16} 
                            className={suggestion.isLiked ? 'fill-current' : ''} 
                          />
                          <span>{suggestion.likes}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
