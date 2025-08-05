"use client"

import { useSession } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Send, Phone, Video, MoreHorizontal, ArrowLeft } from "lucide-react"
import Link from "next/link"

// 模拟聊天数据
const mockMessages = [
  {
    id: 1,
    senderId: "dev1",
    senderName: "Alex Chen",
    senderAvatar: "https://github.com/alexchen.png",
    content: "你好！感谢你的订阅，有什么技术问题可以随时问我。",
    timestamp: "10:30",
    isCurrentUser: false
  },
  {
    id: 2,
    senderId: "user1",
    senderName: "用户",
    senderAvatar: "",
    content: "你好Alex！我想了解一下React Native的性能优化，特别是长列表的处理。",
    timestamp: "10:32",
    isCurrentUser: true
  },
  {
    id: 3,
    senderId: "dev1", 
    senderName: "Alex Chen",
    senderAvatar: "https://github.com/alexchen.png",
    content: "这是个很好的问题！对于长列表，我推荐使用FlatList而不是ScrollView。FlatList有懒加载和回收机制，可以大大提升性能。",
    timestamp: "10:35",
    isCurrentUser: false
  },
  {
    id: 4,
    senderId: "dev1",
    senderName: "Alex Chen", 
    senderAvatar: "https://github.com/alexchen.png",
    content: "另外，还要注意几个关键点：\n1. 使用getItemLayout提供固定高度\n2. 设置合适的initialNumToRender\n3. 避免在renderItem中使用匿名函数\n4. 使用keyExtractor优化key生成",
    timestamp: "10:36",
    isCurrentUser: false
  }
]

const mockDeveloper = {
  id: "dev1",
  name: "Alex Chen",
  username: "@alexdev",
  avatar: "https://github.com/alexchen.png",
  isOnline: true,
  lastSeen: "刚刚活跃"
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState(mockMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [developerId, setDeveloperId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 解析参数
  useEffect(() => {
    params.then(resolvedParams => {
      setDeveloperId(resolvedParams.id)
    })
  }, [params])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message = {
      id: messages.length + 1,
      senderId: session?.user?.id || "user1",
      senderName: session?.user?.name || "用户",
      senderAvatar: session?.user?.image || "",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true
    }

    setMessages([...messages, message])
    setNewMessage("")

    // 模拟开发者回复
    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        const reply = {
          id: messages.length + 2,
          senderId: "dev1",
          senderName: "Alex Chen",
          senderAvatar: "https://github.com/alexchen.png",
          content: "收到！让我想想这个问题的最佳解决方案...",
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: false
        }
        setMessages(prev => [...prev, reply])
        setIsTyping(false)
      }, 2000)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Link href="/auth/signin">
            <Button className="bg-blue-600 hover:bg-blue-700">
              立即登录
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 聊天头部 */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/developer/${developerId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              
              <Avatar className="w-12 h-12">
                <img src={mockDeveloper.avatar} alt={mockDeveloper.name} className="rounded-full" />
              </Avatar>
              
              <div>
                <h1 className="font-semibold text-white">{mockDeveloper.name}</h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${mockDeveloper.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm text-gray-400">
                    {mockDeveloper.isOnline ? '在线' : mockDeveloper.lastSeen}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Phone size={20} />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Video size={20} />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <MoreHorizontal size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${message.isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!message.isCurrentUser && (
                    <Avatar className="w-8 h-8">
                      <img src={message.senderAvatar} alt={message.senderName} className="rounded-full" />
                    </Avatar>
                  )}
                  
                  <div className={`rounded-lg px-4 py-2 ${
                    message.isCurrentUser 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.isCurrentUser ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                  <Avatar className="w-8 h-8">
                    <img src={mockDeveloper.avatar} alt={mockDeveloper.name} className="rounded-full" />
                  </Avatar>
                  <div className="bg-gray-800 text-gray-100 rounded-lg px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 消息输入区域 */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
              >
                <Send size={20} />
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 