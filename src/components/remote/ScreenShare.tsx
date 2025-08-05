"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, MonitorOff, Mic, MicOff, Video, VideoOff } from "lucide-react"

interface ScreenShareProps {
  isHost?: boolean
  onStreamChange?: (stream: MediaStream | null) => void
}

export default function ScreenShare({ isHost = false, onStreamChange }: ScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Initialize WebRTC peer connection
  useEffect(() => {
    const initializePeerConnection = () => {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
      
      const peerConnection = new RTCPeerConnection(configuration)
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to remote peer via signaling server
          console.log('ICE candidate:', event.candidate)
        }
      }
      
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream')
        setRemoteStream(event.streams[0])
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }
      
      peerConnectionRef.current = peerConnection
    }
    
    initializePeerConnection()
    
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [])

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      setError(null)
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      })
      
      localStreamRef.current = stream
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      // Add stream to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream)
        })
      }
      
      // Handle stream ending
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }
      
      setIsSharing(true)
      onStreamChange?.(stream)
      
    } catch (err) {
      console.error('Error starting screen share:', err)
      setError('Failed to start screen sharing. Please check permissions.')
    }
  }

  // Stop screen sharing
  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      localStreamRef.current = null
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    
    setIsSharing(false)
    onStreamChange?.(null)
  }

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>Screen Sharing</span>
          </CardTitle>
          <CardDescription>
            {isHost ? 'Share your screen with the user' : 'View developer\'s screen'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {isHost && (
              <>
                <Button
                  onClick={isSharing ? stopScreenShare : startScreenShare}
                  variant={isSharing ? "destructive" : "default"}
                  className="flex items-center space-x-2"
                >
                  {isSharing ? (
                    <>
                      <MonitorOff className="w-4 h-4" />
                      <span>Stop Sharing</span>
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4" />
                      <span>Start Sharing</span>
                    </>
                  )}
                </Button>
                
                {isSharing && (
                  <>
                    <Button
                      onClick={toggleAudio}
                      variant={isMuted ? "destructive" : "secondary"}
                      size="sm"
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      onClick={toggleVideo}
                      variant={isVideoEnabled ? "secondary" : "destructive"}
                      size="sm"
                    >
                      {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                  </>
                )}
              </>
            )}
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isSharing ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-600">
                {isSharing ? 'Sharing active' : 'Not sharing'}
              </span>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Video (Host's screen) */}
        {isHost && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Screen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-64 object-contain"
                  style={{ backgroundColor: '#000' }}
                />
                {!isSharing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Monitor className="w-12 h-12 mx-auto mb-2" />
                      <p>Click "Start Sharing" to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Remote Video (Viewing screen) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isHost ? 'User View' : 'Developer\'s Screen'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                className="w-full h-64 object-contain"
                style={{ backgroundColor: '#000' }}
              />
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Monitor className="w-12 h-12 mx-auto mb-2" />
                    <p>
                      {isHost ? 'User will see your screen here' : 'Waiting for developer to share screen'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>WebRTC Connection:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                peerConnectionRef.current?.connectionState === 'connected' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {peerConnectionRef.current?.connectionState || 'Initializing'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Screen Share:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                isSharing 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isSharing ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 