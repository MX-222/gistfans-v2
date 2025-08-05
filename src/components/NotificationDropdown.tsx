'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Clock, User, MessageCircle, Heart, Star, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Notification {
  id: string
  type: string
  title: string
  content: string
  isRead: boolean
  createdAt: string
  sender?: {
    id: string
    name: string
    image: string
    email: string
  }
  relatedId?: string
  metadata?: any
}

interface NotificationDropdownProps {
  onClose: () => void
  onNotificationRead: () => void
}

export function NotificationDropdown({ onClose, onNotificationRead }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 获取通知列表
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('获取通知列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // 标记通知已读
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        onNotificationRead()
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case 'follow':
        return <User className="h-4 w-4 text-green-500" />
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">通知</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 通知列表 */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            加载中...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            暂无通知
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-700 hover:bg-gray-750 cursor-pointer ${
                !notification.isRead ? 'bg-gray-750' : ''
              }`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className="flex items-start space-x-3">
                {/* 通知图标 */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                {/* 通知内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white truncate">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {notification.content}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatTime(notification.createdAt)}
                    </span>
                    {notification.sender && (
                      <span className="text-xs text-gray-500">
                        来自 {notification.sender.name || notification.sender.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-700 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:text-blue-300"
            onClick={() => {
              // 这里可以跳转到完整的通知页面
              onClose()
            }}
          >
            查看全部通知
          </Button>
        </div>
      )}
    </div>
  )
} 