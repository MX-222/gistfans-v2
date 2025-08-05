"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// 简化的聊天界面，避免导入问题
export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', content: 'Welcome to GistFans Chat!', time: '10:00' },
    { id: 2, sender: 'Developer', content: 'Hi! I\'m here to help you with your coding questions.', time: '10:01' },
    { id: 3, sender: 'User', content: 'Thanks! I\'m having trouble with React hooks.', time: '10:02' }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [chatType, setChatType] = useState<'private' | 'group'>('private')

  const sendMessage = () => {
    if (!newMessage.trim()) return
    
    const message = {
      id: messages.length + 1,
      sender: 'You',
      content: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setMessages([...messages, message])
    setNewMessage('')
    
    // Simulate response
    setTimeout(() => {
      const response = {
        id: messages.length + 2,
        sender: chatType === 'private' ? 'Developer' : 'Team',
        content: 'That\'s a great question! Let me help you with that...',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, response])
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GistFans Chat System</h1>
          <p className="text-gray-600">
            Dual chat system: Private developer-user communication + Project group discussions
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Private Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Private Chat</span>
              </CardTitle>
              <CardDescription>
                Direct communication with your subscribed developer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 border rounded-lg p-4 mb-4 overflow-y-auto bg-white">
                {messages.filter((_, i) => i < 4).map((message) => (
                  <div key={message.id} className={`mb-3 ${message.sender === 'You' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-2 rounded-lg max-w-xs ${
                      message.sender === 'You' 
                        ? 'bg-blue-600 text-white' 
                        : message.sender === 'System'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.sender !== 'You' && (
                        <div className="text-xs font-semibold mb-1">{message.sender}</div>
                      )}
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">{message.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-2 border rounded-md"
                />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </CardContent>
          </Card>

          {/* Group Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Project Group Chat</span>
              </CardTitle>
              <CardDescription>
                Discuss projects with multiple developers and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 border rounded-lg p-4 mb-4 overflow-y-auto bg-white">
                <div className="mb-3">
                  <div className="inline-block p-2 rounded-lg bg-gray-100 text-gray-600 text-sm">
                    <div className="text-xs font-semibold mb-1">System</div>
                    <div>Welcome to the React Learning Group!</div>
                    <div className="text-xs opacity-70 mt-1">09:00</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="inline-block p-2 rounded-lg bg-gray-100 text-gray-900 max-w-xs">
                    <div className="text-xs font-semibold mb-1">Senior Dev Alex</div>
                    <div className="text-sm">Today we'll cover React hooks and state management</div>
                    <div className="text-xs opacity-70 mt-1">09:15</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="inline-block p-2 rounded-lg bg-gray-100 text-gray-900 max-w-xs">
                    <div className="text-xs font-semibold mb-1">Student Sarah</div>
                    <div className="text-sm">I'm excited to learn! Can we start with useState?</div>
                    <div className="text-xs opacity-70 mt-1">09:16</div>
                  </div>
                </div>
                
                <div className="mb-3 text-right">
                  <div className="inline-block p-2 rounded-lg bg-blue-600 text-white max-w-xs">
                    <div className="text-sm">Great! I have some questions about useEffect too.</div>
                    <div className="text-xs opacity-70 mt-1">09:17</div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Message the group..."
                  className="flex-1 p-2 border rounded-md"
                />
                <Button>Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Chat System Features</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Real-time Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Instant message delivery</li>
                  <li>• Typing indicators</li>
                  <li>• Message timestamps</li>
                  <li>• Online status indicators</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dual Chat System</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Private developer-user chats</li>
                  <li>• Project-based group discussions</li>
                  <li>• Role-based permissions</li>
                  <li>• Chat history storage</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rich Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• File sharing support</li>
                  <li>• Voice/video call integration</li>
                  <li>• Code snippet sharing</li>
                  <li>• Message reactions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Integration Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Integration with Remote Assistance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Seamless Workflow:</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li>1. Start with chat conversation</li>
                  <li>2. Escalate to screen sharing when needed</li>
                  <li>3. Continue chatting during screen share</li>
                  <li>4. Save session notes and follow-ups</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Smart Features:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Auto-save important conversations</li>
                  <li>• Link chat messages to screen recordings</li>
                  <li>• Generate session summaries</li>
                  <li>• Schedule follow-up sessions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 