"use client"

import { useState } from 'react'
import ScreenShare from '@/components/remote/ScreenShare'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"


export default function RemoteAssistancePage() {
  const [currentRole, setCurrentRole] = useState<'developer' | 'user'>('developer')
  const [sessionActive, setSessionActive] = useState(false)

  const startSession = () => {
    setSessionActive(true)
  }

  const endSession = () => {
    setSessionActive(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Remote Assistance</h1>
          <p className="text-gray-600">
            GistFans remote assistance system - Connect developers with users for real-time help
          </p>
        </div>

        {/* Role Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Session Role</CardTitle>
            <CardDescription>
              Choose your role for this remote assistance session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button
                variant={currentRole === 'developer' ? 'default' : 'outline'}
                onClick={() => setCurrentRole('developer')}
              >
                Developer (Host)
              </Button>
              <Button
                variant={currentRole === 'user' ? 'default' : 'outline'}
                onClick={() => setCurrentRole('user')}
              >
                User (Guest)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Session Control</CardTitle>
            <CardDescription>
              Manage your remote assistance session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              {!sessionActive ? (
                <Button onClick={startSession} className="bg-green-600 hover:bg-green-700">
                  Start Session
                </Button>
              ) : (
                <Button onClick={endSession} variant="destructive">
                  End Session
                </Button>
              )}
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${sessionActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  {sessionActive ? 'Session Active' : 'Session Inactive'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Screen Share Component */}
        {sessionActive && (
          <ScreenShare 
            isHost={currentRole === 'developer'} 
            onStreamChange={(stream) => {
              console.log('Stream changed:', stream)
            }}
          />
        )}

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use Remote Assistance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">For Developers:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Select "Developer (Host)" role</li>
                  <li>• Click "Start Session" to begin</li>
                  <li>• Click "Start Sharing" to share your screen</li>
                  <li>• Use audio/video controls to manage the session</li>
                  <li>• Help users with their coding problems in real-time</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">For Users:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Select "User (Guest)" role</li>
                  <li>• Wait for developer to start sharing</li>
                  <li>• View developer's screen and follow along</li>
                  <li>• Ask questions and get real-time help</li>
                  <li>• Learn from expert developers directly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Technical Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">WebRTC Technology</h4>
                <p className="text-sm text-blue-700 mt-2">
                  Peer-to-peer connection for low latency screen sharing
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900">HD Quality</h4>
                <p className="text-sm text-green-700 mt-2">
                  Up to 1080p resolution at 30fps for crystal clear viewing
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900">Audio Support</h4>
                <p className="text-sm text-purple-700 mt-2">
                  Built-in audio sharing and voice communication
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 