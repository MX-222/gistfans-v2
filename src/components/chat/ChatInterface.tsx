"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Users, User, Phone, Video, MoreVertical } from "lucide-react"

interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'file' | 'system'
}

interface ChatUser {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  role: 'developer' | 'user'
}

interface ChatInterfaceProps {
  currentUserId: string
  chatType: 'private' | 'group'
  chatTitle: string
  users: ChatUser[]
  onSendMessage?: (message: string) => void
  onStartCall?: (type: 'audio' | 'video') => void
}

export default function ChatInterface({
  currentUserId,
  chatType,
  chatTitle,
  users,
  onSendMessage,
  onStartCall
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'system',
      senderName: 'System',
      content: 'Welcome to GistFans chat! Start your conversation here.',
      timestamp: new Date(),
      type: 'system'
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle sending messages
  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: 'You',
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, message])
    onSendMessage?.(newMessage)
    setNewMessage('')
    inputRef.current?.focus()
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Simulate receiving messages (in real app, this would come from WebSocket)
  useEffect(() => {
    // 只在客户端运行
    if (typeof window === 'undefined') return
    
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every 5 seconds
        const randomUser = users[Math.floor(Math.random() * users.length)]
        if (randomUser.id !== currentUserId) {
          const responses = [
            "Thanks for the help!",
            "I'm getting an error here...",
            "Could you explain that part again?",
            "That makes sense now!",
            "Let me try that approach.",
            "I'm sharing my screen now.",
            "The code is working perfectly!"
          ]
          
          const message: Message = {
            id: Date.now().toString(),
            senderId: randomUser.id,
            senderName: randomUser.name,
            senderAvatar: randomUser.avatar,
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
            type: 'text'
          }
          
          setMessages(prev => [...prev, message])
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [users, currentUserId])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isOwnMessage = (senderId: string) => senderId === currentUserId

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {chatType === 'group' ? (
                <Users className="w-5 h-5 text-blue-600" />
              ) : (
                <User className="w-5 h-5 text-green-600" />
              )}
              <div>
                <CardTitle className="text-lg">{chatTitle}</CardTitle>
                <CardDescription>
                  {chatType === 'group' 
                    ? `${users.length} members` 
                    : users.find(u => u.id !== currentUserId)?.name || 'Private chat'
                  }
                </CardDescription>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartCall?.('audio')}
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartCall?.('video')}
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message.senderId) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[70%] ${
                    isOwnMessage(message.senderId) ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {!isOwnMessage(message.senderId) && message.type !== 'system' && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.senderAvatar} />
                      <AvatarFallback>
                        {message.senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.type === 'system'
                        ? 'bg-gray-100 text-gray-600 text-center text-sm'
                        : isOwnMessage(message.senderId)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.type !== 'system' && !isOwnMessage(message.senderId) && (
                      <div className="text-xs font-semibold mb-1 opacity-70">
                        {message.senderName}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 opacity-70 ${
                      message.type === 'system' ? 'hidden' : ''
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
                <span>{typingUsers.join(', ')} typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
} 